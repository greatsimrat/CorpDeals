import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import {
  authenticateToken,
  authenticateTokenOptional,
  requireAdmin,
  requireVendorOnly,
} from '../middleware/auth';
import { getNormalizedUserLocation } from '../lib/offer-coverage';
import { isUserVerifiedForCompany } from '../lib/verifications';
import { sendVendorLeadNotificationEmail } from '../lib/mailer';
import {
  processDuplicateLeadNoCharge,
  processVendorLeadMonetization,
  resolveOfferCategoryContext,
} from '../lib/vendor-lead-monetization';
import { getLeadDuplicateWindowStart } from '../lib/lead-dedup';

const router = Router();

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

// Submit a lead (public, but requires employee verification)
router.post('/', authenticateTokenOptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      offerId,
      companyId,
      firstName,
      lastName,
      email,
      phone,
      employeeId,
      message,
      verificationId,
    } = req.body;

    if (!offerId || !companyId || !firstName || !lastName || !email) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [offer, company] = await Promise.all([
      prisma.offer.findUnique({
        where: { id: offerId },
        select: {
          id: true,
          title: true,
          companyId: true,
          vendorId: true,
          categoryId: true,
          active: true,
          offerState: true,
          complianceStatus: true,
          category: {
            select: {
              id: true,
              parentId: true,
            },
          },
          vendor: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
        },
      }),
      prisma.company.findFirst({
        where: {
          OR: [{ id: companyId }, { slug: companyId }],
        },
        select: { id: true, name: true },
      }),
    ]);

    if (!offer) {
      res.status(400).json({ error: 'Offer not found' });
      return;
    }

    if (!company) {
      res.status(400).json({ error: 'Company not found' });
      return;
    }

    if (offer.companyId !== company.id) {
      res.status(400).json({ error: 'Company does not match offer' });
      return;
    }
    if (
      !offer.active ||
      String((offer as any).offerState || offer.complianceStatus || '').toUpperCase() !== 'APPROVED'
    ) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    let verified = false;
    if (req.user) {
      const [user, userVerifiedForCompany] = await Promise.all([
        prisma.user.findUnique({
          where: { id: req.user.id },
          select: { email: true },
        }),
        isUserVerifiedForCompany(req.user.id, company.id),
      ]);

      if (userVerifiedForCompany) {
        if (!user || user.email !== normalizedEmail) {
          res.status(400).json({ error: 'Use your verified work email address' });
          return;
        }
        verified = true;
      }
    }

    if (!verified && verificationId) {
      const verification = await prisma.employeeVerification.findUnique({
        where: { id: verificationId },
        select: { status: true, companyId: true, email: true },
      });

      if (
        verification &&
        verification.status === 'VERIFIED' &&
        verification.companyId === company.id &&
        verification.email === normalizedEmail
      ) {
        verified = true;
      }
    }

    if (!verified) {
      res.status(403).json({ error: 'Employment verification required to claim this offer' });
      return;
    }

    const duplicateWhere = req.user?.id
      ? {
          userId: req.user.id,
          offerId: offer.id,
          createdAt: { gte: getLeadDuplicateWindowStart() },
        }
      : {
          offerId: offer.id,
          email: normalizedEmail,
          createdAt: { gte: getLeadDuplicateWindowStart() },
        };
    const existingLead = await prisma.lead.findFirst({
      where: duplicateWhere as any,
      select: { id: true, createdAt: true },
    });

    const consentGiven = Boolean(req.body?.consent);
    const termsAccepted = Boolean(req.body?.termsAccepted);
    if (!consentGiven || !termsAccepted) {
      res.status(400).json({
        error: 'Both terms acceptance and consent are required',
      });
      return;
    }
    const userLocation = getNormalizedUserLocation(req.user);
    const payloadJson = {
      firstName,
      lastName,
      email: normalizedEmail,
      phone: phone || null,
      employeeId: employeeId || null,
      message: message || null,
      verificationId: verificationId || null,
      consent: consentGiven,
      termsAccepted,
      userProvinceCode: userLocation.provinceCode,
      userCity: userLocation.cityName,
    };

    const leadResult = await prisma.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: {
          userId: req.user?.id,
          offerId: offer.id,
          companyId: company.id,
          vendorId: offer.vendorId,
          payloadJson,
          consent: consentGiven,
          consentAt: consentGiven ? new Date() : null,
          consentIp: req.ip || null,
          termsAccepted,
          termsAcceptedAt: new Date(),
          userProvinceCodeAtSubmission: userLocation.provinceCode,
          userCityAtSubmission: userLocation.cityName,
          firstName,
          lastName,
          email: normalizedEmail,
          phone,
          employeeId,
          message,
          vendorNotificationEmail: offer.vendor.email,
          status: 'NEW',
        } as any,
      });

      const categoryContext = resolveOfferCategoryContext({
        categoryId: offer.categoryId,
        category: offer.category,
      });
      const monetization = existingLead
        ? await processDuplicateLeadNoCharge(tx as any, {
            leadId: createdLead.id,
            vendorId: offer.vendorId,
            offerId: offer.id,
            userId: req.user?.id || null,
            companyId: company.id,
            categoryId: categoryContext.categoryId,
            subcategoryId: categoryContext.subcategoryId,
            leadType: 'FORM_SUBMISSION',
          })
        : await processVendorLeadMonetization(tx as any, {
            leadId: createdLead.id,
            vendorId: offer.vendorId,
            offerId: offer.id,
            userId: req.user?.id || null,
            companyId: company.id,
            categoryId: categoryContext.categoryId,
            subcategoryId: categoryContext.subcategoryId,
            leadType: 'FORM_SUBMISSION',
          });

      await tx.offer.update({
        where: { id: offerId },
        data: { leadCount: { increment: 1 } },
      });

      return { lead: createdLead, monetization };
    });
    const lead = leadResult.lead;
    const monetization = leadResult.monetization;

    const vendorNotification = monetization.canSharePII
      ? await sendVendorLeadNotificationEmail({
          vendorEmail: offer.vendor.email,
          vendorCompanyName: offer.vendor.companyName,
          companyName: company.name,
          offerTitle: offer.title,
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
          },
        })
      : {
          sent: false,
          recipient: offer.vendor.email,
          actualVendorEmail: offer.vendor.email,
          overridden: false,
          error: monetization.lockedReason
            ? `Lead locked (${monetization.lockedReason})`
            : 'Lead locked',
        };

    if (!vendorNotification.sent && monetization.canSharePII) {
      console.error('Vendor lead notification email failed:', {
        leadId: lead.id,
        actualVendorEmail: vendorNotification.actualVendorEmail || offer.vendor.email,
        sentTo: vendorNotification.recipient,
        overridden: vendorNotification.overridden,
        error: vendorNotification.error,
      });
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'FAILED' },
      });
    } else if (monetization.canSharePII) {
      console.log('Vendor lead notification email sent:', {
        leadId: lead.id,
        actualVendorEmail: vendorNotification.actualVendorEmail,
        sentTo: vendorNotification.recipient,
        overridden: vendorNotification.overridden,
      });
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'SENT' },
      });
    } else {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'NEW' },
      });
    }

    res.status(201).json({
      ...lead,
      is_duplicate: Boolean(existingLead),
      duplicate_of_lead_id: existingLead?.id || null,
      visibility_status: monetization.visibilityStatus,
      locked_reason: monetization.lockedReason,
      lead_access: monetization.canSharePII ? 'VISIBLE' : 'LOCKED',
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({
        error: 'DUPLICATE_LEAD',
        message: 'You have already applied for this offer.',
      });
      return;
    }
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to submit lead' });
  }
});

