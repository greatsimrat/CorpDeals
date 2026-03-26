import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authenticateTokenOptional, requireVendor, requireAdmin } from '../middleware/auth';
import { isUserVerifiedForCompany } from '../lib/verifications';
import { sendVendorLeadNotificationEmail } from '../lib/mailer';
import { recordLeadDeliveryBillingEvent } from '../lib/lead-billing';

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
      ? { userId: req.user.id, offerId: offer.id }
      : { offerId: offer.id, email: normalizedEmail };
    const existingLead = await prisma.lead.findFirst({
      where: duplicateWhere as any,
      select: { id: true, createdAt: true },
    });
    if (existingLead) {
      res.status(409).json({
        error: 'DUPLICATE_LEAD',
        message: 'You have already applied for this offer.',
        existing_lead_id: existingLead.id,
      });
      return;
    }

    const trialDays = Number(process.env.VENDOR_TRIAL_DAYS || 30);
    const defaultLeadPriceCents = Number(process.env.DEFAULT_LEAD_PRICE_CENTS || 0);
    const now = new Date();
    const consentGiven = Boolean(req.body?.consent);
    const payloadJson = {
      firstName,
      lastName,
      email: normalizedEmail,
      phone: phone || null,
      employeeId: employeeId || null,
      message: message || null,
      verificationId: verificationId || null,
      consent: consentGiven,
    };

    const lead = await prisma.$transaction(async (tx) => {
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

      let billing = await tx.vendorBilling.findUnique({
        where: { vendorId: offer.vendorId },
      });

      if (!billing) {
        const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
        billing = await tx.vendorBilling.create({
          data: {
            vendorId: offer.vendorId,
            billingMode: 'TRIAL',
            postTrialMode: 'PAY_PER_LEAD',
            trialEndsAt,
            leadPriceCents: defaultLeadPriceCents,
          },
        });
      } else if (billing.billingMode === 'TRIAL' && !billing.trialEndsAt) {
        const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
        billing = await tx.vendorBilling.update({
          where: { id: billing.id },
          data: { trialEndsAt },
        });
      }

      let effectiveMode = billing.billingMode;
      if (effectiveMode === 'TRIAL') {
        if (billing.trialEndsAt && billing.trialEndsAt <= now) {
          const newMode = billing.postTrialMode || 'PAY_PER_LEAD';
          billing = await tx.vendorBilling.update({
            where: { id: billing.id },
            data: { billingMode: newMode },
          });
          effectiveMode = newMode;
        }
      }

      const isFree = effectiveMode === 'TRIAL' || effectiveMode === 'FREE';
      const amountCents = isFree ? 0 : (billing.leadPriceCents ?? defaultLeadPriceCents);
      const status = isFree ? 'WAIVED' : 'PENDING';
      const reason = effectiveMode === 'TRIAL' ? 'TRIAL' : (effectiveMode === 'FREE' ? 'FREE' : null);

      await tx.leadCharge.create({
        data: {
          leadId: createdLead.id,
          vendorId: offer.vendorId,
          amountCents,
          currency: billing.currency || 'USD',
          status,
          reason: reason ?? undefined,
          chargeableAt: createdLead.createdAt,
        },
      });

      await tx.offer.update({
        where: { id: offerId },
        data: { leadCount: { increment: 1 } },
      });

      return createdLead;
    });

    // Notification failures should not fail lead submission.
    const vendorNotification = await sendVendorLeadNotificationEmail({
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
    });

    if (!vendorNotification.sent) {
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
    } else {
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
      await recordLeadDeliveryBillingEvent(lead.id, offer.vendorId);
    }

    res.status(201).json(lead);
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
router.get('/vendor', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = firstString(req.query.status);
    const offerId = firstString(req.query.offerId);

    // Get vendor for current user
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendor && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Vendor profile not found' });
      return;
    }

    const where: any = {};
    
    if (req.user?.role !== 'ADMIN') {
      // Get all offers for this vendor
      const vendorOffers = await prisma.offer.findMany({
        where: { vendorId: vendor!.id },
        select: { id: true },
      });
      where.offerId = { in: vendorOffers.map(o => o.id) };
    }

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
router.patch('/:id', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
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
    if (req.user?.role !== 'ADMIN' && lead.offer.vendor.userId !== req.user?.id) {
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
