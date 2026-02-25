import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  sendOfferReviewDecisionEmail,
  sendVendorApprovalEmail,
  sendVendorRejectionEmail,
} from '../lib/mailer';
import { createVendorSetPasswordToken } from '../lib/vendor-password';

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

const normalizeVendorStatus = (value: string) => value.trim().toUpperCase();

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
      prisma.offer.count({ where: { active: true, complianceStatus: 'APPROVED' } as any }),
      prisma.lead.count(),
      prisma.vendorRequest.count({ where: { status: 'PENDING' } }),
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

    if (String((offer as any).complianceStatus) !== 'SUBMITTED') {
      res.status(400).json({ error: 'Only submitted offers can be approved' });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        complianceStatus: 'APPROVED',
        complianceNotes: null,
        active: true,
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

    if (String((offer as any).complianceStatus) !== 'SUBMITTED') {
      res.status(400).json({ error: 'Only submitted offers can be rejected' });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: {
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

// Get all users
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = firstString(req.query.role);
    const search = firstString(req.query.search);

    const where: any = {};
    if (role) where.role = role;
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

    const { role } = req.body;

    if (!['ADMIN', 'FINANCE', 'VENDOR', 'EMPLOYEE'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

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
          role: 'VENDOR',
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

export default router;
