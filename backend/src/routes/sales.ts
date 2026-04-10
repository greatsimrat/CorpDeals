import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdminOrSales } from '../middleware/auth';
import { resolveCoverageInput } from '../lib/offer-coverage';
import {
  getUniqueOfferSlug,
  normalizeJsonField,
  normalizeOfferDetailTemplateType,
  normalizeOptionalUrl,
} from '../lib/offer-details';

const router = Router();

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

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

router.use(authenticateToken, requireAdminOrSales);

router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      pendingVendorRequests,
      pendingCompanyRequests,
      approvedVendors,
      draftOffers,
      submittedOffers,
      liveOffers,
      recentVendorRequests,
      recentCompanyRequests,
      vendorOptions,
      companies,
      categories,
      recentOffers,
    ] = await Promise.all([
      prisma.vendorRequest.count({ where: { status: 'PENDING' } }),
      prisma.companyRequest.count({ where: { status: 'PENDING' } }),
      prisma.vendor.count({ where: { status: 'APPROVED' } }),
      prisma.offer.count({ where: { offerState: 'DRAFT' } as any }),
      prisma.offer.count({ where: { offerState: 'SUBMITTED' } as any }),
      prisma.offer.count({
        where: {
          active: true,
          offerState: 'APPROVED',
        } as any,
      }),
      prisma.vendorRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          vendor: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              email: true,
              businessType: true,
              city: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.companyRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.vendor.findMany({
        where: { status: 'APPROVED' },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          businessEmail: true,
          businessType: true,
          city: true,
          status: true,
          _count: {
            select: {
              offers: true,
              leads: true,
            },
          },
        },
        orderBy: { companyName: 'asc' },
      }),
      prisma.company.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          verified: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.offer.findMany({
        include: {
          vendor: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }),
    ]);

    res.json({
      summary: {
        pendingVendorRequests,
        pendingCompanyRequests,
        approvedVendors,
        draftOffers,
        submittedOffers,
        liveOffers,
      },
      vendorRequests: recentVendorRequests,
      companyRequests: recentCompanyRequests,
      vendors: vendorOptions,
      companies,
      categories,
      recentOffers,
    });
  } catch (error) {
    console.error('GET /api/sales/dashboard error:', error);
    res.status(500).json({ error: 'Failed to load sales dashboard' });
  }
});

router.post('/offers', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = String(req.body?.vendorId || '').trim();
    const companyId = String(req.body?.companyId || '').trim();
    const categoryIdRaw = String(req.body?.categoryId || '').trim();
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const productName = String(req.body?.productName || '').trim();
    const productModel = String(req.body?.productModel || '').trim();
    const productUrl = String(req.body?.productUrl || '').trim();
    const expiryDateRaw = String(req.body?.expiryDate || '').trim();
    const coverage = resolveCoverageInput({
      coverageType: req.body?.coverageType ?? req.body?.coverage_type,
      provinceCode: req.body?.provinceCode ?? req.body?.province_code,
      cityName: req.body?.cityName ?? req.body?.city_name,
    });

    if (!vendorId || !companyId || !title || !description) {
      res.status(400).json({
        error: 'vendorId, companyId, title, and description are required',
      });
      return;
    }

    const expiryDate = expiryDateRaw ? parseDateInput(expiryDateRaw) : null;
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

    const [vendor, company, fallbackCategory] = await Promise.all([
      prisma.vendor.findUnique({
        where: { id: vendorId },
        select: {
          id: true,
          companyName: true,
          status: true,
        },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      categoryIdRaw
        ? prisma.category.findUnique({
            where: { id: categoryIdRaw },
            select: { id: true },
          })
        : prisma.category.upsert({
            where: { slug: 'general' },
            update: { name: 'General' },
            create: { slug: 'general', name: 'General' },
            select: { id: true },
          }),
    ]);

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }
    if (vendor.status !== 'APPROVED') {
      res.status(409).json({ error: 'Sales can only create offers for approved vendors' });
      return;
    }
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    if (!fallbackCategory) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const created = await prisma.offer.create({
      data: {
        slug: await getUniqueOfferSlug(title),
        vendorId: vendor.id,
        companyId: company.id,
        categoryId: fallbackCategory.id,
        title,
        description,
        productName: productName || null,
        productModel: productModel || null,
        productUrl: productUrl || null,
        discountValue: 'Lead submission',
        discountType: 'SPECIAL',
        terms: [],
        howToClaim: [],
        expiryDate,
        featured: false,
        verified: false,
        active: false,
        offerState: 'DRAFT',
        offerStatus: 'DRAFT',
        offerType: 'lead',
        coverageType: coverage.coverageType,
        provinceCode: coverage.provinceCode,
        cityName: coverage.cityName,
        detailTemplateType: normalizeOfferDetailTemplateType(req.body?.detailTemplateType),
        highlightsJson: normalizeJsonField(req.body?.highlightsJson),
        detailSectionsJson: normalizeJsonField(req.body?.detailSectionsJson),
        termsUrl: normalizeOptionalUrl(req.body?.termsUrl),
        cancellationPolicyUrl: normalizeOptionalUrl(req.body?.cancellationPolicyUrl),
        configJson: {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
        complianceStatus: 'DRAFT',
        complianceNotes: `Created by sales workspace (${req.user?.email || 'unknown'})`,
      } as any,
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.status(201).json({
      ok: true,
      offer: created,
      message: `Draft offer created for ${vendor.companyName} targeting ${company.name}.`,
    });
  } catch (error) {
    console.error('POST /api/sales/offers error:', error);
    res.status(500).json({ error: 'Failed to create draft offer' });
  }
});

router.get('/offers', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = firstString(req.query.status);
    const vendorId = firstString(req.query.vendorId);
    const where: Record<string, unknown> = {};

    if (status) {
      const normalizedStatus = status.trim().toUpperCase();
      const mappedStatus =
        normalizedStatus === 'LIVE' || normalizedStatus === 'PAUSED'
          ? 'APPROVED'
          : normalizedStatus;
      if (['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(mappedStatus)) {
        where.offerState = mappedStatus;
      }
    }
    if (vendorId) {
      where.vendorId = vendorId.trim();
    }

    const offers = await prisma.offer.findMany({
      where: where as any,
      include: {
        vendor: {
          select: { id: true, companyName: true },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    res.json(offers);
  } catch (error) {
    console.error('GET /api/sales/offers error:', error);
    res.status(500).json({ error: 'Failed to load sales offers' });
  }
});

export default router;
