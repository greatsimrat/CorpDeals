import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireVendor } from '../middleware/auth';
import { getUserVerification, isUserVerifiedForCompany, VERIFIED_STATUS } from '../lib/verifications';
import { sendLeadSubmissionConfirmationEmail, sendVendorLeadNotificationEmail } from '../lib/mailer';

const router = Router();
type JsonObject = Record<string, any>;

const asObject = (value: unknown): JsonObject => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const pickMinimalOfferConfig = (configJson: unknown) => {
  const config = asObject(configJson);
  return {
    lead_fields: asStringArray(config.lead_fields),
    consent_required: config.consent_required === undefined ? true : Boolean(config.consent_required),
  };
};

const splitName = (fullName: string) => {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || 'N/A';
  return { firstName, lastName };
};

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

const createLeadFromOfferApply = async (req: Request, res: Response): Promise<void> => {
  const offerId = String(req.params.id);
  const offer: any = await prisma.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      title: true,
      configJson: true,
      active: true,
      complianceStatus: true,
      companyId: true,
      vendorId: true,
      productName: true,
      productModel: true,
      productUrl: true,
      company: { select: { id: true, slug: true, name: true } },
      vendor: { select: { id: true, companyName: true, email: true } },
    } as any,
  });

  if (!offer || !offer.active || offer.complianceStatus !== 'APPROVED') {
    res.status(404).json({ error: 'Offer not found' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, employeeCompanyId: true },
  });

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const verified = await isUserVerifiedForCompany(user.id, offer.companyId);
  if (!verified) {
    console.warn('Offer apply blocked: verification required', {
      offerId: offer.id,
      userId: user.id,
      companyId: offer.companyId,
    });
    res.status(403).json({ error: 'VERIFY_REQUIRED', company_id: offer.companyId });
    return;
  }

  if (user.employeeCompanyId !== offer.companyId) {
    console.warn('Offer apply blocked: active company mismatch', {
      offerId: offer.id,
      userId: user.id,
      activeCompanyId: user.employeeCompanyId,
      requiredCompanyId: offer.companyId,
    });
    res.status(409).json({ error: 'ACTIVE_COMPANY_MISMATCH', company_id: offer.companyId });
    return;
  }

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').trim();
  const consent = req.body?.consent === true || req.body?.consent === 'true';

  if (!name || !email || !phone || !consent) {
    res.status(400).json({
      error: 'INVALID_LEAD_PAYLOAD',
      detail: 'Required fields: name, email, phone, consent=true',
    });
    return;
  }

  const { firstName, lastName } = splitName(name);
  const payloadJson = { name, email, phone };

  const lead = await prisma.lead.create({
    data: {
      userId: user.id,
      offerId: offer.id,
      companyId: offer.companyId,
      vendorId: offer.vendorId,
      payloadJson,
      consent,
      consentAt: new Date(),
      consentIp: req.ip || null,
      firstName,
      lastName,
      email,
      phone,
      message: typeof req.body?.message === 'string' ? req.body.message : null,
      employeeId: typeof req.body?.employeeId === 'string' ? req.body.employeeId : null,
      vendorNotificationEmail: offer.vendor.email,
      status: 'NEW',
    } as any,
  });

  const vendorEmailResult = await sendVendorLeadNotificationEmail({
    vendorEmail: offer.vendor.email,
    vendorCompanyName: offer.vendor.companyName,
    companyName: offer.company.name,
    offerTitle: offer.title,
      dashboardLeadUrl: `${
        process.env.FRONTEND_URL || 'http://localhost:5173'
      }/vendor/leads/${encodeURIComponent(lead.id)}`,
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        message: lead.message,
        createdAt: lead.createdAt,
        consentAt: lead.consentAt,
        consentIp: lead.consentIp,
        productName: (offer as any).productName || null,
        productModel: (offer as any).productModel || null,
        productUrl: (offer as any).productUrl || null,
      },
    });

  if (!vendorEmailResult.sent) {
    console.error('Offer apply vendor email failed', {
      leadId: lead.id,
      offerId: offer.id,
      userId: user.id,
      error: vendorEmailResult.error,
      recipient: vendorEmailResult.recipient,
    });
  }

  const userConfirmationResult = await sendLeadSubmissionConfirmationEmail({
    to: email,
    offerTitle: offer.title,
    companyName: offer.company.name,
    vendorName: offer.vendor.companyName,
    leadId: lead.id,
  });

  if (!userConfirmationResult.sent) {
    console.error('Offer apply user confirmation failed', {
      leadId: lead.id,
      offerId: offer.id,
      userId: user.id,
      error: userConfirmationResult.error,
    });
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'SENT' },
  });

  res.json({
    ok: true,
    lead_id: lead.id,
    message: 'Submitted. Vendor will contact you.',
  });
};