// Get leads for vendor (vendor access)
router.get('/vendor', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = firstString(req.query.status);
    const offerId = firstString(req.query.offerId);

    // Get vendor for current user
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendor) {
      res.status(403).json({ error: 'Vendor profile not found' });
      return;
    }

    const where: any = {};

    // Get all offers for this vendor
    const vendorOffers = await prisma.offer.findMany({
      where: { vendorId: vendor.id },
      select: { id: true },
    });
    where.offerId = { in: vendorOffers.map((offer) => offer.id) };

    if (status) where.status = status;
    if (offerId) where.offerId = offerId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        offer: {
          select: { id: true, title: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leads);
  } catch (error) {
    console.error('Get vendor leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Get all leads (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = firstString(req.query.status);
    const companyId = firstString(req.query.companyId);
    const offerId = firstString(req.query.offerId);

    const where: any = {};
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (offerId) where.offerId = offerId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        offer: {
          include: {
            vendor: {
              select: { id: true, companyName: true },
            },
          },
        },
        company: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leads);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Update lead status (vendor or admin)
router.patch('/:id', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid lead id' });
      return;
    }

    const { status, vendorNotes } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        offer: {
          include: { vendor: true },
        },
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Check permission
    if (lead.offer.vendor.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: { status, vendorNotes },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

export default router;
