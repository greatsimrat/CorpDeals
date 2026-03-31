import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateTokenOptional } from '../middleware/auth';
import { isUserVerifiedForCompany } from '../lib/verifications';
import {
  sendLeadSubmissionConfirmationEmail,
  sendQaTypedTestEmail,
  sendVendorLeadNotificationEmail,
} from '../lib/mailer';

const router = Router();

const isDevelopment =
  (process.env.APP_ENV || '').toLowerCase() === 'local' ||
  (process.env.NODE_ENV || '').toLowerCase() === 'development';

router.get('/test-email', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!isDevelopment) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const userTest = await sendQaTypedTestEmail({
      emailType: 'user_confirmation',
      to: 'qa.amazon.employee@amazon.com',
      subject: 'QA User Confirmation Test',
      body: 'If you received this at user-test@corpdeals.ca, routing works.',
    });

    const vendorTest = await sendQaTypedTestEmail({
      emailType: 'vendor_lead',
      to: 'anyvendor@example.com',
      subject: 'QA Vendor Lead Test',
      body: 'If you received this at vendor-test@corpdeals.ca, routing works.',
    });

    res.json({
      status: 'ok',
      tests: {
        user_confirmation: {
          sent: userTest.sent,
          error: userTest.error || null,
          originalTo: userTest.originalRecipient,
          finalTo: userTest.recipient,
        },
        vendor_lead: {
          sent: vendorTest.sent,
          error: vendorTest.error || null,
          originalTo: vendorTest.originalRecipient,
          finalTo: vendorTest.recipient,
        },
      },
    });
  } catch (error) {
    console.error('QA test email route error:', error);
    res.status(500).json({ error: 'Failed to send QA test emails' });
  }
});

router.get(
  '/test-lead-flow',
  authenticateTokenOptional,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isDevelopment) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      const leadOffer = await prisma.offer.findFirst({
        where: {
          active: true,
          OR: [
            { title: { contains: 'BMO', mode: 'insensitive' } },
            { id: 'dev-amazon-lead-offer' },
          ],
        },
        select: {
          id: true,
          title: true,
          companyId: true,
          vendorId: true,
          company: { select: { id: true, slug: true, name: true } },
          vendor: { select: { id: true, companyName: true, email: true } },
        },
      });

      if (!leadOffer) {
        res.status(404).json({
          error: 'NO_LEAD_OFFER_FOUND',
          detail: 'Seed local dev data first using GET /dev/seed.',
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          error: 'LOGIN_REQUIRED',
          detail: 'Log in first, then call GET /qa/test-lead-flow to run the lead flow.',
          offer_id: leadOffer.id,
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        res.status(401).json({ error: 'USER_NOT_FOUND' });
        return;
      }

      const isVerified = await isUserVerifiedForCompany(user.id, leadOffer.companyId);
      if (!isVerified) {
        res.status(403).json({
          error: 'VERIFY_REQUIRED',
          detail: 'Verify employment for this company and retry.',
          company_id: leadOffer.companyId,
        });
        return;
      }

      const fullName = user.name?.trim() || 'QA Test User';
      const [firstName, ...lastNameParts] = fullName.split(/\s+/);
      const lastName = lastNameParts.join(' ') || 'User';
      const payload = {
        name: fullName,
        email: user.email,
        phone: '555-0100',
        consent: true,
      };

      const lead = await prisma.lead.create({
        data: {
          userId: user.id,
          offerId: leadOffer.id,
          companyId: leadOffer.companyId,
          vendorId: leadOffer.vendorId,
          payloadJson: payload,
          consent: true,
          consentAt: new Date(),
          consentIp: req.ip || null,
          firstName,
          lastName,
          email: user.email,
          phone: payload.phone,
          vendorNotificationEmail: leadOffer.vendor.email,
          status: 'NEW',
        } as any,
      });

      const vendorEmailResult = await sendVendorLeadNotificationEmail({
        vendorEmail: leadOffer.vendor.email,
        vendorCompanyName: leadOffer.vendor.companyName,
        companyName: leadOffer.company.name,
        offerTitle: leadOffer.title,
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          message: null,
          createdAt: lead.createdAt,
          consentAt: lead.consentAt,
          consentIp: lead.consentIp,
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: vendorEmailResult.sent ? 'SENT' : 'FAILED' },
      });

      const userEmailResult = await sendLeadSubmissionConfirmationEmail({
        to: user.email,
        offerTitle: leadOffer.title,
        companyName: leadOffer.company.name,
        vendorName: leadOffer.vendor.companyName,
        leadId: lead.id,
      });

      res.json({
        ok: true,
        lead_id: lead.id,
        offer_id: leadOffer.id,
        intended_user_email: userEmailResult.originalRecipient,
        final_user_email: userEmailResult.recipient,
        intended_vendor_email: vendorEmailResult.actualVendorEmail,
        final_vendor_email: vendorEmailResult.recipient,
        vendor_email_sent: vendorEmailResult.sent,
        user_email_sent: userEmailResult.sent,
      });
    } catch (error: any) {
      console.error('QA test lead flow error:', error);
      res.status(500).json({
        error: 'FAILED_QA_TEST_LEAD_FLOW',
        detail: error?.message || 'Unknown error',
      });
    }
  }
);

export default router;
