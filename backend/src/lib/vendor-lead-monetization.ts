import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type LeadMonetizationInput = {
  leadId: string;
  vendorId: string;
  offerId: string;
  userId?: string | null;
  companyId: string;
  categoryId: string;
  subcategoryId?: string | null;
  leadType?: 'FORM_SUBMISSION' | 'PURCHASE';
};

export type LeadMonetizationResult = {
  visibilityStatus: 'VISIBLE' | 'LOCKED';
  lockedReason: 'PLAN_LIMIT' | 'NO_BALANCE' | null;
  priceApplied: number;
  pricingSource: 'INCLUDED' | 'CATEGORY' | 'SUBCATEGORY';
  deductedFromIncludedLeads: number;
  deductedFromWallet: number;
  includedLeadsTotal: number;
  includedLeadsUsed: number;
  walletBalance: number;
  canSharePII: boolean;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMoney = (value: number) => Math.round(value * 100) / 100;

const resolveBillingCycleWindow = (now: Date) => {
  const start = new Date(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 30);
  return { start, end };
};

const resolveActivePlan = async (tx: TxClient, vendorId: string, now: Date) =>
  (tx as any).vendorBillingPlan.findFirst({
    where: {
      vendorId,
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ startsAt: 'desc' }, { updatedAt: 'desc' }],
  });

