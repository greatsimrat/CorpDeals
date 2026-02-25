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

    const [vendors, charges] = await Promise.all([
      prisma.vendor.findMany({
        where: vendorWhere,
        include: { billing: true },
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
        const summary = byVendor.get(vendor.id) || {
          leadCount: 0,
          chargeableLeadCount: 0,
          waivedLeadCount: 0,
          amountCents: 0,
          currency: vendor.billing?.currency || 'USD',
        };

        const trialActive =
          vendor.billing?.billingMode === 'TRIAL' &&
          !!vendor.billing.trialEndsAt &&
          vendor.billing.trialEndsAt > now;

        return {
          vendorId: vendor.id,
          companyName: vendor.companyName,
          status: vendor.status,
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
