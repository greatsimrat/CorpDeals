import { Router, Request, Response } from 'express';
import { LeadChargeStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdminOrFinance } from '../middleware/auth';

const router = Router();

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

router.use(authenticateToken, requireAdminOrFinance);

const parseDate = (value: string | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
};

const getMonthRange = (monthValue?: string) => {
  const now = new Date();
  const [yearStr, monthStr] = (monthValue || '').split('-');
  const year = yearStr ? Number(yearStr) : now.getFullYear();
  const month = monthStr ? Number(monthStr) : now.getMonth() + 1;
  const safeYear = Number.isFinite(year) ? year : now.getFullYear();
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const start = new Date(Date.UTC(safeYear, safeMonth - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(safeYear, safeMonth, 0, 23, 59, 59, 999));
  return { start, end, month: `${safeYear}-${String(safeMonth).padStart(2, '0')}` };
};

const decimalToNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toCents = (value: unknown): number => Math.round(decimalToNumber(value) * 100);

const SUBSCRIPTION_PRESETS = {
  FREE: {
    monthlyFee: 0,
    includedLeadsPerMonth: 10,
    overagePricePerLead: 5,
    currency: 'USD',
  },
  GROWTH: {
    monthlyFee: 100,
    includedLeadsPerMonth: 50,
    overagePricePerLead: 3,
    currency: 'USD',
  },
  PRO: {
    monthlyFee: 500,
    includedLeadsPerMonth: 300,
    overagePricePerLead: 2,
    currency: 'USD',
  },
} as const;

type SubscriptionPresetKey = keyof typeof SUBSCRIPTION_PRESETS;

const resolveSubscriptionPresetKey = (value: unknown): SubscriptionPresetKey | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return null;
  if (Object.prototype.hasOwnProperty.call(SUBSCRIPTION_PRESETS, normalized)) {
    return normalized as SubscriptionPresetKey;
  }
  return null;
};

const getSubscriptionPresetByMonthlyFee = (monthlyFee: number | null): SubscriptionPresetKey | null => {
  if (monthlyFee === null) return null;
  const entries = Object.entries(SUBSCRIPTION_PRESETS) as Array<
    [SubscriptionPresetKey, (typeof SUBSCRIPTION_PRESETS)[SubscriptionPresetKey]]
  >;
  for (const [key, preset] of entries) {
    if (preset.monthlyFee === monthlyFee) return key;
  }
  return null;
};

