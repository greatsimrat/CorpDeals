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
import { getVendorBillingState } from '../lib/vendor-billing';

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

const asNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toMoney = (value: number): string => value.toFixed(2);

const ADMIN_SUBSCRIPTION_PRESETS = {
  FREE: {
    monthlyFee: 0,
    includedLeadsPerMonth: 10,
    overagePricePerLead: 5,
    currency: 'USD',
    offerLimit: 5,
  },
  GROWTH: {
    monthlyFee: 100,
    includedLeadsPerMonth: 50,
    overagePricePerLead: 3,
    currency: 'USD',
    offerLimit: 25,
  },
  PRO: {
    monthlyFee: 500,
    includedLeadsPerMonth: 300,
    overagePricePerLead: 2,
    currency: 'USD',
    offerLimit: 100,
  },
} as const;

type AdminSubscriptionPresetKey = keyof typeof ADMIN_SUBSCRIPTION_PRESETS;

const resolveAdminSubscriptionPresetKey = (value: unknown): AdminSubscriptionPresetKey | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return null;
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

const countActiveApprovedOffers = async () => {
  try {
    return await prisma.offer.count({
      where: { active: true, complianceStatus: 'APPROVED' } as any,
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    const isCompatibilityIssue =
      message.includes('Unknown argument `complianceStatus`') ||
      String(error?.code || '') === 'P2022';
    if (!isCompatibilityIssue) {
      throw error;
    }
    return prisma.offer.count({ where: { active: true } });
  }
};

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

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
    if (status) where.status = status;

    const requests = await prisma.vendorRequest.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
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

    const request = await prisma.vendorRequest.findUnique({
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
      },
    });

    if (!request) {
      res.status(404).json({ error: 'Vendor request not found' });
      return;
    }

    res.json(request);
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

    const { status, reviewNotes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const request = await prisma.vendorRequest.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!request) {
      res.status(404).json({ error: 'Vendor request not found' });
      return;
    }

    // Update request and vendor status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.vendorRequest.update({
        where: { id },
        data: {
          status,
          reviewNotes,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
      });

      const updatedVendor = await tx.vendor.update({
        where: { id: request.vendorId },
        data: {
          status: status as 'APPROVED' | 'REJECTED',
        },
      });

      if (status === 'APPROVED') {
        const trialDays = Number(process.env.VENDOR_TRIAL_DAYS || 30);
        const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
        const existingBilling = await tx.vendorBilling.findUnique({
          where: { vendorId: request.vendorId },
        });

        if (!existingBilling) {
          await tx.vendorBilling.create({
            data: {
              vendorId: request.vendorId,
              billingMode: 'TRIAL',
              postTrialMode: 'PAY_PER_LEAD',
              trialEndsAt,
            },
          });
        } else if (existingBilling.billingMode === 'TRIAL' && !existingBilling.trialEndsAt) {
          await tx.vendorBilling.update({
            where: { id: existingBilling.id },
            data: { trialEndsAt },
          });
        }
      }

      return { request: updatedRequest, vendor: updatedVendor };
    });

    res.json(result);
  } catch (error) {
    console.error('Update vendor request error:', error);
    res.status(500).json({ error: 'Failed to update vendor request' });
  }
});

