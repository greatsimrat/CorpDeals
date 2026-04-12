import { ensureBillingPlanConfig } from './billing-plan-config';

export const VENDOR_SUBSCRIPTION_PLAN_PRESETS = {
  FREE: {
    monthlyFee: 0,
    includedLeadsPerMonth: 10,
    overagePricePerLead: 5,
    currency: 'CAD',
    offerLimit: 50 as number | null,
    billingMode: 'FREE' as const,
    associationStatus: 'FREE' as const,
  },
  GOLD: {
    monthlyFee: 100,
    includedLeadsPerMonth: 20,
    overagePricePerLead: 3,
    currency: 'CAD',
    offerLimit: 100 as number | null,
    billingMode: 'MONTHLY' as const,
    associationStatus: 'ACTIVE' as const,
  },
  PREMIUM: {
    monthlyFee: 250,
    includedLeadsPerMonth: 50,
    overagePricePerLead: 2,
    currency: 'CAD',
    offerLimit: 250 as number | null,
    billingMode: 'MONTHLY' as const,
    associationStatus: 'ACTIVE' as const,
  },
} as const;

export type VendorSubscriptionPlanTier = keyof typeof VENDOR_SUBSCRIPTION_PLAN_PRESETS;

export const resolveVendorSubscriptionPlanTier = (
  value: unknown
): VendorSubscriptionPlanTier | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'GROWTH') return 'GOLD';
  if (normalized === 'PRO') return 'PREMIUM';
  if (Object.prototype.hasOwnProperty.call(VENDOR_SUBSCRIPTION_PLAN_PRESETS, normalized)) {
    return normalized as VendorSubscriptionPlanTier;
  }
  return null;
};

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

type ApplyVendorPlanInput = {
  vendorId: string;
  planTier: VendorSubscriptionPlanTier;
  billingCycleDay?: number;
  paymentMethod?: 'MANUAL' | 'STRIPE';
  associationStatus?:
    | 'TRIALING'
    | 'ACTIVE'
    | 'FREE'
    | 'INACTIVE'
    | 'PAST_DUE'
    | 'CANCELED'
    | 'INCOMPLETE'
    | 'EXPIRED';
  statusReason?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  cycleStartAt?: Date | null;
  cycleEndAt?: Date | null;
};