const toActivePlanSummary = (plan: any) => {
  if (!plan) return null;
  return {
    id: plan.id,
    planType: plan.planType,
    pricePerLead: plan.pricePerLead,
    monthlyFee: plan.monthlyFee,
    includedLeadsPerMonth: plan.includedLeadsPerMonth,
    overagePricePerLead: plan.overagePricePerLead,
    billingCycleDay: plan.billingCycleDay,
    currency: plan.currency,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
};

// Finance dashboard summary per vendor
router.get('/vendors/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const start = firstString(req.query.start);
    const end = firstString(req.query.end);
    const vendorId = firstString(req.query.vendorId);
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rangeStart = parseDate(start, defaultStart);
    const rangeEnd = parseDate(end, now);

    const vendorWhere: any = {};
    if (vendorId) vendorWhere.id = vendorId;

    const [vendorsRaw, charges] = await Promise.all([
      prisma.vendor.findMany({
        where: vendorWhere,
        include: {
          billing: true,
          billingPlans: {
            where: {
              isActive: true,
              startsAt: { lte: now },
              OR: [{ endsAt: null }, { endsAt: { gte: now } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        } as any,
        orderBy: { companyName: 'asc' },
      }),
      prisma.leadCharge.findMany({
        where: {
          ...(vendorId ? { vendorId: vendorId as string } : {}),
          chargeableAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { vendorId: true, amountCents: true, status: true, currency: true },
      }),
    ]);
    const vendors = vendorsRaw as any[];

    const byVendor = new Map<string, { leadCount: number; chargeableLeadCount: number; waivedLeadCount: number; amountCents: number; currency: string }>();
    for (const charge of charges) {
      const existing = byVendor.get(charge.vendorId) || {
        leadCount: 0,
        chargeableLeadCount: 0,
        waivedLeadCount: 0,
        amountCents: 0,
        currency: charge.currency,
      };

      existing.leadCount += 1;
      if (charge.status === 'WAIVED') {
        existing.waivedLeadCount += 1;
      } else {
        existing.chargeableLeadCount += 1;
        existing.amountCents += charge.amountCents;
      }
      byVendor.set(charge.vendorId, existing);
    }

    const totals = { leadCount: 0, chargeableLeadCount: 0, waivedLeadCount: 0, amountCents: 0 };
    for (const summary of byVendor.values()) {
      totals.leadCount += summary.leadCount;
      totals.chargeableLeadCount += summary.chargeableLeadCount;
      totals.waivedLeadCount += summary.waivedLeadCount;
      totals.amountCents += summary.amountCents;
    }

    res.json({
      range: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
      totals,
      vendors: vendors.map((vendor) => {
        const activePlan = (vendor as any).billingPlans?.[0] || null;
        const summary = byVendor.get(vendor.id) || {
          leadCount: 0,
          chargeableLeadCount: 0,
          waivedLeadCount: 0,
          amountCents: 0,
          currency: activePlan?.currency || vendor.billing?.currency || 'USD',
        };

        const trialActive =
          vendor.billing?.billingMode === 'TRIAL' &&
          !!vendor.billing.trialEndsAt &&
          vendor.billing.trialEndsAt > now;

        return {
          vendorId: vendor.id,
          companyName: vendor.companyName,
          status: vendor.status,
          billingPlan: toActivePlanSummary(activePlan),
          billing: vendor.billing
            ? {
                billingMode: vendor.billing.billingMode,
                postTrialMode: vendor.billing.postTrialMode,
                trialEndsAt: vendor.billing.trialEndsAt,
                leadPriceCents: vendor.billing.leadPriceCents,
                monthlyFeeCents: vendor.billing.monthlyFeeCents,
                paymentMethod: vendor.billing.paymentMethod,
                currency: vendor.billing.currency,
                billingDay: vendor.billing.billingDay,
                trialActive,
              }
            : null,
          leadCount: summary.leadCount,
          chargeableLeadCount: summary.chargeableLeadCount,
          waivedLeadCount: summary.waivedLeadCount,
          amountCents: summary.amountCents,
          currency: summary.currency,
        };
      }),
    });
  } catch (error) {
    console.error('Finance summary error:', error);
    res.status(500).json({ error: 'Failed to load finance summary' });
  }
});

// Monthly invoices (computed)
router.get('/invoices', async (req: Request, res: Response): Promise<void> => {
  try {
    const month = firstString(req.query.month);
    const { start, end, month: monthKey } = getMonthRange(month);

    const vendors = await prisma.vendor.findMany({
      include: { billing: true },
      orderBy: { companyName: 'asc' },
    });

    const charges = await prisma.leadCharge.findMany({
      where: {
        chargeableAt: { gte: start, lte: end },
        status: { in: ['PENDING', 'BILLED'] },
      },
      select: { vendorId: true, amountCents: true, currency: true },
    });

    const chargesByVendor = new Map<string, { amountCents: number; currency: string }>();
    for (const charge of charges) {
      const existing = chargesByVendor.get(charge.vendorId) || {
        amountCents: 0,
        currency: charge.currency,
      };
      existing.amountCents += charge.amountCents;
      chargesByVendor.set(charge.vendorId, existing);
    }

    const invoices = vendors
      .map((vendor) => {
        const billing = vendor.billing;
        if (!billing) return null;

        const currency = billing.currency || 'USD';
        const baseFee =
          billing.billingMode === 'MONTHLY' || billing.billingMode === 'HYBRID'
            ? billing.monthlyFeeCents
            : 0;
        const leadCharges =
          billing.billingMode === 'PAY_PER_LEAD' || billing.billingMode === 'HYBRID'
            ? chargesByVendor.get(vendor.id)?.amountCents || 0
            : 0;

        const total = baseFee + leadCharges;
        if (total <= 0) return null;

        const invoiceId = `INV-${monthKey}-${vendor.id.slice(0, 6).toUpperCase()}`;
        return {
          invoiceId,
          vendorId: vendor.id,
          companyName: vendor.companyName,
          currency,
          paymentMethod: billing.paymentMethod,
          status: 'DRAFT',
          period: { start: start.toISOString(), end: end.toISOString() },
          lineItems: [
            ...(baseFee > 0 ? [{ label: 'Monthly platform fee', amountCents: baseFee }] : []),
            ...(leadCharges > 0 ? [{ label: 'Lead charges', amountCents: leadCharges }] : []),
          ],
          totalCents: total,
        };
      })
      .filter(Boolean);

    const totals = invoices.reduce(
      (acc: { count: number; amountCents: number }, invoice: any) => {
        acc.count += 1;
        acc.amountCents += invoice.totalCents;
        return acc;
      },
      { count: 0, amountCents: 0 }
    );

    res.json({
      month: monthKey,
      totals,
      invoices,
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

// List lead charges for a vendor
router.get('/vendors/:id/charges', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = firstString(req.params.id);
    if (!vendorId) {
      res.status(400).json({ error: 'Invalid vendor id' });
      return;
    }

    const start = firstString(req.query.start);
    const end = firstString(req.query.end);
    const status = firstString(req.query.status);
    const statusFilter =
      status && ['PENDING', 'BILLED', 'WAIVED', 'REFUNDED'].includes(status)
        ? (status as LeadChargeStatus)
        : undefined;
    if (status && !statusFilter) {
      res.status(400).json({ error: 'Invalid charge status' });
      return;
    }
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rangeStart = parseDate(start, defaultStart);
    const rangeEnd = parseDate(end, now);

    const charges = await prisma.leadCharge.findMany({
      where: {
        vendorId,
        ...(statusFilter ? { status: statusFilter } : {}),
        chargeableAt: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        lead: {
          select: {
            id: true,
            createdAt: true,
            email: true,
            offer: { select: { id: true, title: true } },
            company: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { chargeableAt: 'desc' },
    });

    res.json({
      range: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
      charges,
    });
  } catch (error) {
    console.error('Vendor charges error:', error);
    res.status(500).json({ error: 'Failed to load vendor charges' });
  }
});

// Update vendor billing settings
router.patch('/vendors/:id/billing', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = firstString(req.params.id);
    if (!vendorId) {
      res.status(400).json({ error: 'Invalid vendor id' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const {
      planType,
      pricePerLead,
      monthlyFee,
      includedLeadsPerMonth,
      overagePricePerLead,
      billingCycleDay,
      billingMode,
      postTrialMode,
      trialEndsAt,
      leadPriceCents,
      monthlyFeeCents,
      currency,
      billingDay,
      paymentMethod,
      stripeCustomerId,
      stripeSubscriptionId,
    } = req.body;
    const subscriptionTier = req.body?.subscriptionTier ?? req.body?.subscription_tier;

    const normalizedPlanType = typeof planType === 'string' ? planType.trim().toUpperCase() : undefined;
    if (normalizedPlanType) {
      if (!['PAY_PER_LEAD', 'SUBSCRIPTION'].includes(normalizedPlanType)) {
        res.status(400).json({ error: 'Invalid planType. Use PAY_PER_LEAD or SUBSCRIPTION' });
        return;
      }

      let parsedPricePerLead =
        pricePerLead === undefined || pricePerLead === null || pricePerLead === ''
          ? null
          : Number(pricePerLead);
      const requestedMonthlyFee =
        monthlyFee === undefined || monthlyFee === null || monthlyFee === ''
          ? null
          : Number(monthlyFee);
      let parsedMonthlyFee = requestedMonthlyFee;
      let parsedIncludedLeadsPerMonth =
        includedLeadsPerMonth === undefined ||
        includedLeadsPerMonth === null ||
        includedLeadsPerMonth === ''
          ? null
          : Number(includedLeadsPerMonth);
      let parsedOveragePricePerLead =
        overagePricePerLead === undefined || overagePricePerLead === null || overagePricePerLead === ''
          ? null
          : Number(overagePricePerLead);
      const parsedBillingCycleDay =
        billingCycleDay === undefined || billingCycleDay === null || billingCycleDay === ''
          ? 1
          : Number(billingCycleDay);
      let normalizedCurrency = String(currency || 'CAD').trim().toUpperCase() || 'CAD';

      if (parsedPricePerLead !== null && (!Number.isFinite(parsedPricePerLead) || parsedPricePerLead < 0)) {
        res.status(400).json({ error: 'pricePerLead must be a non-negative number' });
        return;
      }
      if (!Number.isInteger(parsedBillingCycleDay) || parsedBillingCycleDay < 1 || parsedBillingCycleDay > 28) {
        res.status(400).json({ error: 'billingCycleDay must be an integer between 1 and 28' });
        return;
      }
      if (normalizedPlanType === 'PAY_PER_LEAD' && parsedPricePerLead === null) {
        res.status(400).json({ error: 'pricePerLead is required for PAY_PER_LEAD plans' });
        return;
      }

      if (normalizedPlanType === 'SUBSCRIPTION') {
        const resolvedTier =
          resolveSubscriptionPresetKey(subscriptionTier) ||
          getSubscriptionPresetByMonthlyFee(requestedMonthlyFee);
        if (!resolvedTier) {
          res.status(400).json({
            error: 'subscriptionTier must be FREE, GROWTH, or PRO (or monthlyFee must match 0, 100, or 500)',
          });
          return;
        }

        const preset = SUBSCRIPTION_PRESETS[resolvedTier];
        parsedPricePerLead = null;
        parsedMonthlyFee = preset.monthlyFee;
        parsedIncludedLeadsPerMonth = preset.includedLeadsPerMonth;
        parsedOveragePricePerLead = preset.overagePricePerLead;
        normalizedCurrency = preset.currency;
      } else {
        if (parsedMonthlyFee !== null && (!Number.isFinite(parsedMonthlyFee) || parsedMonthlyFee < 0)) {
          res.status(400).json({ error: 'monthlyFee must be a non-negative number' });
          return;
        }
        if (
          parsedIncludedLeadsPerMonth !== null &&
          (!Number.isInteger(parsedIncludedLeadsPerMonth) || parsedIncludedLeadsPerMonth < 0)
        ) {
          res.status(400).json({ error: 'includedLeadsPerMonth must be a non-negative integer' });
          return;
        }
        if (
          parsedOveragePricePerLead !== null &&
          (!Number.isFinite(parsedOveragePricePerLead) || parsedOveragePricePerLead < 0)
        ) {
          res.status(400).json({ error: 'overagePricePerLead must be a non-negative number' });
          return;
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        await (tx as any).vendorBillingPlan.updateMany({
          where: { vendorId, isActive: true },
          data: { isActive: false },
        });

        const activePlan = await (tx as any).vendorBillingPlan.create({
          data: {
            vendorId,
            planType: normalizedPlanType,
            pricePerLead: parsedPricePerLead,
            monthlyFee: parsedMonthlyFee,
            includedLeadsPerMonth: parsedIncludedLeadsPerMonth,
            overagePricePerLead: parsedOveragePricePerLead,
            billingCycleDay: parsedBillingCycleDay,
            currency: normalizedCurrency,
            isActive: true,
          },
        });

        // Keep legacy billing in sync for old screens/routes.
        const legacyBilling = await tx.vendorBilling.upsert({
          where: { vendorId },
          update: {
            billingMode: normalizedPlanType === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
            leadPriceCents: parsedPricePerLead !== null ? toCents(parsedPricePerLead) : 0,
            monthlyFeeCents: parsedMonthlyFee !== null ? toCents(parsedMonthlyFee) : 0,
            currency: normalizedCurrency,
            billingDay: parsedBillingCycleDay,
          },
          create: {
            vendorId,
            billingMode: normalizedPlanType === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
            postTrialMode: normalizedPlanType === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
            trialEndsAt: null,
            leadPriceCents: parsedPricePerLead !== null ? toCents(parsedPricePerLead) : 0,
            monthlyFeeCents: parsedMonthlyFee !== null ? toCents(parsedMonthlyFee) : 0,
            paymentMethod: 'MANUAL',
            currency: normalizedCurrency,
            billingDay: parsedBillingCycleDay,
          },
        });

        return { activePlan, legacyBilling };
      });

      res.json(result);
      return;
    }

    const allowedModes = ['TRIAL', 'FREE', 'PAY_PER_LEAD', 'MONTHLY', 'HYBRID'];
    if (billingMode && !allowedModes.includes(billingMode)) {
      res.status(400).json({ error: 'Invalid billingMode' });
      return;
    }
    if (postTrialMode && !allowedModes.includes(postTrialMode)) {
      res.status(400).json({ error: 'Invalid postTrialMode' });
      return;
    }
    if (paymentMethod && !['MANUAL', 'STRIPE'].includes(paymentMethod)) {
      res.status(400).json({ error: 'Invalid paymentMethod' });
      return;
    }
    if (leadPriceCents !== undefined && (!Number.isFinite(leadPriceCents) || leadPriceCents < 0)) {
      res.status(400).json({ error: 'leadPriceCents must be a non-negative number' });
      return;
    }
    if (monthlyFeeCents !== undefined && (!Number.isFinite(monthlyFeeCents) || monthlyFeeCents < 0)) {
      res.status(400).json({ error: 'monthlyFeeCents must be a non-negative number' });
      return;
    }
    if (billingDay !== undefined && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28)) {
      res.status(400).json({ error: 'billingDay must be an integer between 1 and 28' });
      return;
    }

    const data: any = {};
    if (billingMode) data.billingMode = billingMode;
    if (postTrialMode !== undefined) data.postTrialMode = postTrialMode;
    if (trialEndsAt !== undefined) {
      data.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    }
    if (leadPriceCents !== undefined) data.leadPriceCents = leadPriceCents;
    if (monthlyFeeCents !== undefined) data.monthlyFeeCents = monthlyFeeCents;
    if (currency !== undefined) data.currency = currency;
    if (billingDay !== undefined) data.billingDay = billingDay;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (stripeCustomerId !== undefined) data.stripeCustomerId = stripeCustomerId;
    if (stripeSubscriptionId !== undefined) data.stripeSubscriptionId = stripeSubscriptionId;

    const trialDays = Number(process.env.VENDOR_TRIAL_DAYS || 30);
    const defaultTrialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.vendorBilling.upsert({
      where: { vendorId },
      update: data,
      create: {
        vendorId,
        billingMode: data.billingMode || 'TRIAL',
        postTrialMode: data.postTrialMode || 'PAY_PER_LEAD',
        trialEndsAt: data.trialEndsAt ?? defaultTrialEndsAt,
        leadPriceCents: data.leadPriceCents ?? 0,
        monthlyFeeCents: data.monthlyFeeCents ?? 0,
        paymentMethod: data.paymentMethod || 'MANUAL',
        stripeCustomerId: data.stripeCustomerId || null,
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        currency: data.currency || 'USD',
        billingDay: data.billingDay ?? 1,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update vendor billing error:', error);
    res.status(500).json({ error: 'Failed to update vendor billing' });
  }
});

export default router;
