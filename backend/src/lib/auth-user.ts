import prisma from './prisma';
import { normalizeRole } from './roles';
import {
  getLatestVerificationBadge,
  VERIFIED_STATUS,
} from './verifications';
import {
  resolveEffectiveRoleSnapshot,
  resolveRolePermissions,
  resolveScopedRoleAssignments,
} from './rbac';

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

  const assignments = await resolveScopedRoleAssignments(prisma, userId);
  const roleSnapshot = resolveEffectiveRoleSnapshot(user.role, assignments);
  const permissionCodes = await resolveRolePermissions(prisma, roleSnapshot.roles);

  const latestVerification = await getLatestVerificationBadge(userId);
  const isActiveVerification =
    !!latestVerification &&
    latestVerification.status === VERIFIED_STATUS &&
    latestVerification.expiresAt > new Date();
  const latestVerifiedWorkEmail =
    (await prisma.employeeVerification.findFirst({
      where: latestVerification
        ? {
            userId,
            companyId: latestVerification.company.id,
            status: 'VERIFIED',
          }
        : {
            userId,
            status: 'VERIFIED',
          },
      select: {
        email: true,
        verifiedAt: true,
      },
      orderBy: [{ verifiedAt: 'desc' }, { updatedAt: 'desc' }],
    })) ||
    (await prisma.employeeVerification.findFirst({
      where: {
        userId,
        status: 'VERIFIED',
      },
      select: {
        email: true,
        verifiedAt: true,
      },
      orderBy: [{ verifiedAt: 'desc' }, { updatedAt: 'desc' }],
    }));

  return {
    id: user.id,
    email: user.email,
    loginEmail: user.email,
    name: user.name,
    role: roleSnapshot.primaryRole || normalizeRole(user.role),
    roles: roleSnapshot.roles,
    permissionCodes,
    provinceCode: user.provinceCode,
    cityName: user.cityName,
    vendor: user.vendor,
    employmentVerifiedAt: user.employmentVerifiedAt,
    workEmail: latestVerifiedWorkEmail?.email || null,
    workEmailVerifiedAt: latestVerifiedWorkEmail?.verifiedAt || null,
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
