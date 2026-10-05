import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './tenant-extension';

export function createTenantPrismaClient(client?: PrismaClient) {
  const basePrisma = client ?? new PrismaClient();
  return basePrisma.$extends(createTenantExtension());
}

export type ExtendedPrismaClient = ReturnType<typeof createTenantPrismaClient>;

export const prisma = createTenantPrismaClient();
