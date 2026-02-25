import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  getUserVerification,
  isUserVerifiedForCompany,
  VERIFIED_STATUS,
} from '../lib/verifications';

const router = Router();

const asString = (value: unknown) => (typeof value === 'string' ? value : '');
const normalizeSearchQuery = (query: Request['query']) =>
  (asString(query.q) || asString(query.query) || asString(query.search)).trim();

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

    const tokens = query.split(/[^a-z0-9]+/).filter((token) => token.length >= 2);
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
      .filter((item) => item.score > 0)
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