const resolveCategoryPricing = async (
  tx: TxClient,
  input: { categoryId: string; subcategoryId?: string | null }
) => {
  if (input.subcategoryId) {
    const subcategoryPricing = await (tx as any).categoryLeadPricing.findFirst({
      where: {
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (subcategoryPricing) {
      return {
        priceApplied: toMoney(toNumber(subcategoryPricing.leadPrice)),
        pricingSource: 'SUBCATEGORY' as const,
      };
    }
  }

  const categoryPricing = await (tx as any).categoryLeadPricing.findFirst({
    where: {
      categoryId: input.categoryId,
      subcategoryId: null,
      isActive: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (categoryPricing) {
    return {
      priceApplied: toMoney(toNumber(categoryPricing.leadPrice)),
      pricingSource: 'CATEGORY' as const,
    };
  }

  return null;
};

const upsertLegacyLeadCharge = async (
  tx: TxClient,
  input: {
    leadId: string;
    vendorId: string;
    priceApplied: number;
    visible: boolean;
    deductedFromIncludedLeads: number;
  }
) => {
  const amountCents = Math.max(0, Math.round(input.priceApplied * 100));
  const status = input.visible && input.deductedFromIncludedLeads === 0 ? 'PENDING' : 'WAIVED';
  const reason =
    input.visible && input.deductedFromIncludedLeads === 0
      ? undefined
      : input.deductedFromIncludedLeads > 0
      ? 'FREE'
      : 'INVALID';

  await (tx as any).leadCharge.upsert({
    where: { leadId: input.leadId },
    update: {
      amountCents,
      status,
      reason,
    },
    create: {
      leadId: input.leadId,
      vendorId: input.vendorId,
      amountCents,
      status,
      reason,
    },
  });
};

const upsertLegacyLeadBillingEvent = async (
  tx: TxClient,
  input: { leadId: string; vendorId: string; visible: boolean }
) => {
  await (tx as any).leadBillingEvent.upsert({
    where: { leadId: input.leadId },
    update: {
      billingStatus: input.visible ? 'PENDING' : 'VOID',
    },
    create: {
      leadId: input.leadId,
      vendorId: input.vendorId,
      billedAt: new Date(),
      billingStatus: input.visible ? 'PENDING' : 'VOID',
    },
  });
};

export const processVendorLeadMonetization = async (
  tx: TxClient,
  input: LeadMonetizationInput
): Promise<LeadMonetizationResult> => {
  const now = new Date();
  const activePlan = await resolveActivePlan(tx, input.vendorId, now);

  let billing = await (tx as any).vendorBilling.findUnique({
    where: { vendorId: input.vendorId },
  });

  if (!billing) {
    const cycle = resolveBillingCycleWindow(now);
    billing = await (tx as any).vendorBilling.create({
      data: {
        vendorId: input.vendorId,
        billingMode: 'FREE',
        postTrialMode: 'FREE',
        associationStatus: 'INACTIVE',
        statusReason: 'auto-created-on-lead',
        currency: 'CAD',
        currencyCode: 'CAD',
        billingCycleStartAt: cycle.start,
        billingCycleEndAt: cycle.end,
        includedLeadsTotal: 0,
        includedLeadsUsed: 0,
        walletBalance: '0.00',
        lastValidatedAt: now,
      },
    });
  }

  let includedLeadsTotal = Number(billing.includedLeadsTotal || 0);
  let includedLeadsUsed = Number(billing.includedLeadsUsed || 0);
  let walletBalance = toMoney(toNumber(billing.walletBalance));
  const overageEnabled = activePlan ? Boolean((activePlan as any).overageEnabled ?? true) : false;
  const planIncludedLeads = Number(
    (activePlan as any)?.includedLeadsPerCycle ??
      (activePlan as any)?.includedLeadsPerMonth ??
      0
  );
  const currencyCode = String(
    (billing as any).currencyCode || (billing as any).currency || (activePlan as any)?.currency || 'CAD'
  ).toUpperCase();

  const cycleStartAt = (billing as any).billingCycleStartAt ? new Date((billing as any).billingCycleStartAt) : null;
  const cycleEndAt = (billing as any).billingCycleEndAt ? new Date((billing as any).billingCycleEndAt) : null;
  const cycleExpired = !cycleStartAt || !cycleEndAt || cycleEndAt <= now;

  if (cycleExpired) {
    const nextCycle = resolveBillingCycleWindow(now);
    includedLeadsTotal = Math.max(0, planIncludedLeads);
    includedLeadsUsed = 0;
    billing = await (tx as any).vendorBilling.update({
      where: { vendorId: input.vendorId },
      data: {
        billingCycleStartAt: nextCycle.start,
        billingCycleEndAt: nextCycle.end,
        includedLeadsTotal,
        includedLeadsUsed,
        currencyCode,
        lastValidatedAt: now,
      },
    });
  } else if (includedLeadsTotal === 0 && planIncludedLeads > 0) {
    includedLeadsTotal = planIncludedLeads;
    billing = await (tx as any).vendorBilling.update({
      where: { vendorId: input.vendorId },
      data: {
        includedLeadsTotal,
        currencyCode,
        lastValidatedAt: now,
      },
    });
  }

  const pricingResolution = await resolveCategoryPricing(tx, {
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
  });

  const defaultLeadPrice = Math.max(0, toMoney(toNumber((billing as any).leadPriceCents) / 100));
  const priceApplied = Math.max(0, pricingResolution?.priceApplied ?? defaultLeadPrice);
  const fallbackPricingSource = pricingResolution?.pricingSource ?? ('CATEGORY' as const);

  const includedRemaining = Math.max(0, includedLeadsTotal - includedLeadsUsed);
  let visibilityStatus: 'VISIBLE' | 'LOCKED' = 'VISIBLE';
  let lockedReason: 'PLAN_LIMIT' | 'NO_BALANCE' | null = null;
  let pricingSource: 'INCLUDED' | 'CATEGORY' | 'SUBCATEGORY' = 'INCLUDED';
  let deductedFromIncludedLeads = 0;
  let deductedFromWallet = 0;

  if (includedRemaining > 0) {
    deductedFromIncludedLeads = 1;
    pricingSource = 'INCLUDED';
    includedLeadsUsed += 1;
  } else if (priceApplied <= 0) {
    pricingSource = fallbackPricingSource;
  } else if (walletBalance >= priceApplied) {
    deductedFromWallet = priceApplied;
    pricingSource = fallbackPricingSource;
    walletBalance = toMoney(walletBalance - priceApplied);
  } else {
    visibilityStatus = 'LOCKED';
    pricingSource = fallbackPricingSource;
    lockedReason = !overageEnabled ? 'PLAN_LIMIT' : 'NO_BALANCE';
  }

  await (tx as any).vendorBilling.update({
    where: { vendorId: input.vendorId },
    data: {
      includedLeadsUsed,
      walletBalance: toMoney(walletBalance).toFixed(2),
      currencyCode,
      lastValidatedAt: now,
    },
  });

  if (deductedFromWallet > 0) {
    await (tx as any).vendorWalletTransaction.create({
      data: {
        vendorId: input.vendorId,
        subscriptionId: (billing as any).id,
        type: 'LEAD_CHARGE',
        amount: deductedFromWallet.toFixed(2),
        balanceBefore: toMoney(walletBalance + deductedFromWallet).toFixed(2),
        balanceAfter: toMoney(walletBalance).toFixed(2),
        referenceType: 'LEAD_EVENT',
        referenceId: input.leadId,
      },
    });
  }

  await (tx as any).vendorLeadEvent.upsert({
    where: { leadId: input.leadId },
    update: {
      leadType: input.leadType || 'FORM_SUBMISSION',
      priceApplied: priceApplied.toFixed(2),
      pricingSource,
      visibilityStatus,
      lockedReason,
      deductedFromIncludedLeads,
      deductedFromWallet: deductedFromWallet.toFixed(2),
      unlockedAt: visibilityStatus === 'VISIBLE' ? now : null,
      status: visibilityStatus === 'VISIBLE' ? 'DELIVERED' : 'BLOCKED',
    },
    create: {
      leadType: input.leadType || 'FORM_SUBMISSION',
      priceApplied: priceApplied.toFixed(2),
      pricingSource,
      visibilityStatus,
      lockedReason,
      deductedFromIncludedLeads,
      deductedFromWallet: deductedFromWallet.toFixed(2),
      unlockedAt: visibilityStatus === 'VISIBLE' ? now : null,
      status: visibilityStatus === 'VISIBLE' ? 'DELIVERED' : 'BLOCKED',
      lead: {
        connect: {
          id: input.leadId,
        },
      },
      vendor: {
        connect: {
          id: input.vendorId,
        },
      },
      offer: {
        connect: {
          id: input.offerId,
        },
      },
      company: {
        connect: {
          id: input.companyId,
        },
      },
      category: {
        connect: {
          id: input.categoryId,
        },
      },
      ...(input.userId
        ? {
            user: {
              connect: {
                id: input.userId,
              },
            },
          }
        : {}),
      ...(input.subcategoryId
        ? {
            subcategory: {
              connect: {
                id: input.subcategoryId,
              },
            },
          }
        : {}),
    },
  });

  await upsertLegacyLeadCharge(tx, {
    leadId: input.leadId,
    vendorId: input.vendorId,
    priceApplied,
    visible: visibilityStatus === 'VISIBLE',
    deductedFromIncludedLeads,
  });

  await upsertLegacyLeadBillingEvent(tx, {
    leadId: input.leadId,
    vendorId: input.vendorId,
    visible: visibilityStatus === 'VISIBLE',
  });

  return {
    visibilityStatus,
    lockedReason,
    priceApplied,
    pricingSource,
    deductedFromIncludedLeads,
    deductedFromWallet,
    includedLeadsTotal,
    includedLeadsUsed,
    walletBalance,
    canSharePII: visibilityStatus === 'VISIBLE',
  };
};

export const resolveOfferCategoryContext = (offer: {
  categoryId: string;
  category?: { id: string; parentId?: string | null } | null;
}) => {
  if (offer.category?.parentId) {
    return {
      categoryId: offer.category.parentId,
      subcategoryId: offer.category.id,
    };
  }
  return {
    categoryId: offer.categoryId,
    subcategoryId: null,
  };
};
