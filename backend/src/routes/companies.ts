import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, requireAdminOrSales } from '../middleware/auth';
import { sendCompanyRequestInternalEmail } from '../lib/mailer';
import {
  buildEligibilityMessage,
  getNormalizedUserLocation,
  isOfferEligibleForLocation,
} from '../lib/offer-coverage';
import { parseDealSearchIntent, scoreOfferForDealSearch } from '../lib/deal-search';
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

const COMPANY_SUFFIXES = new Set([
  'and',
  'co',
  'company',
  'corp',
  'corporation',
  'group',
  'holdings',
  'inc',
  'incorporated',
  'limited',
  'llc',
  'ltd',
  'plc',
]);

const COMPANY_DECORATOR_SUFFIX = /\b(regression|test|qa|demo|staging|sandbox|temp|tmp)\b[\s-]*\d*$/i;

const normalizeCompanyIdentity = (value: string) => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(COMPANY_DECORATOR_SUFFIX, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const tokens = cleaned
    .split(/\s+/)
    .filter((token) => token && !COMPANY_SUFFIXES.has(token));

  return tokens.join('');
};

const rankCompanyCandidate = (company: CompanyListItem) => {
  const offerCount = company._count?.offers ?? 0;
  const hrContactsCount = company._count?.hrContacts ?? 0;
  const isDecorated = COMPANY_DECORATOR_SUFFIX.test(company.name);
  const hasNaturalSpacing = /\s/.test(company.name);
  return [
    company.verified ? 1 : 0,
    offerCount,
    hrContactsCount,
    isDecorated ? 0 : 1,
    hasNaturalSpacing ? 1 : 0,
    company.name.length ? -company.name.length : 0,
  ];
};

const preferCanonicalCompany = (left: CompanyListItem, right: CompanyListItem) => {
  const leftRank = rankCompanyCandidate(left);
  const rightRank = rankCompanyCandidate(right);

  for (let index = 0; index < leftRank.length; index += 1) {
    if (leftRank[index] === rightRank[index]) continue;
    return leftRank[index] > rightRank[index] ? left : right;
  }

  return left.name.localeCompare(right.name) <= 0 ? left : right;
};

const dedupeCompanies = <T extends CompanyListItem>(companies: T[]) => {
  const grouped = new Map<string, T>();

  for (const company of companies) {
    const identity =
      normalizeCompanyIdentity(company.name) ||
      normalizeCompanyIdentity(company.slug) ||
      (company.domain || '').toLowerCase();
    const key = identity || company.id;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, company);
      continue;
    }

    grouped.set(key, preferCanonicalCompany(existing, company) as T);
  }

  return Array.from(grouped.values());
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

type CompanyLookupClient = {
  company: {
    findMany: typeof prisma.company.findMany;
  };
};

