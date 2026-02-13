import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { canSendEmail, sendVerificationCodeEmail } from '../lib/mailer';

const router = Router();

const CODE_TTL_MINUTES = Number(process.env.VERIFICATION_CODE_TTL_MINUTES || '15');
const MAX_ATTEMPTS = Number(process.env.VERIFICATION_CODE_MAX_ATTEMPTS || '5');

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'gmx.com',
]);

const ALLOW_PERSONAL_EMAILS =
  process.env.ALLOW_PERSONAL_EMAIL_VERIFICATION === 'true' &&
  process.env.NODE_ENV !== 'production';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const extractDomain = (email: string) => {
  const at = email.lastIndexOf('@');
  if (at === -1) return '';
  return email.slice(at + 1).toLowerCase();
};

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const shouldReturnDevCode = () =>
  process.env.RETURN_VERIFICATION_CODE === 'true' ||
  process.env.NODE_ENV !== 'production';

// Start verification (send code)
router.post('/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyIdOrSlug, email } = req.body;

    if (!companyIdOrSlug || !email) {
      res.status(400).json({ error: 'Company and email are required' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const domain = extractDomain(normalizedEmail);

    if (!domain) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }

    if (PERSONAL_EMAIL_DOMAINS.has(domain) && !ALLOW_PERSONAL_EMAILS) {
      res.status(400).json({ error: 'Please use your work email address' });
      return;
    }

    const company = await prisma.company.findFirst({
      where: {
        OR: [{ id: companyIdOrSlug }, { slug: companyIdOrSlug }],
      },
      select: { id: true, name: true, slug: true, domain: true },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const companyDomain = company.domain?.toLowerCase();
    if (companyDomain && !ALLOW_PERSONAL_EMAILS) {
      const matches =
        domain === companyDomain || domain.endsWith(`.${companyDomain}`);
      if (!matches) {
        res.status(400).json({
          error: `Email domain must match ${companyDomain}`,
        });
        return;
      }
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const codeExpiresAt = new Date(
      Date.now() + CODE_TTL_MINUTES * 60 * 1000
    );

    const existing = await prisma.employeeVerification.findFirst({
      where: {
        companyId: company.id,
        email: normalizedEmail,
        status: 'PENDING',
        codeExpiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const verification = existing
      ? await prisma.employeeVerification.update({
          where: { id: existing.id },
          data: { codeHash, codeExpiresAt, attempts: 0 },
        })
      : await prisma.employeeVerification.create({
          data: {
            companyId: company.id,
            email: normalizedEmail,
            codeHash,
            codeExpiresAt,
            method: 'EMAIL',
          },
        });

    const emailResult = await sendVerificationCodeEmail({
      to: normalizedEmail,
      code,
      companyName: company.name,
      expiresAt: codeExpiresAt,
    });

    if (!emailResult.sent && process.env.NODE_ENV === 'production') {
      console.error('Send verification email error:', emailResult.error);
      res.status(500).json({ error: 'Failed to send verification email' });
      return;
    }

    console.log(
      `[verification] ${normalizedEmail} -> ${company.slug}: ${code} (expires ${codeExpiresAt.toISOString()})`
    );

    const response: any = {
      verificationId: verification.id,
      expiresAt: verification.codeExpiresAt,
      company: {
        id: company.id,
        slug: company.slug,
        name: company.name,
        domain: company.domain,
      },
      delivery: emailResult.sent ? 'email' : 'console',
      emailConfigured: canSendEmail(),
    };

    if (shouldReturnDevCode()) {
      response.devCode = code;
    }

    res.json(response);
  } catch (error) {
    console.error('Start verification error:', error);
    res.status(500).json({ error: 'Failed to start verification' });
  }
});

// Verify code and issue employee token
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { verificationId, code, name } = req.body;

    if (!verificationId || !code) {
      res.status(400).json({ error: 'Verification ID and code are required' });
      return;
    }

    const verification = await prisma.employeeVerification.findUnique({
      where: { id: verificationId },
      include: {
        company: { select: { id: true, slug: true, name: true, domain: true } },
      },
    });

    if (!verification) {
      res.status(404).json({ error: 'Verification request not found' });
      return;
    }

    if (verification.status !== 'PENDING') {
      res.status(400).json({ error: 'Verification is no longer valid' });
      return;
    }

    if (verification.codeExpiresAt < new Date()) {
      await prisma.employeeVerification.update({
        where: { id: verification.id },
        data: { status: 'EXPIRED' },
      });
      res.status(400).json({ error: 'Verification code has expired' });
      return;
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      res.status(429).json({ error: 'Too many attempts. Request a new code.' });
      return;
    }

    const isValid = await bcrypt.compare(code, verification.codeHash);
    if (!isValid) {
      await prisma.employeeVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: verification.email },
    });

    if (existingUser && existingUser.role !== 'EMPLOYEE') {
      res.status(409).json({
        error: 'This email is already linked to a vendor or admin account',
      });
      return;
    }

    const displayName =
      typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;

    const passwordHash = existingUser
      ? undefined
      : await bcrypt.hash(
          `emp-${verification.id}-${Math.random().toString(36).slice(2)}`,
          10
        );

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            employeeCompanyId: verification.companyId,
            employmentVerifiedAt: new Date(),
            ...(displayName && !existingUser.name ? { name: displayName } : {}),
          },
        })
      : await prisma.user.create({
          data: {
            email: verification.email,
            passwordHash: passwordHash!,
            name: displayName,
            role: 'EMPLOYEE',
            employeeCompanyId: verification.companyId,
            employmentVerifiedAt: new Date(),
          },
        });

    await prisma.employeeVerification.update({
      where: { id: verification.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        userId: user.id,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        employmentVerifiedAt: user.employmentVerifiedAt,
        employeeCompany: verification.company,
      },
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Get current verification status (authenticated)
router.get(
  '/status',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          employmentVerifiedAt: true,
          employeeCompany: {
            select: { id: true, slug: true, name: true, domain: true },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        verified: !!user.employmentVerifiedAt,
        employmentVerifiedAt: user.employmentVerifiedAt,
        company: user.employeeCompany,
      });
    } catch (error) {
      console.error('Get verification status error:', error);
      res.status(500).json({ error: 'Failed to fetch verification status' });
    }
  }
);

export default router;
