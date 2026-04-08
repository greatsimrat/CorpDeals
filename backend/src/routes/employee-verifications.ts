import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken, authenticateTokenOptional, requireAdmin } from '../middleware/auth';
import {
  canSendEmail,
  getEmailConfig,
  sendTestEmail,
  sendVerificationCodeEmail,
} from '../lib/mailer';
import { buildAuthUserPayload } from '../lib/auth-user';
import {
  companyMatchesDomain,
  getCompanyAllowedDomains,
  getUserVerification,
  listUserVerifications,
  resolveCompanyByDomain,
  upsertUserCompanyVerification,
  VERIFIED_STATUS,
} from '../lib/verifications';
import { DEFAULT_USER_ROLE } from '../lib/roles';

const router = Router();

const CODE_TTL_MINUTES = Number(process.env.VERIFICATION_CODE_TTL_MINUTES || '10');
const MAX_ATTEMPTS = Number(process.env.VERIFICATION_CODE_MAX_ATTEMPTS || '5');
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

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
const normalizeCompanyName = (value: string) => value.trim().replace(/\s+/g, ' ');

const extractDomain = (email: string) => {
  const at = email.lastIndexOf('@');
  if (at === -1) return '';
  return email.slice(at + 1).toLowerCase();
};

const buildCompanySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'company';

const getUniqueCompanySlug = async (companyName: string) => {
  const baseSlug = buildCompanySlug(companyName);
  let candidate = baseSlug;
  let suffix = 2;

  while (await prisma.company.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const getVerificationCompany = async (
  companyIdOrSlug: string,
  companyName: string,
  workDomain: string
) => {
  const select = {
    id: true,
    name: true,
    slug: true,
    domain: true,
    allowedDomains: true,
    logo: true,
  } as const;

  if (companyIdOrSlug) {
    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [{ id: companyIdOrSlug }, { slug: companyIdOrSlug }],
      },
      select,
    });

    if (existingCompany) {
      return existingCompany;
    }
  }

  if (!companyName || !workDomain) {
    return null;
  }

  const matchedByDomain = await resolveCompanyByDomain(workDomain);
  if (matchedByDomain) {
    return matchedByDomain;
  }

  const normalizedCompanyName = normalizeCompanyName(companyName);
  if (!normalizedCompanyName) {
    return null;
  }

  const matchedByName = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { equals: normalizedCompanyName, mode: 'insensitive' } },
        { slug: buildCompanySlug(normalizedCompanyName) },
      ],
    },
    select,
  });

  if (matchedByName) {
    return matchedByName;
  }

  const slug = await getUniqueCompanySlug(normalizedCompanyName);
  return prisma.company.create({
    data: {
      name: normalizedCompanyName,
      slug,
      domain: workDomain,
      allowedDomains: [workDomain],
      verified: false,
    },
    select,
  });
};

const attachCompanyDomainIfMissing = async (
  company: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    allowedDomains: string[];
    logo?: string | null;
  },
  workDomain: string
) => {
  const normalizedDomain = extractDomain(`employee@${workDomain}`);
  const existingAllowedDomains = getCompanyAllowedDomains(company);
  if (existingAllowedDomains.length > 0 || !normalizedDomain) {
    return company;
  }

  return prisma.company.update({
    where: { id: company.id },
    data: {
      domain: normalizedDomain,
      allowedDomains: [normalizedDomain],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      allowedDomains: true,
      logo: true,
    },
  });
};

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const shouldReturnDevCode = () =>
  process.env.RETURN_VERIFICATION_CODE === 'true' ||
  process.env.NODE_ENV !== 'production';

