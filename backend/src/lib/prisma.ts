import { loadRuntimeEnv } from './runtime-env';
import path from 'path';

loadRuntimeEnv();

const generatedClientPath = path.join(__dirname, '../../node_modules/.prisma/client');
const { PrismaClient } = require(generatedClientPath) as typeof import('@prisma/client');

const globalForPrisma = globalThis as unknown as {
  prisma: import('@prisma/client').PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