router.get('/offers-review', async (req: Request, res: Response): Promise<void> => {
  try {
    const statusParam = String(req.query.status || '').trim().toUpperCase();
    const status = statusParam || 'SUBMITTED';

    const offers = await prisma.offer.findMany({
      where: {
        complianceStatus: status as any,
        ...(status === 'SUBMITTED' ? { offerStatus: 'SUBMITTED' } : {}),
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

    if (
      String((offer as any).complianceStatus) !== 'SUBMITTED' ||
      String((offer as any).offerStatus || '') !== 'SUBMITTED'
    ) {
      res.status(400).json({ error: 'Only submitted offers can be approved' });
      return;
    }
    const billingState = await getVendorBillingState(offer.vendor.id, {
      excludeOfferId: String(offer.id),
    });
    if (!billingState.canPublishOffer) {
      res.status(400).json({
        error:
          billingState.publishOfferMessage ||
          'An active billing plan is required before an offer can go live',
      });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        offerStatus: 'LIVE',
        complianceStatus: 'APPROVED',
        complianceNotes: null,
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

    if (
      String((offer as any).complianceStatus) !== 'SUBMITTED' ||
      String((offer as any).offerStatus || '') !== 'SUBMITTED'
    ) {
      res.status(400).json({ error: 'Only submitted offers can be rejected' });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        offerStatus: 'REJECTED',
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
      select: { id: true, offerStatus: true } as any,
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String((offer as any).offerStatus || '') !== 'LIVE') {
      res.status(400).json({ error: 'Only live offers can be paused' });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: {
        active: false,
        offerStatus: 'PAUSED',
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
        complianceStatus: true,
      } as any,
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String((offer as any).offerStatus || '') !== 'PAUSED') {
      res.status(400).json({ error: 'Only paused offers can be resumed' });
      return;
    }
    if (String((offer as any).complianceStatus || '') !== 'APPROVED') {
      res.status(400).json({ error: 'Only approved offers can be resumed' });
      return;
    }
    const billingState = await getVendorBillingState(String(offer.vendorId), {
      excludeOfferId: String(offer.id),
    });
    if (!billingState.canPublishOffer) {
      res.status(400).json({
        error:
          billingState.publishOfferMessage ||
          'An active billing plan is required before an offer can go live',
      });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: {
        active: true,
        offerStatus: 'LIVE',
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
      select: { id: true, offerStatus: true } as any,
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (String((offer as any).offerStatus || '') === 'CANCELLED') {
      res.status(400).json({ error: 'Offer is already cancelled' });
      return;
    }

    const cancelReason = String(req.body?.cancelReason || req.body?.cancel_reason || '').trim() || null;
    const updated = await prisma.offer.update({
      where: { id },
      data: {
        active: false,
        offerStatus: 'CANCELLED',
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

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
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
    const status = firstString(req.query.status);
    const where: any = {};
    if (status && status.toLowerCase() !== 'all') {
      where.status = normalizeVendorStatus(status);
    } else if (!status) {
      where.status = 'PENDING';
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
        _count: {
          select: { offers: true, leads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(vendors);
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

    const requestedStatus = String(req.body?.status || req.body?.action || '')
      .trim()
      .toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(requestedStatus)) {
      res.status(400).json({ error: 'Invalid status. Use approved or rejected.' });
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

    const updated = await prisma.$transaction(async (tx) => {
      const vendorRecord = await tx.vendor.update({
        where: { id: vendor.id },
        data: { status: requestedStatus as any },
      });

      await tx.user.update({
        where: { id: vendor.userId },
        data: {
          vendorId: vendor.id,
        } as any,
      });

      return vendorRecord;
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendBaseUrl}/vendor/login`;

    if (requestedStatus === 'APPROVED') {
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

    res.json({
      ok: true,
      vendor: updated,
      status: requestedStatus,
    });
  } catch (error) {
    console.error('Patch admin vendor status error:', error);
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
});

router.post('/vendors', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      companyName,
      contactName,
      phone,
      website,
      businessType,
      description,
    } = req.body;

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: contactName,
          role: 'VENDOR',
        },
      });

      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          companyName,
          contactName,
          email,
          phone,
          website,
          businessType,
          description,
          status: 'APPROVED', // Pre-approved when created by admin
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { vendorId: vendor.id } as any,
      });

      const trialDays = Number(process.env.VENDOR_TRIAL_DAYS || 30);
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      await tx.vendorBilling.create({
        data: {
          vendorId: vendor.id,
          billingMode: 'TRIAL',
          postTrialMode: 'PAY_PER_LEAD',
          trialEndsAt,
        },
      });

      return { user, vendor };
    });

    res.status(201).json(result.vendor);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
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
          error: 'subscription_tier must be one of FREE, GROWTH, PRO (or monthly_fee must match 0, 100, 500)',
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
      await (tx as any).vendorBillingPlan.updateMany({
        where: { vendorId, isActive: true },
        data: { isActive: false },
      });

      return (tx as any).vendorBillingPlan.create({
        data: {
          vendorId,
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
    });

    res.json(created);
  } catch (error) {
    console.error('PUT /api/admin/vendors/:id/billing-plan error:', error);
    res.status(500).json({ error: 'Failed to save vendor billing plan' });
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
