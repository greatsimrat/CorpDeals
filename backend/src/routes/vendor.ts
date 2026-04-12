import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken, authenticateTokenOptional, requireVendorOnly } from '../middleware/auth';
import { buildAuthUserPayload } from '../lib/auth-user';
import {
  sendOfferSubmittedForReviewEmail,
  sendVendorApplicationInternalEmail,
} from '../lib/mailer';
import { verifyVendorSetPasswordToken } from '../lib/vendor-password';
import { DEFAULT_USER_ROLE } from '../lib/roles';
import {
  normalizePhone,
  vendorApplicationSchema,
} from '../lib/vendor-application';
import { resolveCoverageInput } from '../lib/offer-coverage';
import {
  getUniqueOfferSlug,
  normalizeJsonField,
  normalizeOfferDetailTemplateType,
  normalizeOptionalUrl,
} from '../lib/offer-details';
import { getVendorBillingState } from '../lib/vendor-billing';
import { getVendorBillingAccess, toBillingAccessDeniedResponse } from '../lib/vendor-billing-access';
import {
  applyVendorSubscriptionPlan,
  resolveVendorSubscriptionPlanTier,
} from '../lib/vendor-subscription-plan';
import {
  cancelRecurringGoldSubscription,
  confirmGoldCheckoutSession,
  createGoldCheckoutSession,
  getRecurringSubscriptionSnapshot,
  mapStripeStatusToAssociation,
} from '../lib/recurring-billing';

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

  const [leadsToday, leadsMonth, activeOffers, qualifiedLeads, leadsSent, hiddenLeads] = await Promise.all([
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
        offerState: 'APPROVED',
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
    prisma.vendorLeadEvent.count({
      where: {
        vendorId,
        visibilityStatus: 'LOCKED',
      } as any,
    }),
  ]);

  return {
    leads_today: leadsToday,
    leads_month: leadsMonth,
    active_offers: activeOffers,
    qualified_leads: qualifiedLeads,
    leads_sent: leadsSent,
    hidden_leads: hiddenLeads,
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

const serializeVendorLeadForResponse = (lead: any) => {
  const visibilityStatus = String(lead?.vendorLeadEvent?.visibilityStatus || 'VISIBLE').toUpperCase();
  const lockedReason = lead?.vendorLeadEvent?.lockedReason || null;
  const isLocked = visibilityStatus === 'LOCKED';

  if (!isLocked) {
    return {
      ...lead,
      visibilityStatus: 'VISIBLE',
      lockedReason: null,
      leadAccess: 'VISIBLE',
      contactVisible: true,
    };
  }

  return {
    ...lead,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    message: null,
    employeeId: null,
    consentIp: null,
    visibilityStatus: 'LOCKED',
    lockedReason,
    leadAccess: 'LOCKED',
    contactVisible: false,
  };
};

type OfferLifecycleStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'CANCELLED'
  | 'REJECTED';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildReplicatedOfferTitle = (
  title: string,
  sourceCompanyName: string,
  targetCompanyName: string
) => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return `${targetCompanyName} employee offer`;
  if (!sourceCompanyName.trim()) return normalizedTitle;

  const pattern = new RegExp(escapeRegExp(sourceCompanyName.trim()), 'ig');
  return pattern.test(normalizedTitle)
    ? normalizedTitle.replace(pattern, targetCompanyName.trim())
    : normalizedTitle;
};

const loadOwnedOffer = async (
  vendorId: string,
  offerId: string,
  select?: Record<string, unknown>
) => {
  const offer: any = await prisma.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      vendorId: true,
      title: true,
      active: true,
      offerStatus: true,
      offerState: true,
      complianceStatus: true,
      ...(select || {}),
    } as any,
  });

  if (!offer || offer.vendorId !== vendorId) {
    return null;
  }

  return offer as any;
};

const requireVendorUser = async (req: Request, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (!req.user.vendorId) {
    res.status(403).json({ error: 'Vendor profile not found' });
    return null;
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: req.user.vendorId },
  });

  if (!vendor) {
    res.status(403).json({ error: 'Vendor profile not found' });
    return null;
  }

  return vendor;
};

