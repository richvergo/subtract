/**
 * Minimal test to isolate Prisma query issues
 */

import { testDb, createTestUser } from './setup';

describe('Prisma Query Isolation Test', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com');
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it('should query user by email without session context', async () => {
    console.log('Test user created:', testUser);
    
    const user = await testDb.user.findUnique({
      where: { email: 'test@example.com' },
      select: { id: true },
    });
    
    console.log('User found:', user);
    expect(user).toBeDefined();
    expect(user?.id).toBe(testUser.id);
  });

  it('should handle missing user gracefully', async () => {
    const user = await testDb.user.findUnique({
      where: { email: 'nonexistent@example.com' },
      select: { id: true },
    });
    
    expect(user).toBeNull();
  });
});
