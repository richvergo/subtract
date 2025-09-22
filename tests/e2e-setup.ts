/**
 * E2E Test Setup
 * Configures environment for end-to-end testing of the complete Agents workflow
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// E2E Test configuration
export const E2E_CONFIG = {
  DATABASE_URL: 'file:./e2e-test.db',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  ENCRYPTION_KEY: 'e2e-encryption-key-32-chars-long',
  NEXTAUTH_SECRET: 'e2e-nextauth-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
  TEST_ARTIFACTS_DIR: '/tmp/test_artifacts',
};

// Global E2E test database instance
export let e2eTestDb: PrismaClient;

// Setup E2E test environment
export async function setupE2ETests() {
  // Set E2E environment variables
  process.env.DATABASE_URL = E2E_CONFIG.DATABASE_URL;
  process.env.ENCRYPTION_KEY = E2E_CONFIG.ENCRYPTION_KEY;
  process.env.NEXTAUTH_SECRET = E2E_CONFIG.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_URL = E2E_CONFIG.NEXTAUTH_URL;
  process.env.REDIS_HOST = E2E_CONFIG.REDIS_HOST;
  process.env.REDIS_PORT = E2E_CONFIG.REDIS_PORT.toString();

  // Initialize E2E test database
  e2eTestDb = new PrismaClient({
    datasources: {
      db: {
        url: E2E_CONFIG.DATABASE_URL,
      },
    },
  });

  // Run database migrations
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: E2E_CONFIG.DATABASE_URL },
      stdio: 'pipe',
    });
  } catch {
    console.warn('E2E Migration failed, continuing with existing schema');
  }

  // Create test artifacts directory
  try {
    await fs.mkdir(E2E_CONFIG.TEST_ARTIFACTS_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }

  console.log('✅ E2E test environment setup complete');
}

// Cleanup E2E test environment
export async function cleanupE2ETests() {
  if (e2eTestDb) {
    await e2eTestDb.$disconnect();
  }

  // Clean up test artifacts
  try {
    await fs.rm(E2E_CONFIG.TEST_ARTIFACTS_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }

  console.log('✅ E2E test environment cleanup complete');
}

// Helper function to create test user for E2E tests
export async function createE2ETestUser(email: string) {
  const user = await e2eTestDb.user.create({
    data: {
      email,
      name: 'E2E Test User',
      passwordHash: 'test-password-hash',
    },
  });

  const entity = await e2eTestDb.entity.create({
    data: { name: `E2E Test Entity ${Date.now()}` },
  });

  await e2eTestDb.membership.create({
    data: {
      userId: user.id,
      entityId: entity.id,
      role: 'ADMIN',
    },
  });

  return { user, entity };
}

// Helper function to create test login for E2E tests
export async function createE2ETestLogin(ownerId: string, name: string) {
  return await e2eTestDb.login.create({
    data: {
      name,
      loginUrl: 'https://example.com/login',
      username: 'test@example.com',
      password: 'testpassword123',
      ownerId,
    },
  });
}

// Helper function to create test agent for E2E tests
export async function createE2ETestAgent(ownerId: string, name: string, agentConfig: unknown[] = []) {
  return await e2eTestDb.agent.create({
    data: {
      name,
      description: `E2E test agent: ${name}`,
      ownerId,
      agentConfig: JSON.stringify(agentConfig),
      purposePrompt: `E2E test purpose for ${name}`,
    },
  });
}

// Helper function to wait for agent run completion
export async function waitForAgentRunCompletion(runId: string, timeoutMs: number = 30000): Promise<unknown> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const run = await e2eTestDb.agentRun.findUnique({
      where: { id: runId },
    });

    if (run && run.status !== 'PENDING') {
      return run;
    }

    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Agent run ${runId} did not complete within ${timeoutMs}ms`);
}

// Helper function to save test artifacts
export async function saveTestArtifacts(testName: string, data: unknown) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactPath = path.join(E2E_CONFIG.TEST_ARTIFACTS_DIR, `${testName}-${timestamp}.json`);
  
  await fs.writeFile(artifactPath, JSON.stringify(data, null, 2));
  console.log(`📁 Test artifacts saved to: ${artifactPath}`);
  
  return artifactPath;
}

// Helper function to clean up test data
export async function cleanupE2ETestData() {
  await e2eTestDb.agentRun.deleteMany();
  await e2eTestDb.agentLogin.deleteMany();
  await e2eTestDb.agent.deleteMany();
  await e2eTestDb.login.deleteMany();
  await e2eTestDb.membership.deleteMany();
  await e2eTestDb.user.deleteMany();
  await e2eTestDb.entity.deleteMany();
}
