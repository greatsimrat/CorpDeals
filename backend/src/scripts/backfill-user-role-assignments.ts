import { createHash } from 'crypto';
import prisma from '../lib/prisma';
import { normalizeRole } from '../lib/roles';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const allowProduction = args.has('--allow-production');

const makeId = (userId: string, role: string) =>
  `ura-global-${createHash('sha1').update(`${userId}:${role}:GLOBAL`).digest('hex').slice(0, 20)}`;

async function main() {
  const runtimeEnv = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  const isProduction = runtimeEnv === 'production' || runtimeEnv === 'prod';
  if (isProduction && !allowProduction) {
    throw new Error(
      'Refusing to run RBAC backfill in production without --allow-production. Use --dry-run first.'
    );
  }

  const users = await (prisma as any).user.findMany({
    select: {
      id: true,
      role: true,
      createdAt: true,
      roleAssignments: {
        where: {
          scopeType: 'GLOBAL',
          companyId: null,
          vendorId: null,
          isActive: true,
        },
        select: {
          id: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary = {
    usersScanned: users.length,
    alreadyAligned: 0,
    assignmentsCreated: 0,
    assignmentsDeactivated: 0,
  };

  for (const user of users as Array<{
    id: string;
    role: string;
    createdAt: Date;
    roleAssignments: Array<{ id: string; role: string }>;
  }>) {
    const normalizedRole = normalizeRole(user.role);
    const hasExpected = user.roleAssignments.some((assignment: { role: string }) => assignment.role === normalizedRole);
    const mismatchedActive = user.roleAssignments.filter(
      (assignment: { role: string }) => assignment.role !== normalizedRole
    );

    if (hasExpected && mismatchedActive.length === 0) {
      summary.alreadyAligned += 1;
      continue;
    }

    if (dryRun) {
      if (!hasExpected) summary.assignmentsCreated += 1;
      summary.assignmentsDeactivated += mismatchedActive.length;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      if (!hasExpected) {
        await (tx as any).userRoleAssignment.upsert({
          where: { id: makeId(user.id, normalizedRole) },
          update: {
            userId: user.id,
            role: normalizedRole,
            scopeType: 'GLOBAL',
            companyId: null,
            vendorId: null,
            isActive: true,
            startsAt: user.createdAt,
            endsAt: null,
            grantReason: 'backfill-from-users-role',
          },
          create: {
            id: makeId(user.id, normalizedRole),
            userId: user.id,
            role: normalizedRole,
            scopeType: 'GLOBAL',
            companyId: null,
            vendorId: null,
            isActive: true,
            startsAt: user.createdAt,
            endsAt: null,
            grantReason: 'backfill-from-users-role',
          },
        });
        summary.assignmentsCreated += 1;
      }

      if (mismatchedActive.length > 0) {
        const now = new Date();
        await (tx as any).userRoleAssignment.updateMany({
          where: {
            id: { in: mismatchedActive.map((assignment) => assignment.id) },
            isActive: true,
          },
          data: {
            isActive: false,
            endsAt: now,
          },
        });
        summary.assignmentsDeactivated += mismatchedActive.length;
      }
    });
  }

  console.log('RBAC role-assignment backfill summary');
  console.table(summary);
}

main()
  .catch((error) => {
    if ((error as any)?.code === 'P2022') {
      console.error('RBAC tables are missing. Run `npx prisma migrate deploy` first.');
    }
    console.error('RBAC backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
