import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import {
  mapStripeStatusToAssociation,
  parseStripeWebhookEvent,
} from '../lib/recurring-billing';
import { applyVendorSubscriptionPlan } from '../lib/vendor-subscription-plan';

const toDate = (epochSeconds?: number | null) =>
  typeof epochSeconds === 'number' && Number.isFinite(epochSeconds)
    ? new Date(epochSeconds * 1000)
    : null;

const extractVendorIdFromSubscription = async (subscription: Stripe.Subscription | any) => {
  const metadataVendorId = String(subscription?.metadata?.vendorId || '').trim();
  if (metadataVendorId) return metadataVendorId;
  const subscriptionId = String(subscription?.id || '').trim();
  if (!subscriptionId) return null;
  const billing = await prisma.vendorBilling.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { vendorId: true },
  });
  return billing?.vendorId || null;
};

const handleSubscriptionUpsert = async (subscription: Stripe.Subscription | any) => {
  const vendorId = await extractVendorIdFromSubscription(subscription);
  if (!vendorId) return;

  const associationStatus = mapStripeStatusToAssociation(subscription.status);
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer | null)?.id || null;

  const existing = await prisma.vendorBilling.findUnique({
    where: { vendorId },
    select: {
      billingDay: true,
      stripeCustomerId: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await applyVendorSubscriptionPlan(tx, {
      vendorId,
      planTier: 'GOLD',
      billingCycleDay: existing?.billingDay || 1,
      paymentMethod: 'STRIPE',
      associationStatus: associationStatus as any,
      statusReason: subscription.cancel_at_period_end
        ? 'stripe-cancel-at-period-end'
        : 'stripe-webhook-sync',
      stripeCustomerId: customerId || existing?.stripeCustomerId || null,
      stripeSubscriptionId: String(subscription.id),
      cycleStartAt: new Date(),
      cycleEndAt: toDate(subscription.current_period_end),
    });
  });
};

const handleCheckoutCompleted = async (session: Stripe.Checkout.Session | any) => {
  if (session.mode !== 'subscription') return;
  const vendorId = String(session.metadata?.vendorId || '').trim();
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id;
  if (!vendorId || !subscriptionId) return;

  const existing = await prisma.vendorBilling.findUnique({
    where: { vendorId },
    select: {
      billingDay: true,
      stripeCustomerId: true,
    },
  });

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id || null;

  await prisma.$transaction(async (tx) => {
    await applyVendorSubscriptionPlan(tx, {
      vendorId,
      planTier: 'GOLD',
      billingCycleDay: existing?.billingDay || 1,
      paymentMethod: 'STRIPE',
      associationStatus: 'ACTIVE',
      statusReason: 'stripe-checkout-completed',
      stripeCustomerId: customerId || existing?.stripeCustomerId || null,
      stripeSubscriptionId: subscriptionId,
      cycleStartAt: new Date(),
      cycleEndAt: null,
    });
  });
};

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'];
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body || {}), 'utf8');
    const event = parseStripeWebhookEvent(
      rawBody,
      typeof signature === 'string' ? signature : Array.isArray(signature) ? signature[0] : undefined
    );

    if (!event) {
      res.json({ received: true, mode: 'mock' });
      return;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: error?.message || 'Invalid webhook event' });
  }
};

