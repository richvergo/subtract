/**
 * Test using testDb directly without mocking
 */

import { testDb, createTestUser } from './setup';

describe('TestDB Direct Test', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com');
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it('should query user using testDb directly', async () => {
    console.log('Test user created:', testUser);
    
    const user = await testDb.user.findUnique({
      where: { email: 'test@example.com' },
      select: { id: true },
    });
    
    console.log('User found with testDb:', user);
    expect(user).toBeDefined();
    expect(user?.id).toBe(testUser.id);
  });
});