const findPotentialDuplicateCompany = async (
  db: CompanyLookupClient,
  input: {
    companyName: string;
    domain?: string | null;
    excludeCompanyId?: string;
    matchOnDomainOnly?: boolean;
  }
) => {
  const normalizedName = normalizeCompanyIdentity(input.companyName);
  const normalizedSlug = normalizeCompanyIdentity(buildCompanySlug(input.companyName));
  const normalizedDomain = input.domain ? input.domain.trim().toLowerCase() : '';
  const matchOnDomainOnly = input.matchOnDomainOnly ?? true;

  const candidates = await db.company.findMany({
    where: input.excludeCompanyId
      ? { id: { not: input.excludeCompanyId } }
      : undefined,
    select: {
      id: true,
      slug: true,
      name: true,
      domain: true,
      allowedDomains: true,
      logo: true,
      verified: true,
      _count: { select: { offers: true, hrContacts: true } },
    },
  });

  const matches = candidates.filter((company) => {
    const candidateName = normalizeCompanyIdentity(company.name);
    const candidateSlug = normalizeCompanyIdentity(company.slug);
    const candidateDomains = new Set(
      [company.domain, ...(company.allowedDomains || [])]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const nameMatches =
      (!!normalizedName && (candidateName === normalizedName || candidateSlug === normalizedName)) ||
      (!!normalizedSlug && (candidateName === normalizedSlug || candidateSlug === normalizedSlug));
    const domainMatches = !!normalizedDomain && candidateDomains.has(normalizedDomain);

    return (
      nameMatches ||
      (matchOnDomainOnly && domainMatches)
    );
  });

  if (matches.length === 0) {
    return null;
  }

  return dedupeCompanies(matches)[0] || matches[0];
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

    res.json({ companies: dedupeCompanies(companies).map(toPublicCompany) });
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
    const scored = dedupeCompanies(companies)
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

    const existingCompany = await findPotentialDuplicateCompany(prisma, {
      companyName,
      domain: extractEmailDomain(workEmail),
      matchOnDomainOnly: false,
    });

    if (existingCompany) {
      res.status(409).json({
        error: 'That company already exists in CorpDeals',
        company: toPublicCompany(existingCompany),
      });
      return;
    }

    const pendingRequests = await prisma.companyRequest.findMany({
      where: { status: 'PENDING' },
      select: { id: true, companyName: true, workEmail: true },
    });

    const requestedIdentity = normalizeCompanyIdentity(companyName);
    const existingRequest = pendingRequests.find((item) => {
      return (
        normalizeCompanyIdentity(item.companyName) === requestedIdentity &&
        item.workEmail.trim().toLowerCase() === workEmail
      );
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
        const existingCompany = await findPotentialDuplicateCompany(tx, {
          companyName,
          domain: workDomain || null,
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

const getCompanyByIdOrSlug = async (idOrSlug: string) =>
  prisma.company.findFirst({
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

const serializeVerification = (verification: Awaited<ReturnType<typeof getUserVerification>> | null) =>
  verification
    ? {
        id: verification.id,
        status: verification.status,
        verifiedAt: verification.verifiedAt,
        expiresAt: verification.expiresAt,
        verified:
          verification.status === VERIFIED_STATUS && verification.expiresAt > new Date(),
      }
    : null;

// Search company deals (requires login + active verification for this company)
router.get('/:idOrSlug/deals/search', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const idOrSlug = String(req.params.idOrSlug);
    const query = normalizeSearchQuery(req.query);
    if (!query) {
      res.json({
        company: null,
        query: '',
        results: [],
        viewerLocation: getNormalizedUserLocation(req.user),
        nearbyExplanation: null,
      });
      return;
    }

    const company = await getCompanyByIdOrSlug(idOrSlug);
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

    const viewerLocation = getNormalizedUserLocation(req.user);
    const searchIntent = parseDealSearchIntent(query);
    const offers = await prisma.offer.findMany({
      where: {
        companyId: company.id,
        active: true,
        complianceStatus: 'APPROVED',
      } as any,
      include: {
        vendor: { select: { id: true, companyName: true, logo: true } },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            parent: {
              select: { id: true, name: true, slug: true, icon: true },
            },
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });

    const results = offers
      .map((offer) => {
        const searchMatch = scoreOfferForDealSearch(offer, searchIntent);
        if (!searchMatch.matched) return null;

        const isEligible = isOfferEligibleForLocation(offer, viewerLocation);
        return {
          ...offer,
          isEligible,
          eligibilityMessage: buildEligibilityMessage(offer, company.name, isEligible),
          searchMatch,
        };
      })
      .filter((offer): offer is NonNullable<typeof offer> => Boolean(offer))
      .sort((left, right) => {
        if (right.searchMatch.score !== left.searchMatch.score) {
          return right.searchMatch.score - left.searchMatch.score;
        }
        if (Number(right.isEligible) !== Number(left.isEligible)) {
          return Number(right.isEligible) - Number(left.isEligible);
        }
        if (Number(Boolean(right.featured)) !== Number(Boolean(left.featured))) {
          return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
        }
        return left.title.localeCompare(right.title);
      });

    const nearbyExplanation =
      searchIntent.requestedCityName &&
      searchIntent.requestedProvinceCode &&
      results.some((offer) => offer.searchMatch.locationMatch === 'query-nearby-city')
        ? `Showing nearby ${searchIntent.requestedProvinceCode} city matches for ${searchIntent.requestedCityName}`
        : null;

    res.json({
      company,
      query,
      results,
      viewerLocation,
      nearbyExplanation,
      verification: serializeVerification(verification),
    });
  } catch (error) {
    console.error('Search company deals error:', error);
    res.status(500).json({ error: 'Failed to search company deals' });
  }
});

// Get company deals (requires login + active verification for this company)
router.get('/:idOrSlug/deals', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const idOrSlug = String(req.params.idOrSlug);

    const company = await getCompanyByIdOrSlug(idOrSlug);

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

    const userLocation = getNormalizedUserLocation(req.user);
    const offerVisibility: Record<string, unknown>[] = [
      { coverageType: 'COMPANY_WIDE' },
    ];
    if (userLocation.provinceCode) {
      offerVisibility.push({
        coverageType: 'PROVINCE_SPECIFIC',
        provinceCode: userLocation.provinceCode,
      });
    }
    if (userLocation.provinceCode && userLocation.cityName) {
      offerVisibility.push({
        coverageType: 'CITY_SPECIFIC',
        provinceCode: userLocation.provinceCode,
        cityName: {
          equals: userLocation.cityName,
          mode: 'insensitive',
        },
      });
    }

    const offers = await prisma.offer.findMany({
      where: {
        companyId: company.id,
        active: true,
        complianceStatus: 'APPROVED',
        OR: offerVisibility as any,
      } as any,
      include: {
        vendor: { select: { id: true, companyName: true, logo: true } },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            parent: {
              select: { id: true, name: true, slug: true, icon: true },
            },
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      company,
      offers,
      viewerLocation: {
        provinceCode: userLocation.provinceCode,
        cityName: userLocation.cityName,
      },
      verification: serializeVerification(verification),
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
    const existingCompany = await findPotentialDuplicateCompany(prisma, {
      companyName: String(name || ''),
      domain: typeof domain === 'string' ? domain : null,
    });

    if (existingCompany) {
      res.status(409).json({
        error: `Company looks like a duplicate of ${existingCompany.name}`,
        company: toPublicCompany(existingCompany),
      });
      return;
    }

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
    const existingCompany = await findPotentialDuplicateCompany(prisma, {
      companyName: String(name || ''),
      domain: typeof domain === 'string' ? domain : null,
      excludeCompanyId: companyId,
    });

    if (existingCompany) {
      res.status(409).json({
        error: `Company looks like a duplicate of ${existingCompany.name}`,
        company: toPublicCompany(existingCompany),
      });
      return;
    }

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
