/**
 * Global test teardown
 * Runs once after all tests
 */

import { execSync } from 'child_process';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  // Clean up Prisma connections
  try {
    const { prisma } = await import('@/lib/db');
    await prisma.$disconnect();
    console.log('✅ Prisma connections closed');
  } catch (error) {
    console.warn('⚠️  Failed to close Prisma connections');
  }

  // Clean up test database
  try {
    execSync('rm -f test.db', { stdio: 'pipe' });
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.warn('⚠️  Failed to clean up test database');
  }

  // Give a moment for all connections to close
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('✅ Test environment cleanup complete');
}