// Get all offers (public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, categoryId, vendorId, featured, active, search } = req.query;

    const where: any = {
      active: true,
      complianceStatus: 'APPROVED',
    };
    if (companyId) where.companyId = companyId;
    if (categoryId) where.categoryId = categoryId;
    if (vendorId) where.vendorId = vendorId;
    if (featured !== undefined) where.featured = featured === 'true';
    if (active !== undefined && active !== 'true') {
      where.id = '__never__';
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const offers = await prisma.offer.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true },
        },
        company: {
          select: { id: true, name: true, slug: true, logo: true },
        },
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(offers);
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Failed to get offers' });
  }
});

// Check whether the current user can access an offer
router.get('/:id/access', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const offerId = String(req.params.id);
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true, website: true },
        },
        company: {
          select: {
            id: true,
            slug: true,
            name: true,
            domain: true,
            allowedDomains: true,
            logo: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (!offer.active || String((offer as any).complianceStatus || '') !== 'APPROVED') {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    const verification = await getUserVerification(req.user!.id, offer.companyId);
    const canAccess =
      !!verification &&
      verification.status === VERIFIED_STATUS &&
      verification.expiresAt > new Date();

    res.json({
      canAccess,
      offer,
      company: offer.company,
      verification: verification
        ? {
            id: verification.id,
            status: verification.status,
            verifiedAt: verification.verifiedAt,
            expiresAt: verification.expiresAt,
            verificationMethod: verification.verificationMethod,
          }
        : null,
    });
  } catch (error) {
    console.error('Offer access check error:', error);
    res.status(500).json({ error: 'Failed to check offer access' });
  }
});

router.post('/:id/apply', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    await createLeadFromOfferApply(req, res);
  } catch (error: any) {
    console.error('Offer apply error:', {
      offerId: req.params.id,
      userId: req.user?.id,
      body: req.body,
      error: error?.message || error,
    });
    res.status(500).json({
      error: 'FAILED_TO_APPLY',
      detail: error?.message || 'Unknown error',
    });
  }
});

// Legacy alias for older clients.
router.post('/:id/action', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    await createLeadFromOfferApply(req, res);
  } catch (error: any) {
    console.error('Offer action alias error:', {
      offerId: req.params.id,
      userId: req.user?.id,
      body: req.body,
      error: error?.message || error,
    });
    res.status(500).json({
      error: 'FAILED_TO_APPLY',
      detail: error?.message || 'Unknown error',
    });
  }
});

// Get offer by ID (authenticated, and employee users must be verified)
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const offerId = String(req.params.id);
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true, website: true },
        },
        company: true,
        category: true,
      },
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    if (req.user?.role !== 'ADMIN') {
      if (!offer.active || String((offer as any).complianceStatus || '') !== 'APPROVED') {
        res.status(404).json({ error: 'Offer not found' });
        return;
      }
    }

    if (req.user?.role === 'EMPLOYEE') {
      const verified = await isUserVerifiedForCompany(req.user.id, offer.companyId);
      if (!verified) {
        res.status(403).json({
          error: 'Employment verification required',
          code: 'NOT_VERIFIED',
          company: {
            id: offer.company.id,
            slug: offer.company.slug,
            name: offer.company.name,
          },
        });
        return;
      }
    }

    res.json({
      ...offer,
      offer_type: 'lead',
      config: pickMinimalOfferConfig(offer.configJson),
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ error: 'Failed to get offer' });
  }
});

