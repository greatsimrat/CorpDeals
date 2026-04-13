import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  sendOfferReviewDecisionEmail,
  sendVendorApprovalEmail,
  sendVendorRejectionEmail,
} from '../lib/mailer';
import { createVendorSetPasswordToken } from '../lib/vendor-password';
import { isAppRole, normalizeRole } from '../lib/roles';
import {
  canApplyAdminBillingOverride,
  getVendorBillingAccess,
  toBillingAccessDeniedResponse,
} from '../lib/vendor-billing-access';
import { enforceLiveOfferBillingEligibility } from '../lib/vendor-offer-enforcement';
import { ensureBillingPlanConfig } from '../lib/billing-plan-config';
import { upsertGlobalRoleAssignment } from '../lib/rbac';
import { buildCountedOfferWhere } from '../lib/offer-counting';
import {
  BILLING_GST_RATE,
  calculateBillingPreviewTotals,
  resolveLeadUsageForCycle,
} from '../lib/billing-preview';
import {
  applyVendorSubscriptionPlan,
  resolveVendorSubscriptionPlanTier,
} from '../lib/vendor-subscription-plan';

const router = Router();

interface LeadSummaryRow {
  today: number;
  thisMonth: number;
  thisYear: number;
}

interface LeadBucketRow {
  bucket: string;
  count: number;
}

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

const normalizeOptionalQueryValue = (value: unknown): string | undefined => {
  const raw = firstString(value);
  if (!raw) return undefined;
  const normalized = raw.trim();
  if (!normalized) return undefined;
  const lowered = normalized.toLowerCase();
  if (['undefined', 'null', 'all'].includes(lowered)) return undefined;
  return normalized;
};

const normalizeVendorStatus = (value: string) => value.trim().toUpperCase();
const normalizeRequestStatus = (value: string) => value.trim().toUpperCase();

const asNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const isTruthy = (value: unknown) =>
  value === true || value === 'true' || value === '1' || value === 1;

const toMoney = (value: number): string => value.toFixed(2);

const ADMIN_SUBSCRIPTION_PRESETS = {
  FREE: {
    monthlyFee: 0,
    includedLeadsPerMonth: 10,
    overagePricePerLead: 5,
    currency: 'CAD',
    offerLimit: 50,
    description: 'Starter plan for vendors testing CorpDeals.',
  },
  GOLD: {
    monthlyFee: 100,
    includedLeadsPerMonth: 20,
    overagePricePerLead: 3,
    currency: 'CAD',
    offerLimit: 100,
    description: 'Growth plan for vendors actively scaling deal coverage.',
  },
  PREMIUM: {
    monthlyFee: 250,
    includedLeadsPerMonth: 50,
    overagePricePerLead: 2,
    currency: 'CAD',
    offerLimit: 250,
    description: 'High-volume plan for vendors with broad active catalogs.',
  },
} as const;

type AdminSubscriptionPresetKey = keyof typeof ADMIN_SUBSCRIPTION_PRESETS;

const resolveAdminSubscriptionPresetKey = (value: unknown): AdminSubscriptionPresetKey | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'GROWTH') return 'GOLD';
  if (normalized === 'PRO') return 'PREMIUM';
  if (Object.prototype.hasOwnProperty.call(ADMIN_SUBSCRIPTION_PRESETS, normalized)) {
    return normalized as AdminSubscriptionPresetKey;
  }
  return null;
};

const getSubscriptionPresetByMonthlyFee = (monthlyFee: number | null): AdminSubscriptionPresetKey | null => {
  if (monthlyFee === null) return null;
  const entries = Object.entries(ADMIN_SUBSCRIPTION_PRESETS) as Array<
    [AdminSubscriptionPresetKey, (typeof ADMIN_SUBSCRIPTION_PRESETS)[AdminSubscriptionPresetKey]]
  >;
  for (const [key, preset] of entries) {
    if (preset.monthlyFee === monthlyFee) return key;
  }
  return null;
};

const parsePeriodMonth = (periodRaw: string | undefined) => {
  const value = String(periodRaw || '').trim();
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;

  const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0));
  return { year, month, periodStart, periodEnd, nextMonthStart, periodKey: value };
};

const normalizeInvoiceStatus = (value: unknown) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (['DRAFT', 'SENT', 'PAID', 'VOID'].includes(normalized)) return normalized;
  return null;
};

type AdminPlanCode = keyof typeof ADMIN_SUBSCRIPTION_PRESETS;

const ADMIN_PLAN_CODE_ORDER: AdminPlanCode[] = ['FREE', 'GOLD', 'PREMIUM'];

const getPlanDisplayDescription = (code: AdminPlanCode) => ADMIN_SUBSCRIPTION_PRESETS[code].description;

const normalizePlanCode = (value: unknown): AdminPlanCode | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'GROWTH') return 'GOLD';
  if (normalized === 'PRO') return 'PREMIUM';
  if (ADMIN_PLAN_CODE_ORDER.includes(normalized as AdminPlanCode)) {
    return normalized as AdminPlanCode;
  }
  return null;
};

type RequestPlanCode = 'FREE' | 'GOLD' | 'PREMIUM';
const REQUEST_PLAN_CODE_ORDER: RequestPlanCode[] = ['FREE', 'GOLD', 'PREMIUM'];

const normalizeRequestPlanCode = (value: unknown): RequestPlanCode | null => {
  const normalized = resolveVendorSubscriptionPlanTier(value);
  if (!normalized) return null;
  if (!REQUEST_PLAN_CODE_ORDER.includes(normalized as RequestPlanCode)) return null;
  return normalized as RequestPlanCode;
};

const ensureAdminDefaultPlans = async (tx: any) => {
  for (const code of ADMIN_PLAN_CODE_ORDER) {
    const preset = ADMIN_SUBSCRIPTION_PRESETS[code];
    await ensureBillingPlanConfig(tx, {
      code,
      name: code === 'FREE' ? 'Free' : code === 'GOLD' ? 'Gold' : 'Premium',
      description: preset.description,
      planType: 'SUBSCRIPTION',
      monthlyFee: preset.monthlyFee,
      includedLeadsPerCycle: preset.includedLeadsPerMonth,
      overagePricePerLead: preset.overagePricePerLead,
      maxActiveOffers: preset.offerLimit,
      overageEnabled: true,
      currencyCode: preset.currency,
      isSystemPreset: true,
    });
  }
};

