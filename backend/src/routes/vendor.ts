import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { buildAuthUserPayload } from '../lib/auth-user';
import {
  sendOfferSubmittedForReviewEmail,
  sendVendorApplicationInternalEmail,
} from '../lib/mailer';
import { verifyVendorSetPasswordToken } from '../lib/vendor-password';

const router = Router();

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

const DEFAULT_OFFER_TERMS_TEMPLATE = `This offer is provided by the participating vendor for verified employees only.
Offer details, pricing, and availability are subject to change without notice.
The offer may not be combined with other promotions unless explicitly stated.
Proof of employment and identity may be required at redemption.
Misuse, fraud, or unauthorized sharing may result in cancellation.
Additional product- or service-specific conditions may apply.`;

const DEFAULT_CANCELLATION_TEMPLATE = `Cancellation and refund eligibility is determined by the vendor and may vary by product or service.
Requests must be submitted through the vendor's published support channels.
If approved, refunds are issued to the original payment method unless otherwise required by law.
Processing times may vary based on payment provider timelines.
Non-refundable fees or partially used services may be excluded where legally permitted.
Questions should be directed to the vendor first; CorpDeals does not process refunds on the vendor's behalf.`;

const parseDateInput = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isFutureDate = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
};

const toDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isTruthy = (value: unknown) =>
  value === true || value === 'true' || value === '1' || value === 1;

const extractRequestIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

const getDefaultPolicyTemplates = async () => {
  try {
    const policies = await (prisma as any).platformPolicy.findMany({
      where: {
        isDefault: true,
        policyType: {
          in: ['TERMS_TEMPLATE', 'CANCELLATION_TEMPLATE'],
        },
      },
      select: {
        policyType: true,
        bodyText: true,
      },
    });

    const termsTemplate =
      policies.find((policy: any) => policy.policyType === 'TERMS_TEMPLATE')?.bodyText ||
      DEFAULT_OFFER_TERMS_TEMPLATE;
    const cancellationTemplate =
      policies.find((policy: any) => policy.policyType === 'CANCELLATION_TEMPLATE')?.bodyText ||
      DEFAULT_CANCELLATION_TEMPLATE;

    return {
      termsTemplate,
      cancellationTemplate,
    };
  } catch (error) {
    return {
      termsTemplate: DEFAULT_OFFER_TERMS_TEMPLATE,
      cancellationTemplate: DEFAULT_CANCELLATION_TEMPLATE,
    };
  }
};

