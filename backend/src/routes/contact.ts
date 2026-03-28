import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { sendContactMessageInternalEmail } from '../lib/mailer';

const router = Router();

const normalizeBodyString = (value: unknown, maxLength = 2000) =>
  (typeof value === 'string' ? value : '').trim().slice(0, maxLength);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const name = normalizeBodyString(req.body?.name, 120);
    const email = normalizeBodyString(req.body?.email, 160).toLowerCase();
    const company = normalizeBodyString(req.body?.company, 160);
    const message = normalizeBodyString(req.body?.message, 3000);

    if (!name || !email || !message) {
      res.status(400).json({ error: 'Name, email, and message are required' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        company: company || null,
        message,
      },
    });

    const emailResult = await sendContactMessageInternalEmail({
      name,
      email,
      company: company || null,
      message,
    });

    if (!emailResult.sent) {
      console.error('Contact message email failed:', {
        contactMessageId: contactMessage.id,
        error: emailResult.error,
      });
    }

    res.status(201).json({
      ok: true,
      message: 'Thanks. Your message has been sent to the CorpDeals team.',
      contactMessageId: contactMessage.id,
    });
  } catch (error) {
    console.error('POST /api/contact error:', error);
    res.status(500).json({ error: 'Failed to send contact message' });
  }
});

export default router;
