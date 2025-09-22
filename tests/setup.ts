/**
 * Jest test setup
 * Configures test environment and global test utilities
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Global test database instance
export let testDb: PrismaClient;

// Test configuration
export const TEST_CONFIG = {
  DATABASE_URL: 'file:./test.db',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
  NEXTAUTH_SECRET: 'test-nextauth-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
};

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('🚀 Setting up test environment...');

  // Check if Redis is running
  try {
    execSync('redis-cli ping', { stdio: 'pipe' });
    console.log('✅ Redis is running');
  } catch {
    console.warn('⚠️  Redis is not running. Some tests may fail.');
    console.log('   Start Redis with: brew services start redis');
  }

  // Clean up any existing test database
  try {
    execSync('rm -f test.db', { stdio: 'pipe' });
  } catch {
    // Ignore if file doesn't exist
  }

  // Set test environment variables
  process.env.DATABASE_URL = TEST_CONFIG.DATABASE_URL;
  process.env.ENCRYPTION_KEY = TEST_CONFIG.ENCRYPTION_KEY;
  process.env.NEXTAUTH_SECRET = TEST_CONFIG.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_URL = TEST_CONFIG.NEXTAUTH_URL;
  process.env.REDIS_HOST = TEST_CONFIG.REDIS_HOST;
  process.env.REDIS_PORT = TEST_CONFIG.REDIS_PORT.toString();

  // Initialize test database
  testDb = new PrismaClient({
    datasources: {
      db: {
        url: TEST_CONFIG.DATABASE_URL,
      },
    },
  });

  // Run database migrations
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_CONFIG.DATABASE_URL },
      stdio: 'pipe',
    });
  } catch (error) {
    console.warn('Migration failed, continuing with existing schema');
  }

  await testDb.$connect();
  console.log('✅ Test environment setup complete');
});

// Cleanup after each test
afterEach(async () => {
  // Clean up test data in correct order to respect foreign key constraints
  await testDb.agentRun.deleteMany();
  await testDb.agentLogin.deleteMany();
  await testDb.agent.deleteMany();
  await testDb.login.deleteMany();
  await testDb.membership.deleteMany();
  await testDb.user.deleteMany();
  await testDb.entity.deleteMany();
});

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  // Clean up Prisma connections
  try {
    await testDb.$disconnect();
    console.log('✅ Prisma connections closed');
  } catch {
    console.warn('⚠️  Failed to close Prisma connections');
  }

  // Clean up test database
  try {
    execSync('rm -f test.db', { stdio: 'pipe' });
    console.log('✅ Test database cleaned up');
  } catch {
    console.warn('⚠️  Failed to clean up test database');
  }

  // Give a moment for all connections to close
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('✅ Test environment cleanup complete');
});

// Test utilities
export const createTestUser = async (email: string = 'test@example.com') => {
  return await testDb.user.create({
    data: {
      email,
      passwordHash: 'test-hash',
      name: 'Test User',
    },
  });
};

export const createTestEntity = async (name: string = 'Test Entity') => {
  return await testDb.entity.create({
    data: { name },
  });
};

export const createTestMembership = async (userId: string, entityId: string) => {
  return await testDb.membership.create({
    data: {
      userId,
      entityId,
      role: 'ADMIN',
    },
  });
};

export const createTestLogin = async (ownerId: string, name: string = 'Test Login') => {
  return await testDb.login.create({
    data: {
      name,
      loginUrl: 'https://example.com/login',
      username: 'encrypted-username',
      password: 'encrypted-password',
      ownerId,
    },
  });
};

export const createTestAgent = async (ownerId: string, name: string = 'Test Agent') => {
  return await testDb.agent.create({
    data: {
      name,
      description: 'Test agent description',
      agentConfig: JSON.stringify([
        { action: 'goto', url: 'https://example.com' },
        { action: 'waitForSelector', selector: 'body' },
      ]),
      purposePrompt: 'Test agent purpose',
      ownerId,
    },
  });
};
