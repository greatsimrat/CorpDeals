import prisma from './prisma';
import { buildCountedOfferWhere } from './offer-counting';

const FREE_PLAN_MONTHLY_FEE = 0;
const GOLD_PLAN_MONTHLY_FEE = 100;
const PREMIUM_PLAN_MIN_MONTHLY_FEE = 250;

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
  PREMIUM: 250,
  PAY_PER_LEAD: 25,
} as const;

type BillingPlanRecord = {
  id: string;
  vendorId: string;
  planConfigId?: string | null;
  planType: 'PAY_PER_LEAD' | 'SUBSCRIPTION';
  pricePerLead?: unknown;
  monthlyFee?: unknown;
  offerLimit?: number | null;
  maxActiveOffers?: number | null;
  includedLeadsPerMonth?: number | null;
  includedLeadsPerCycle?: number | null;
  overagePricePerLead?: unknown;
  billingCycleDay?: number | null;
  currency?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  planConfig?: {
    id: string;
    code: string;
    name: string;
    planType: 'PAY_PER_LEAD' | 'SUBSCRIPTION';
    pricePerLead?: unknown;
    monthlyFee?: unknown;
    includedLeadsPerCycle?: number | null;
    overagePricePerLead?: unknown;
    maxActiveOffers?: number | null;
    overageEnabled?: boolean;
    currencyCode?: string | null;
    isActive?: boolean;
  } | null;
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
  if (plan.planConfig?.name?.trim()) return plan.planConfig.name.trim();

  const resolvedPlanType = plan.planConfig?.planType || plan.planType;
  const resolvedMonthlyFee = toNumber(plan.planConfig?.monthlyFee) ?? toNumber(plan.monthlyFee) ?? 0;
  if (resolvedPlanType === 'PAY_PER_LEAD') return 'Pay per lead';

  if (resolvedMonthlyFee <= FREE_PLAN_MONTHLY_FEE) return 'Free';
  if (resolvedMonthlyFee >= PREMIUM_PLAN_MIN_MONTHLY_FEE) return 'Premium';
  if (resolvedMonthlyFee >= GOLD_PLAN_MONTHLY_FEE) return 'Gold';
  return 'Gold';
};

export const getPlanOfferLimit = (plan: BillingPlanRecord | null | undefined) => {
  if (!plan) return null;
  const configuredLimit =
    (typeof plan.planConfig?.maxActiveOffers === 'number' ? plan.planConfig.maxActiveOffers : null) ??
    (typeof plan.maxActiveOffers === 'number' ? plan.maxActiveOffers : null) ??
    (typeof plan.offerLimit === 'number' ? plan.offerLimit : null);
  if (configuredLimit === null && (plan.planConfig?.maxActiveOffers === null || plan.offerLimit === null)) {
    return null;
  }
  if (configuredLimit !== null && Number.isInteger(configuredLimit) && configuredLimit >= 0) {
    return configuredLimit;
  }
  const resolvedPlanType = plan.planConfig?.planType || plan.planType;
  if (resolvedPlanType === 'PAY_PER_LEAD') return DEFAULT_PLAN_OFFER_LIMITS.PAY_PER_LEAD;

  const monthlyFee = toNumber(plan.planConfig?.monthlyFee) ?? toNumber(plan.monthlyFee) ?? 0;
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
      include: {
        planConfig: true,
      },
    }),
    (prisma as any).vendorBillingPlan.findFirst({
      where: { vendorId },
      include: {
        planConfig: true,
      },
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { updatedAt: 'desc' }],
    }),
    (prisma as any).vendorBillingPlan.findFirst({
      where: {
        vendorId,
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      include: {
        planConfig: true,
      },
      orderBy: [{ startsAt: 'desc' }, { updatedAt: 'desc' }],
    }),
    prisma.offer.count({
      where: buildCountedOfferWhere({
        vendorId,
        excludeOfferId: options?.excludeOfferId || null,
      }) as any,
    }),
    prisma.offer.count({
      where: buildCountedOfferWhere({
        vendorId,
        excludeOfferId: options?.excludeOfferId || null,
      }) as any,
    }),
  ]);

  const effectivePlan = (activePlan || latestPlan) as BillingPlanRecord | null;
  const fallbackPlanFromBillingProfile = billingProfile?.planConfig
    ? ({
        id: String((billingProfile as any).planConfig.id),
        vendorId,
        planType: String((billingProfile as any).planConfig.planType) as 'PAY_PER_LEAD' | 'SUBSCRIPTION',
        planConfig: (billingProfile as any).planConfig,
      } as BillingPlanRecord)
    : null;
  const resolvedPlan = effectivePlan || fallbackPlanFromBillingProfile;
  const associationStatus = String((billingProfile as any)?.associationStatus || '').toUpperCase();
  const hasAllowedAssociationStatus =
    ALLOWED_VENDOR_BILLING_ASSOCIATION_STATUSES.includes(
      associationStatus as AllowedVendorBillingAssociationStatus
    );
  const offerLimit = getPlanOfferLimit(resolvedPlan);
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
    planDisplayName: getPlanDisplayName(resolvedPlan),
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
