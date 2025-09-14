/**
 * Global test setup
 * Runs once before all tests
 */

import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');

  // Check if Redis is running
  try {
    execSync('redis-cli ping', { stdio: 'pipe' });
    console.log('✅ Redis is running');
  } catch (error) {
    console.warn('⚠️  Redis is not running. Some tests may fail.');
    console.log('   Start Redis with: brew services start redis');
  }

  // Clean up any existing test database
  try {
    execSync('rm -f test.db', { stdio: 'pipe' });
  } catch (error) {
    // Ignore if file doesn't exist
  }

  console.log('✅ Test environment setup complete');
}
