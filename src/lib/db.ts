import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a fresh client for tests to avoid global state issues
const createPrismaClient = (): PrismaClient => {
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_DB_AUDIT === '1') {
    // Use a fresh client for tests to avoid any global context issues
    return new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  
  return new PrismaClient();
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Export a separate instance for tests
export const prisma = db;
