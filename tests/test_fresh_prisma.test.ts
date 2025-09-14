/**
 * Test with fresh Prisma client to isolate the issue
 */

import { PrismaClient } from '@prisma/client';
import { testDb, createTestUser } from './setup';

describe('Fresh Prisma Client Test', () => {
  let testUser: any;
  let freshPrisma: PrismaClient;

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com');
    
    // Create a completely fresh Prisma client
    freshPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  });

  afterEach(async () => {
    await freshPrisma.$disconnect();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it('should query user with fresh Prisma client', async () => {
    console.log('Test user created:', testUser);
    
    const user = await freshPrisma.user.findUnique({
      where: { email: 'test@example.com' },
      select: { id: true },
    });
    
    console.log('User found with fresh client:', user);
    expect(user).toBeDefined();
    expect(user?.id).toBe(testUser.id);
  });
});
