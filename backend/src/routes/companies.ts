import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, requireAdminOrSales } from '../middleware/auth';
import { sendCompanyRequestInternalEmail } from '../lib/mailer';
import {
  getUserVerification,
  isUserVerifiedForCompany,
  VERIFIED_STATUS,
} from '../lib/verifications';

const router = Router();

const asString = (value: unknown) => (typeof value === 'string' ? value : '');
const normalizeBodyString = (value: unknown, maxLength = 255) =>
  asString(value).trim().slice(0, maxLength);
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const extractEmailDomain = (value: string) => {
  const [, domain = ''] = value.trim().toLowerCase().split('@');
  return domain;
};
const normalizeSearchQuery = (query: Request['query']) =>
  (asString(query.q) || asString(query.query) || asString(query.search)).trim();
const SEARCH_STOPWORDS = new Set([
  'and',
  'at',
  'co',
  'company',
  'corp',
  'corporation',
  'deals',
  'employee',
  'employees',
  'for',
  'group',
  'inc',
  'incorporated',
  'limited',
  'llc',
  'ltd',
  'of',
  'organization',
  'the',
  'verified',
]);

const normalizeDomainsInput = (
  input: unknown,
  fallbackDomain?: string | null
) => {
  const items = Array.isArray(input)
    ? input
    : typeof input === 'string'
    ? input.split(',')
    : [];

  const domains = items
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);

  if (fallbackDomain) {
    domains.push(String(fallbackDomain).trim().toLowerCase());
  }

  return Array.from(new Set(domains));
};

type CompanyListItem = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logo: string | null;
  verified: boolean;
  _count?: { offers: number; hrContacts: number };
};

const toPublicCompany = (company: CompanyListItem) => {
  const domains = company.domain ? [company.domain.toLowerCase()] : [];
  return {
    ...company,
    domains,
  };
};

const buildCompanySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'company';

const getUniqueCompanySlug = async (tx: any, companyName: string) => {
  const baseSlug = buildCompanySlug(companyName);
  let candidate = baseSlug;
  let suffix = 2;

  while (await tx.company.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

// Get all companies (public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = normalizeSearchQuery(req.query);
    const verified = asString(req.query.verified);

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { domain: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (verified) {
      where.verified = verified === 'true';
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        logo: true,
        verified: true,
        _count: { select: { offers: true, hrContacts: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ companies: companies.map(toPublicCompany) });
  } catch (error) {
    console.error('Get companies error:', {
      query: req.query,
      error,
    });
    res.status(500).json({ error: 'Failed to get companies' });
  }
});

// Resolve a company from free-text search (e.g., "Amazon employee deals")
router.get('/resolve/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = normalizeSearchQuery(req.query).toLowerCase();
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        logo: true,
        verified: true,
      },
    });

    const tokens = query
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !SEARCH_STOPWORDS.has(token));
    const scored = companies
      .map((company) => {
        const name = company.name.toLowerCase();
        const slug = company.slug.toLowerCase();
        const domain = (company.domain || '').toLowerCase();

        let score = 0;
        if (name === query || slug === query || domain === query) score += 100;
        if (name.includes(query) || slug.includes(query) || domain.includes(query)) score += 40;

        for (const token of tokens) {
          if (name.includes(token)) score += 8;
          if (slug.includes(token)) score += 6;
          if (domain.includes(token)) score += 5;
        }

        return { company: toPublicCompany(company), score };
      })
      .filter((item) => item.score >= 12)
      .sort((a, b) => b.score - a.score);

    res.json({
      query,
      company: scored[0]?.company || null,
      matches: scored.slice(0, 10).map((item) => item.company),
    });
  } catch (error) {
    console.error('Resolve company search error:', {
      query: req.query,
      error,
    });
    res.status(500).json({ error: 'Failed to resolve company search' });
  }
});

