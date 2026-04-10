import prisma from './prisma';

const FREE_PLAN_MONTHLY_FEE = 0;
const PREMIUM_PLAN_MIN_MONTHLY_FEE = 500;

export const DEFAULT_PLAN_OFFER_LIMITS = {
  FREE: 5,
  PAID: 25,
  PREMIUM: 100,
  PAY_PER_LEAD: 25,
} as const;

type BillingPlanRecord = {
  id: string;
  vendorId: string;
  planType: 'PAY_PER_LEAD' | 'SUBSCRIPTION';
  pricePerLead?: unknown;
  monthlyFee?: unknown;
  offerLimit?: number | null;
  billingCycleDay?: number | null;
  currency?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const toDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getPlanDisplayName = (plan: BillingPlanRecord | null | undefined) => {
  if (!plan) return 'No plan';
  if (plan.planType === 'PAY_PER_LEAD') return 'Paid';

  const monthlyFee = toNumber(plan.monthlyFee) ?? 0;
  if (monthlyFee <= FREE_PLAN_MONTHLY_FEE) return 'Free';
  if (monthlyFee >= PREMIUM_PLAN_MIN_MONTHLY_FEE) return 'Premium';
  return 'Paid';
};

export const getPlanOfferLimit = (plan: BillingPlanRecord | null | undefined) => {
  if (!plan) return null;
  if (typeof plan.offerLimit === 'number' && Number.isInteger(plan.offerLimit) && plan.offerLimit >= 0) {
    return plan.offerLimit;
  }
  if (plan.planType === 'PAY_PER_LEAD') return DEFAULT_PLAN_OFFER_LIMITS.PAY_PER_LEAD;

  const monthlyFee = toNumber(plan.monthlyFee) ?? 0;
  if (monthlyFee <= FREE_PLAN_MONTHLY_FEE) return DEFAULT_PLAN_OFFER_LIMITS.FREE;
  if (monthlyFee >= PREMIUM_PLAN_MIN_MONTHLY_FEE) return DEFAULT_PLAN_OFFER_LIMITS.PREMIUM;
  return DEFAULT_PLAN_OFFER_LIMITS.PAID;
};

export const isPlanActiveNow = (plan: BillingPlanRecord | null | undefined, now = new Date()) => {
  if (!plan || !plan.isActive) return false;
  const startsAt = toDate(plan.startsAt);
  const endsAt = toDate(plan.endsAt);
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
};

export const getActiveVendorBillingRelationFilter = (now = new Date()) => ({
  billingPlans: {
    some: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
  },
});

export const syncExpiredVendorPlans = async (vendorIds?: string[]) => {
  const now = new Date();
  const expiredPlans = await (prisma as any).vendorBillingPlan.findMany({
    where: {
      isActive: true,
      endsAt: { lt: now },
      ...(vendorIds?.length ? { vendorId: { in: vendorIds } } : {}),
    },
    select: { id: true, vendorId: true },
  });

  if (!expiredPlans.length) {
    return { expiredVendorIds: [] as string[], pausedOffers: 0 };
  }

  const expiredVendorIds = [...new Set(expiredPlans.map((plan: { vendorId: string }) => plan.vendorId))];

  await prisma.$transaction(async (tx) => {
    await (tx as any).vendorBillingPlan.updateMany({
      where: { id: { in: expiredPlans.map((plan: { id: string }) => plan.id) } },
      data: { isActive: false },
    });

    await tx.offer.updateMany({
      where: {
        vendorId: { in: expiredVendorIds },
        offerStatus: 'LIVE',
      } as any,
      data: {
        active: false,
        offerStatus: 'PAUSED',
        pausedAt: now,
        pausedByUserId: null,
      } as any,
    });
  });

  return { expiredVendorIds, pausedOffers: expiredVendorIds.length };
};

export const getVendorBillingState = async (vendorId: string, options?: { excludeOfferId?: string | null }) => {
  await syncExpiredVendorPlans([vendorId]);

  const now = new Date();
  const [billingProfile, latestPlan, activePlan, managedOfferCount, liveOfferCount] = await Promise.all([
    (prisma as any).vendorBilling.findUnique({
      where: { vendorId },
    }),
    (prisma as any).vendorBillingPlan.findFirst({
      where: { vendorId },
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { updatedAt: 'desc' }],
    }),
    (prisma as any).vendorBillingPlan.findFirst({
      where: {
        vendorId,
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: [{ startsAt: 'desc' }, { updatedAt: 'desc' }],
    }),
    prisma.offer.count({
      where: {
        vendorId,
        ...(options?.excludeOfferId ? { id: { not: options.excludeOfferId } } : {}),
        offerStatus: { not: 'CANCELLED' },
      } as any,
    }),
    prisma.offer.count({
      where: {
        vendorId,
        ...(options?.excludeOfferId ? { id: { not: options.excludeOfferId } } : {}),
        offerStatus: 'LIVE',
      } as any,
    }),
  ]);

  const effectivePlan = (activePlan || latestPlan) as BillingPlanRecord | null;
  const offerLimit = getPlanOfferLimit(effectivePlan);
  const remainingOfferSlots =
    offerLimit === null ? null : Math.max(offerLimit - managedOfferCount, 0);
  const planStatus = activePlan
    ? 'ACTIVE'
    : latestPlan
    ? toDate((latestPlan as BillingPlanRecord).endsAt) && toDate((latestPlan as BillingPlanRecord).endsAt)! < now
      ? 'EXPIRED'
      : toDate((latestPlan as BillingPlanRecord).startsAt) &&
        toDate((latestPlan as BillingPlanRecord).startsAt)! > now
      ? 'SCHEDULED'
      : 'INACTIVE'
    : 'NONE';

  const canCreateOffer = Boolean(activePlan) && (remainingOfferSlots === null || remainingOfferSlots > 0);
  const canPublishOffer = Boolean(activePlan);

  let createOfferMessage = '';
  if (!activePlan) {
    createOfferMessage =
      planStatus === 'EXPIRED'
        ? 'Your billing plan has ended. Renew or assign a new plan before creating another offer.'
        : 'An active billing plan is required before you can create another offer.';
  } else if (remainingOfferSlots !== null && remainingOfferSlots <= 0) {
    createOfferMessage = `Your current ${getPlanDisplayName(
      effectivePlan
    ).toLowerCase()} plan is full. Upgrade the plan or cancel an offer before creating another one.`;
  }

  const publishOfferMessage = activePlan
    ? ''
    : planStatus === 'EXPIRED'
    ? 'Your billing plan has ended. Renew or assign a new plan before submitting or reactivating offers.'
    : 'An active billing plan is required before offers can be submitted, approved, or go live.';

  return {
    billingProfile,
    latestPlan,
    activePlan,
    planStatus,
    planDisplayName: getPlanDisplayName(effectivePlan),
    offerLimit,
    managedOfferCount,
    liveOfferCount,
    remainingOfferSlots,
    canCreateOffer,
    canPublishOffer,
    createOfferMessage,
    publishOfferMessage,
  };
};
