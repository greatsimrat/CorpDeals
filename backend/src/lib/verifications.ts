import prisma from './prisma';

export const VERIFIED_STATUS = 'verified';
export const EXPIRED_STATUS = 'expired';
export const REVOKED_STATUS = 'revoked';
export const WORK_EMAIL_METHOD = 'work_email';

export const VERIFICATION_VALIDITY_DAYS = Number(
  process.env.VERIFICATION_VALIDITY_DAYS || '60'
);

type CompanyDomainInfo = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  allowedDomains: string[];
  logo?: string | null;
};

const uniq = <T>(values: T[]) => Array.from(new Set(values));

export const normalizeDomain = (value: string) =>
  value.trim().toLowerCase().replace(/^\.+|\.+$/g, '');

export const getCompanyAllowedDomains = (company: {
  domain?: string | null;
  allowedDomains?: string[] | null;
}) => {
  const values = (company.allowedDomains || []).map((item) => normalizeDomain(item));
  if (company.domain) {
    values.push(normalizeDomain(company.domain));
  }
  return uniq(values.filter(Boolean));
};

export const companyMatchesDomain = (
  company: {
    domain?: string | null;
    allowedDomains?: string[] | null;
  },
  domain: string
) => {
  const normalizedDomain = normalizeDomain(domain);
  const allowed = getCompanyAllowedDomains(company);
  return allowed.some(
    (allowedDomain) =>
      normalizedDomain === allowedDomain ||
      normalizedDomain.endsWith(`.${allowedDomain}`)
  );
};

export const getVerificationExpiryDate = (fromDate = new Date()) => {
  const expiresAt = new Date(fromDate);
  expiresAt.setDate(expiresAt.getDate() + VERIFICATION_VALIDITY_DAYS);
  return expiresAt;
};

export const resolveCompanyByDomain = async (domain: string) => {
  const normalizedDomain = normalizeDomain(domain);
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      domain: true,
      allowedDomains: true,
      logo: true,
    },
  });

  const match = companies.find((company) =>
    companyMatchesDomain(company, normalizedDomain)
  );
  return (match || null) as CompanyDomainInfo | null;
};

const expireVerificationIfNeeded = async (record: {
  id: string;
  status: string;
  expiresAt: Date;
}) => {
  if (record.status === VERIFIED_STATUS && record.expiresAt <= new Date()) {
    return prisma.userCompanyVerification.update({
      where: { id: record.id },
      data: { status: EXPIRED_STATUS },
      include: {
        company: {
          select: { id: true, slug: true, name: true, domain: true, logo: true },
        },
      },
    });
  }
  return prisma.userCompanyVerification.findUnique({
    where: { id: record.id },
    include: {
      company: {
        select: { id: true, slug: true, name: true, domain: true, logo: true },
      },
    },
  });
};

export const getUserVerification = async (userId: string, companyId: string) => {
  const existing = await prisma.userCompanyVerification.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    include: {
      company: {
        select: { id: true, slug: true, name: true, domain: true, logo: true },
      },
    },
  });

  if (!existing) return null;
  return expireVerificationIfNeeded(existing);
};

export const isUserVerifiedForCompany = async (
  userId: string,
  companyId: string
) => {
  const verification = await getUserVerification(userId, companyId);
  return !!(
    verification &&
    verification.status === VERIFIED_STATUS &&
    verification.expiresAt > new Date()
  );
};

export const upsertUserCompanyVerification = async (
  userId: string,
  companyId: string
) => {
  const now = new Date();
  const expiresAt = getVerificationExpiryDate(now);

  return prisma.userCompanyVerification.upsert({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    update: {
      verificationMethod: WORK_EMAIL_METHOD,
      verifiedAt: now,
      expiresAt,
      status: VERIFIED_STATUS,
    },
    create: {
      userId,
      companyId,
      verificationMethod: WORK_EMAIL_METHOD,
      verifiedAt: now,
      expiresAt,
      status: VERIFIED_STATUS,
    },
    include: {
      company: {
        select: { id: true, slug: true, name: true, domain: true, logo: true },
      },
    },
  });
};

export const listUserVerifications = async (userId: string) => {
  const verifications = await prisma.userCompanyVerification.findMany({
    where: { userId },
    include: {
      company: {
        select: { id: true, slug: true, name: true, domain: true, logo: true },
      },
    },
    orderBy: [{ expiresAt: 'desc' }, { updatedAt: 'desc' }],
  });

  const resolved = await Promise.all(
    verifications.map((record) => expireVerificationIfNeeded(record))
  );

  return resolved.filter(
    (record): record is NonNullable<(typeof resolved)[number]> => record !== null
  );
};

export const getLatestVerificationBadge = async (userId: string) => {
  const latest = await prisma.userCompanyVerification.findFirst({
    where: { userId },
    orderBy: [{ expiresAt: 'desc' }, { updatedAt: 'desc' }],
    include: {
      company: {
        select: { id: true, slug: true, name: true, domain: true, logo: true },
      },
    },
  });

  if (!latest) return null;
  return expireVerificationIfNeeded(latest);
};