router.post('/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyName = normalizeBodyString(req.body.companyName, 160);
    const requesterName = normalizeBodyString(req.body.requesterName, 120);
    const workEmail = normalizeBodyString(req.body.workEmail, 160).toLowerCase();
    const city = normalizeBodyString(req.body.city, 120);
    const note = normalizeBodyString(req.body.note, 1500);

    if (!companyName || !requesterName || !workEmail) {
      res.status(400).json({
        error: 'Company name, your name, and work email are required',
      });
      return;
    }

    if (!isValidEmail(workEmail)) {
      res.status(400).json({ error: 'Please enter a valid work email' });
      return;
    }

    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { name: { equals: companyName, mode: 'insensitive' } },
          { slug: { equals: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        logo: true,
        verified: true,
        _count: { select: { offers: true, hrContacts: true } },
      },
    });

    if (existingCompany) {
      res.status(409).json({
        error: 'That company already exists in CorpDeals',
        company: toPublicCompany(existingCompany),
      });
      return;
    }

    const existingRequest = await prisma.companyRequest.findFirst({
      where: {
        companyName: { equals: companyName, mode: 'insensitive' },
        workEmail: { equals: workEmail, mode: 'insensitive' },
        status: 'PENDING',
      },
      select: { id: true },
    });

    if (existingRequest) {
      res.status(409).json({
        error: 'You have already requested this company. We will review it shortly.',
      });
      return;
    }

    const request = await prisma.companyRequest.create({
      data: {
        companyName,
        requesterName,
        workEmail,
        city: city || null,
        note: note || null,
        status: 'PENDING',
      },
    });

    const internalEmail = await sendCompanyRequestInternalEmail({
      companyName,
      requesterName,
      workEmail,
      city: city || null,
      note: note || null,
    });

    if (!internalEmail.sent) {
      console.error('Company request internal email failed:', {
        requestId: request.id,
        error: internalEmail.error,
      });
    }

    res.status(201).json({
      ok: true,
      requestId: request.id,
      message: `Thanks. We received your request to add ${companyName}.`,
    });
  } catch (error) {
    console.error('Create company request error:', error);
    res.status(500).json({ error: 'Failed to submit company request' });
  }
});

