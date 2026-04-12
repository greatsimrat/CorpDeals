import { createHash } from 'crypto';
import type { AppRole } from './roles';
import { APP_ROLES, normalizeRole } from './roles';

export type RoleScope = 'GLOBAL' | 'COMPANY' | 'VENDOR';

export type RoleAssignmentInput = {
  userId: string;
  role: AppRole;
  scopeType?: RoleScope;
  companyId?: string | null;
  vendorId?: string | null;
  grantedByUserId?: string | null;
  grantReason?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

export const RBAC_PERMISSION_CODES = [
  'admin.full_access',
  'users.role.manage',
  'vendors.approval.manage',
  'offers.approval.manage',
  'companies.requests.manage',
  'finance.billing.manage',
  'finance.invoices.manage',
  'sales.pipeline.manage',
  'vendor.portal.access',
  'employee.portal.access',
] as const;

export const ROLE_PERMISSION_DEFAULTS: Record<AppRole, ReadonlyArray<string>> = {
  ADMIN: [...RBAC_PERMISSION_CODES],
  FINANCE: ['finance.billing.manage', 'finance.invoices.manage'],
  SALES: ['sales.pipeline.manage', 'companies.requests.manage'],
  VENDOR: ['vendor.portal.access'],
  USER: ['employee.portal.access'],
};

const ROLE_PRECEDENCE: AppRole[] = ['ADMIN', 'FINANCE', 'SALES', 'VENDOR', 'USER'];

const makeDeterministicId = (prefix: string, value: string) =>
  `${prefix}-${createHash('sha1').update(value).digest('hex').slice(0, 20)}`;

export const getHighestPriorityRole = (roles: readonly AppRole[]): AppRole => {
  const roleSet = new Set(roles);
  for (const role of ROLE_PRECEDENCE) {
    if (roleSet.has(role)) return role;
  }
  return 'USER';
};

export const normalizeRoleList = (roles: unknown[]): AppRole[] => {
  const unique = new Set<AppRole>();
  for (const role of roles) {
    unique.add(normalizeRole(role));
  }
  if (!unique.size) unique.add('USER');
  return APP_ROLES.filter((role) => unique.has(role));
};

export const resolveScopedRoleAssignments = async (
  prismaLike: any,
  userId: string,
  now = new Date()
) => {
  const rows = await (prismaLike as any).userRoleAssignment.findMany({
    where: {
      userId,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    select: {
      role: true,
      scopeType: true,
      companyId: true,
      vendorId: true,
    },
  });
  return rows;
};

export const resolveEffectiveRoleSnapshot = (
  baseRole: unknown,
  roleAssignments: Array<{ role: unknown }>
) => {
  const roles = normalizeRoleList([baseRole, ...roleAssignments.map((assignment) => assignment.role)]);
  return {
    roles,
    primaryRole: getHighestPriorityRole(roles),
  };
};

export const resolveRolePermissions = async (prismaLike: any, roles: AppRole[]) => {
  const rows = await (prismaLike as any).rolePermission.findMany({
    where: {
      role: { in: roles as any },
      isActive: true,
      permission: {
        isActive: true,
      },
    },
    select: {
      permission: {
        select: {
          code: true,
        },
      },
    },
  });
  return [...new Set(rows.map((row: any) => String(row.permission?.code || '')))].filter(Boolean) as string[];
};

export const hasAnyRole = (effectiveRoles: AppRole[], requiredRoles: AppRole[]) =>
  requiredRoles.some((role) => effectiveRoles.includes(role));

export const hasPermissionCode = (permissionCodes: string[], requiredPermission: string) =>
  permissionCodes.includes(requiredPermission) || permissionCodes.includes('admin.full_access');

export const upsertGlobalRoleAssignment = async (
  tx: any,
  input: RoleAssignmentInput
) => {
  const scopeType: RoleScope = input.scopeType || 'GLOBAL';
  const role = normalizeRole(input.role);
  const companyId = scopeType === 'COMPANY' ? input.companyId || null : null;
  const vendorId = scopeType === 'VENDOR' ? input.vendorId || null : null;

  const id = makeDeterministicId(
    'ura',
    `${input.userId}:${role}:${scopeType}:${companyId || ''}:${vendorId || ''}`
  );

  await (tx as any).userRoleAssignment.upsert({
    where: { id },
    update: {
      role,
      scopeType,
      companyId,
      vendorId,
      isActive: true,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
      grantedByUserId: input.grantedByUserId || null,
      grantReason: input.grantReason || null,
    },
    create: {
      id,
      userId: input.userId,
      role,
      scopeType,
      companyId,
      vendorId,
      isActive: true,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
      grantedByUserId: input.grantedByUserId || null,
      grantReason: input.grantReason || null,
    },
  });

  await (tx as any).userRoleAssignment.updateMany({
    where: {
      userId: input.userId,
      isActive: true,
      scopeType,
      companyId,
      vendorId,
      id: { not: id },
    },
    data: {
      isActive: false,
      endsAt: new Date(),
    },
  });

  return id;
};