const QUALIFIED_STATUSES = ['QUALIFIED', 'CONVERTED'] as const;
const LEAD_SENT_STATUSES = ['SENT', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED'] as const;

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const startOfMonth = () => {
  const now = startOfToday();
  now.setDate(1);
  return now;
};

const startOfLastNDays = (days: number) => {
  const now = startOfToday();
  now.setDate(now.getDate() - (days - 1));
  return now;
};

const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDashboardSummary = async (vendorId: string) => {
  const todayStart = startOfToday();
  const monthStart = startOfMonth();

  const [leadsToday, leadsMonth, activeOffers, qualifiedLeads, leadsSent] = await Promise.all([
    prisma.lead.count({
      where: {
        vendorId,
        createdAt: { gte: todayStart },
      },
    }),
    prisma.lead.count({
      where: {
        vendorId,
        createdAt: { gte: monthStart },
      },
    }),
    prisma.offer.count({
      where: {
        vendorId,
        active: true,
      },
    }),
    prisma.lead.count({
      where: {
        vendorId,
        status: {
          in: [...QUALIFIED_STATUSES] as any,
        },
      },
    }),
    prisma.lead.count({
      where: {
        vendorId,
        status: {
          in: [...LEAD_SENT_STATUSES] as any,
        },
      },
    }),
  ]);

  return {
    leads_today: leadsToday,
    leads_month: leadsMonth,
    active_offers: activeOffers,
    qualified_leads: qualifiedLeads,
    leads_sent: leadsSent,
  };
};

const csvEscape = (value: unknown): string => {
  const raw = String(value ?? '');
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const asNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const requireVendorUser = async (req: Request, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (req.user.role !== 'VENDOR') {
    res.status(403).json({ error: 'Vendor access required' });
    return null;
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(403).json({ error: 'Vendor profile not found' });
    return null;
  }

  return vendor;
};

router.post('/apply', async (req: Request, res: Response): Promise<void> => {
  try {
    const businessName = String(req.body?.businessName || req.body?.business_name || '').trim();
    const contactName = String(req.body?.contactName || req.body?.contact_name || '').trim();
    const contactEmail = String(req.body?.contactEmail || req.body?.contact_email || '')
      .trim()
      .toLowerCase();
    const phone = String(req.body?.phone || '').trim() || null;
    const website = String(req.body?.website || '').trim() || null;
    const category = String(req.body?.category || '').trim() || null;
    const city = String(req.body?.city || '').trim() || null;
    const notes = String(req.body?.notes || '').trim() || null;

    if (!businessName || !contactName || !contactEmail) {
      res.status(400).json({
        error: 'Missing required fields',
        detail: 'business name, contact name, and contact email are required',
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: contactEmail },
      select: { id: true },
    });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: contactEmail,
          role: 'VENDOR',
          name: contactName,
          passwordHash: null as any,
        } as any,
      });

      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          companyName: businessName,
          contactName,
          email: contactEmail,
          phone,
          website,
          businessType: category,
          city,
          notes,
          description: notes,
          status: 'PENDING',
        } as any,
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          vendorId: vendor.id,
        } as any,
      });

      return { user, vendor };
    });

    const internalEmail = await sendVendorApplicationInternalEmail({
      businessName,
      contactName,
      contactEmail,
      phone,
      website,
      category,
      city,
      notes,
    });

    if (!internalEmail.sent) {
      console.error('Vendor application internal email failed:', {
        vendorId: created.vendor.id,
        error: internalEmail.error,
      });
    }

    res.status(201).json({
      ok: true,
      vendorId: created.vendor.id,
      message: "We’ll review and contact you within 1–2 business days.",
    });
  } catch (error) {
    console.error('POST /api/vendor/apply error:', error);
    res.status(500).json({ error: 'Failed to submit vendor application' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { vendor: true },
    });
    if (!user || user.role !== 'VENDOR') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (!user.vendor || user.vendor.status !== 'APPROVED') {
      res.status(403).json({ error: 'Vendor account is not approved' });
      return;
    }
    if (!user.passwordHash) {
      res.status(403).json({
        error: 'Password not set',
        detail: 'Set your password using the approval email link first',
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: jwtExpiresIn }
    );

    const userPayload = await buildAuthUserPayload(user.id);
    res.json({ user: userPayload, token });
  } catch (error) {
    console.error('POST /api/vendor/login error:', error);
    res.status(500).json({ error: 'Failed to login vendor' });
  }
});

