import prisma from './prisma';

const FREE_PLAN_MONTHLY_FEE = 0;
const GOLD_PLAN_MONTHLY_FEE = 100;
const PREMIUM_PLAN_MIN_MONTHLY_FEE = 300;

export const ALLOWED_VENDOR_BILLING_ASSOCIATION_STATUSES = [
  'FREE',
  'TRIALING',
  'ACTIVE',
] as const;

export type AllowedVendorBillingAssociationStatus =
  (typeof ALLOWED_VENDOR_BILLING_ASSOCIATION_STATUSES)[number];

const BILLING_STATUS_MESSAGE_BY_ASSOCIATION: Record<string, string> = {
  PAST_DUE: 'Your billing account is past due. Update billing before creating or publishing offers.',
  CANCELED: 'Your billing account is canceled. Reactivate billing before creating or publishing offers.',
  INCOMPLETE: 'Your billing setup is incomplete. Complete billing before creating or publishing offers.',
  EXPIRED: 'Your billing association is expired. Renew or assign a valid plan before creating or publishing offers.',
  INACTIVE: 'A valid billing association is required before creating or publishing offers.',
};

export const DEFAULT_PLAN_OFFER_LIMITS = {
  FREE: 50,
  GOLD: 100,
  PREMIUM: null as number | null,
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
  if (plan.planType === 'PAY_PER_LEAD') return 'Pay per lead';

  const monthlyFee = toNumber(plan.monthlyFee) ?? 0;
  if (monthlyFee <= FREE_PLAN_MONTHLY_FEE) return 'Free';
  if (monthlyFee >= PREMIUM_PLAN_MIN_MONTHLY_FEE) return 'Premium';
  if (monthlyFee >= GOLD_PLAN_MONTHLY_FEE) return 'Gold';
  return 'Gold';
};

export const getPlanOfferLimit = (plan: BillingPlanRecord | null | undefined) => {
  if (!plan) return null;
  if (plan.offerLimit === null) return null;
  if (typeof plan.offerLimit === 'number' && Number.isInteger(plan.offerLimit) && plan.offerLimit >= 0) {
    return plan.offerLimit;
  }
  if (plan.planType === 'PAY_PER_LEAD') return DEFAULT_PLAN_OFFER_LIMITS.PAY_PER_LEAD;

  const monthlyFee = toNumber(plan.monthlyFee) ?? 0;
  if (monthlyFee <= FREE_PLAN_MONTHLY_FEE) return DEFAULT_PLAN_OFFER_LIMITS.FREE;
  if (monthlyFee >= PREMIUM_PLAN_MIN_MONTHLY_FEE) return DEFAULT_PLAN_OFFER_LIMITS.PREMIUM;
  if (monthlyFee >= GOLD_PLAN_MONTHLY_FEE) return DEFAULT_PLAN_OFFER_LIMITS.GOLD;
  return DEFAULT_PLAN_OFFER_LIMITS.GOLD;
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
  billing: {
    is: {
      associationStatus: { in: [...ALLOWED_VENDOR_BILLING_ASSOCIATION_STATUSES] },
    },
  },
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
  let pausedOffers = 0;

  await prisma.$transaction(async (tx) => {
    await (tx as any).vendorBillingPlan.updateMany({
      where: { id: { in: expiredPlans.map((plan: { id: string }) => plan.id) } },
      data: { isActive: false },
    });

    const pausedResult = await tx.offer.updateMany({
      where: {
        vendorId: { in: expiredVendorIds },
        offerState: 'APPROVED',
        active: true,
      } as any,
      data: {
        active: false,
        offerStatus: 'PAUSED',
        offerState: 'APPROVED',
        pausedAt: now,
        pausedByUserId: null,
      } as any,
    });
    pausedOffers = pausedResult.count;

    const stillActivePlanRows = await (tx as any).vendorBillingPlan.findMany({
      where: {
        vendorId: { in: expiredVendorIds },
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      select: { vendorId: true },
    });

    const vendorsWithActivePlans = new Set(
      stillActivePlanRows.map((row: { vendorId: string }) => row.vendorId)
    );
    const vendorsWithoutActivePlans = expiredVendorIds.filter(
      (vendorId) => !vendorsWithActivePlans.has(vendorId)
    );

    if (vendorsWithoutActivePlans.length) {
      await (tx as any).vendorBilling.updateMany({
        where: {
          vendorId: { in: vendorsWithoutActivePlans },
          associationStatus: { in: ['ACTIVE', 'TRIALING', 'FREE', 'INACTIVE'] },
        },
        data: {
          associationStatus: 'EXPIRED',
          statusReason: 'plan-window-expired',
          lastValidatedAt: now,
        },
      });
    }
  });

  return { expiredVendorIds, pausedOffers };
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
        offerState: { not: 'CANCELLED' },
      } as any,
    }),
    prisma.offer.count({
      where: {
        vendorId,
        ...(options?.excludeOfferId ? { id: { not: options.excludeOfferId } } : {}),
        offerState: 'APPROVED',
        active: true,
      } as any,
    }),
  ]);

  const effectivePlan = (activePlan || latestPlan) as BillingPlanRecord | null;
  const associationStatus = String((billingProfile as any)?.associationStatus || '').toUpperCase();
  const hasAllowedAssociationStatus =
    ALLOWED_VENDOR_BILLING_ASSOCIATION_STATUSES.includes(
      associationStatus as AllowedVendorBillingAssociationStatus
    );
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

  const hasActivePlan = Boolean(activePlan);
  const hasOfferCapacity = remainingOfferSlots === null || remainingOfferSlots > 0;
  const canCreateOffer = hasActivePlan && hasAllowedAssociationStatus && hasOfferCapacity;
  const canPublishOffer = hasActivePlan && hasAllowedAssociationStatus;

  let createOfferMessage = '';
  if (!hasAllowedAssociationStatus) {
    createOfferMessage =
      BILLING_STATUS_MESSAGE_BY_ASSOCIATION[associationStatus] ||
      'Your billing account is not eligible. Update billing before creating offers.';
  } else if (!activePlan) {
    createOfferMessage =
      planStatus === 'EXPIRED'
        ? 'Your billing plan has ended. Renew or assign a new plan before creating another offer.'
        : 'An active billing plan is required before you can create another offer.';
  } else if (remainingOfferSlots !== null && remainingOfferSlots <= 0) {
    createOfferMessage = `Your current ${getPlanDisplayName(
      effectivePlan
    ).toLowerCase()} plan is full. Upgrade the plan or cancel an offer before creating another one.`;
  }

  const publishOfferMessage = !hasAllowedAssociationStatus
    ? BILLING_STATUS_MESSAGE_BY_ASSOCIATION[associationStatus] ||
      'Your billing account is not eligible. Update billing before publishing offers.'
    : activePlan
    ? ''
    : planStatus === 'EXPIRED'
    ? 'Your billing plan has ended. Renew or assign a new plan before submitting or reactivating offers.'
    : 'An active billing plan is required before offers can be submitted, approved, or go live.';

  return {
    billingProfile,
    associationStatus: associationStatus || null,
    hasAllowedAssociationStatus,
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
