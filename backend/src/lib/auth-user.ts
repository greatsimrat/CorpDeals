import prisma from './prisma';
import { normalizeRole } from './roles';
import {
  getLatestVerificationBadge,
  VERIFIED_STATUS,
} from './verifications';

export const buildAuthUserPayload = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      vendor: true,
      activeCompany: {
        select: { id: true, slug: true, name: true, domain: true },
      },
      employeeCompany: {
        select: { id: true, slug: true, name: true, domain: true },
      },
    },
  });

  if (!user) return null;

  const latestVerification = await getLatestVerificationBadge(userId);
  const isActiveVerification =
    !!latestVerification &&
    latestVerification.status === VERIFIED_STATUS &&
    latestVerification.expiresAt > new Date();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: normalizeRole(user.role),
    vendor: user.vendor,
    employmentVerifiedAt: user.employmentVerifiedAt,
    activeCompany: user.activeCompany,
    employeeCompany: user.employeeCompany,
    activeVerification: isActiveVerification
      ? {
          id: latestVerification.id,
          status: latestVerification.status,
          verifiedAt: latestVerification.verifiedAt,
          expiresAt: latestVerification.expiresAt,
          verificationMethod: latestVerification.verificationMethod,
          company: latestVerification.company,
        }
      : null,
    latestVerification: latestVerification
      ? {
          id: latestVerification.id,
          status: latestVerification.status,
          verifiedAt: latestVerification.verifiedAt,
          expiresAt: latestVerification.expiresAt,
          verificationMethod: latestVerification.verificationMethod,
          company: latestVerification.company,
        }
      : null,
  };
};