router.post('/apply', authenticateTokenOptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = vendorApplicationSchema.safeParse({
      businessName: req.body?.businessName || req.body?.business_name,
      contactName: req.body?.contactName || req.body?.contact_name,
      contactEmail: req.body?.contactEmail || req.body?.contact_email,
      businessEmail: req.body?.businessEmail || req.body?.business_email,
      phone: req.body?.phone,
      website: req.body?.website,
      category: req.body?.category,
      categoryOther: req.body?.categoryOther || req.body?.category_other,
      city: req.body?.city,
      notes: req.body?.notes || req.body?.description || req.body?.additionalInfo,
      jobTitle: req.body?.jobTitle || req.body?.job_title,
      targetCompanies: req.body?.targetCompanies || req.body?.target_companies,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        Object.values(fieldErrors)
          .flat()
          .find(Boolean) || 'Invalid application details';
      res.status(400).json({
        error: firstError,
        fieldErrors,
      });
      return;
    }

    const {
      businessName,
      contactName,
      contactEmail,
      businessEmail,
      phone,
      website,
      category,
      categoryOther,
      city,
      notes,
      jobTitle,
      targetCompanies,
    } = parsed.data;

    const resolvedCategory = category === 'Other' ? categoryOther.trim() : category;

    if (req.user && !['USER', 'VENDOR'].includes(req.user.role)) {
      res.status(403).json({ error: 'This account cannot be used for vendor applications' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: contactEmail },
      select: {
        id: true,
        email: true,
        role: true,
        vendorId: true,
        vendor: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
    if (existingUser && req.user?.id && existingUser.id !== req.user.id) {
      res.status(400).json({ error: 'This contact email already belongs to another account' });
      return;
    }

    if (!req.user?.id && existingUser) {
      if (existingUser.vendor) {
        const statusLabel =
          existingUser.vendor.status === 'APPROVED'
            ? 'already has an approved vendor workspace'
            : 'already has a vendor application in progress';
        res.status(409).json({ error: `This email ${statusLabel}. Sign in to continue.` });
        return;
      }

      res.status(409).json({
        error: 'This email already has a CorpDeals account. Sign in first to continue your partner application.',
      });
      return;
    }

    const applicantUser = req.user?.id
      ? await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            email: true,
            role: true,
            vendorId: true,
            vendor: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        })
      : existingUser;

    if (applicantUser?.vendor) {
      const statusLabel =
        applicantUser.vendor.status === 'APPROVED'
          ? 'You already have an approved vendor workspace'
          : 'Your vendor application is already under review';
      res.status(409).json({ error: statusLabel });
      return;
    }

    const duplicateVendorByEmail = await prisma.vendor.findFirst({
      where: {
        OR: [
          { email: contactEmail },
          { email: businessEmail },
          { businessEmail: contactEmail },
          { businessEmail },
        ],
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (duplicateVendorByEmail) {
      res.status(409).json({
        error: 'A partner application already exists for this email address',
      });
      return;
    }

    if (phone) {
      const vendorPhones = await prisma.vendor.findMany({
        where: {
          NOT: {
            phone: null,
          },
        },
        select: {
          id: true,
          phone: true,
          status: true,
        },
      });
      const duplicatePhone = vendorPhones.find(
        (vendor) => normalizePhone(vendor.phone || '') === phone
      );
      if (duplicatePhone) {
        res.status(409).json({
          error: 'A partner application already exists for this phone number',
        });
        return;
      }
    }

    const additionalInfo = [
      targetCompanies ? `Target companies: ${targetCompanies}` : null,
      notes ? `Additional notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const created = await prisma.$transaction(async (tx) => {
      const user =
        applicantUser ||
        (await tx.user.create({
          data: {
            email: contactEmail,
            role: DEFAULT_USER_ROLE,
            name: contactName,
            passwordHash: null as any,
          } as any,
        }));

      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          companyName: businessName,
          contactName,
          email: contactEmail,
          businessEmail,
          phone: phone || null,
          website: website || null,
          businessType: resolvedCategory || null,
          city: city || null,
          notes: notes || null,
          description: null,
          status: 'PENDING',
        } as any,
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          vendorId: vendor.id,
        } as any,
      });

      const request = await tx.vendorRequest.create({
        data: {
          vendorId: vendor.id,
          businessType: resolvedCategory || null,
          categoryOther: category === 'Other' ? categoryOther || null : null,
          description: null,
          jobTitle: jobTitle || null,
          additionalInfo: additionalInfo || null,
          status: 'PENDING',
        } as any,
      });

      return { user, vendor, request };
    });

    const internalEmail = await sendVendorApplicationInternalEmail({
      businessName,
      contactName,
      contactEmail,
      businessEmail,
      phone: phone || null,
      website: website || null,
      category: resolvedCategory || null,
      city: city || null,
      jobTitle: jobTitle || null,
      notes:
        [
          targetCompanies ? `Target companies: ${targetCompanies}` : null,
          notes ? `Notes: ${notes}` : null,
        ]
          .filter(Boolean)
          .join('\n') || null,
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
      requestId: created.request.id,
      message: 'Thanks. We have your company details and will follow up if there is a fit.',
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
    if (!user || !user.vendor) {
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
    if (!user || !user.vendor) {
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

router.get('/dashboard', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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

router.get('/dashboard/summary', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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
  requireVendorOnly,
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
  requireVendorOnly,
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

router.get('/dashboard/lead-trend', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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

router.get('/billing', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const [billingState, invoices, hiddenLeadCount, walletTransactions] = await Promise.all([
      getVendorBillingState(vendor.id),
      (prisma as any).invoice.findMany({
        where: { vendorId: vendor.id },
        include: {
          lineItems: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
      }),
      (prisma as any).vendorLeadEvent.count({
        where: {
          vendorId: vendor.id,
          visibilityStatus: 'LOCKED',
        },
      }),
      (prisma as any).vendorWalletTransaction.findMany({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);
    const stripeSubscription = billingState.billingProfile?.stripeSubscriptionId
      ? await getRecurringSubscriptionSnapshot(String(billingState.billingProfile.stripeSubscriptionId))
      : null;

    res.json({
      vendor: {
        id: vendor.id,
        companyName: vendor.companyName,
        email: vendor.email,
      },
      billingProfile: billingState.billingProfile,
      activePlan: billingState.activePlan,
      latestPlan: billingState.latestPlan,
      planStatus: billingState.planStatus,
      planDisplayName: billingState.planDisplayName,
      offerLimit: billingState.offerLimit,
      managedOfferCount: billingState.managedOfferCount,
      liveOfferCount: billingState.liveOfferCount,
      remainingOfferSlots: billingState.remainingOfferSlots,
      canCreateOffer: billingState.canCreateOffer,
      canPublishOffer: billingState.canPublishOffer,
      createOfferMessage: billingState.createOfferMessage,
      publishOfferMessage: billingState.publishOfferMessage,
      hiddenLeadCount,
      walletBalance: billingState.billingProfile?.walletBalance ?? '0.00',
      currencyCode: billingState.billingProfile?.currencyCode || billingState.billingProfile?.currency || 'CAD',
      includedLeadsTotal: billingState.billingProfile?.includedLeadsTotal ?? 0,
      includedLeadsUsed: billingState.billingProfile?.includedLeadsUsed ?? 0,
      walletTransactions,
      stripeSubscription,
      invoices,
    });
  } catch (error) {
    console.error('GET /api/vendor/billing error:', error);
    res.status(500).json({ error: 'Failed to load vendor billing' });
  }
});

router.put('/billing/plan', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    if (vendor.status !== 'APPROVED') {
      res.status(403).json({ error: 'Only approved vendors can update billing plans' });
      return;
    }

    const requestedTier = resolveVendorSubscriptionPlanTier(
      req.body?.planTier ?? req.body?.subscriptionTier ?? req.body?.tier
    );
    if (!requestedTier) {
      res.status(400).json({ error: 'planTier must be one of FREE, GOLD, or PREMIUM' });
      return;
    }

    const existingBilling = await prisma.vendorBilling.findUnique({
      where: { vendorId: vendor.id },
      select: { billingDay: true },
    });
    const billingCycleDayRaw = req.body?.billingCycleDay ?? req.body?.billing_cycle_day;
    const billingCycleDay =
      billingCycleDayRaw === undefined || billingCycleDayRaw === null || String(billingCycleDayRaw).trim() === ''
        ? existingBilling?.billingDay || 1
        : Number(billingCycleDayRaw);
    if (!Number.isInteger(billingCycleDay) || billingCycleDay < 1 || billingCycleDay > 28) {
      res.status(400).json({ error: 'billingCycleDay must be an integer between 1 and 28' });
      return;
    }

    if (requestedTier === 'GOLD') {
      res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        detail: 'Gold plan requires recurring payment setup. Start checkout first.',
        code: 'GOLD_REQUIRES_CHECKOUT',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await applyVendorSubscriptionPlan(tx, {
        vendorId: vendor.id,
        planTier: requestedTier,
        billingCycleDay,
        paymentMethod: 'MANUAL',
        statusReason: 'vendor-self-service-plan-update',
      });
    });

    const billingState = await getVendorBillingState(vendor.id);
    res.json({
      message: 'Billing plan updated',
      planTier: requestedTier,
      billingProfile: billingState.billingProfile,
      activePlan: billingState.activePlan,
      latestPlan: billingState.latestPlan,
      planStatus: billingState.planStatus,
      planDisplayName: billingState.planDisplayName,
      offerLimit: billingState.offerLimit,
      managedOfferCount: billingState.managedOfferCount,
      liveOfferCount: billingState.liveOfferCount,
      remainingOfferSlots: billingState.remainingOfferSlots,
      canCreateOffer: billingState.canCreateOffer,
      canPublishOffer: billingState.canPublishOffer,
      createOfferMessage: billingState.createOfferMessage,
      publishOfferMessage: billingState.publishOfferMessage,
    });
  } catch (error) {
    if (String((error as any)?.message || '').startsWith('PLAN_CONFIG_INACTIVE:')) {
      res.status(409).json({ error: 'Selected billing plan is inactive and cannot be assigned' });
      return;
    }
    console.error('PUT /api/vendor/billing/plan error:', error);
    res.status(500).json({ error: 'Failed to update billing plan' });
  }
});

router.post(
  '/billing/checkout-session',
  authenticateToken,
  requireVendorOnly,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const vendor = await requireVendorUser(req, res);
      if (!vendor) return;

      if (vendor.status !== 'APPROVED') {
        res.status(403).json({ error: 'Only approved vendors can upgrade billing plans' });
        return;
      }

      const requestedTier = resolveVendorSubscriptionPlanTier(
        req.body?.planTier ?? req.body?.subscriptionTier ?? req.body?.tier
      );
      if (requestedTier !== 'GOLD') {
        res.status(400).json({ error: 'Only GOLD checkout is supported for recurring billing' });
        return;
      }

      const billing = await prisma.vendorBilling.findUnique({
        where: { vendorId: vendor.id },
        select: {
          stripeCustomerId: true,
          billingDay: true,
        },
      });

      const checkout = await createGoldCheckoutSession({
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        vendorEmail: vendor.email,
        stripeCustomerId: billing?.stripeCustomerId || null,
      });

      await prisma.vendorBilling.upsert({
        where: { vendorId: vendor.id },
        update: {
          paymentMethod: 'STRIPE',
          associationStatus: 'INCOMPLETE',
          statusReason: 'stripe-checkout-started',
          lastValidatedAt: new Date(),
          billingDay: billing?.billingDay || 1,
          ...(checkout.stripeCustomerId ? { stripeCustomerId: checkout.stripeCustomerId } : {}),
        } as any,
        create: {
          vendorId: vendor.id,
          billingMode: 'MONTHLY',
          postTrialMode: 'MONTHLY',
          trialEndsAt: null,
          leadPriceCents: 0,
          monthlyFeeCents: 10000,
          paymentMethod: 'STRIPE',
          currency: 'CAD',
          currencyCode: 'CAD',
          includedLeadsTotal: 100,
          includedLeadsUsed: 0,
          walletBalance: '0.00',
          billingDay: billing?.billingDay || 1,
          associationStatus: 'INCOMPLETE',
          statusReason: 'stripe-checkout-started',
          lastValidatedAt: new Date(),
          ...(checkout.stripeCustomerId ? { stripeCustomerId: checkout.stripeCustomerId } : {}),
        } as any,
      });

      res.status(201).json({
        message: 'Checkout session created',
        planTier: 'GOLD',
        provider: checkout.provider,
        sessionId: checkout.sessionId,
        checkoutUrl: checkout.checkoutUrl,
      });
    } catch (error) {
      console.error('POST /api/vendor/billing/checkout-session error:', error);
      res.status(500).json({ error: 'Failed to start billing checkout' });
    }
  }
);

router.post(
  '/billing/checkout/confirm',
  authenticateToken,
  requireVendorOnly,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const vendor = await requireVendorUser(req, res);
      if (!vendor) return;

      const sessionId = String(req.body?.sessionId || req.body?.session_id || '').trim();
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      const existingBilling = await prisma.vendorBilling.findUnique({
        where: { vendorId: vendor.id },
        select: {
          stripeCustomerId: true,
          billingDay: true,
        },
      });

      const snapshot = await confirmGoldCheckoutSession({
        sessionId,
        vendorId: vendor.id,
        fallbackCustomerId: existingBilling?.stripeCustomerId || null,
      });
      const mappedAssociation = mapStripeStatusToAssociation(snapshot.status);

      await prisma.$transaction(async (tx) => {
        await applyVendorSubscriptionPlan(tx, {
          vendorId: vendor.id,
          planTier: 'GOLD',
          billingCycleDay: existingBilling?.billingDay || 1,
          paymentMethod: 'STRIPE',
          associationStatus: mappedAssociation as any,
          statusReason: snapshot.cancelAtPeriodEnd
            ? 'stripe-cancel-at-period-end'
            : 'stripe-checkout-confirmed',
          stripeCustomerId: snapshot.customerId || existingBilling?.stripeCustomerId || null,
          stripeSubscriptionId: snapshot.subscriptionId,
          cycleStartAt: new Date(),
          cycleEndAt: snapshot.currentPeriodEnd,
        });
      });

      const billingState = await getVendorBillingState(vendor.id);
      res.json({
        message: 'Gold subscription activated',
        planTier: 'GOLD',
        subscription: {
          provider: snapshot.provider,
          id: snapshot.subscriptionId,
          status: snapshot.status,
          cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
          currentPeriodEnd: snapshot.currentPeriodEnd,
        },
        billingProfile: billingState.billingProfile,
        activePlan: billingState.activePlan,
        latestPlan: billingState.latestPlan,
        planStatus: billingState.planStatus,
        planDisplayName: billingState.planDisplayName,
      });
    } catch (error: any) {
      console.error('POST /api/vendor/billing/checkout/confirm error:', error);
      res.status(400).json({
        error: error?.message || 'Failed to confirm billing checkout',
      });
    }
  }
);

router.post(
  '/billing/subscription/cancel',
  authenticateToken,
  requireVendorOnly,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const vendor = await requireVendorUser(req, res);
      if (!vendor) return;

      const billing = await prisma.vendorBilling.findUnique({
        where: { vendorId: vendor.id },
      });
      if (!billing || !billing.stripeSubscriptionId) {
        res.status(400).json({ error: 'No recurring subscription found for this vendor' });
        return;
      }

      const snapshot = await cancelRecurringGoldSubscription({
        subscriptionId: String(billing.stripeSubscriptionId),
      });
      const mappedAssociation = mapStripeStatusToAssociation(snapshot.status);

      await prisma.vendorBilling.update({
        where: { vendorId: vendor.id },
        data: {
          associationStatus: mappedAssociation as any,
          statusReason: snapshot.cancelAtPeriodEnd
            ? 'stripe-cancel-at-period-end'
            : 'stripe-subscription-updated',
          billingCycleEndAt: snapshot.currentPeriodEnd,
          lastValidatedAt: new Date(),
        } as any,
      });

      const billingState = await getVendorBillingState(vendor.id);
      res.json({
        message: snapshot.cancelAtPeriodEnd
          ? 'Subscription cancellation scheduled at period end'
          : 'Subscription updated',
        cancellationScheduled: snapshot.cancelAtPeriodEnd,
        subscription: {
          provider: snapshot.provider,
          id: snapshot.subscriptionId,
          status: snapshot.status,
          cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
          currentPeriodEnd: snapshot.currentPeriodEnd,
        },
        billingProfile: billingState.billingProfile,
      });
    } catch (error: any) {
      console.error('POST /api/vendor/billing/subscription/cancel error:', error);
      res.status(400).json({
        error: error?.message || 'Failed to cancel recurring subscription',
      });
    }
  }
);

router.get('/billing/wallet', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const [billingProfile, recentTransactions] = await Promise.all([
      prisma.vendorBilling.findUnique({
        where: { vendorId: vendor.id },
      }),
      (prisma as any).vendorWalletTransaction.findMany({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    res.json({
      vendorId: vendor.id,
      walletBalance: billingProfile?.walletBalance ?? '0.00',
      currencyCode: billingProfile?.currencyCode || billingProfile?.currency || 'CAD',
      includedLeadsTotal: billingProfile?.includedLeadsTotal ?? 0,
      includedLeadsUsed: billingProfile?.includedLeadsUsed ?? 0,
      transactions: recentTransactions,
    });
  } catch (error) {
    console.error('GET /api/vendor/billing/wallet error:', error);
    res.status(500).json({ error: 'Failed to load vendor wallet' });
  }
});

router.post('/billing/wallet/top-up', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const amountRaw = Number(req.body?.amount);
    const amount = Number.isFinite(amountRaw) ? Math.round(amountRaw * 100) / 100 : 0;
    if (amount <= 0) {
      res.status(400).json({ error: 'Top-up amount must be greater than zero' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const billing = await tx.vendorBilling.upsert({
        where: { vendorId: vendor.id },
        update: {},
        create: {
          vendorId: vendor.id,
          billingMode: 'FREE',
          postTrialMode: 'FREE',
          associationStatus: 'INACTIVE',
          statusReason: 'wallet-top-up-bootstrap',
          currency: 'CAD',
          currencyCode: 'CAD',
          walletBalance: '0.00',
        } as any,
      });

      const before = asNumber((billing as any).walletBalance);
      const after = Math.round((before + amount) * 100) / 100;

      const updated = await tx.vendorBilling.update({
        where: { vendorId: vendor.id },
        data: {
          walletBalance: after.toFixed(2),
          lastValidatedAt: new Date(),
        } as any,
      });

      const transaction = await (tx as any).vendorWalletTransaction.create({
        data: {
          vendorId: vendor.id,
          subscriptionId: (billing as any).id,
          type: 'TOP_UP',
          amount: amount.toFixed(2),
          balanceBefore: before.toFixed(2),
          balanceAfter: after.toFixed(2),
          referenceType: 'MANUAL_TOP_UP',
          referenceId: null,
        },
      });

      return { updated, transaction };
    });

    res.status(201).json({
      message: 'Wallet topped up',
      walletBalance: result.updated.walletBalance,
      currencyCode: result.updated.currencyCode || result.updated.currency || 'CAD',
      transaction: result.transaction,
    });
  } catch (error) {
    console.error('POST /api/vendor/billing/wallet/top-up error:', error);
    res.status(500).json({ error: 'Failed to top up wallet' });
  }
});

router.get('/billing/invoices/:id/csv', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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

router.get('/offers', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    await getVendorBillingState(vendor.id);

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

router.get('/policies/defaults', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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

router.post('/offers', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    if (vendor.status !== 'APPROVED') {
      res.status(403).json({ error: 'Only approved vendors can create offers' });
      return;
    }

    const billingAccess = await getVendorBillingAccess(vendor.id, 'CREATE_OFFER');
    if (!billingAccess.allowed) {
      res.status(403).json(toBillingAccessDeniedResponse(billingAccess));
      return;
    }

    const companyId = String(req.body?.companyId || req.body?.company_id || '').trim();
    const categoryId = String(req.body?.categoryId || req.body?.category_id || '').trim();
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
    const coverage = resolveCoverageInput({
      coverageType: req.body?.coverageType ?? req.body?.coverage_type,
      provinceCode: req.body?.provinceCode ?? req.body?.province_code,
      cityName: req.body?.cityName ?? req.body?.city_name,
    });
    const expiryDate = expiryDateRaw ? parseDateInput(expiryDateRaw) : null;

    if (!companyId || !categoryId || !title || !description) {
      res.status(400).json({
        error: 'Missing required fields',
        detail: 'companyId, categoryId, title, and description are required',
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
    if (coverage.error) {
      res.status(400).json({ error: coverage.error });
      return;
    }

    const [company, category] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }),
      prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, active: true, parentId: true },
      } as any),
    ]);

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    if (!category.active) {
      res.status(400).json({ error: 'Selected category/subcategory is inactive' });
      return;
    }
    if (category.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: category.parentId },
        select: { id: true, active: true },
      });
      if (!parentCategory || !parentCategory.active) {
        res.status(400).json({ error: 'Parent category is inactive for selected subcategory' });
        return;
      }
    }

    const created = await prisma.offer.create({
      data: {
        slug: await getUniqueOfferSlug(title),
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
        coverageType: coverage.coverageType,
        provinceCode: coverage.provinceCode,
        cityName: coverage.cityName,
        detailTemplateType: normalizeOfferDetailTemplateType(req.body?.detailTemplateType),
        highlightsJson: normalizeJsonField(req.body?.highlightsJson),
        detailSectionsJson: normalizeJsonField(req.body?.detailSectionsJson),
        termsUrl: normalizeOptionalUrl(req.body?.termsUrl),
        cancellationPolicyUrl: normalizeOptionalUrl(req.body?.cancellationPolicyUrl),
        offerStatus: 'DRAFT',
        offerState: 'DRAFT',
        complianceStatus: 'DRAFT',
        complianceNotes: null,
        vendorAttestationAcceptedAt: null,
        vendorAttestationAcceptedIp: null,
        pausedAt: null,
        pausedByUserId: null,
        cancelledAt: null,
        cancelledByUserId: null,
        cancelReason: null,
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

router.post(
  '/offers/:id/replicate',
  authenticateToken,
  requireVendorOnly,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const vendor = await requireVendorUser(req, res);
      if (!vendor) return;

      if (vendor.status !== 'APPROVED') {
        res.status(403).json({ error: 'Only approved vendors can replicate offers' });
        return;
      }

      const billingAccess = await getVendorBillingAccess(vendor.id, 'CREATE_OFFER');
      if (!billingAccess.allowed) {
        res.status(403).json(toBillingAccessDeniedResponse(billingAccess));
        return;
      }

      const id = String(req.params.id || '').trim();
      const targetCompanyId = String(
        req.body?.targetCompanyId || req.body?.target_company_id || ''
      ).trim();

      if (!id || !targetCompanyId) {
        res.status(400).json({ error: 'Offer id and target company are required' });
        return;
      }

      const existing = await prisma.offer.findUnique({
        where: { id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!existing) {
        res.status(404).json({ error: 'Offer not found' });
        return;
      }

      if (existing.vendorId !== vendor.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (existing.companyId === targetCompanyId) {
        res.status(400).json({
          error: 'Replicate this offer to a different company. The current company cannot be selected.',
        });
        return;
      }

      const targetCompany = await prisma.company.findUnique({
        where: { id: targetCompanyId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      if (!targetCompany) {
        res.status(404).json({ error: 'Target company not found' });
        return;
      }

      const activeCategory = await prisma.category.findUnique({
        where: { id: existing.categoryId },
        select: { id: true, active: true, parentId: true },
      } as any);
      if (!activeCategory) {
        res.status(404).json({ error: 'Offer category not found' });
        return;
      }
      if (!activeCategory.active) {
        res.status(400).json({ error: 'Offer category is inactive and cannot be used for replication' });
        return;
      }
      if (activeCategory.parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: activeCategory.parentId },
          select: { id: true, active: true },
        });
        if (!parentCategory || !parentCategory.active) {
          res.status(400).json({ error: 'Parent category is inactive for offer category' });
          return;
        }
      }

      const replicatedTitle = buildReplicatedOfferTitle(
        existing.title,
        existing.company.name,
        targetCompany.name
      );
      const slug = await getUniqueOfferSlug(replicatedTitle);

      const duplicated = await prisma.offer.create({
        data: {
          slug,
          vendorId: existing.vendorId,
          companyId: targetCompany.id,
          categoryId: existing.categoryId,
          offerType: existing.offerType,
          coverageType: existing.coverageType,
          provinceCode: existing.provinceCode,
          cityName: existing.cityName,
          detailTemplateType: existing.detailTemplateType,
          highlightsJson: existing.highlightsJson,
          detailSectionsJson: existing.detailSectionsJson,
          configJson: existing.configJson,
          productName: existing.productName,
          productModel: existing.productModel,
          productUrl: existing.productUrl,
          title: replicatedTitle,
          description: existing.description,
          discountValue: existing.discountValue,
          discountType: existing.discountType,
          originalPrice: existing.originalPrice,
          discountedPrice: existing.discountedPrice,
          terms: existing.terms,
          howToClaim: existing.howToClaim,
          expiryDate: existing.expiryDate,
          featured: false,
          verified: false,
          active: false,
          location: existing.location,
          image: existing.image,
          rating: 0,
          reviewCount: 0,
          leadCount: 0,
          termsText: existing.termsText,
          termsUrl: existing.termsUrl,
          cancellationPolicyText: existing.cancellationPolicyText,
          cancellationPolicyUrl: existing.cancellationPolicyUrl,
          redemptionInstructionsText: existing.redemptionInstructionsText,
          restrictionsText: existing.restrictionsText,
          usePlatformDefaultTerms: existing.usePlatformDefaultTerms,
          usePlatformDefaultCancellationPolicy: existing.usePlatformDefaultCancellationPolicy,
          offerStatus: 'DRAFT',
          offerState: 'DRAFT',
          vendorAttestationAcceptedAt: null,
          vendorAttestationAcceptedIp: null,
          complianceStatus: 'DRAFT',
          complianceNotes: null,
          pausedAt: null,
          pausedByUserId: null,
          cancelledAt: null,
          cancelledByUserId: null,
          cancelReason: null,
        } as any,
        include: {
          company: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { leads: true },
          },
        },
      });

      res.status(201).json({
        message: `Created a draft copy for ${targetCompany.name}`,
        offer: duplicated,
      });
    } catch (error) {
      console.error('POST /api/vendor/offers/:id/replicate error:', error);
      res.status(500).json({ error: 'Failed to replicate offer' });
    }
  }
);

const updateDraftOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const id = String(req.params.id);
    const existing = await prisma.offer.findUnique({
      where: { id },
      select: {
        id: true,
        vendorId: true,
        slug: true,
        title: true,
        offerStatus: true,
        offerState: true,
        coverageType: true,
        provinceCode: true,
        cityName: true,
      },
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
    if (String(offerRecord.offerState || '').toUpperCase() === 'CANCELLED') {
      res.status(400).json({ error: 'Cancelled offers cannot be edited. Replicate the offer instead.' });
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
    if (req.body?.slug !== undefined) {
      data.slug = await getUniqueOfferSlug(
        String(req.body.slug || req.body.title || offerRecord.title || 'offer'),
        offerRecord.id
      );
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
    if (req.body?.detailTemplateType !== undefined) {
      data.detailTemplateType = normalizeOfferDetailTemplateType(req.body.detailTemplateType);
    }
    if (req.body?.highlightsJson !== undefined) {
      data.highlightsJson = normalizeJsonField(req.body.highlightsJson);
    }
    if (req.body?.detailSectionsJson !== undefined) {
      data.detailSectionsJson = normalizeJsonField(req.body.detailSectionsJson);
    }
    if (req.body?.termsUrl !== undefined) {
      data.termsUrl = normalizeOptionalUrl(req.body.termsUrl);
    }
    if (req.body?.cancellationPolicyUrl !== undefined) {
      data.cancellationPolicyUrl = normalizeOptionalUrl(req.body.cancellationPolicyUrl);
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
    const coverage = resolveCoverageInput({
      coverageType:
        req.body?.coverageType !== undefined || req.body?.coverage_type !== undefined
          ? req.body?.coverageType ?? req.body?.coverage_type
          : offerRecord.coverageType,
      provinceCode:
        req.body?.provinceCode !== undefined || req.body?.province_code !== undefined
          ? req.body?.provinceCode ?? req.body?.province_code
          : offerRecord.provinceCode,
      cityName:
        req.body?.cityName !== undefined || req.body?.city_name !== undefined
          ? req.body?.cityName ?? req.body?.city_name
          : offerRecord.cityName,
    });
    if (coverage.error) {
      res.status(400).json({ error: coverage.error });
      return;
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
    data.offerStatus = 'DRAFT';
    data.offerState = 'DRAFT';
    data.complianceStatus = 'DRAFT';
    data.complianceNotes = null;
    data.vendorAttestationAcceptedAt = null;
    data.vendorAttestationAcceptedIp = null;
    data.pausedAt = null;
    data.pausedByUserId = null;
    data.cancelledAt = null;
    data.cancelledByUserId = null;
    data.cancelReason = null;
    data.offerType = 'lead';
    data.coverageType = coverage.coverageType;
    data.provinceCode = coverage.provinceCode;
    data.cityName = coverage.cityName;

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

router.put('/offers/:id', authenticateToken, requireVendorOnly, updateDraftOffer);
router.patch('/offers/:id', authenticateToken, requireVendorOnly, updateDraftOffer);

router.post('/offers/:id/submit', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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
        offerStatus: true,
        offerState: true,
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
    const billingAccess = await getVendorBillingAccess(vendor.id, 'SUBMIT_OFFER', {
      excludeOfferId: String(offerRecord.id),
    });
    if (!billingAccess.allowed) {
      res.status(400).json(toBillingAccessDeniedResponse(billingAccess));
      return;
    }
    if (String(offerRecord.offerState || '').toUpperCase() === 'CANCELLED') {
      res.status(400).json({ error: 'Cancelled offers cannot be submitted' });
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
        offerStatus: 'SUBMITTED',
        offerState: 'SUBMITTED',
        complianceStatus: 'SUBMITTED',
        complianceNotes: null,
        active: false,
        pausedAt: null,
        pausedByUserId: null,
        cancelledAt: null,
        cancelledByUserId: null,
        cancelReason: null,
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

router.post('/offers/:id/pause', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const offer = await loadOwnedOffer(vendor.id, String(req.params.id));
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String(offer.offerState || '').toUpperCase() !== 'APPROVED' || !offer.active) {
      res.status(400).json({ error: 'Only active approved offers can be paused' });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        active: false,
        offerStatus: 'PAUSED',
        offerState: 'APPROVED',
        pausedAt: new Date(),
        pausedByUserId: req.user?.id || null,
      } as any,
      include: {
        company: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('POST /api/vendor/offers/:id/pause error:', error);
    res.status(500).json({ error: 'Failed to pause offer' });
  }
});

router.post('/offers/:id/resume', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const offer = await loadOwnedOffer(vendor.id, String(req.params.id));
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String(offer.offerState || '').toUpperCase() !== 'APPROVED') {
      res.status(400).json({ error: 'Only approved offers can be resumed' });
      return;
    }
    if (offer.active) {
      res.status(400).json({ error: 'Offer is already active' });
      return;
    }
    const billingAccess = await getVendorBillingAccess(vendor.id, 'PUBLISH_OFFER', {
      excludeOfferId: String(offer.id),
    });
    if (!billingAccess.allowed) {
      res.status(400).json(toBillingAccessDeniedResponse(billingAccess));
      return;
    }

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        active: true,
        offerStatus: 'LIVE',
        offerState: 'APPROVED',
        pausedAt: null,
        pausedByUserId: null,
      } as any,
      include: {
        company: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('POST /api/vendor/offers/:id/resume error:', error);
    res.status(500).json({ error: 'Failed to resume offer' });
  }
});

router.post('/offers/:id/cancel', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const offer = await loadOwnedOffer(vendor.id, String(req.params.id));
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String(offer.offerState || '').toUpperCase() === 'CANCELLED') {
      res.status(400).json({ error: 'Offer is already cancelled' });
      return;
    }

    const cancelReason = String(req.body?.cancelReason || req.body?.cancel_reason || '').trim() || null;
    const updated = await prisma.offer.update({
      where: { id: offer.id },
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
      include: {
        company: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('POST /api/vendor/offers/:id/cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel offer' });
  }
});

router.delete('/offers/:id', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const offer = await prisma.offer.findUnique({
      where: { id: String(req.params.id) },
      include: {
        _count: {
          select: {
            leads: true,
            claims: true,
            redemptions: true,
            offerClicks: true,
          },
        },
      },
    });

    if (!offer || offer.vendorId !== vendor.id) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String((offer as any).offerState || '').toUpperCase() !== 'DRAFT') {
      res.status(400).json({ error: 'Only draft offers can be deleted' });
      return;
    }

    const counts = (offer as any)._count || {};
    if (counts.leads || counts.claims || counts.redemptions || counts.offerClicks) {
      res.status(400).json({ error: 'Offers with activity cannot be deleted' });
      return;
    }

    await prisma.offer.delete({
      where: { id: offer.id },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/vendor/offers/:id error:', error);
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});

router.get('/leads', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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
        vendorLeadEvent: {
          select: {
            visibilityStatus: true,
            lockedReason: true,
            pricingSource: true,
            priceApplied: true,
          },
        },
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
    const serializedLeads = leads.map((lead) => serializeVendorLeadForResponse(lead));

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

      const rows = serializedLeads.map((lead: any) =>
        [
          lead.id,
          lead.status,
          `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
          lead.email || '',
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

    res.json(serializedLeads);
  } catch (error) {
    console.error('GET /api/vendor/leads error:', error);
    res.status(500).json({ error: 'Failed to load vendor leads' });
  }
});

router.get('/leads/:id', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await requireVendorUser(req, res);
    if (!vendor) return;

    const id = String(req.params.id);
    const lead = await prisma.lead.findFirst({
      where: { id, vendorId: vendor.id },
      include: {
        vendorLeadEvent: {
          select: {
            visibilityStatus: true,
            lockedReason: true,
            pricingSource: true,
            priceApplied: true,
          },
        },
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

    res.json(serializeVendorLeadForResponse(lead));
  } catch (error) {
    console.error('GET /api/vendor/leads/:id error:', error);
    res.status(500).json({ error: 'Failed to load lead' });
  }
});

router.patch('/leads/:id', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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
      select: {
        id: true,
        status: true,
        vendorLeadEvent: {
          select: {
            visibilityStatus: true,
          },
        },
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (nextStatus) {
      if (String(lead?.vendorLeadEvent?.visibilityStatus || '').toUpperCase() === 'LOCKED') {
        res.status(400).json({
          error: 'Lead is locked by billing. Upgrade or top up before changing lead status.',
          code: 'LEAD_LOCKED',
        });
        return;
      }
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