// SMTP test email (admin only)
router.post(
  '/test-email',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      const to = normalizeEmail(String(req.body?.to || ''));
      if (!to || !to.includes('@')) {
        res.status(400).json({ error: 'A valid recipient email is required' });
        return;
      }

      const result = await sendTestEmail({ to });
      if (!result.sent) {
        res.status(500).json({
          error: 'Failed to send test email',
          detail: result.error || 'Unknown mailer error',
          config: getEmailConfig(),
        });
        return;
      }

      res.json({
        sent: true,
        to,
        config: getEmailConfig(),
      });
    } catch (error) {
      console.error('Test email endpoint error:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  }
);

// Start verification (send code)
router.post('/start', authenticateTokenOptional, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user && req.user.role !== DEFAULT_USER_ROLE) {
      res.status(403).json({
        error: 'Only user accounts can start work email verification',
      });
      return;
    }

    const companyIdOrSlug = String(
      req.body?.companyIdOrSlug || req.body?.companyId || req.body?.company || ''
    ).trim();
    const companyName = normalizeCompanyName(String(req.body?.companyName || ''));
    const email = String(req.body?.email || req.body?.workEmail || '').trim();

    if ((!companyIdOrSlug && !companyName) || !email) {
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

    let company = await getVerificationCompany(companyIdOrSlug, companyName, domain);

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    company = await attachCompanyDomainIfMissing(company, domain);

    const allowedDomains = getCompanyAllowedDomains(company);
    if (!ALLOW_PERSONAL_EMAILS && !companyMatchesDomain(company, domain)) {
      const matchedCompany = await resolveCompanyByDomain(domain);
      if (!matchedCompany) {
        res.status(404).json({
          error: 'Company not found. Request to add company.',
        });
        return;
      }

      if (matchedCompany.id !== company.id) {
        res.status(400).json({
          error: `This email is associated with ${matchedCompany.name}. Verify that company instead.`,
        });
        return;
      }

      const expected = allowedDomains.join(', ') || company.domain || 'your company domain';
      res.status(400).json({
        error: `Email domain mismatch. Use your ${expected} work email.`,
      });
      return;
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
        logo: company.logo,
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

const completeVerification = async (
  verification: any,
  code: string,
  name: unknown,
  currentUserId: string | undefined,
  res: Response
): Promise<void> => {
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

  const conflictingVerifiedWorkEmail = await prisma.employeeVerification.findFirst({
    where: {
      email: verification.email,
      status: 'VERIFIED',
      userId: {
        not: currentUserId || undefined,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  const existingUser = await prisma.user.findUnique({
    where: { email: verification.email },
  });

  const currentUser = currentUserId
    ? await prisma.user.findUnique({
        where: { id: currentUserId },
      })
    : null;

  if (currentUser && currentUser.role !== DEFAULT_USER_ROLE) {
    res.status(403).json({
      error: 'Only user accounts can attach work email verification',
    });
    return;
  }

  if (currentUser && existingUser && existingUser.id !== currentUser.id) {
    res.status(409).json({
      error: 'This work email is already linked to another account',
    });
    return;
  }

  if (
    conflictingVerifiedWorkEmail &&
    conflictingVerifiedWorkEmail.userId &&
    (!currentUser || conflictingVerifiedWorkEmail.userId !== currentUser.id)
  ) {
    res.status(409).json({
      error: 'This work email is already linked to another account',
    });
    return;
  }

  if (!currentUser && existingUser && existingUser.role !== DEFAULT_USER_ROLE) {
    res.status(409).json({
      error: 'This email is already linked to a non-user account',
    });
    return;
  }

  const displayName =
    typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;

  const accountUser = currentUser || existingUser;

  const passwordHash = accountUser
    ? undefined
    : await bcrypt.hash(
        `emp-${verification.id}-${Math.random().toString(36).slice(2)}`,
        10
      );

  const user = accountUser
    ? await prisma.user.update({
        where: { id: accountUser.id },
        data: {
          role: DEFAULT_USER_ROLE,
          activeCompanyId: verification.companyId,
          employeeCompanyId: verification.companyId,
          employmentVerifiedAt: new Date(),
          ...(displayName && !accountUser.name ? { name: displayName } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          email: verification.email,
          passwordHash: passwordHash!,
          name: displayName,
          role: DEFAULT_USER_ROLE,
          activeCompanyId: verification.companyId,
          employeeCompanyId: verification.companyId,
          employmentVerifiedAt: new Date(),
        },
      });

  const verificationRecord = await upsertUserCompanyVerification(
    user.id,
    verification.companyId
  );

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
    { expiresIn: jwtExpiresIn }
  );

  const userPayload = await buildAuthUserPayload(user.id);
  if (!userPayload) {
    res.status(500).json({ error: 'Failed to prepare user payload' });
    return;
  }

  res.json({
    token,
    user: userPayload,
    verification: {
      id: verificationRecord.id,
      status: verificationRecord.status,
      verifiedAt: verificationRecord.verifiedAt,
      expiresAt: verificationRecord.expiresAt,
      company: verificationRecord.company,
    },
  });
};

// Verify code and issue employee token
router.post('/verify', authenticateTokenOptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const verificationId = String(req.body?.verificationId || '').trim();
    const code = String(req.body?.code || req.body?.otp || '').trim();
    const name = req.body?.name;

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

    await completeVerification(verification, code, name, req.user?.id, res);
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Alias used by new frontend flow
router.post('/confirm', authenticateTokenOptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const verificationId = String(req.body?.verificationId || '').trim();
    const companyIdOrSlug = String(
      req.body?.companyId || req.body?.company || req.body?.companyIdOrSlug || ''
    ).trim();
    const workEmail = String(req.body?.workEmail || req.body?.email || '').trim();
    const otp = String(req.body?.otp || req.body?.code || '').trim();
    const name = req.body?.name;

    let verification: any = null;

    if (verificationId) {
      verification = await prisma.employeeVerification.findUnique({
        where: { id: verificationId },
        include: {
          company: { select: { id: true, slug: true, name: true, domain: true } },
        },
      });
    } else {
      if (!companyIdOrSlug || !workEmail || !otp) {
        res.status(400).json({
          error: 'companyId, workEmail, and otp are required',
        });
        return;
      }

      const company = await prisma.company.findFirst({
        where: {
          OR: [{ id: companyIdOrSlug }, { slug: companyIdOrSlug }],
        },
        select: { id: true },
      });

      if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      verification = await prisma.employeeVerification.findFirst({
        where: {
          companyId: company.id,
          email: normalizeEmail(workEmail),
          status: 'PENDING',
        },
        include: {
          company: { select: { id: true, slug: true, name: true, domain: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!verification) {
      res.status(404).json({ error: 'Verification request not found' });
      return;
    }

    const code = otp || String(req.body?.code || '').trim();
    if (!code) {
      res.status(400).json({ error: 'OTP code is required' });
      return;
    }

    await completeVerification(verification, code, name, req.user?.id, res);
  } catch (error) {
    console.error('Confirm verification error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

router.get(
  '/company/:companyIdOrSlug/status',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const companyIdOrSlug = String(req.params.companyIdOrSlug);
      const company = await prisma.company.findFirst({
        where: {
          OR: [{ id: companyIdOrSlug }, { slug: companyIdOrSlug }],
        },
        select: { id: true, slug: true, name: true, domain: true, logo: true },
      });

      if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      const verification = await getUserVerification(req.user!.id, company.id);
      const verified =
        !!verification &&
        verification.status === VERIFIED_STATUS &&
        verification.expiresAt > new Date();

      res.json({
        verified,
        company,
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
      console.error('Get company verification status error:', error);
      res.status(500).json({ error: 'Failed to fetch verification status' });
    }
  }
);

router.get(
  '/my',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const records = await listUserVerifications(req.user!.id);
      res.json(
        records.map((record) => ({
          id: record.id,
          status: record.status,
          verifiedAt: record.verifiedAt,
          expiresAt: record.expiresAt,
          verificationMethod: record.verificationMethod,
          company: record.company,
        }))
      );
    } catch (error) {
      console.error('Get my verifications error:', error);
      res.status(500).json({ error: 'Failed to fetch verifications' });
    }
  }
);

// Get current verification status (authenticated)
router.get('/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const companyIdOrSlug = (req.query.companyIdOrSlug as string | undefined) || '';
    const allVerifications = await listUserVerifications(req.user!.id);
    const activeVerifications = allVerifications.filter(
      (item) => item.status === VERIFIED_STATUS && item.expiresAt > new Date()
    );

    let companyVerification: any = null;
    if (companyIdOrSlug) {
      const company = await prisma.company.findFirst({
        where: {
          OR: [{ id: companyIdOrSlug }, { slug: companyIdOrSlug }],
        },
        select: { id: true, slug: true, name: true, domain: true, logo: true },
      });

      if (company) {
        const verification = await getUserVerification(req.user!.id, company.id);
        companyVerification = {
          company,
          verification: verification
            ? {
                id: verification.id,
                status: verification.status,
                verifiedAt: verification.verifiedAt,
                expiresAt: verification.expiresAt,
                verificationMethod: verification.verificationMethod,
              }
            : null,
          verified:
            !!verification &&
            verification.status === VERIFIED_STATUS &&
            verification.expiresAt > new Date(),
        };
      }
    }

    const current = activeVerifications[0] || null;

    res.json({
      verified: !!current,
      employmentVerifiedAt: current?.verifiedAt || null,
      company: current?.company || null,
      verification: current
        ? {
            id: current.id,
            status: current.status,
            verifiedAt: current.verifiedAt,
            expiresAt: current.expiresAt,
            verificationMethod: current.verificationMethod,
          }
        : null,
      activeVerifications: activeVerifications.map((item) => ({
        id: item.id,
        status: item.status,
        verifiedAt: item.verifiedAt,
        expiresAt: item.expiresAt,
        verificationMethod: item.verificationMethod,
        company: item.company,
      })),
      companyVerification,
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

export default router;