// Create offer (vendor or admin)
router.post('/', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyId,
      categoryId,
      title,
      description,
      productName,
      productModel,
      productUrl,
      discountValue,
      discountType,
      originalPrice,
      discountedPrice,
      terms,
      howToClaim,
      expiryDate,
      featured,
      location,
      image,
      } = req.body;

    const parsedExpiryDate = expiryDate ? parseDateInput(String(expiryDate)) : null;
    if (expiryDate && !parsedExpiryDate) {
      res.status(400).json({ error: 'Invalid expiry date' });
      return;
    }
    if (parsedExpiryDate && !isFutureDate(parsedExpiryDate)) {
      res.status(400).json({ error: 'Offer end date must be in the future' });
      return;
    }

    // Get vendor ID for the current user
    let vendorId: string;

    if (req.user?.role === 'ADMIN') {
      // Admin can specify vendor ID
      vendorId = req.body.vendorId;
      if (!vendorId) {
        res.status(400).json({ error: 'Vendor ID required for admin' });
        return;
      }
    } else {
      // Get vendor for current user
      const vendor = await prisma.vendor.findUnique({
        where: { userId: req.user!.id },
      });

      if (!vendor) {
        res.status(403).json({ error: 'Vendor profile not found' });
        return;
      }

      if (vendor.status !== 'APPROVED') {
        res.status(403).json({ error: 'Vendor must be approved to create offers' });
        return;
      }

      vendorId = vendor.id;
    }

    const offer = await prisma.offer.create({
      data: {
        vendorId,
        companyId,
        categoryId,
        title,
        description,
        productName,
        productModel,
        productUrl,
        discountValue,
        discountType: discountType || 'PERCENTAGE',
        originalPrice,
        discountedPrice,
        terms: terms || [],
        howToClaim: howToClaim || [],
        expiryDate: parsedExpiryDate,
        featured: featured || false,
        verified: req.user?.role === 'ADMIN',
        active: false,
        complianceStatus: 'DRAFT',
        location,
        image,
        offerType: 'lead',
        configJson: req.body?.configJson || req.body?.config_json || {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
      } as any,
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true },
        },
        company: true,
        category: true,
      },
    });

    res.status(201).json(offer);
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// Update offer
router.patch('/:id', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const offerId = String(req.params.id);
    const existingOffer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { vendor: true },
    });

    if (!existingOffer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Check permission
    if (req.user?.role !== 'ADMIN' && existingOffer.vendor.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const {
      companyId,
      categoryId,
      title,
      description,
      productName,
      productModel,
      productUrl,
      discountValue,
      discountType,
      originalPrice,
      discountedPrice,
      terms,
      howToClaim,
      expiryDate,
      featured,
      verified,
      active,
      location,
      image,
    } = req.body;

    if (active === true && String((existingOffer as any).complianceStatus || '') !== 'APPROVED') {
      res.status(400).json({ error: 'Offer must be compliance-approved before activation' });
      return;
    }

    let parsedExpiryDate: Date | null | undefined = undefined;
    if (expiryDate !== undefined) {
      const raw = String(expiryDate || '').trim();
      if (!raw) {
        parsedExpiryDate = null;
      } else {
        const parsed = parseDateInput(raw);
        if (!parsed) {
          res.status(400).json({ error: 'Invalid expiry date' });
          return;
        }
        if (!isFutureDate(parsed)) {
          res.status(400).json({ error: 'Offer end date must be in the future' });
          return;
        }
        parsedExpiryDate = parsed;
      }
    }

    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        companyId,
        categoryId,
        title,
        description,
        productName,
        productModel,
        productUrl,
        discountValue,
        discountType,
        originalPrice,
        discountedPrice,
        terms,
        howToClaim,
        expiryDate: parsedExpiryDate,
        featured: req.user?.role === 'ADMIN' ? featured : undefined,
        verified: req.user?.role === 'ADMIN' ? verified : undefined,
        active,
        location,
        image,
        offerType: 'lead',
        configJson:
          req.body?.configJson !== undefined
            ? req.body.configJson
            : req.body?.config_json !== undefined
            ? req.body.config_json
            : undefined,
      } as any,
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true },
        },
        company: true,
        category: true,
      },
    });

    res.json(offer);
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// Delete offer
router.delete('/:id', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const offerId = String(req.params.id);
    const existingOffer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { vendor: true },
    });

    if (!existingOffer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Check permission
    if (req.user?.role !== 'ADMIN' && existingOffer.vendor.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.offer.delete({
      where: { id: offerId },
    });

    res.json({ message: 'Offer deleted' });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});

export default router;