router.post('/set-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const decoded = verifyVendorSetPasswordToken(token);

    if (!decoded?.userId || decoded.type !== 'vendor_set_password') {
      res.status(400).json({ error: 'Invalid password set token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { vendor: true },
    });
    if (!user || user.role !== 'VENDOR' || !user.vendor) {
      res.status(404).json({ error: 'Vendor user not found' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/vendor/set-password error:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

router.get('/dashboard', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const summary = await getDashboardSummary(vendor.id);

    res.json({
      vendor: {
        id: vendor.id,
        name: vendor.companyName,
        status: vendor.status,
      },
      metrics: summary,
    });
  } catch (error) {
    console.error('GET /api/vendor/dashboard error:', error);
    res.status(500).json({ error: 'Failed to load vendor dashboard' });
  }
});

router.get('/dashboard/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const summary = await getDashboardSummary(vendor.id);
    res.json(summary);
  } catch (error) {
    console.error('GET /api/vendor/dashboard/summary error:', error);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

router.get(
  '/dashboard/company-breakdown',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const vendor = await requireVendorUser(req, res);
      if (!vendor) return;

      const last30Start = startOfLastNDays(30);

      const [totalGroupedRaw, last30GroupedRaw, qualifiedGroupedRaw] = await Promise.all([
        prisma.lead.groupBy({
          by: ['companyId'],
          where: { vendorId: vendor.id },
          _count: { _all: true },
        }) as any,
        prisma.lead.groupBy({
          by: ['companyId'],
          where: {
            vendorId: vendor.id,
            createdAt: { gte: last30Start },
          },
          _count: { _all: true },
        }) as any,
        prisma.lead.groupBy({
          by: ['companyId'],
          where: {
            vendorId: vendor.id,
            status: { in: [...QUALIFIED_STATUSES] as any },
          },
          _count: { _all: true },
        }) as any,
      ]);

      const totalGrouped = totalGroupedRaw as Array<{ companyId: string; _count: { _all: number } }>;
      const last30Grouped = last30GroupedRaw as Array<{ companyId: string; _count: { _all: number } }>;
      const qualifiedGrouped = qualifiedGroupedRaw as Array<{ companyId: string; _count: { _all: number } }>;

      const companyIds = [...new Set(totalGrouped.map((row) => row.companyId))];
      const companies = companyIds.length
        ? await prisma.company.findMany({
            where: { id: { in: companyIds } },
            select: { id: true, name: true },
          })
        : [];

      const companyNameById = new Map(companies.map((company) => [company.id, company.name]));
      const last30ByCompany = new Map(last30Grouped.map((row) => [row.companyId, row._count._all]));
      const qualifiedByCompany = new Map(
        qualifiedGrouped.map((row) => [row.companyId, row._count._all])
      );

      const rows = totalGrouped
        .map((row) => ({
          company_id: row.companyId,
          company_name: companyNameById.get(row.companyId) || 'Unknown company',
          leads_30_days: last30ByCompany.get(row.companyId) || 0,
          total_leads: row._count._all || 0,
          qualified_leads: qualifiedByCompany.get(row.companyId) || 0,
        }))
        .sort((a, b) => b.leads_30_days - a.leads_30_days || b.total_leads - a.total_leads);

      res.json(rows);
    } catch (error) {
      console.error('GET /api/vendor/dashboard/company-breakdown error:', error);
      res.status(500).json({ error: 'Failed to load company breakdown' });
    }
  }
);

router.get(
  '/dashboard/offer-performance',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const vendor = await requireVendorUser(req, res);
      if (!vendor) return;

      const last30Start = startOfLastNDays(30);

      const [offers, totalGroupedRaw, last30GroupedRaw] = await Promise.all([
        prisma.offer.findMany({
          where: { vendorId: vendor.id },
          select: {
            id: true,
            title: true,
            active: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.lead.groupBy({
          by: ['offerId'],
          where: { vendorId: vendor.id },
          _count: { _all: true },
        }) as any,
        prisma.lead.groupBy({
          by: ['offerId'],
          where: {
            vendorId: vendor.id,
            createdAt: { gte: last30Start },
          },
          _count: { _all: true },
        }) as any,
      ]);

      const totalGrouped = totalGroupedRaw as Array<{ offerId: string; _count: { _all: number } }>;
      const last30Grouped = last30GroupedRaw as Array<{ offerId: string; _count: { _all: number } }>;

      const totalByOffer = new Map(totalGrouped.map((row) => [row.offerId, row._count._all]));
      const last30ByOffer = new Map(last30Grouped.map((row) => [row.offerId, row._count._all]));

      const rows = offers
        .map((offer) => ({
          offer_id: offer.id,
          offer_title: offer.title,
          company_id: offer.company.id,
          company_name: offer.company.name,
          leads_30_days: last30ByOffer.get(offer.id) || 0,
          total_leads: totalByOffer.get(offer.id) || 0,
          status: offer.active ? 'Active' : 'Inactive',
        }))
        .sort((a, b) => b.leads_30_days - a.leads_30_days || b.total_leads - a.total_leads);

      res.json(rows);
    } catch (error) {
      console.error('GET /api/vendor/dashboard/offer-performance error:', error);
      res.status(500).json({ error: 'Failed to load offer performance' });
    }
  }
);

router.get('/dashboard/lead-trend', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const rawDays = Number.parseInt(String(req.query.days || '14'), 10);
    const days = Number.isFinite(rawDays) ? Math.max(1, Math.min(rawDays, 90)) : 14;
    const startDate = startOfLastNDays(days);

    const leads = await prisma.lead.findMany({
      where: {
        vendorId: vendor.id,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const countsByDate = new Map<string, number>();
    const series: Array<{ date: string; leads: number }> = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = startOfToday();
      date.setDate(date.getDate() - offset);
      const key = formatDateKey(date);
      countsByDate.set(key, 0);
      series.push({ date: key, leads: 0 });
    }

    for (const lead of leads) {
      const key = formatDateKey(lead.createdAt);
      if (countsByDate.has(key)) {
        countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
      }
    }

    const finalizedSeries = series.map((point) => ({
      date: point.date,
      leads: countsByDate.get(point.date) || 0,
    }));

    res.json({
      days,
      series: finalizedSeries,
    });
  } catch (error) {
    console.error('GET /api/vendor/dashboard/lead-trend error:', error);
    res.status(500).json({ error: 'Failed to load lead trend' });
  }
});

router.get('/billing', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const [activePlan, invoices] = await Promise.all([
      (prisma as any).vendorBillingPlan.findFirst({
        where: { vendorId: vendor.id, isActive: true },
        orderBy: { updatedAt: 'desc' },
      }),
      (prisma as any).invoice.findMany({
        where: { vendorId: vendor.id },
        include: {
          lineItems: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    res.json({
      vendor: {
        id: vendor.id,
        companyName: vendor.companyName,
        email: vendor.email,
      },
      activePlan,
      invoices,
    });
  } catch (error) {
    console.error('GET /api/vendor/billing error:', error);
    res.status(500).json({ error: 'Failed to load vendor billing' });
  }
});

router.get('/billing/invoices/:id/csv', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const id = String(req.params.id);
    const invoice = await (prisma as any).invoice.findFirst({
      where: { id, vendorId: vendor.id },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const header = ['item_type', 'description', 'quantity', 'unit_price', 'amount', 'metadata_json'];
    const rows = (invoice.lineItems || []).map((item: any) =>
      [
        item.itemType,
        item.description,
        item.quantity,
        asNumber(item.unitPrice).toFixed(2),
        asNumber(item.amount).toFixed(2),
        item.metadataJson ? JSON.stringify(item.metadataJson) : '',
      ]
        .map(csvEscape)
        .join(',')
    );

    const preface = [
      ['invoice_id', invoice.id],
      ['period_start', new Date(invoice.periodStart).toISOString().slice(0, 10)],
      ['period_end', new Date(invoice.periodEnd).toISOString().slice(0, 10)],
      ['status', invoice.status],
      ['subtotal', asNumber(invoice.subtotal).toFixed(2)],
      ['tax', asNumber(invoice.tax).toFixed(2)],
      ['total', asNumber(invoice.total).toFixed(2)],
    ].map((row) => row.map(csvEscape).join(','));

    const csv = [...preface, '', header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.id}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('GET /api/vendor/billing/invoices/:id/csv error:', error);
    res.status(500).json({ error: 'Failed to export invoice CSV' });
  }
});

router.get('/offers', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const offers = await prisma.offer.findMany({
      where: { vendorId: vendor.id },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(offers);
  } catch (error) {
    console.error('GET /api/vendor/offers error:', error);
    res.status(500).json({ error: 'Failed to load vendor offers' });
  }
});

router.get('/policies/defaults', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const templates = await getDefaultPolicyTemplates();
    res.json({
      termsTemplate: {
        title: 'Default Offer Terms template',
        bodyText: templates.termsTemplate,
      },
      cancellationTemplate: {
        title: 'Default Cancellation/Refund template',
        bodyText: templates.cancellationTemplate,
      },
    });
  } catch (error) {
    console.error('GET /api/vendor/policies/defaults error:', error);
    res.status(500).json({ error: 'Failed to load default policy templates' });
  }
});

router.post('/offers', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    if (vendor.status !== 'APPROVED') {
      res.status(403).json({ error: 'Only approved vendors can create offers' });
      return;
    }

    const companyId = String(req.body?.companyId || req.body?.company_id || '').trim();
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const productName = String(req.body?.productName || req.body?.product_name || '').trim() || null;
    const productModel =
      String(req.body?.productModel || req.body?.product_model || '').trim() || null;
    const productUrl = String(req.body?.productUrl || req.body?.product_url || '').trim() || null;
    const expiryDateRaw = String(req.body?.expiryDate || req.body?.expiry_date || '').trim();
    const termsText = normalizeText(req.body?.termsText ?? req.body?.terms_text);
    const cancellationPolicyText = normalizeText(
      req.body?.cancellationPolicyText ?? req.body?.cancellation_policy_text
    );
    const redemptionInstructionsText = normalizeText(
      req.body?.redemptionInstructionsText ?? req.body?.redemption_instructions_text
    );
    const restrictionsText = normalizeText(req.body?.restrictionsText ?? req.body?.restrictions_text);
    const usePlatformDefaultTerms =
      req.body?.usePlatformDefaultTerms === undefined &&
      req.body?.use_platform_default_terms === undefined
        ? true
        : isTruthy(req.body?.usePlatformDefaultTerms ?? req.body?.use_platform_default_terms);
    const usePlatformDefaultCancellationPolicy =
      req.body?.usePlatformDefaultCancellationPolicy === undefined &&
      req.body?.use_platform_default_cancellation_policy === undefined
        ? true
        : isTruthy(
            req.body?.usePlatformDefaultCancellationPolicy ??
              req.body?.use_platform_default_cancellation_policy
          );
    const expiryDate = expiryDateRaw ? parseDateInput(expiryDateRaw) : null;

    if (!companyId || !title || !description) {
      res.status(400).json({
        error: 'Missing required fields',
        detail: 'companyId, title, and description are required',
      });
      return;
    }
    if (expiryDateRaw && !expiryDate) {
      res.status(400).json({ error: 'Invalid expiry date' });
      return;
    }
    if (expiryDate && !isFutureDate(expiryDate)) {
      res.status(400).json({ error: 'Offer end date must be in the future' });
      return;
    }

    const [company, category] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }),
      prisma.category.upsert({
        where: { slug: 'general' },
        update: { name: 'General' },
        create: { slug: 'general', name: 'General' },
        select: { id: true },
      }),
    ]);

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const created = await prisma.offer.create({
      data: {
        vendorId: vendor.id,
        companyId,
        categoryId: category.id,
        title,
        description,
        discountValue: 'Lead submission',
        discountType: 'SPECIAL',
        terms: [],
        howToClaim: [],
        active: false,
        expiryDate,
        offerType: 'lead',
        configJson: {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
        productName,
        productModel,
        productUrl,
        termsText,
        cancellationPolicyText,
        redemptionInstructionsText: redemptionInstructionsText || null,
        restrictionsText: restrictionsText || null,
        usePlatformDefaultTerms,
        usePlatformDefaultCancellationPolicy,
        complianceStatus: 'DRAFT',
        complianceNotes: null,
        vendorAttestationAcceptedAt: null,
        vendorAttestationAcceptedIp: null,
      } as any,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/vendor/offers error:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

const updateDraftOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const id = String(req.params.id);
    const existing = await prisma.offer.findUnique({
      where: { id },
      select: { id: true, vendorId: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    const offerRecord = existing as any;
    if (offerRecord.vendorId !== vendor.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (req.body?.title !== undefined) {
      const title = String(req.body.title || '').trim();
      if (!title) {
        res.status(400).json({ error: 'Title cannot be empty' });
        return;
      }
      data.title = title;
    }
    if (req.body?.description !== undefined) {
      data.description = String(req.body.description || '').trim() || null;
    }
    if (req.body?.companyId || req.body?.company_id) {
      data.companyId = String(req.body.companyId || req.body.company_id).trim();
    }
    if (req.body?.productName !== undefined || req.body?.product_name !== undefined) {
      data.productName = String(req.body?.productName || req.body?.product_name || '').trim() || null;
    }
    if (req.body?.productModel !== undefined || req.body?.product_model !== undefined) {
      data.productModel =
        String(req.body?.productModel || req.body?.product_model || '').trim() || null;
    }
    if (req.body?.productUrl !== undefined || req.body?.product_url !== undefined) {
      data.productUrl = String(req.body?.productUrl || req.body?.product_url || '').trim() || null;
    }
    if (req.body?.expiryDate !== undefined || req.body?.expiry_date !== undefined) {
      const expiryDateRaw = String(req.body?.expiryDate || req.body?.expiry_date || '').trim();
      if (!expiryDateRaw) {
        data.expiryDate = null;
      } else {
        const parsed = parseDateInput(expiryDateRaw);
        if (!parsed) {
          res.status(400).json({ error: 'Invalid expiry date' });
          return;
        }
        if (!isFutureDate(parsed)) {
          res.status(400).json({ error: 'Offer end date must be in the future' });
          return;
        }
        data.expiryDate = parsed;
      }
    }

    if (req.body?.termsText !== undefined || req.body?.terms_text !== undefined) {
      data.termsText = normalizeText(req.body?.termsText ?? req.body?.terms_text);
    }
    if (
      req.body?.cancellationPolicyText !== undefined ||
      req.body?.cancellation_policy_text !== undefined
    ) {
      data.cancellationPolicyText = normalizeText(
        req.body?.cancellationPolicyText ?? req.body?.cancellation_policy_text
      );
    }
    if (
      req.body?.redemptionInstructionsText !== undefined ||
      req.body?.redemption_instructions_text !== undefined
    ) {
      const redemptionInstructionsText = normalizeText(
        req.body?.redemptionInstructionsText ?? req.body?.redemption_instructions_text
      );
      data.redemptionInstructionsText = redemptionInstructionsText || null;
    }
    if (req.body?.restrictionsText !== undefined || req.body?.restrictions_text !== undefined) {
      const restrictionsText = normalizeText(req.body?.restrictionsText ?? req.body?.restrictions_text);
      data.restrictionsText = restrictionsText || null;
    }
    if (
      req.body?.usePlatformDefaultTerms !== undefined ||
      req.body?.use_platform_default_terms !== undefined
    ) {
      data.usePlatformDefaultTerms = isTruthy(
        req.body?.usePlatformDefaultTerms ?? req.body?.use_platform_default_terms
      );
    }
    if (
      req.body?.usePlatformDefaultCancellationPolicy !== undefined ||
      req.body?.use_platform_default_cancellation_policy !== undefined
    ) {
      data.usePlatformDefaultCancellationPolicy = isTruthy(
        req.body?.usePlatformDefaultCancellationPolicy ??
          req.body?.use_platform_default_cancellation_policy
      );
    }

    if (typeof data.companyId === 'string' && data.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
        select: { id: true },
      });
      if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }
    }

    data.active = false;
    data.complianceStatus = 'DRAFT';
    data.complianceNotes = null;
    data.vendorAttestationAcceptedAt = null;
    data.vendorAttestationAcceptedIp = null;
    data.offerType = 'lead';

    const updated = await prisma.offer.update({
      where: { id },
      data: data as any,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('PUT /api/vendor/offers/:id error:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
};

router.put('/offers/:id', authenticateToken, updateDraftOffer);
router.patch('/offers/:id', authenticateToken, updateDraftOffer);

router.post('/offers/:id/submit', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const id = String(req.params.id);
    const existing = await prisma.offer.findUnique({
      where: { id },
      select: {
        id: true,
        vendorId: true,
        title: true,
        termsText: true,
        cancellationPolicyText: true,
        redemptionInstructionsText: true,
        restrictionsText: true,
        usePlatformDefaultTerms: true,
        usePlatformDefaultCancellationPolicy: true,
        vendor: {
          select: {
            contactName: true,
            companyName: true,
            email: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      } as any,
    });

    if (!existing) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    const offerRecord: any = existing;

    if (offerRecord.vendorId !== vendor.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const usePlatformDefaultTerms =
      req.body?.usePlatformDefaultTerms === undefined &&
      req.body?.use_platform_default_terms === undefined
        ? Boolean(offerRecord.usePlatformDefaultTerms)
        : isTruthy(req.body?.usePlatformDefaultTerms ?? req.body?.use_platform_default_terms);
    const usePlatformDefaultCancellationPolicy =
      req.body?.usePlatformDefaultCancellationPolicy === undefined &&
      req.body?.use_platform_default_cancellation_policy === undefined
        ? Boolean(offerRecord.usePlatformDefaultCancellationPolicy)
        : isTruthy(
            req.body?.usePlatformDefaultCancellationPolicy ??
              req.body?.use_platform_default_cancellation_policy
          );

    const termsTextInput =
      req.body?.termsText !== undefined || req.body?.terms_text !== undefined
        ? normalizeText(req.body?.termsText ?? req.body?.terms_text)
        : normalizeText(offerRecord.termsText);
    const cancellationPolicyTextInput =
      req.body?.cancellationPolicyText !== undefined ||
      req.body?.cancellation_policy_text !== undefined
        ? normalizeText(req.body?.cancellationPolicyText ?? req.body?.cancellation_policy_text)
        : normalizeText(offerRecord.cancellationPolicyText);
    const redemptionInstructionsText =
      req.body?.redemptionInstructionsText !== undefined ||
      req.body?.redemption_instructions_text !== undefined
        ? normalizeText(req.body?.redemptionInstructionsText ?? req.body?.redemption_instructions_text)
        : normalizeText(offerRecord.redemptionInstructionsText);
    const restrictionsText =
      req.body?.restrictionsText !== undefined || req.body?.restrictions_text !== undefined
        ? normalizeText(req.body?.restrictionsText ?? req.body?.restrictions_text)
        : normalizeText(offerRecord.restrictionsText);
    const attestationAccepted = isTruthy(
      req.body?.vendorAttestationAccepted ?? req.body?.vendor_attestation_accepted
    );

    if (!attestationAccepted) {
      res.status(400).json({ error: 'Vendor attestation must be accepted before submit' });
      return;
    }

    const templates = await getDefaultPolicyTemplates();
    const finalTermsText = usePlatformDefaultTerms ? templates.termsTemplate : termsTextInput;
    const finalCancellationPolicyText = usePlatformDefaultCancellationPolicy
      ? templates.cancellationTemplate
      : cancellationPolicyTextInput;

    if (!normalizeText(finalTermsText)) {
      res.status(400).json({ error: 'Terms & Conditions text is required for submit' });
      return;
    }
    if (!normalizeText(finalCancellationPolicyText)) {
      res.status(400).json({ error: 'Cancellation/Refund policy text is required for submit' });
      return;
    }

    const acceptedAt = new Date();
    const acceptedIp = extractRequestIp(req);
    const updated = await prisma.offer.update({
      where: { id: String(offerRecord.id) },
      data: {
        termsText: finalTermsText,
        cancellationPolicyText: finalCancellationPolicyText,
        redemptionInstructionsText: redemptionInstructionsText || null,
        restrictionsText: restrictionsText || null,
        usePlatformDefaultTerms,
        usePlatformDefaultCancellationPolicy,
        vendorAttestationAcceptedAt: acceptedAt,
        vendorAttestationAcceptedIp: acceptedIp,
        complianceStatus: 'SUBMITTED',
        complianceNotes: null,
        active: false,
      } as any,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    const supportEmailResult = await sendOfferSubmittedForReviewEmail({
      offerId: String(offerRecord.id),
      vendorName: offerRecord.vendor.contactName || offerRecord.vendor.companyName,
      vendorCompany: offerRecord.vendor.companyName,
      targetCompanyName: offerRecord.company?.name,
      offerTitle: String(offerRecord.title),
      submittedAt: acceptedAt,
      submittedIp: acceptedIp,
      termsText: finalTermsText,
      cancellationPolicyText: finalCancellationPolicyText,
      restrictionsText: restrictionsText || null,
      redemptionInstructionsText: redemptionInstructionsText || null,
    });

    if (!supportEmailResult.sent) {
      console.error('Offer submit notification email failed:', {
        offerId: offerRecord.id,
        error: supportEmailResult.error,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('POST /api/vendor/offers/:id/submit error:', error);
    res.status(500).json({ error: 'Failed to submit offer for review' });
  }
});

router.get('/leads', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const status = String(req.query.status || '').trim().toUpperCase();
    const fromDate = toDate(req.query.date_from);
    const toDateValue = toDate(req.query.date_to);
    const exportFormat = String(req.query.export || '').trim().toLowerCase();

    const where: Record<string, unknown> = { vendorId: vendor.id };
    if (status) where.status = status;
    if (fromDate || toDateValue) {
      where.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDateValue ? { lte: toDateValue } : {}),
      };
    }

    const leads = await prisma.lead.findMany({
      where: where as any,
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            productName: true,
            productModel: true,
            productUrl: true,
          } as any,
        },
        company: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (exportFormat === 'csv') {
      const header = [
        'lead_id',
        'status',
        'name',
        'email',
        'phone',
        'company',
        'offer',
        'product_name',
        'product_model',
        'product_url',
        'vendor_notes',
        'created_at',
      ];

      const rows = leads.map((lead) =>
        [
          lead.id,
          lead.status,
          `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
          lead.email,
          lead.phone || '',
          lead.company.name,
          lead.offer.title,
          (lead.offer as any).productName || '',
          (lead.offer as any).productModel || '',
          (lead.offer as any).productUrl || '',
          lead.vendorNotes || '',
          lead.createdAt.toISOString(),
        ]
          .map(csvEscape)
          .join(',')
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="vendor-leads-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send([header.join(','), ...rows].join('\n'));
      return;
    }

    res.json(leads);
  } catch (error) {
    console.error('GET /api/vendor/leads error:', error);
    res.status(500).json({ error: 'Failed to load vendor leads' });
  }
});

router.get('/leads/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const id = String(req.params.id);
    const lead = await prisma.lead.findFirst({
      where: { id, vendorId: vendor.id },
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            productName: true,
            productModel: true,
            productUrl: true,
          } as any,
        },
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json(lead);
  } catch (error) {
    console.error('GET /api/vendor/leads/:id error:', error);
    res.status(500).json({ error: 'Failed to load lead' });
  }
});

router.patch('/leads/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const id = String(req.params.id);
    const nextStatusRaw = req.body?.status;
    const vendorNotes = req.body?.vendor_notes ?? req.body?.vendorNotes;
    const nextStatus =
      nextStatusRaw === undefined ? undefined : String(nextStatusRaw).trim().toUpperCase();

    const lead = await prisma.lead.findFirst({
      where: { id, vendorId: vendor.id },
      select: { id: true, status: true },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (nextStatus) {
      const current = String(lead.status).toUpperCase();
      const normalizedCurrent = current === 'SENT' ? 'NEW' : current;
      const allowedTransitions: Record<string, string> = {
        NEW: 'CONTACTED',
        CONTACTED: 'QUALIFIED',
        QUALIFIED: 'CONVERTED',
        CONVERTED: 'CLOSED',
      };
      if (
        normalizedCurrent !== nextStatus &&
        allowedTransitions[normalizedCurrent] !== nextStatus
      ) {
        res.status(400).json({
          error: 'Invalid status transition',
          detail: `${normalizedCurrent} can only move to ${allowedTransitions[normalizedCurrent] || 'N/A'}`,
        });
        return;
      }
    }

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...(nextStatus ? { status: nextStatus as any } : {}),
        ...(vendorNotes !== undefined ? { vendorNotes: String(vendorNotes || '') } : {}),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/vendor/leads/:id error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

export default router;
