import crypto from 'node:crypto';
import Stripe from 'stripe';

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

type CreateGoldCheckoutSessionInput = {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  stripeCustomerId?: string | null;
};

type CheckoutSessionResult = {
  provider: 'STRIPE' | 'MOCK';
  sessionId: string;
  checkoutUrl: string;
  stripeCustomerId?: string | null;
};

export type StripeSubscriptionSnapshot = {
  provider: 'STRIPE' | 'MOCK';
  subscriptionId: string;
  customerId?: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

const firstConfiguredUrl = (...values: Array<string | undefined>) => {
  for (const value of values) {
    const candidate = String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .find(Boolean);
    if (candidate) return candidate.replace(/\/$/, '');
  }
  return DEFAULT_FRONTEND_URL;
};

const getFrontendUrl = () =>
  firstConfiguredUrl(process.env.FRONTEND_URL, process.env.FRONTEND_URLS, DEFAULT_FRONTEND_URL);

const isProduction = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production';

export const isMockRecurringBillingMode = () => {
  if (String(process.env.BILLING_MOCK_PAYMENTS || '').toLowerCase() === 'true') return true;
  if (String(process.env.BILLING_MOCK_PAYMENTS || '').toLowerCase() === 'false') return false;
  return !process.env.STRIPE_SECRET_KEY && !isProduction();
};

const assertStripeReady = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured');
  }
};

let stripeClient: Stripe | null = null;
const getStripeClient = () => {
  assertStripeReady();
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }
  return stripeClient;
};

const GOLD_AMOUNT_CENTS = 10000;
const GOLD_CURRENCY = 'cad';

const toDate = (epochSeconds?: number | null) =>
  typeof epochSeconds === 'number' && Number.isFinite(epochSeconds)
    ? new Date(epochSeconds * 1000)
    : null;

export const createGoldCheckoutSession = async (
  input: CreateGoldCheckoutSessionInput
): Promise<CheckoutSessionResult> => {
  const frontendUrl = getFrontendUrl();

  if (isMockRecurringBillingMode()) {
    const mockSessionId = `mock_cs_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    return {
      provider: 'MOCK',
      sessionId: mockSessionId,
      checkoutUrl: `${frontendUrl}/vendor/billing?checkout=success&session_id=${encodeURIComponent(
        mockSessionId
      )}`,
      stripeCustomerId: input.stripeCustomerId || `mock_cus_${input.vendorId}`,
    };
  }

  const stripe = getStripeClient();
  const customerId =
    input.stripeCustomerId ||
    (
      await stripe.customers.create({
        name: input.vendorName,
        email: input.vendorEmail,
        metadata: {
          vendorId: input.vendorId,
        },
      })
    ).id;

  const configuredGoldPriceId = String(process.env.STRIPE_GOLD_PRICE_ID || '').trim();
  const lineItem = configuredGoldPriceId
    ? { price: configuredGoldPriceId, quantity: 1 }
    : {
        price_data: {
          currency: GOLD_CURRENCY,
          unit_amount: GOLD_AMOUNT_CENTS,
          recurring: { interval: 'month' as const },
          product_data: {
            name: 'CorpDeals Gold Plan',
            description: 'Monthly recurring subscription for CorpDeals vendor Gold plan.',
          },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    success_url: `${frontendUrl}/vendor/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/vendor/billing?checkout=cancel`,
    line_items: [lineItem as any],
    metadata: {
      vendorId: input.vendorId,
      planTier: 'GOLD',
    },
    subscription_data: {
      metadata: {
        vendorId: input.vendorId,
        planTier: 'GOLD',
      },
    },
  });

  if (!session.url) {
    throw new Error('Stripe checkout session URL was not returned');
  }

  return {
    provider: 'STRIPE',
    sessionId: session.id,
    checkoutUrl: session.url,
    stripeCustomerId: customerId,
  };
};

export const confirmGoldCheckoutSession = async (input: {
  sessionId: string;
  vendorId: string;
  fallbackCustomerId?: string | null;
}): Promise<StripeSubscriptionSnapshot> => {
  const sessionId = String(input.sessionId || '').trim();
  if (!sessionId) throw new Error('sessionId is required');

  if (isMockRecurringBillingMode() && sessionId.startsWith('mock_cs_')) {
    return {
      provider: 'MOCK',
      subscriptionId: `mock_sub_${sessionId.replace(/^mock_cs_/, '')}`,
      customerId: input.fallbackCustomerId || `mock_cus_${input.vendorId}`,
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  });

  if (!session || session.mode !== 'subscription') {
    throw new Error('Invalid checkout session');
  }
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    throw new Error('Checkout session is not completed');
  }

  const metadataVendorId = String(session.metadata?.vendorId || '').trim();
  if (metadataVendorId && metadataVendorId !== input.vendorId) {
    throw new Error('Checkout session does not belong to this vendor');
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id;
  if (!subscriptionId) {
    throw new Error('No subscription found for checkout session');
  }

  const subscription =
    typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : (session.subscription as Stripe.Subscription);

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer | null)?.id || input.fallbackCustomerId || null;

  return {
    provider: 'STRIPE',
    subscriptionId,
    customerId,
    status: subscription.status,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    currentPeriodEnd: toDate(subscription.current_period_end),
  };
};

export const cancelRecurringGoldSubscription = async (input: {
  subscriptionId: string;
}): Promise<StripeSubscriptionSnapshot> => {
  const subscriptionId = String(input.subscriptionId || '').trim();
  if (!subscriptionId) {
    throw new Error('subscriptionId is required');
  }

  if (isMockRecurringBillingMode() && subscriptionId.startsWith('mock_sub_')) {
    return {
      provider: 'MOCK',
      subscriptionId,
      status: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  const stripe = getStripeClient();
  const updated = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return {
    provider: 'STRIPE',
    subscriptionId: updated.id,
    customerId: typeof updated.customer === 'string' ? updated.customer : null,
    status: updated.status,
    cancelAtPeriodEnd: Boolean(updated.cancel_at_period_end),
    currentPeriodEnd: toDate(updated.current_period_end),
  };
};

export const getRecurringSubscriptionSnapshot = async (
  subscriptionId: string
): Promise<StripeSubscriptionSnapshot | null> => {
  const normalized = String(subscriptionId || '').trim();
  if (!normalized) return null;

  if (isMockRecurringBillingMode() && normalized.startsWith('mock_sub_')) {
    return {
      provider: 'MOCK',
      subscriptionId: normalized,
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  if (isMockRecurringBillingMode()) return null;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(normalized);
  return {
    provider: 'STRIPE',
    subscriptionId: subscription.id,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
    status: subscription.status,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    currentPeriodEnd: toDate(subscription.current_period_end),
  };
};

export const mapStripeStatusToAssociation = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active' || normalized === 'trialing') return 'ACTIVE';
  if (normalized === 'past_due' || normalized === 'unpaid') return 'PAST_DUE';
  if (normalized === 'incomplete' || normalized === 'incomplete_expired') return 'INCOMPLETE';
  if (normalized === 'canceled') return 'CANCELED';
  return 'INACTIVE';
};

export const parseStripeWebhookEvent = (rawBody: Buffer, signature?: string | null) => {
  if (isMockRecurringBillingMode()) return null;
  const stripe = getStripeClient();
  const endpointSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();

  if (endpointSecret && signature) {
    return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  }

  return JSON.parse(rawBody.toString('utf8'));
};