const countActiveApprovedOffers = async () => {
  try {
    return await prisma.offer.count({
      where: buildCountedOfferWhere({}) as any,
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    const isCompatibilityIssue =
      message.includes('Unknown argument `offerState`') ||
      String(error?.code || '') === 'P2022';
    if (!isCompatibilityIssue) {
      throw error;
    }
    return prisma.offer.count({ where: { active: true } });
  }
};

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

router.get('/plans', async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureAdminDefaultPlans(prisma);

    const [planRows, activePlanCounts] = await Promise.all([
      (prisma as any).billingPlanConfig.findMany({
        where: {
          planType: 'SUBSCRIPTION',
          code: { in: ADMIN_PLAN_CODE_ORDER },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      (prisma as any).vendorBillingPlan.groupBy({
        by: ['planConfigId'],
        where: {
          isActive: true,
          planConfigId: { not: null },
        },
        _count: { planConfigId: true },
      }),
    ]);

    const vendorCountByPlanConfigId = new Map<string, number>();
    for (const row of activePlanCounts as Array<{ planConfigId: string; _count: { planConfigId: number } }>) {
      if (!row.planConfigId) continue;
      vendorCountByPlanConfigId.set(row.planConfigId, Number(row._count?.planConfigId || 0));
    }

    const rowsByCode = new Map<string, any>();
    for (const row of planRows as any[]) {
      rowsByCode.set(String(row.code || '').toUpperCase(), row);
    }

    const orderedPlans = ADMIN_PLAN_CODE_ORDER.map((code) => {
      const row = rowsByCode.get(code);
      const preset = ADMIN_SUBSCRIPTION_PRESETS[code];
      if (!row) {
        return {
          code,
          name: code === 'FREE' ? 'Free' : code === 'GOLD' ? 'Gold' : 'Premium',
          description: preset.description,
          monthlyPrice: preset.monthlyFee,
          maxActiveOffers: preset.offerLimit,
          includedFreeLeadsPerMonth: preset.includedLeadsPerMonth,
          status: 'ACTIVE',
          updatedAt: null,
          activeVendorCount: 0,
        };
      }
      return {
        id: row.id,
        code,
        name: row.name,
        description: row.description || getPlanDisplayDescription(code),
        monthlyPrice: asNumber(row.monthlyFee),
        maxActiveOffers:
          row.maxActiveOffers === null || row.maxActiveOffers === undefined
            ? null
            : Number(row.maxActiveOffers),
        includedFreeLeadsPerMonth:
          row.includedLeadsPerCycle === null || row.includedLeadsPerCycle === undefined
            ? 0
            : Number(row.includedLeadsPerCycle),
        status: row.isActive ? 'ACTIVE' : 'INACTIVE',
        updatedAt: row.updatedAt,
        activeVendorCount: vendorCountByPlanConfigId.get(String(row.id)) || 0,
      };
    });

    res.json(orderedPlans);
  } catch (error) {
    console.error('GET /api/admin/plans error:', error);
    res.status(500).json({ error: 'Failed to load plan configurations' });
  }
});

router.put('/plans/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const planCode = normalizePlanCode(req.params.code);
    if (!planCode) {
      res.status(400).json({ error: 'Plan code must be FREE, GOLD, or PREMIUM' });
      return;
    }

    const nameInput = String(req.body?.name || '').trim();
    const name = nameInput || (planCode === 'FREE' ? 'Free' : planCode === 'GOLD' ? 'Gold' : 'Premium');
    const descriptionInput = req.body?.description;
    const description =
      descriptionInput === undefined || descriptionInput === null
        ? getPlanDisplayDescription(planCode)
        : String(descriptionInput).trim();
    const monthlyPrice = Number(req.body?.monthlyPrice ?? req.body?.monthly_price);
    const maxActiveOffersRaw = req.body?.maxActiveOffers ?? req.body?.max_active_offers;
    const includedLeadsRaw =
      req.body?.includedFreeLeadsPerMonth ??
      req.body?.includedLeadsPerMonth ??
      req.body?.included_leads_per_month;
    const statusRaw = String(req.body?.status || '').trim().toUpperCase();
    const isActive = statusRaw ? statusRaw === 'ACTIVE' : true;

    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
      res.status(400).json({ error: 'monthlyPrice must be a non-negative number' });
      return;
    }
    const maxActiveOffers =
      maxActiveOffersRaw === null || maxActiveOffersRaw === undefined || String(maxActiveOffersRaw).trim() === ''
        ? null
        : Number(maxActiveOffersRaw);
    if (maxActiveOffers !== null && (!Number.isInteger(maxActiveOffers) || maxActiveOffers < 0)) {
      res.status(400).json({ error: 'maxActiveOffers must be a non-negative integer or null' });
      return;
    }
    const includedLeads = Number(includedLeadsRaw);
    if (!Number.isInteger(includedLeads) || includedLeads < 0) {
      res.status(400).json({ error: 'includedFreeLeadsPerMonth must be a non-negative integer' });
      return;
    }

    const saved = await prisma.$transaction(async (tx) => {
      const planConfig = await ensureBillingPlanConfig(tx, {
        code: planCode,
        name,
        description,
        planType: 'SUBSCRIPTION',
        monthlyFee: monthlyPrice,
        includedLeadsPerCycle: includedLeads,
        overagePricePerLead: ADMIN_SUBSCRIPTION_PRESETS[planCode].overagePricePerLead,
        maxActiveOffers,
        overageEnabled: true,
        currencyCode: 'CAD',
        isSystemPreset: true,
      });

      return (tx as any).billingPlanConfig.update({
        where: { id: planConfig.id },
        data: {
          name,
          description,
          monthlyFee: monthlyPrice.toFixed(2),
          includedLeadsPerCycle: includedLeads,
          maxActiveOffers,
          isActive,
        },
      });
    });

    res.json({
      id: saved.id,
      code: saved.code,
      name: saved.name,
      description: saved.description || getPlanDisplayDescription(planCode),
      monthlyPrice: asNumber(saved.monthlyFee),
      maxActiveOffers: saved.maxActiveOffers,
      includedFreeLeadsPerMonth: Number(saved.includedLeadsPerCycle || 0),
      status: saved.isActive ? 'ACTIVE' : 'INACTIVE',
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    console.error('PUT /api/admin/plans/:code error:', error);
    res.status(500).json({ error: 'Failed to update plan configuration' });
  }
});

router.get('/billing-preview', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = normalizeOptionalQueryValue(req.query.vendorId ?? req.query.vendor_id);
    const search = normalizeOptionalQueryValue(req.query.search);
    const now = new Date();
    const defaultCycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const defaultCycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

    const vendorWhere: any = {
      ...(vendorId ? { id: vendorId } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const vendors = await prisma.vendor.findMany({
      where: vendorWhere,
      include: {
        billing: {
          include: {
            planConfig: true,
          },
        } as any,
        billingPlans: {
          where: {
            isActive: true,
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
          include: {
            planConfig: true,
          },
          orderBy: [{ startsAt: 'desc' }, { updatedAt: 'desc' }],
          take: 1,
        } as any,
      } as any,
      orderBy: { companyName: 'asc' },
    });

    const vendorIds = vendors.map((vendor) => vendor.id);
    const activeOfferCountByVendorId = new Map<string, number>();

    if (vendorIds.length > 0) {
      try {
        const activeOfferRows = await prisma.offer.groupBy({
          by: ['vendorId'],
          where: {
            ...(buildCountedOfferWhere({}) as any),
            vendorId: { in: vendorIds },
          } as any,
          _count: { _all: true },
        });
        for (const row of activeOfferRows as Array<{ vendorId: string; _count: { _all: number } }>) {
          activeOfferCountByVendorId.set(row.vendorId, Number(row._count?._all || 0));
        }
      } catch {
        const fallbackRows = await prisma.offer.groupBy({
          by: ['vendorId'],
          where: {
            vendorId: { in: vendorIds },
            active: true,
          },
          _count: { _all: true },
        });
        for (const row of fallbackRows as Array<{ vendorId: string; _count: { _all: number } }>) {
          activeOfferCountByVendorId.set(row.vendorId, Number(row._count?._all || 0));
        }
      }
    }

    const pricingRows = await (prisma as any).categoryLeadPricing.findMany({
      where: { isActive: true },
      select: {
        categoryId: true,
        subcategoryId: true,
        leadPrice: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const subcategoryPricing = new Map<string, number>();
    const categoryPricing = new Map<string, number>();
    for (const row of pricingRows as Array<{ categoryId: string; subcategoryId: string | null; leadPrice: unknown }>) {
      const price = Math.max(0, asNumber(row.leadPrice));
      if (row.subcategoryId) {
        const key = `${row.categoryId}::${row.subcategoryId}`;
        if (!subcategoryPricing.has(key)) subcategoryPricing.set(key, price);
      } else if (!categoryPricing.has(row.categoryId)) {
        categoryPricing.set(row.categoryId, price);
      }
    }

    const vendorRows = [];
    for (const vendor of vendors as any[]) {
      const activePlan = (vendor.billingPlans || [])[0] || null;
      const planConfig = activePlan?.planConfig || vendor.billing?.planConfig || null;
      const monthlySubscriptionAmount = Math.max(
        0,
        asNumber(activePlan?.monthlyFee ?? planConfig?.monthlyFee ?? (vendor.billing?.monthlyFeeCents || 0) / 100)
      );
      const includedFreeLeads = Math.max(
        0,
        Number(
          activePlan?.includedLeadsPerCycle ??
            activePlan?.includedLeadsPerMonth ??
            planConfig?.includedLeadsPerCycle ??
            vendor.billing?.includedLeadsTotal ??
            0
        )
      );
      const planName =
        String(planConfig?.name || '').trim() ||
        (monthlySubscriptionAmount <= 0
          ? 'Free'
          : monthlySubscriptionAmount >= 250
          ? 'Premium'
          : monthlySubscriptionAmount >= 100
          ? 'Gold'
          : 'Subscription');
      const planCode =
        normalizePlanCode(planConfig?.code) ||
        (monthlySubscriptionAmount <= 0
          ? 'FREE'
          : monthlySubscriptionAmount >= 250
          ? 'PREMIUM'
          : 'GOLD');

      const cycleStart = vendor.billing?.billingCycleStartAt
        ? new Date(vendor.billing.billingCycleStartAt)
        : defaultCycleStart;
      const cycleEnd = vendor.billing?.billingCycleEndAt
        ? new Date(vendor.billing.billingCycleEndAt)
        : defaultCycleEnd;
      const validCycleStart = Number.isNaN(cycleStart.getTime()) ? defaultCycleStart : cycleStart;
      const validCycleEnd = Number.isNaN(cycleEnd.getTime()) ? defaultCycleEnd : cycleEnd;
      const lookbackStart = new Date(validCycleStart);
      lookbackStart.setDate(lookbackStart.getDate() - 30);

      const leads = await prisma.lead.findMany({
        where: {
          vendorId: vendor.id,
          createdAt: {
            gte: lookbackStart,
            lt: validCycleEnd,
          },
          offer: {
            active: true,
            offerState: 'APPROVED',
          } as any,
        },
        select: {
          id: true,
          createdAt: true,
          userId: true,
          email: true,
          offerId: true,
          offer: {
            select: {
              categoryId: true,
              category: {
                select: {
                  id: true,
                  parentId: true,
                },
              },
            },
          },
          vendorLeadEvent: {
            select: {
              priceApplied: true,
            },
          },
        } as any,
        orderBy: { createdAt: 'asc' },
      });

      const lastSeenByLeadKey = new Map<string, Date>();
      const uniqueBillableLeadPrices: number[] = [];

      for (const lead of leads as any[]) {
        const employeeKeySource = String(lead.userId || lead.email || '').trim().toLowerCase();
        if (!employeeKeySource) continue;
        const dedupeKey = `${lead.offerId}::${employeeKeySource}`;
        const createdAt = new Date(lead.createdAt);
        const previous = lastSeenByLeadKey.get(dedupeKey);
        if (previous) {
          const daysSinceLast = (createdAt.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000);
          if (daysSinceLast < 30) {
            continue;
          }
        }
        lastSeenByLeadKey.set(dedupeKey, createdAt);
        if (createdAt < validCycleStart) {
          continue;
        }

        const directEventPrice = asNumber(lead.vendorLeadEvent?.priceApplied);
        let resolvedPrice = directEventPrice;
        if (resolvedPrice <= 0) {
          const offerCategory = lead.offer?.category;
          const categoryId = offerCategory?.parentId || lead.offer?.categoryId;
          const subcategoryId = offerCategory?.parentId ? offerCategory.id : null;
          const subcategoryKey = subcategoryId ? `${categoryId}::${subcategoryId}` : '';
          resolvedPrice =
            (subcategoryKey ? subcategoryPricing.get(subcategoryKey) : undefined) ||
            (categoryId ? categoryPricing.get(categoryId) : undefined) ||
            0;
        }
        uniqueBillableLeadPrices.push(Math.max(0, resolvedPrice));
      }

      const uniqueValidLeadCount = uniqueBillableLeadPrices.length;
      const { freeLeadsUsed, paidLeadCount } = resolveLeadUsageForCycle({
        uniqueValidLeadCount,
        includedFreeLeads,
      });
      const paidLeadCharges = uniqueBillableLeadPrices
        .slice(freeLeadsUsed)
        .reduce((sum, value) => sum + value, 0);
      const billingTotals = calculateBillingPreviewTotals({
        monthlySubscriptionAmount,
        paidLeadCharges,
      });

      vendorRows.push({
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        vendorEmail: vendor.email,
        currentPlan: planName,
        currentPlanCode: planCode,
        monthlySubscriptionAmount: billingTotals.monthlySubscriptionAmount,
        activeOfferCount: activeOfferCountByVendorId.get(vendor.id) || 0,
        includedFreeLeads,
        freeLeadsUsed,
        paidLeadCount,
        paidLeadCharges: billingTotals.paidLeadCharges,
        gstPercent: BILLING_GST_RATE * 100,
        gstAmount: billingTotals.gstAmount,
        estimatedTotal: billingTotals.estimatedTotal,
        cycleStartAt: validCycleStart,
        cycleEndAt: validCycleEnd,
      });
    }

    const totals = vendorRows.reduce(
      (acc, row) => {
        acc.vendors += 1;
        acc.monthlySubscriptions += row.monthlySubscriptionAmount;
        acc.paidLeadCharges += row.paidLeadCharges;
        acc.gst += row.gstAmount;
        acc.estimatedTotal += row.estimatedTotal;
        acc.paidLeads += row.paidLeadCount;
        return acc;
      },
      {
        vendors: 0,
        monthlySubscriptions: 0,
        paidLeadCharges: 0,
        gst: 0,
        estimatedTotal: 0,
        paidLeads: 0,
      }
    );

    res.json({
      gstPercent: BILLING_GST_RATE * 100,
      rows: vendorRows,
      totals: {
        vendors: totals.vendors,
        paidLeads: totals.paidLeads,
        monthlySubscriptions: Math.round(totals.monthlySubscriptions * 100) / 100,
        paidLeadCharges: Math.round(totals.paidLeadCharges * 100) / 100,
        gst: Math.round(totals.gst * 100) / 100,
        estimatedTotal: Math.round(totals.estimatedTotal * 100) / 100,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/billing-preview error:', error);
    res.status(500).json({ error: 'Failed to load billing preview' });
  }
});

// Dashboard stats
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalVendors,
      pendingVendors,
      approvedVendors,
      totalCompanies,
      totalOffers,
      activeOffers,
      totalLeads,
      pendingRequests,
      pendingCompanyRequests,
      leadSummaryRows,
      dailyLeadRows,
      monthlyLeadRows,
      yearlyLeadRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: 'PENDING' } }),
      prisma.vendor.count({ where: { status: 'APPROVED' } }),
      prisma.company.count(),
      prisma.offer.count(),
      countActiveApprovedOffers(),
      prisma.lead.count(),
      prisma.vendorRequest.count({ where: { status: 'PENDING' } }),
      prisma.companyRequest.count({ where: { status: 'PENDING' } }),
      prisma.$queryRaw<LeadSummaryRow[]>`
        SELECT
          COUNT(*) FILTER (WHERE "created_at" >= DATE_TRUNC('day', NOW()))::int AS "today",
          COUNT(*) FILTER (WHERE "created_at" >= DATE_TRUNC('month', NOW()))::int AS "thisMonth",
          COUNT(*) FILTER (WHERE "created_at" >= DATE_TRUNC('year', NOW()))::int AS "thisYear"
        FROM "leads"
      `,
      prisma.$queryRaw<LeadBucketRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', "created_at"), 'YYYY-MM-DD') AS "bucket",
          COUNT(*)::int AS "count"
        FROM "leads"
        WHERE "created_at" >= DATE_TRUNC('day', NOW()) - INTERVAL '29 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<LeadBucketRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') AS "bucket",
          COUNT(*)::int AS "count"
        FROM "leads"
        WHERE "created_at" >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<LeadBucketRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('year', "created_at"), 'YYYY') AS "bucket",
          COUNT(*)::int AS "count"
        FROM "leads"
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const leadSummary = leadSummaryRows[0] || { today: 0, thisMonth: 0, thisYear: 0 };

    res.json({
      users: totalUsers,
      vendors: {
        total: totalVendors,
        pending: pendingVendors,
        approved: approvedVendors,
      },
      companies: totalCompanies,
      offers: {
        total: totalOffers,
        active: activeOffers,
      },
      leads: totalLeads,
      pendingCompanyRequests,
      leadSubmissions: {
        today: leadSummary.today,
        thisMonth: leadSummary.thisMonth,
        thisYear: leadSummary.thisYear,
        daily: dailyLeadRows,
        monthly: monthlyLeadRows,
        yearly: yearlyLeadRows,
      },
      pendingRequests,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get all vendor requests
router.get('/vendor-requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = firstString(req.query.status);

    const where: any = {};
    if (status && normalizeRequestStatus(status) !== 'ALL') where.status = normalizeRequestStatus(status);

    const requests = await (prisma as any).vendorRequest.findMany({
      where,
      include: {
        vendor: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        reviewedBy: {
          select: { id: true, email: true, name: true },
        },
        selectedPlanConfig: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            monthlyFee: true,
            maxActiveOffers: true,
            includedLeadsPerCycle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const payload = requests.map((request: any) => {
      const selectedPlanCode = normalizeRequestPlanCode(request.selectedPlanCode) || 'FREE';
      const selectedPlanConfig = request.selectedPlanConfig || null;
      return {
        ...request,
        selectedPlanCode,
        billingStatus: selectedPlanConfig?.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    });

    res.json(payload);
  } catch (error) {
    console.error('Get vendor requests error:', error);
    res.status(500).json({ error: 'Failed to get vendor requests' });
  }
});

// Get single vendor request
router.get('/vendor-requests/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid vendor request id' });
      return;
    }

    const request = await (prisma as any).vendorRequest.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        reviewedBy: {
          select: { id: true, email: true, name: true },
        },
        selectedPlanConfig: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            monthlyFee: true,
            maxActiveOffers: true,
            includedLeadsPerCycle: true,
          },
        },
      },
    });

    if (!request) {
      res.status(404).json({ error: 'Vendor request not found' });
      return;
    }

    res.json({
      ...request,
      selectedPlanCode: normalizeRequestPlanCode((request as any).selectedPlanCode) || 'FREE',
      billingStatus: (request as any).selectedPlanConfig?.isActive ? 'ACTIVE' : 'INACTIVE',
    });
  } catch (error) {
    console.error('Get vendor request error:', error);
    res.status(500).json({ error: 'Failed to get vendor request' });
  }
});