router.get('/requests', authenticateToken, requireAdminOrSales, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = asString(req.query.status).trim();

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const requests = await prisma.companyRequest.findMany({
      where: where as any,
      include: {
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(requests);
  } catch (error) {
    console.error('Get company requests error:', error);
    res.status(500).json({ error: 'Failed to load company requests' });
  }
});

router.patch('/requests/:id', authenticateToken, requireAdminOrSales, async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = String(req.params.id || '').trim();
    const status = String(req.body?.status || '').trim().toUpperCase();
    const reviewNotes = normalizeBodyString(req.body?.reviewNotes, 1000);

    if (!requestId) {
      res.status(400).json({ error: 'Invalid company request id' });
      return;
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
      return;
    }

    const request = await prisma.companyRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      res.status(404).json({ error: 'Company request not found' });
      return;
    }

    if (request.status !== 'PENDING') {
      res.status(409).json({ error: 'This company request has already been reviewed' });
      return;
    }

    const companyName = request.companyName.trim();
    const workDomain = extractEmailDomain(request.workEmail);

    const result = await prisma.$transaction(async (tx) => {
      let createdCompany: CompanyListItem | null = null;

      if (status === 'APPROVED') {
        const existingCompany = await tx.company.findFirst({
          where: {
            OR: [
              { name: { equals: companyName, mode: 'insensitive' } },
              ...(workDomain
                ? [{ domain: { equals: workDomain, mode: 'insensitive' as const } }]
                : []),
            ],
          },
          select: {
            id: true,
            slug: true,
            name: true,
            domain: true,
            logo: true,
            verified: true,
            _count: { select: { offers: true, hrContacts: true } },
          },
        });

        if (existingCompany) {
          createdCompany = existingCompany;
        } else {
          const slug = await getUniqueCompanySlug(tx, companyName);
          createdCompany = await tx.company.create({
            data: {
              name: companyName,
              slug,
              domain: workDomain || null,
              allowedDomains: workDomain ? [workDomain] : [],
              verified: false,
            },
            select: {
              id: true,
              slug: true,
              name: true,
              domain: true,
              logo: true,
              verified: true,
              _count: { select: { offers: true, hrContacts: true } },
            },
          });
        }
      }

      const updatedRequest = await tx.companyRequest.update({
        where: { id: requestId },
        data: {
          status: status as 'APPROVED' | 'REJECTED',
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
        include: {
          reviewedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return {
        request: updatedRequest,
        company: createdCompany ? toPublicCompany(createdCompany) : null,
      };
    });

    res.json({
      ok: true,
      request: result.request,
      company: result.company,
      message:
        status === 'APPROVED'
          ? `Approved. ${companyName} is now in CorpDeals.`
          : `Rejected company request for ${companyName}.`,
    });
  } catch (error) {
    console.error('Review company request error:', error);
    res.status(500).json({ error: 'Failed to review company request' });
  }
});

// Get company deals (requires login + active verification for this company)
router.get('/:idOrSlug/deals', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const idOrSlug = String(req.params.idOrSlug);

    const company = await prisma.company.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        allowedDomains: true,
        logo: true,
        headquarters: true,
        description: true,
      },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const verified = await isUserVerifiedForCompany(req.user!.id, company.id);
    const verification = await getUserVerification(req.user!.id, company.id);

    if (!verified) {
      res.status(403).json({
        error: 'Employment verification required',
        code: 'NOT_VERIFIED',
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
      return;
    }

    const offers = await prisma.offer.findMany({
      where: {
        companyId: company.id,
        active: true,
        complianceStatus: 'APPROVED',
      } as any,
      include: {
        vendor: { select: { id: true, companyName: true, logo: true } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      company,
      offers,
      verification: verification
        ? {
            id: verification.id,
            status: verification.status,
            verifiedAt: verification.verifiedAt,
            expiresAt: verification.expiresAt,
            verified: verification.status === VERIFIED_STATUS && verification.expiresAt > new Date(),
          }
        : null,
    });
  } catch (error) {
    console.error('Get company deals error:', error);
    res.status(500).json({ error: 'Failed to get company deals' });
  }
});

// Get company by ID or slug (public)
router.get('/:idOrSlug', async (req: Request, res: Response): Promise<void> => {
  try {
    const idOrSlug = String(req.params.idOrSlug);

    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
        ],
      },
      include: {
        offers: {
          where: {
            active: true,
            complianceStatus: 'APPROVED',
          } as any,
          include: {
            vendor: {
              select: { companyName: true, logo: true },
            },
            category: true,
          },
        },
        hrContacts: true,
        _count: { select: { offers: true } },
      },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to get company' });
  }
});

// Create company (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      domain,
      allowedDomains,
      logo,
      employeeCount,
      headquarters,
      description,
      verified,
      bannerImage,
      brandColor,
    } = req.body;

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const company = await prisma.company.create({
      data: {
        name,
        slug: finalSlug,
        domain,
        allowedDomains: normalizeDomainsInput(allowedDomains, domain),
        logo,
        employeeCount,
        headquarters,
        description,
        verified: verified || false,
        bannerImage,
        brandColor,
      },
    });

    res.status(201).json(company);
  } catch (error: any) {
    console.error('Create company error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Company with this slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update company (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = String(req.params.id);
    const {
      name,
      slug,
      domain,
      allowedDomains,
      logo,
      employeeCount,
      headquarters,
      description,
      verified,
      bannerImage,
      brandColor,
    } = req.body;

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        slug,
        domain,
        allowedDomains:
          allowedDomains !== undefined
            ? normalizeDomainsInput(allowedDomains, domain)
            : undefined,
        logo,
        employeeCount,
        headquarters,
        description,
        verified,
        bannerImage,
        brandColor,
      },
    });

    res.json(company);
  } catch (error: any) {
    console.error('Update company error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete company (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = String(req.params.id);
    await prisma.company.delete({
      where: { id: companyId },
    });

    res.json({ message: 'Company deleted' });
  } catch (error: any) {
    console.error('Delete company error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;
