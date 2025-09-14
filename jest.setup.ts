// jest.setup.ts
import '@testing-library/jest-dom';
jest.mock("ioredis", () => require("ioredis-mock"));

// Disable DB audit during tests to prevent session context issues
process.env.DISABLE_DB_AUDIT = '1';

// Global teardown for Prisma connections
afterAll(async () => {
  // Import here to avoid circular dependencies
  const { prisma } = await import('@/lib/db');
  await prisma.$disconnect();
});