// Approve or reject vendor request
router.patch('/vendor-requests/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid vendor request id' });
      return;
    }

    const requestedStatus = normalizeRequestStatus(String(req.body?.status || ''));
    const reviewNotes = firstString(req.body?.reviewNotes) || firstString(req.body?.review_notes) || null;

    if (!['APPROVED', 'REJECTED'].includes(requestedStatus)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const request = await (prisma as any).vendorRequest.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        selectedPlanConfig: {
          select: {
            id: true,
            code: true,
            isActive: true,
          },
        },
      },
    });

    if (!request) {
      res.status(404).json({ error: 'Vendor request not found' });
      return;
    }
    if (request.status !== 'PENDING') {
      res.status(400).json({ error: 'Only pending requests can be reviewed' });
      return;
    }

    const selectedPlanCode = normalizeRequestPlanCode(request.selectedPlanCode);
    if (!selectedPlanCode && requestedStatus === 'APPROVED') {
      res.status(400).json({ error: 'Request has invalid selected plan' });
      return;
    }

    if (requestedStatus === 'APPROVED') {
      const selectedPlanConfigId = String((request as any).selectedPlanConfigId || '').trim();
      const activeSelectedPlan = await (prisma as any).billingPlanConfig.findFirst({
        where: {
          id: selectedPlanConfigId,
          code: selectedPlanCode,
          planType: 'SUBSCRIPTION',
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          isActive: true,
        },
      });
      if (!activeSelectedPlan) {
        res.status(409).json({
          error: `${selectedPlanCode} plan is inactive or missing and cannot be assigned`,
          code: 'VENDOR_REQUEST_PLAN_INACTIVE',
        });
        return;
      }
    }

    // Update request and vendor status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await (tx as any).vendorRequest.update({
        where: { id },
        data: {
          status: requestedStatus as any,
          reviewNotes,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
        include: {
          selectedPlanConfig: {
            select: {
              id: true,
              code: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      const updatedVendor = await tx.vendor.update({
        where: { id: request.vendorId },
        data: {
          status: requestedStatus as 'APPROVED' | 'REJECTED',
        },
      });

      if (requestedStatus === 'APPROVED') {
        const approvedPlanCode = selectedPlanCode as RequestPlanCode;
        await applyVendorSubscriptionPlan(tx, {
          vendorId: request.vendorId,
          planTier: approvedPlanCode,
          statusReason: 'vendor-request-approved',
          associationStatus: approvedPlanCode === 'FREE' ? 'FREE' : 'ACTIVE',
        });
      }

      return { request: updatedRequest, vendor: updatedVendor };
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendBaseUrl}/vendor/login`;

    if (requestedStatus === 'APPROVED') {
      const token = createVendorSetPasswordToken({
        userId: request.vendor.user.id,
        email: request.vendor.user.email,
        vendorId: request.vendor.id,
      });
      const setPasswordUrl = `${frontendBaseUrl}/vendor/set-password?token=${encodeURIComponent(token)}`;
      const approvalEmail = await sendVendorApprovalEmail({
        to: request.vendor.email,
        businessName: request.vendor.companyName,
        loginUrl,
        setPasswordUrl,
      });
      if (!approvalEmail.sent) {
        console.error('Vendor request approval email failed:', {
          vendorId: request.vendor.id,
          requestId: request.id,
          error: approvalEmail.error,
        });
      }
    } else {
      const rejectionEmail = await sendVendorRejectionEmail({
        to: request.vendor.email,
        businessName: request.vendor.companyName,
      });
      if (!rejectionEmail.sent) {
        console.error('Vendor request rejection email failed:', {
          vendorId: request.vendor.id,
          requestId: request.id,
          error: rejectionEmail.error,
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Update vendor request error:', error);
    res.status(500).json({ error: 'Failed to update vendor request' });
  }
});

router.get('/offers-review', async (req: Request, res: Response): Promise<void> => {
  try {
    const statusParam = String(req.query.status || '').trim().toUpperCase();
    const normalizedStatus =
      statusParam === 'LIVE' || statusParam === 'PAUSED'
        ? 'APPROVED'
        : ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(statusParam)
        ? statusParam
        : 'SUBMITTED';

    const vendorIdFilter = normalizeOptionalQueryValue(req.query.vendorId);

    const offers = await prisma.offer.findMany({
      where: {
        offerState: normalizedStatus as any,
        ...(vendorIdFilter ? { vendorId: vendorIdFilter } : {}),
      } as any,
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(offers);
  } catch (error) {
    console.error('Get offers review queue error:', error);
    res.status(500).json({ error: 'Failed to load offers review queue' });
  }
});

router.post('/offers-review/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid offer id' });
      return;
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, companyName: true, email: true },
        },
      },
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (String((offer as any).offerState || '') !== 'SUBMITTED') {
      res.status(400).json({ error: 'Only submitted offers can be approved' });
      return;
    }
    const billingAccess = await getVendorBillingAccess(offer.vendor.id, 'PUBLISH_OFFER', {
      excludeOfferId: String(offer.id),
    });
    const billingOverrideRequested = isTruthy(
      req.body?.billingOverride ?? req.body?.billing_override
    );
    const billingOverrideReason = String(
      req.body?.billingOverrideReason ?? req.body?.billing_override_reason ?? ''
    ).trim();
    const canUseBillingOverride = canApplyAdminBillingOverride({
      requested: billingOverrideRequested,
      reason: billingOverrideReason,
    });
    if (!billingAccess.allowed && !canUseBillingOverride) {
      res.status(400).json({
        ...toBillingAccessDeniedResponse(billingAccess),
        overrideHint:
          'Set billingOverride=true and provide billingOverrideReason (8+ chars) to force publish.',
      });
      return;
    }

    const overrideComplianceNote = canUseBillingOverride
      ? `[BILLING_OVERRIDE:${billingAccess.reasonCode}] ${billingOverrideReason}`
      : null;

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        offerStatus: 'LIVE',
        offerState: 'APPROVED',
        complianceStatus: 'APPROVED',
        adminApprovedAt: new Date(),
        complianceNotes: overrideComplianceNote,
        active: true,
        pausedAt: null,
        pausedByUserId: null,
      } as any,
      include: {
        vendor: {
          select: { id: true, companyName: true, email: true },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    const vendorEmailResult = await sendOfferReviewDecisionEmail({
      to: offer.vendor.email,
      businessName: offer.vendor.companyName,
      offerTitle: offer.title,
      status: 'APPROVED',
    });
    if (!vendorEmailResult.sent) {
      console.error('Offer approval email failed:', {
        offerId: offer.id,
        vendorId: offer.vendor.id,
        error: vendorEmailResult.error,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Approve offer error:', error);
    res.status(500).json({ error: 'Failed to approve offer' });
  }
});

router.post('/offers-review/:id/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid offer id' });
      return;
    }

    const complianceNotes = String(req.body?.complianceNotes || req.body?.compliance_notes || '').trim();
    if (!complianceNotes) {
      res.status(400).json({ error: 'compliance_notes is required when rejecting an offer' });
      return;
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, companyName: true, email: true },
        },
      },
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (String((offer as any).offerState || '') !== 'SUBMITTED') {
      res.status(400).json({ error: 'Only submitted offers can be rejected' });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        offerStatus: 'REJECTED',
        offerState: 'REJECTED',
        complianceStatus: 'REJECTED',
        complianceNotes,
        active: false,
      } as any,
      include: {
        vendor: {
          select: { id: true, companyName: true, email: true },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    const vendorEmailResult = await sendOfferReviewDecisionEmail({
      to: offer.vendor.email,
      businessName: offer.vendor.companyName,
      offerTitle: offer.title,
      status: 'REJECTED',
      complianceNotes,
    });
    if (!vendorEmailResult.sent) {
      console.error('Offer rejection email failed:', {
        offerId: offer.id,
        vendorId: offer.vendor.id,
        error: vendorEmailResult.error,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Reject offer error:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
});

router.post('/offers/:id/pause', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid offer id' });
      return;
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      select: { id: true, offerStatus: true, offerState: true, active: true } as any,
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String((offer as any).offerState || '') !== 'APPROVED' || !(offer as any).active) {
      res.status(400).json({ error: 'Only active approved offers can be paused' });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: {
        active: false,
        offerStatus: 'PAUSED',
        offerState: 'APPROVED',
        pausedAt: new Date(),
        pausedByUserId: req.user?.id || null,
      } as any,
    });

    res.json(updated);
  } catch (error) {
    console.error('Pause admin offer error:', error);
    res.status(500).json({ error: 'Failed to pause offer' });
  }
});

router.post('/offers/:id/resume', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid offer id' });
      return;
    }

    const offer: any = await prisma.offer.findUnique({
      where: { id },
      select: {
        id: true,
        vendorId: true,
        offerStatus: true,
        offerState: true,
        complianceStatus: true,
        complianceNotes: true,
      } as any,
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String((offer as any).offerState || '') !== 'APPROVED') {
      res.status(400).json({ error: 'Only approved offers can be resumed' });
      return;
    }
    if ((offer as any).active) {
      res.status(400).json({ error: 'Offer is already active' });
      return;
    }
    const billingAccess = await getVendorBillingAccess(String(offer.vendorId), 'PUBLISH_OFFER', {
      excludeOfferId: String(offer.id),
    });
    const billingOverrideRequested = isTruthy(
      req.body?.billingOverride ?? req.body?.billing_override
    );
    const billingOverrideReason = String(
      req.body?.billingOverrideReason ?? req.body?.billing_override_reason ?? ''
    ).trim();
    const canUseBillingOverride = canApplyAdminBillingOverride({
      requested: billingOverrideRequested,
      reason: billingOverrideReason,
    });
    if (!billingAccess.allowed && !canUseBillingOverride) {
      res.status(400).json({
        ...toBillingAccessDeniedResponse(billingAccess),
        overrideHint:
          'Set billingOverride=true and provide billingOverrideReason (8+ chars) to force resume.',
      });
      return;
    }

    const overrideComplianceNote = canUseBillingOverride
      ? `[BILLING_OVERRIDE:${billingAccess.reasonCode}] ${billingOverrideReason}`
      : String(offer.complianceNotes || '').trim() || null;

    const updated = await prisma.offer.update({
      where: { id },
      data: {
        active: true,
        offerStatus: 'LIVE',
        offerState: 'APPROVED',
        complianceNotes: overrideComplianceNote,
        pausedAt: null,
        pausedByUserId: null,
      } as any,
    });

    res.json(updated);
  } catch (error) {
    console.error('Resume admin offer error:', error);
    res.status(500).json({ error: 'Failed to resume offer' });
  }
});

router.post('/offers/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid offer id' });
      return;
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      select: { id: true, offerStatus: true, offerState: true } as any,
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String((offer as any).offerState || '') === 'CANCELLED') {
      res.status(400).json({ error: 'Offer is already cancelled' });
      return;
    }

    const cancelReason = String(req.body?.cancelReason || req.body?.cancel_reason || '').trim() || null;
    const updated = await prisma.offer.update({
      where: { id },
      data: {
        active: false,
        offerStatus: 'CANCELLED',
        offerState: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByUserId: req.user?.id || null,
        cancelReason,
        pausedAt: null,
        pausedByUserId: null,
      } as any,
    });

    res.json(updated);
  } catch (error) {
    console.error('Cancel admin offer error:', error);
    res.status(500).json({ error: 'Failed to cancel offer' });
  }
});

// Get all users
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const roleParam = firstString(req.query.role);
    const search = firstString(req.query.search);

    const where: any = {};
    if (roleParam) {
      if (!isAppRole(roleParam) && String(roleParam).trim().toUpperCase() !== 'EMPLOYEE') {
        res.status(400).json({ error: 'Invalid role filter' });
        return;
      }
      where.role = normalizeRole(roleParam);
    }
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        vendor: {
          select: { id: true, companyName: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user role
router.patch('/users/:id/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }

    const requestedRole = req.body?.role;

    if (!isAppRole(requestedRole)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const role = normalizeRole(requestedRole);

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const actorUserId = req.user?.id || null;

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      await upsertGlobalRoleAssignment(tx as any, {
        userId: id,
        role,
        scopeType: 'GLOBAL',
        grantedByUserId: actorUserId,
        grantReason: 'admin-role-update',
      });

      await (tx as any).authChangeLog.create({
        data: {
          id: `auth-change-role-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          actorUserId,
          targetUserId: id,
          action: 'USER_ROLE_UPDATED',
          oldValueJson: { role: existingUser.role },
          newValueJson: { role },
          reason: 'admin-role-update',
        },
      });

      return updated;
    });

    res.json(user);
  } catch (error: any) {
    console.error('Update user role error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Create vendor directly (admin)
router.get('/vendors', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = normalizeOptionalQueryValue(req.query.status);
    const search = normalizeOptionalQueryValue(req.query.search);
    const where: any = {};
    if (status) {
      const normalized = normalizeVendorStatus(status);
      if (normalized === 'ALL') {
        // no-op
      } else if (normalized === 'ACTIVE') {
        where.status = 'APPROVED';
      } else if (normalized === 'INACTIVE') {
        where.status = 'SUSPENDED';
      } else {
        where.status = normalized;
      }
    } else {
      where.status = 'APPROVED';
    }
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
        billing: {
          select: {
            associationStatus: true,
            planConfig: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
        billingPlans: {
          where: { isActive: true },
          orderBy: { startsAt: 'desc' },
          take: 1,
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            startsAt: true,
            endsAt: true,
            planConfig: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            createdAt: true,
            selectedPlanCode: true,
            selectedPlanConfig: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const vendorIds = (vendors || []).map((vendor) => vendor.id);

    const [offerCounts, rawLeadCounts] = await Promise.all([
      vendorIds.length
        ? (prisma as any).offer.groupBy({
            by: ['vendorId'],
            where: {
              ...(buildCountedOfferWhere({}) as any),
              vendorId: { in: vendorIds },
            },
            _count: { vendorId: true },
          })
        : Promise.resolve([]),
      // Deduplicate by (userId, offerId): same user submitting to the same offer
      // is counted only once (earliest submission). Null-userId leads are always counted.
      vendorIds.length
        ? (() => {
            const placeholders = vendorIds.map((_, i) => `$${i + 1}`).join(', ');
            return prisma.$queryRawUnsafe<Array<{ vendorId: string; count: number }>>(
              `
                WITH ranked AS (
                  SELECT
                    vendor_id,
                    ROW_NUMBER() OVER (
                      PARTITION BY COALESCE(user_id::text, id::text), offer_id
                      ORDER BY created_at ASC
                    ) AS rn
                  FROM leads
                  WHERE vendor_id IN (${placeholders})
                    AND status != 'FAILED'
                )
                SELECT vendor_id::text AS "vendorId", CAST(COUNT(*) AS INTEGER) AS count
                FROM ranked
                WHERE rn = 1
                GROUP BY vendor_id
              `,
              ...vendorIds
            );
          })()
        : Promise.resolve([] as Array<{ vendorId: string; count: number }>),
    ]);

    const offersCountByVendorId = new Map<string, number>();
    for (const row of offerCounts as Array<{ vendorId: string; _count: { vendorId: number } }>) {
      offersCountByVendorId.set(String(row.vendorId), Number(row._count?.vendorId || 0));
    }
    const leadsCountByVendorId = new Map<string, number>();
    for (const row of rawLeadCounts as Array<{ vendorId: string; count: number }>) {
      leadsCountByVendorId.set(String(row.vendorId), Number(row.count || 0));
    }

    const payload = vendors.map((vendor: any) => {
      const activePlan = vendor.billingPlans?.[0] || null;
      const currentPlan =
        activePlan?.planConfig ||
        (activePlan?.code
          ? {
              id: null,
              code: String(activePlan.code).toUpperCase(),
              name: activePlan.name || activePlan.code,
              isActive: true,
            }
          : vendor.billing?.planConfig || null);
      const latestRequest = vendor.requests?.[0] || null;

      return {
        ...vendor,
        currentPlan,
        billingStatus: vendor.billing?.associationStatus || 'UNKNOWN',
        metrics: {
          offersCount: offersCountByVendorId.get(vendor.id) || 0,
          leadsCount: leadsCountByVendorId.get(vendor.id) || 0,
        },
        sourceRequest: latestRequest,
      };
    });

    res.json(payload);
  } catch (error) {
    console.error('Get admin vendors error:', error);
    res.status(500).json({ error: 'Failed to load vendors' });
  }
});

router.patch('/vendors/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid vendor id' });
      return;
    }

    const requestedStatusRaw = String(req.body?.status || req.body?.action || '')
      .trim()
      .toUpperCase();
    const requestedStatus = requestedStatusRaw || null;
    if (requestedStatus && !['APPROVED', 'REJECTED', 'SUSPENDED'].includes(requestedStatus)) {
      res.status(400).json({ error: 'Invalid status. Use approved, rejected, or suspended.' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const updateData: any = {};
    const setOptionalString = (
      key:
        | 'companyName'
        | 'contactName'
        | 'email'
        | 'businessEmail'
        | 'phone'
        | 'website'
        | 'businessType'
        | 'city'
        | 'description'
        | 'notes',
      options?: { required?: boolean }
    ) => {
      if (req.body?.[key] === undefined) return;
      const value = String(req.body?.[key] || '').trim();
      if (!value && options?.required) {
        throw new Error(`FIELD_REQUIRED:${key}`);
      }
      updateData[key] = value || null;
    };

    setOptionalString('companyName', { required: true });
    setOptionalString('contactName', { required: true });
    setOptionalString('email', { required: true });
    setOptionalString('businessEmail');
    setOptionalString('phone');
    setOptionalString('website');
    setOptionalString('businessType');
    setOptionalString('city');
    setOptionalString('description');
    setOptionalString('notes');

    if (requestedStatus) {
      updateData.status = requestedStatus as any;
    }

    if (!Object.keys(updateData).length) {
      res.status(400).json({ error: 'No valid vendor changes supplied' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const vendorRecord = await tx.vendor.update({
        where: { id: vendor.id },
        data: updateData,
      });

      await tx.user.update({
        where: { id: vendor.userId },
        data: {
          vendorId: vendor.id,
        } as any,
      });

      // Only apply a billing plan on a fresh approval (PENDING/REJECTED → APPROVED).
      // SUSPENDED → APPROVED (reactivation) must not overwrite the existing billing plan.
      const isNewApproval = (requestedStatus || '').toUpperCase() === 'APPROVED' && vendor.status !== 'APPROVED';
      if (isNewApproval) {
        const latestRequest = await (tx as any).vendorRequest.findFirst({
          where: {
            vendorId: vendor.id,
            status: { in: ['PENDING', 'APPROVED'] as any },
          },
          include: {
            selectedPlanConfig: {
              select: {
                id: true,
                code: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        });
        const selectedPlanCode =
          normalizeRequestPlanCode(latestRequest?.selectedPlanCode) || ('FREE' as RequestPlanCode);
        const hasActiveSelectedPlan = await (tx as any).billingPlanConfig.findFirst({
          where: {
            code: selectedPlanCode,
            planType: 'SUBSCRIPTION',
            isActive: true,
          },
          select: { id: true },
        });
        if (!hasActiveSelectedPlan) {
          throw new Error(`PLAN_CONFIG_INACTIVE:${selectedPlanCode}`);
        }
        await applyVendorSubscriptionPlan(tx, {
          vendorId: vendor.id,
          planTier: selectedPlanCode,
          statusReason: 'admin-vendor-approved',
          associationStatus: selectedPlanCode === 'FREE' ? 'FREE' : 'ACTIVE',
        });
      }

      return vendorRecord;
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendBaseUrl}/vendor/login`;

    if ((requestedStatus || '').toUpperCase() === 'APPROVED' && vendor.status !== 'APPROVED') {
      const token = createVendorSetPasswordToken({
        userId: vendor.user.id,
        email: vendor.user.email,
        vendorId: vendor.id,
      });
      const setPasswordUrl = `${frontendBaseUrl}/vendor/set-password?token=${encodeURIComponent(token)}`;
      const approvalEmail = await sendVendorApprovalEmail({
        to: vendor.email,
        businessName: vendor.companyName,
        loginUrl,
        setPasswordUrl,
      });
      if (!approvalEmail.sent) {
        console.error('Vendor approval email failed:', {
          vendorId: vendor.id,
          error: approvalEmail.error,
        });
      }
      res.json({
        ok: true,
        vendor: updated,
        status: requestedStatus,
        loginUrl,
        setPasswordUrl,
      });
      return;
    }

    if ((requestedStatus || '').toUpperCase() === 'REJECTED' && vendor.status !== 'REJECTED') {
      const rejectionEmail = await sendVendorRejectionEmail({
        to: vendor.email,
        businessName: vendor.companyName,
      });
      if (!rejectionEmail.sent) {
        console.error('Vendor rejection email failed:', {
          vendorId: vendor.id,
          error: rejectionEmail.error,
        });
      }
    }

    res.json({
      ok: true,
      vendor: updated,
      status: requestedStatus || updated.status,
    });
  } catch (error) {
    console.error('Patch admin vendor status error:', error);
    if (String((error as Error)?.message || '').startsWith('FIELD_REQUIRED:')) {
      const field = String((error as Error).message).split(':')[1] || 'field';
      res.status(400).json({ error: `${field} is required` });
      return;
    }
    if (String((error as Error)?.message || '').startsWith('PLAN_CONFIG_INACTIVE:')) {
      const code = String((error as Error).message).split(':')[1] || 'UNKNOWN';
      res.status(409).json({
        error: `${code} plan is inactive and cannot be assigned`,
        code,
      });
      return;
    }
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
});

router.get('/vendors/:id/billing-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = firstString(req.params.id);
    if (!vendorId) {
      res.status(400).json({ error: 'Invalid vendor id' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, companyName: true, email: true, status: true },
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const now = new Date();
    const [activePlan, plans] = await Promise.all([
      (prisma as any).vendorBillingPlan.findFirst({
        where: {
          vendorId,
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
        orderBy: { updatedAt: 'desc' },
      }),
      (prisma as any).vendorBillingPlan.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({ vendor, activePlan, plans });
  } catch (error) {
    console.error('GET /api/admin/vendors/:id/billing-plan error:', error);
    res.status(500).json({ error: 'Failed to load vendor billing plan' });
  }
});

router.put('/vendors/:id/billing-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = firstString(req.params.id);
    if (!vendorId) {
      res.status(400).json({ error: 'Invalid vendor id' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const planTypeRaw = String(req.body?.planType || req.body?.plan_type || '').trim().toUpperCase();
    if (!['PAY_PER_LEAD', 'SUBSCRIPTION'].includes(planTypeRaw)) {
      res.status(400).json({ error: 'plan_type must be pay_per_lead or subscription' });
      return;
    }

    const pricePerLead = req.body?.pricePerLead ?? req.body?.price_per_lead;
    const monthlyFee = req.body?.monthlyFee ?? req.body?.monthly_fee;
    const includedLeadsPerMonth = req.body?.includedLeadsPerMonth ?? req.body?.included_leads_per_month;
    const overagePricePerLead =
      req.body?.overagePricePerLead ?? req.body?.overage_price_per_lead;
    const subscriptionTier = req.body?.subscriptionTier ?? req.body?.subscription_tier;
    const billingCycleDayRaw = req.body?.billingCycleDay ?? req.body?.billing_cycle_day;
    const offerLimitRaw = req.body?.offerLimit ?? req.body?.offer_limit;
    const startsAtRaw = firstString(req.body?.startsAt ?? req.body?.starts_at);
    const endsAtRaw = firstString(req.body?.endsAt ?? req.body?.ends_at);
    const requestCurrency = String(req.body?.currency || 'CAD').trim().toUpperCase() || 'CAD';

    let normalizedPricePerLead = pricePerLead === undefined || pricePerLead === null ? null : asNumber(pricePerLead);
    const monthlyFeeFromRequest = monthlyFee === undefined || monthlyFee === null ? null : asNumber(monthlyFee);
    let normalizedMonthlyFee = monthlyFeeFromRequest;
    let normalizedIncluded =
      includedLeadsPerMonth === undefined || includedLeadsPerMonth === null || includedLeadsPerMonth === ''
        ? null
        : Number(includedLeadsPerMonth);
    let normalizedOverage =
      overagePricePerLead === undefined || overagePricePerLead === null
        ? null
        : asNumber(overagePricePerLead);
    let normalizedOfferLimit =
      offerLimitRaw === undefined || offerLimitRaw === null || offerLimitRaw === ''
        ? null
        : Number(offerLimitRaw);
    let normalizedCurrency = requestCurrency;
    const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
    const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
    const billingCycleDay =
      billingCycleDayRaw === undefined || billingCycleDayRaw === null || billingCycleDayRaw === ''
        ? 1
        : Number(billingCycleDayRaw);

    if (!Number.isInteger(billingCycleDay) || billingCycleDay < 1 || billingCycleDay > 28) {
      res.status(400).json({ error: 'billing_cycle_day must be an integer between 1 and 28' });
      return;
    }
    if (normalizedIncluded !== null && (!Number.isInteger(normalizedIncluded) || normalizedIncluded < 0)) {
      res.status(400).json({ error: 'included_leads_per_month must be a non-negative integer' });
      return;
    }
    if (normalizedOfferLimit !== null && (!Number.isInteger(normalizedOfferLimit) || normalizedOfferLimit < 0)) {
      res.status(400).json({ error: 'offer_limit must be a non-negative integer' });
      return;
    }
    if (Number.isNaN(startsAt.getTime())) {
      res.status(400).json({ error: 'starts_at must be a valid date' });
      return;
    }
    if (endsAt && Number.isNaN(endsAt.getTime())) {
      res.status(400).json({ error: 'ends_at must be a valid date' });
      return;
    }
    if (endsAt && endsAt <= startsAt) {
      res.status(400).json({ error: 'ends_at must be after starts_at' });
      return;
    }
    if (normalizedPricePerLead !== null && normalizedPricePerLead < 0) {
      res.status(400).json({ error: 'price_per_lead must be non-negative' });
      return;
    }
    if (planTypeRaw === 'PAY_PER_LEAD' && normalizedPricePerLead === null) {
      res.status(400).json({ error: 'price_per_lead is required for pay_per_lead plans' });
      return;
    }

    if (planTypeRaw === 'SUBSCRIPTION') {
      const resolvedTier =
        resolveAdminSubscriptionPresetKey(subscriptionTier) ||
        getSubscriptionPresetByMonthlyFee(monthlyFeeFromRequest);
      if (!resolvedTier) {
        res.status(400).json({
          error: 'subscription_tier must be one of FREE, GOLD, PREMIUM (or monthly_fee must match 0, 100, 250)',
        });
        return;
      }

      const existingPlanConfig = await (prisma as any).billingPlanConfig.findUnique({
        where: { code: resolvedTier },
        select: { id: true, isActive: true },
      });
      if (existingPlanConfig && !existingPlanConfig.isActive) {
        res.status(409).json({
          error: 'PLAN_CONFIG_INACTIVE',
          message: `${resolvedTier} plan is inactive and cannot be assigned`,
          code: resolvedTier,
        });
        return;
      }

      const preset = ADMIN_SUBSCRIPTION_PRESETS[resolvedTier];
      normalizedPricePerLead = null;
      normalizedMonthlyFee = preset.monthlyFee;
      normalizedIncluded = preset.includedLeadsPerMonth;
      normalizedOverage = preset.overagePricePerLead;
      normalizedCurrency = preset.currency;
      normalizedOfferLimit = preset.offerLimit;
    } else {
      if (normalizedMonthlyFee !== null && normalizedMonthlyFee < 0) {
        res.status(400).json({ error: 'monthly_fee must be non-negative' });
        return;
      }
      if (normalizedOverage !== null && normalizedOverage < 0) {
        res.status(400).json({ error: 'overage_price_per_lead must be non-negative' });
        return;
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const derivedCode =
        planTypeRaw === 'PAY_PER_LEAD'
          ? 'PAY_PER_LEAD'
          : normalizedMonthlyFee !== null && normalizedMonthlyFee <= 0
          ? 'FREE'
          : normalizedMonthlyFee !== null && normalizedMonthlyFee >= 250
          ? 'PREMIUM'
          : normalizedMonthlyFee !== null && normalizedMonthlyFee >= 100
          ? 'GOLD'
          : null;
      if (derivedCode) {
        const existingPlanConfig = await (tx as any).billingPlanConfig.findUnique({
          where: { code: derivedCode },
          select: { id: true, isActive: true },
        });
        if (existingPlanConfig && !existingPlanConfig.isActive) {
          throw new Error(`PLAN_CONFIG_INACTIVE:${derivedCode}`);
        }
      }
      const planConfig = await ensureBillingPlanConfig(tx, {
        code: derivedCode,
        name:
          derivedCode === 'FREE'
            ? 'Free'
            : derivedCode === 'GOLD'
            ? 'Gold'
            : derivedCode === 'PREMIUM'
            ? 'Premium'
            : derivedCode === 'PAY_PER_LEAD'
            ? 'Pay Per Lead'
            : 'Custom Plan',
        description:
          derivedCode === 'FREE'
            ? ADMIN_SUBSCRIPTION_PRESETS.FREE.description
            : derivedCode === 'GOLD'
            ? ADMIN_SUBSCRIPTION_PRESETS.GOLD.description
            : derivedCode === 'PREMIUM'
            ? ADMIN_SUBSCRIPTION_PRESETS.PREMIUM.description
            : null,
        planType: planTypeRaw as 'PAY_PER_LEAD' | 'SUBSCRIPTION',
        pricePerLead: normalizedPricePerLead,
        monthlyFee: normalizedMonthlyFee,
        includedLeadsPerCycle: normalizedIncluded,
        overagePricePerLead: normalizedOverage,
        maxActiveOffers: normalizedOfferLimit,
        overageEnabled: true,
        currencyCode: normalizedCurrency,
        isSystemPreset: Boolean(derivedCode && ['FREE', 'GOLD', 'PREMIUM', 'PAY_PER_LEAD'].includes(derivedCode)),
      });

      await (tx as any).vendorBillingPlan.updateMany({
        where: { vendorId, isActive: true },
        data: { isActive: false },
      });

      const createdPlan = await (tx as any).vendorBillingPlan.create({
        data: {
          vendorId,
          planConfigId: planConfig.id,
          planType: planTypeRaw,
          pricePerLead: normalizedPricePerLead === null ? null : toMoney(normalizedPricePerLead),
          monthlyFee: normalizedMonthlyFee === null ? null : toMoney(normalizedMonthlyFee),
          includedLeadsPerMonth: normalizedIncluded,
          overagePricePerLead: normalizedOverage === null ? null : toMoney(normalizedOverage),
          offerLimit: normalizedOfferLimit,
          billingCycleDay,
          currency: normalizedCurrency,
          startsAt,
          endsAt,
          isActive: true,
        },
      });

      const billingMode =
        planTypeRaw === 'PAY_PER_LEAD'
          ? 'PAY_PER_LEAD'
          : Number(normalizedMonthlyFee || 0) <= 0
          ? 'FREE'
          : 'MONTHLY';
      const associationStatus =
        planTypeRaw === 'SUBSCRIPTION' && Number(normalizedMonthlyFee || 0) <= 0
          ? 'FREE'
          : 'ACTIVE';

      await tx.vendorBilling.upsert({
        where: { vendorId },
        update: {
          billingMode,
          postTrialMode: billingMode === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
          trialEndsAt: null,
          leadPriceCents:
            normalizedPricePerLead === null ? 0 : Math.max(0, Math.round(normalizedPricePerLead * 100)),
          monthlyFeeCents:
            normalizedMonthlyFee === null ? 0 : Math.max(0, Math.round(normalizedMonthlyFee * 100)),
          paymentMethod: 'MANUAL',
          currency: normalizedCurrency,
          planConfigId: planConfig.id,
          billingDay: billingCycleDay,
          associationStatus: associationStatus as any,
          statusReason: 'admin-billing-plan-update',
          lastValidatedAt: new Date(),
        } as any,
        create: {
          vendorId,
          billingMode,
          postTrialMode: billingMode === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
          trialEndsAt: null,
          leadPriceCents:
            normalizedPricePerLead === null ? 0 : Math.max(0, Math.round(normalizedPricePerLead * 100)),
          monthlyFeeCents:
            normalizedMonthlyFee === null ? 0 : Math.max(0, Math.round(normalizedMonthlyFee * 100)),
          paymentMethod: 'MANUAL',
          currency: normalizedCurrency,
          planConfigId: planConfig.id,
          billingDay: billingCycleDay,
          associationStatus: associationStatus as any,
          statusReason: 'admin-billing-plan-update',
          lastValidatedAt: new Date(),
        } as any,
      });

      return createdPlan;
    });

    res.json(created);
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.startsWith('PLAN_CONFIG_INACTIVE:')) {
      const planCode = message.split(':')[1] || 'UNKNOWN';
      res.status(409).json({
        error: 'PLAN_CONFIG_INACTIVE',
        message: `${planCode} plan is inactive and cannot be assigned`,
        code: planCode,
      });
      return;
    }
    console.error('PUT /api/admin/vendors/:id/billing-plan error:', error);
    res.status(500).json({ error: 'Failed to save vendor billing plan' });
  }
});

router.get('/vendors/billing-eligibility', async (req: Request, res: Response): Promise<void> => {
  try {
    const invalidOnlyRaw = req.query.invalidOnly ?? req.query.invalid_only;
    const invalidOnly =
      invalidOnlyRaw === undefined || invalidOnlyRaw === null || invalidOnlyRaw === ''
        ? true
        : isTruthy(invalidOnlyRaw);
    const status = normalizeOptionalQueryValue(req.query.status);

    const vendors = await prisma.vendor.findMany({
      where: {
        ...(status ? { status: normalizeVendorStatus(status) as any } : {}),
      },
      select: {
        id: true,
        companyName: true,
        status: true,
        _count: {
          select: {
            offers: true,
          },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const vendorEligibility = [];
    for (const vendor of vendors) {
      const [createAccess, submitAccess, publishAccess] = await Promise.all([
        getVendorBillingAccess(vendor.id, 'CREATE_OFFER'),
        getVendorBillingAccess(vendor.id, 'SUBMIT_OFFER'),
        getVendorBillingAccess(vendor.id, 'PUBLISH_OFFER'),
      ]);
      const isFullyEligible = createAccess.allowed && submitAccess.allowed && publishAccess.allowed;
      vendorEligibility.push({
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        vendorStatus: vendor.status,
        offerCount: (vendor as any)._count?.offers || 0,
        isFullyEligible,
        createAccess,
        submitAccess,
        publishAccess,
      });
    }

    const filtered = invalidOnly
      ? vendorEligibility.filter((vendor) => !vendor.isFullyEligible)
      : vendorEligibility;

    res.json({
      totalVendors: vendors.length,
      invalidVendors: vendorEligibility.filter((vendor) => !vendor.isFullyEligible).length,
      returnedVendors: filtered.length,
      invalidOnly,
      vendors: filtered,
    });
  } catch (error) {
    console.error('GET /api/admin/vendors/billing-eligibility error:', error);
    res.status(500).json({ error: 'Failed to load vendor billing eligibility' });
  }
});

router.get('/vendors/:id/billing-eligibility', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = firstString(req.params.id);
    if (!vendorId) {
      res.status(400).json({ error: 'Invalid vendor id' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, companyName: true, status: true },
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const [createAccess, submitAccess, publishAccess] = await Promise.all([
      getVendorBillingAccess(vendor.id, 'CREATE_OFFER'),
      getVendorBillingAccess(vendor.id, 'SUBMIT_OFFER'),
      getVendorBillingAccess(vendor.id, 'PUBLISH_OFFER'),
    ]);

    res.json({
      vendorId: vendor.id,
      vendorName: vendor.companyName,
      vendorStatus: vendor.status,
      isFullyEligible: createAccess.allowed && submitAccess.allowed && publishAccess.allowed,
      createAccess,
      submitAccess,
      publishAccess,
    });
  } catch (error) {
    console.error('GET /api/admin/vendors/:id/billing-eligibility error:', error);
    res.status(500).json({ error: 'Failed to load vendor billing eligibility' });
  }
});

router.get('/offers/billing-blocked', async (req: Request, res: Response): Promise<void> => {
  try {
    const limitRaw = Number(req.query.limit || 200);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1000) : 200;
    const statusesRaw = normalizeOptionalQueryValue(req.query.statuses);
    const states = statusesRaw
      ? statusesRaw
          .split(',')
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean)
          .map((value) => {
            if (value === 'LIVE' || value === 'PAUSED') return 'APPROVED';
            return value;
          })
      : ['SUBMITTED', 'APPROVED'];

    const offers = await prisma.offer.findMany({
      where: {
        offerState: { in: states as any },
      } as any,
      select: {
        id: true,
        slug: true,
        title: true,
        offerState: true,
        offerStatus: true,
        active: true,
        complianceStatus: true,
        complianceNotes: true,
        vendorId: true,
        company: {
          select: { id: true, name: true },
        },
        vendor: {
          select: { id: true, companyName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    } as any);

    const blocked = [];
    for (const offer of offers as any[]) {
      const publishAccess = await getVendorBillingAccess(String(offer.vendorId), 'PUBLISH_OFFER', {
        excludeOfferId: String(offer.id),
      });
      if (publishAccess.allowed) continue;
      blocked.push({
        offerId: offer.id,
        slug: offer.slug,
        title: offer.title,
        offerState: offer.offerState,
        offerStatus: offer.offerStatus,
        active: offer.active,
        complianceStatus: offer.complianceStatus,
        complianceNotes: offer.complianceNotes,
        vendorId: offer.vendor?.id || offer.vendorId,
        vendorName: offer.vendor?.companyName || null,
        company: offer.company,
        blockingAccess: publishAccess,
      });
    }

    res.json({
      scannedOffers: offers.length,
      blockedOffers: blocked.length,
      results: blocked,
    });
  } catch (error) {
    console.error('GET /api/admin/offers/billing-blocked error:', error);
    res.status(500).json({ error: 'Failed to load billing-blocked offers' });
  }
});

router.post('/offers/revalidate-billing', async (req: Request, res: Response): Promise<void> => {
  try {
    const applyChanges = isTruthy(req.body?.applyChanges ?? req.body?.apply_changes);
    const limitRaw = Number(req.body?.limit);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : undefined;

    const result = await enforceLiveOfferBillingEligibility({
      applyChanges,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('POST /api/admin/offers/revalidate-billing error:', error);
    res.status(500).json({ error: 'Failed to revalidate live offers against billing eligibility' });
  }
});

router.get('/pricing/category-leads', async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = normalizeOptionalQueryValue(req.query.categoryId ?? req.query.category_id);
    const subcategoryId = normalizeOptionalQueryValue(req.query.subcategoryId ?? req.query.subcategory_id);
    const isActiveRaw = normalizeOptionalQueryValue(req.query.isActive ?? req.query.is_active);

    const rows = await (prisma as any).categoryLeadPricing.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(subcategoryId ? { subcategoryId } : {}),
        ...(isActiveRaw !== undefined ? { isActive: isTruthy(isActiveRaw) } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true, parentId: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { subcategory: { name: 'asc' } }],
    });

    res.json(rows);
  } catch (error) {
    console.error('GET /api/admin/pricing/category-leads error:', error);
    res.status(500).json({ error: 'Failed to load category lead pricing' });
  }
});

router.put('/pricing/category-leads', async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = String(req.body?.categoryId ?? req.body?.category_id ?? '').trim();
    const subcategoryIdRaw = req.body?.subcategoryId ?? req.body?.subcategory_id;
    const subcategoryId =
      subcategoryIdRaw === undefined || subcategoryIdRaw === null || String(subcategoryIdRaw).trim() === ''
        ? null
        : String(subcategoryIdRaw).trim();
    const leadPrice = Number(req.body?.leadPrice ?? req.body?.lead_price);
    const billingType = String(req.body?.billingType ?? req.body?.billing_type ?? 'PER_LEAD')
      .trim()
      .toUpperCase();
    const isActive = req.body?.isActive === undefined ? true : isTruthy(req.body?.isActive);
    const descriptionRaw = req.body?.description;
    const description =
      descriptionRaw === undefined || descriptionRaw === null
        ? null
        : String(descriptionRaw).trim() || null;

    if (!categoryId) {
      res.status(400).json({ error: 'categoryId is required' });
      return;
    }
    if (!subcategoryId) {
      res.status(400).json({ error: 'subcategoryId is required' });
      return;
    }
    if (!Number.isFinite(leadPrice) || leadPrice < 0) {
      res.status(400).json({ error: 'leadPrice must be a non-negative number' });
      return;
    }
    if (!['PER_LEAD', 'PER_SALE'].includes(billingType)) {
      res.status(400).json({ error: 'billingType must be PER_LEAD or PER_SALE' });
      return;
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, active: true, parentId: true },
    });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    if (category.parentId) {
      res.status(400).json({ error: 'categoryId must reference a parent category' });
      return;
    }

    const subcategory = await prisma.category.findUnique({
      where: { id: subcategoryId },
      select: { id: true, parentId: true, name: true, active: true },
    });
    if (!subcategory) {
      res.status(404).json({ error: 'Subcategory not found' });
      return;
    }
    if (String(subcategory.parentId || '') !== categoryId) {
      res.status(400).json({ error: 'Subcategory does not belong to category' });
      return;
    }
    if (isActive && (!category.active || !subcategory.active)) {
      res.status(400).json({
        error: 'Active pricing rows require active category and active subcategory',
      });
      return;
    }

    const existing = await (prisma as any).categoryLeadPricing.findFirst({
      where: {
        categoryId,
        subcategoryId,
      },
      select: { id: true },
    });

    const saved = existing
      ? await (prisma as any).categoryLeadPricing.update({
          where: { id: existing.id },
          data: {
            leadPrice: leadPrice.toFixed(2),
            billingType,
            isActive,
            description,
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            subcategory: { select: { id: true, name: true, slug: true, parentId: true } },
          },
        })
      : await (prisma as any).categoryLeadPricing.create({
          data: {
            categoryId,
            subcategoryId,
            leadPrice: leadPrice.toFixed(2),
            billingType,
            isActive,
            description,
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            subcategory: { select: { id: true, name: true, slug: true, parentId: true } },
          },
        });

    res.json(saved);
  } catch (error) {
    console.error('PUT /api/admin/pricing/category-leads error:', error);
    res.status(500).json({ error: 'Failed to save category lead pricing' });
  }
});

router.get('/analytics/lead-monetization', async (req: Request, res: Response): Promise<void> => {
  try {
    const daysRaw = Number(req.query.days || 30);
    const days = Number.isInteger(daysRaw) ? Math.max(1, Math.min(daysRaw, 120)) : 30;
    const walletThresholdRaw = Number(req.query.walletThreshold ?? req.query.wallet_threshold ?? 20);
    const walletThreshold = Number.isFinite(walletThresholdRaw) ? walletThresholdRaw : 20;
    const highLockedThresholdRaw = Number(req.query.highLockedThreshold ?? req.query.high_locked_threshold ?? 5);
    const highLockedThreshold = Number.isInteger(highLockedThresholdRaw) ? highLockedThresholdRaw : 5;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [eventRows, lowBalanceProfiles] = await Promise.all([
      (prisma as any).vendorLeadEvent.findMany({
        where: { createdAt: { gte: start } },
        select: {
          id: true,
          vendorId: true,
          visibilityStatus: true,
          status: true,
          deductedFromIncludedLeads: true,
          deductedFromWallet: true,
          priceApplied: true,
          createdAt: true,
        },
      }),
      prisma.vendorBilling.findMany({
        where: {
          associationStatus: { in: ['ACTIVE', 'FREE', 'TRIALING'] as any },
        } as any,
        select: {
          vendorId: true,
          walletBalance: true,
          currencyCode: true,
          associationStatus: true,
          vendor: {
            select: {
              companyName: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const metricsByVendor = new Map<string, {
      vendorId: string;
      visibleLeads: number;
      lockedLeads: number;
      deliveredLeads: number;
      blockedLeads: number;
      chargedFromWallet: number;
      chargedFromIncluded: number;
    }>();

    for (const row of eventRows as any[]) {
      const bucket = metricsByVendor.get(row.vendorId) || {
        vendorId: row.vendorId,
        visibleLeads: 0,
        lockedLeads: 0,
        deliveredLeads: 0,
        blockedLeads: 0,
        chargedFromWallet: 0,
        chargedFromIncluded: 0,
      };
      if (String(row.visibilityStatus) === 'VISIBLE') bucket.visibleLeads += 1;
      if (String(row.visibilityStatus) === 'LOCKED') bucket.lockedLeads += 1;
      if (String(row.status) === 'DELIVERED') bucket.deliveredLeads += 1;
      if (String(row.status) === 'BLOCKED') bucket.blockedLeads += 1;
      bucket.chargedFromWallet += asNumber(row.deductedFromWallet);
      bucket.chargedFromIncluded += Number(row.deductedFromIncludedLeads || 0);
      metricsByVendor.set(row.vendorId, bucket);
    }

    const vendorsWithHighLockedLeads = Array.from(metricsByVendor.values())
      .filter((item) => item.lockedLeads >= highLockedThreshold)
      .sort((a, b) => b.lockedLeads - a.lockedLeads);

    const vendorsLowBalance = (lowBalanceProfiles as any[])
      .map((profile) => ({
        vendorId: profile.vendorId,
        vendorName: profile.vendor?.companyName || null,
        vendorStatus: profile.vendor?.status || null,
        associationStatus: profile.associationStatus,
        walletBalance: asNumber(profile.walletBalance),
        currencyCode: profile.currencyCode || 'CAD',
      }))
      .filter((profile) => profile.walletBalance <= walletThreshold)
      .sort((a, b) => a.walletBalance - b.walletBalance);

    const totalVisible = (eventRows as any[]).filter((row) => row.visibilityStatus === 'VISIBLE').length;
    const totalLocked = (eventRows as any[]).filter((row) => row.visibilityStatus === 'LOCKED').length;

    res.json({
      days,
      walletThreshold,
      highLockedThreshold,
      totals: {
        leadEvents: (eventRows as any[]).length,
        visibleLeads: totalVisible,
        lockedLeads: totalLocked,
      },
      vendorsLowBalance,
      vendorsWithHighLockedLeads,
    });
  } catch (error) {
    console.error('GET /api/admin/analytics/lead-monetization error:', error);
    res.status(500).json({ error: 'Failed to load lead monetization analytics' });
  }
});

router.post('/billing/generate-invoices', async (req: Request, res: Response): Promise<void> => {
  try {
    const periodRaw = firstString(req.query.period);
    const parsedPeriod = parsePeriodMonth(periodRaw);
    if (!parsedPeriod) {
      res.status(400).json({ error: 'period query must be YYYY-MM' });
      return;
    }

    const { periodStart, periodEnd, nextMonthStart, periodKey } = parsedPeriod;
    const now = new Date();
    const activePlans = await (prisma as any).vendorBillingPlan.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      include: {
        vendor: {
          select: { id: true, companyName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let invoicesCreated = 0;
    let skippedExistingInvoice = 0;
    let skippedNoCharges = 0;
    const vendorSummaries: Array<Record<string, unknown>> = [];

    for (const plan of activePlans as any[]) {
      const existingInvoice = await (prisma as any).invoice.findFirst({
        where: {
          vendorId: plan.vendorId,
          periodStart,
          periodEnd,
        },
        select: { id: true },
      });
      if (existingInvoice) {
        skippedExistingInvoice += 1;
        vendorSummaries.push({
          vendor_id: plan.vendorId,
          vendor_name: plan.vendor?.companyName || 'Unknown vendor',
          result: 'skipped_existing_invoice',
          invoice_id: existingInvoice.id,
        });
        continue;
      }

      const pendingEvents = await (prisma as any).leadBillingEvent.findMany({
        where: {
          vendorId: plan.vendorId,
          billingStatus: 'PENDING',
          lead: {
            createdAt: {
              gte: periodStart,
              lt: nextMonthStart,
            },
          },
        },
        select: {
          id: true,
          leadId: true,
        },
      });

      const totalLeads = pendingEvents.length;
      const lineItems: Array<{
        itemType: 'LEADS' | 'SUBSCRIPTION' | 'ADJUSTMENT';
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
        metadataJson?: Record<string, unknown>;
      }> = [];

      if (plan.planType === 'PAY_PER_LEAD') {
        const unitPrice = asNumber(plan.pricePerLead);
        if (totalLeads > 0) {
          lineItems.push({
            itemType: 'LEADS',
            description: `Leads delivered (${periodKey})`,
            quantity: totalLeads,
            unitPrice,
            amount: totalLeads * unitPrice,
            metadataJson: { lead_ids: pendingEvents.map((event: any) => event.leadId) },
          });
        }
      } else if (plan.planType === 'SUBSCRIPTION') {
        const monthlyFee = asNumber(plan.monthlyFee);
        lineItems.push({
          itemType: 'SUBSCRIPTION',
          description: `Monthly subscription fee (${periodKey})`,
          quantity: 1,
          unitPrice: monthlyFee,
          amount: monthlyFee,
          metadataJson: {
            included_leads_per_month: plan.includedLeadsPerMonth ?? 0,
          },
        });

        const included = Number(plan.includedLeadsPerMonth ?? 0);
        const overage = Math.max(0, totalLeads - included);
        const overageUnitPrice = asNumber(plan.overagePricePerLead);
        if (overage > 0) {
          lineItems.push({
            itemType: 'LEADS',
            description: `Overage leads (${periodKey})`,
            quantity: overage,
            unitPrice: overageUnitPrice,
            amount: overage * overageUnitPrice,
            metadataJson: {
              total_leads: totalLeads,
              included_leads: included,
              overage_leads: overage,
              lead_ids: pendingEvents.map((event: any) => event.leadId),
            },
          });
        }
      }

      const subtotalNumber = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const hasChargeableLine = lineItems.some((item) => item.amount !== 0);
      if (!lineItems.length || (!hasChargeableLine && totalLeads === 0)) {
        skippedNoCharges += 1;
        vendorSummaries.push({
          vendor_id: plan.vendorId,
          vendor_name: plan.vendor?.companyName || 'Unknown vendor',
          result: 'skipped_no_charges',
          pending_leads: totalLeads,
        });
        continue;
      }

      const invoice = await prisma.$transaction(async (tx) => {
        const createdInvoice = await (tx as any).invoice.create({
          data: {
            vendorId: plan.vendorId,
            periodStart,
            periodEnd,
            status: 'DRAFT',
            subtotal: toMoney(subtotalNumber),
            tax: toMoney(0),
            total: toMoney(subtotalNumber),
            notes: null,
          },
        });

        if (lineItems.length > 0) {
          await (tx as any).invoiceLineItem.createMany({
            data: lineItems.map((item) => ({
              invoiceId: createdInvoice.id,
              itemType: item.itemType,
              description: item.description,
              quantity: item.quantity,
              unitPrice: toMoney(item.unitPrice),
              amount: toMoney(item.amount),
              metadataJson: item.metadataJson || null,
            })),
          });
        }

        if (pendingEvents.length > 0) {
          await (tx as any).leadBillingEvent.updateMany({
            where: { id: { in: pendingEvents.map((event: any) => event.id) } },
            data: {
              invoiceId: createdInvoice.id,
              billingStatus: 'INVOICED',
            },
          });
        }

        return createdInvoice;
      });

      invoicesCreated += 1;
      vendorSummaries.push({
        vendor_id: plan.vendorId,
        vendor_name: plan.vendor?.companyName || 'Unknown vendor',
        result: 'invoice_created',
        invoice_id: invoice.id,
        pending_leads: totalLeads,
        subtotal: subtotalNumber,
      });
    }

    res.json({
      ok: true,
      period: periodKey,
      vendors_processed: activePlans.length,
      invoices_created: invoicesCreated,
      skipped_existing_invoice: skippedExistingInvoice,
      skipped_no_charges: skippedNoCharges,
      results: vendorSummaries,
    });
  } catch (error) {
    console.error('POST /api/admin/billing/generate-invoices error:', error);
    res.status(500).json({ error: 'Failed to generate invoices' });
  }
});

router.get('/invoices', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId =
      normalizeOptionalQueryValue(req.query.vendorId) ||
      normalizeOptionalQueryValue(req.query.vendor_id);
    const statusRaw = normalizeOptionalQueryValue(req.query.status);
    const periodRaw = normalizeOptionalQueryValue(req.query.period);
    const status = normalizeInvoiceStatus(statusRaw);
    const period = parsePeriodMonth(periodRaw);

    if (statusRaw && !status) {
      res.status(400).json({ error: 'Invalid invoice status filter' });
      return;
    }
    if (periodRaw && !period) {
      res.status(400).json({ error: 'period query must be YYYY-MM' });
      return;
    }

    const where: Record<string, unknown> = {};
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (period) {
      where.periodStart = period.periodStart;
      where.periodEnd = period.periodEnd;
    }

    const invoices = await (prisma as any).invoice.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
        lineItems: true,
      },
      orderBy: [
        { periodStart: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(invoices);
  } catch (error) {
    console.error('GET /api/admin/invoices error:', error);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

router.get('/invoices/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid invoice id' });
      return;
    }

    const invoice = await (prisma as any).invoice.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, companyName: true, email: true },
        },
        lineItems: {
          orderBy: { createdAt: 'asc' },
        },
        leadBillingEvents: {
          include: {
            lead: {
              select: {
                id: true,
                email: true,
                createdAt: true,
                offer: { select: { id: true, title: true } },
                company: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json(invoice);
  } catch (error) {
    console.error('GET /api/admin/invoices/:id error:', error);
    res.status(500).json({ error: 'Failed to load invoice details' });
  }
});

router.patch('/invoices/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid invoice id' });
      return;
    }

    const status = normalizeInvoiceStatus(req.body?.status);
    if (!status || status === 'DRAFT') {
      res.status(400).json({ error: 'status must be sent, paid, or void' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextInvoice = await (tx as any).invoice.update({
        where: { id },
        data: { status },
      });

      if (status === 'VOID') {
        await (tx as any).leadBillingEvent.updateMany({
          where: { invoiceId: id },
          data: { billingStatus: 'VOID' },
        });
      }

      return nextInvoice;
    });

    res.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    console.error('PATCH /api/admin/invoices/:id/status error:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

router.post('/invoices/:id/line-items', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid invoice id' });
      return;
    }

    const description = String(req.body?.description || '').trim();
    const quantityRaw = req.body?.quantity;
    const unitPriceRaw = req.body?.unitPrice ?? req.body?.unit_price;
    const itemTypeRaw = String(req.body?.itemType || req.body?.item_type || 'ADJUSTMENT').trim().toUpperCase();
    const itemType = ['LEADS', 'SUBSCRIPTION', 'ADJUSTMENT'].includes(itemTypeRaw)
      ? itemTypeRaw
      : null;

    const quantity =
      quantityRaw === undefined || quantityRaw === null || quantityRaw === ''
        ? 1
        : Number(quantityRaw);
    const unitPrice = asNumber(unitPriceRaw);

    if (!description) {
      res.status(400).json({ error: 'description is required' });
      return;
    }
    if (!itemType) {
      res.status(400).json({ error: 'item_type must be leads, subscription, or adjustment' });
      return;
    }
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity === 0) {
      res.status(400).json({ error: 'quantity must be a non-zero integer' });
      return;
    }
    if (!Number.isFinite(unitPrice)) {
      res.status(400).json({ error: 'unit_price must be a valid number' });
      return;
    }

    const amount = quantity * unitPrice;
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await (tx as any).invoice.findUnique({
        where: { id },
      });
      if (!invoice) {
        return null;
      }

      const lineItem = await (tx as any).invoiceLineItem.create({
        data: {
          invoiceId: id,
          itemType,
          description,
          quantity,
          unitPrice: toMoney(unitPrice),
          amount: toMoney(amount),
          metadataJson: req.body?.metadata_json || req.body?.metadataJson || null,
        },
      });

      const nextSubtotal = asNumber(invoice.subtotal) + amount;
      const tax = asNumber(invoice.tax);
      const updatedInvoice = await (tx as any).invoice.update({
        where: { id },
        data: {
          subtotal: toMoney(nextSubtotal),
          total: toMoney(nextSubtotal + tax),
        },
      });

      return { lineItem, invoice: updatedInvoice };
    });

    if (!result) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('POST /api/admin/invoices/:id/line-items error:', error);
    res.status(500).json({ error: 'Failed to add invoice line item' });
  }
});

export default router;