export const applyVendorSubscriptionPlan = async (tx: any, input: ApplyVendorPlanInput) => {
  const preset = VENDOR_SUBSCRIPTION_PLAN_PRESETS[input.planTier];
  const now = new Date();
  const billingCycleDay = input.billingCycleDay || 1;
  const paymentMethod = input.paymentMethod || 'MANUAL';

  const existingPlanConfig = await (tx as any).billingPlanConfig.findUnique({
    where: { code: input.planTier },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      planType: true,
      monthlyFee: true,
      includedLeadsPerCycle: true,
      overagePricePerLead: true,
      maxActiveOffers: true,
      currencyCode: true,
      isActive: true,
    },
  });

  if (existingPlanConfig && !existingPlanConfig.isActive) {
    throw new Error(`PLAN_CONFIG_INACTIVE:${input.planTier}`);
  }

  const ensuredPlan =
    existingPlanConfig ||
    (await ensureBillingPlanConfig(tx, {
      code: input.planTier,
      name: input.planTier === 'FREE' ? 'Free' : input.planTier === 'GOLD' ? 'Gold' : 'Premium',
      description:
        input.planTier === 'FREE'
          ? 'Starter plan for vendors testing CorpDeals.'
          : input.planTier === 'GOLD'
          ? 'Growth plan for vendors actively scaling deal coverage.'
          : 'High-volume plan for vendors with broad active catalogs.',
      planType: 'SUBSCRIPTION',
      monthlyFee: preset.monthlyFee,
      includedLeadsPerCycle: preset.includedLeadsPerMonth,
      overagePricePerLead: preset.overagePricePerLead,
      maxActiveOffers: preset.offerLimit,
      overageEnabled: true,
      currencyCode: preset.currency,
      isSystemPreset: true,
    }));

  const planConfig = await (tx as any).billingPlanConfig.findUnique({
    where: { id: ensuredPlan.id },
    select: {
      id: true,
      monthlyFee: true,
      includedLeadsPerCycle: true,
      overagePricePerLead: true,
      maxActiveOffers: true,
      currencyCode: true,
      isActive: true,
    },
  });

  if (!planConfig || !planConfig.isActive) {
    throw new Error(`PLAN_CONFIG_INACTIVE:${input.planTier}`);
  }

  const resolvedMonthlyFee = toNumber(planConfig.monthlyFee, preset.monthlyFee);
  const resolvedIncludedLeads = Math.max(
    0,
    Number(planConfig.includedLeadsPerCycle ?? preset.includedLeadsPerMonth)
  );
  const resolvedOveragePrice = toNumber(planConfig.overagePricePerLead, preset.overagePricePerLead);
  const resolvedOfferLimit =
    planConfig.maxActiveOffers === null || planConfig.maxActiveOffers === undefined
      ? preset.offerLimit
      : Math.max(0, Number(planConfig.maxActiveOffers));
  const resolvedCurrency = String(planConfig.currencyCode || preset.currency).toUpperCase() || 'CAD';

  await (tx as any).vendorBillingPlan.updateMany({
    where: { vendorId: input.vendorId, isActive: true },
    data: { isActive: false },
  });

  const activePlan = await (tx as any).vendorBillingPlan.create({
    data: {
      vendorId: input.vendorId,
      planConfigId: planConfig.id,
      code: input.planTier,
      name: input.planTier === 'FREE' ? 'Free' : input.planTier === 'GOLD' ? 'Gold' : 'Premium',
      planType: 'SUBSCRIPTION',
      pricePerLead: null,
      monthlyFee: resolvedMonthlyFee.toFixed(2),
      includedLeadsPerMonth: resolvedIncludedLeads,
      includedLeadsPerCycle: resolvedIncludedLeads,
      overagePricePerLead: resolvedOveragePrice.toFixed(2),
      offerLimit: resolvedOfferLimit,
      maxActiveOffers: resolvedOfferLimit,
      overageEnabled: true,
      billingCycleDay,
      currency: resolvedCurrency,
      startsAt: input.cycleStartAt || now,
      endsAt: input.cycleEndAt || null,
      isActive: true,
    },
  });

  const shouldResetUsage = input.planTier === 'FREE' || input.planTier === 'GOLD' || input.planTier === 'PREMIUM';

  const billing = await (tx as any).vendorBilling.upsert({
    where: { vendorId: input.vendorId },
    update: {
      billingMode: preset.billingMode,
      postTrialMode: preset.billingMode === 'FREE' ? 'FREE' : 'MONTHLY',
      trialEndsAt: null,
      leadPriceCents: 0,
      monthlyFeeCents: Math.max(0, Math.round(resolvedMonthlyFee * 100)),
      paymentMethod,
      currency: resolvedCurrency,
      currencyCode: resolvedCurrency,
      planConfigId: planConfig.id,
      billingCycleStartAt: input.cycleStartAt || now,
      billingCycleEndAt: input.cycleEndAt || null,
      includedLeadsTotal: resolvedIncludedLeads,
      ...(shouldResetUsage ? { includedLeadsUsed: 0 } : {}),
      billingDay: billingCycleDay,
      associationStatus: (input.associationStatus || preset.associationStatus) as any,
      statusReason: input.statusReason || 'vendor-plan-update',
      lastValidatedAt: now,
      ...(input.stripeCustomerId !== undefined ? { stripeCustomerId: input.stripeCustomerId } : {}),
      ...(input.stripeSubscriptionId !== undefined
        ? { stripeSubscriptionId: input.stripeSubscriptionId }
        : {}),
    } as any,
    create: {
      vendorId: input.vendorId,
      billingMode: preset.billingMode,
      postTrialMode: preset.billingMode === 'FREE' ? 'FREE' : 'MONTHLY',
      trialEndsAt: null,
      leadPriceCents: 0,
      monthlyFeeCents: Math.max(0, Math.round(resolvedMonthlyFee * 100)),
      paymentMethod,
      currency: resolvedCurrency,
      currencyCode: resolvedCurrency,
      planConfigId: planConfig.id,
      billingCycleStartAt: input.cycleStartAt || now,
      billingCycleEndAt: input.cycleEndAt || null,
      includedLeadsTotal: resolvedIncludedLeads,
      includedLeadsUsed: 0,
      walletBalance: '0.00',
      billingDay: billingCycleDay,
      associationStatus: (input.associationStatus || preset.associationStatus) as any,
      statusReason: input.statusReason || 'vendor-plan-update',
      lastValidatedAt: now,
      ...(input.stripeCustomerId ? { stripeCustomerId: input.stripeCustomerId } : {}),
      ...(input.stripeSubscriptionId ? { stripeSubscriptionId: input.stripeSubscriptionId } : {}),
    } as any,
  });

  return { activePlan, billing, planConfig };
};
