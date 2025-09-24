/**
 * Global Teardown for Smoke Tests
 * Cleans up the test environment after smoke tests complete
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function globalTeardown() {
  console.log('🧹 Starting smoke test global teardown...')
  
  try {
    // Clean up any running processes
    console.log('🛑 Stopping any running processes...')
    
    // Kill any Node.js processes that might be running
    try {
      await execAsync('pkill -f "next start" || true')
      await execAsync('pkill -f "npm start" || true')
    } catch (error) {
      // Ignore errors if no processes are running
      console.log('ℹ️ No running processes to stop')
    }
    
    // Clean up test database
    console.log('🗄️ Cleaning up test database...')
    try {
      await execAsync('rm -f ./prisma/test.db* || true')
    } catch (error) {
      console.log('ℹ️ Test database cleanup skipped')
    }
    
    // Clean up any temporary files
    console.log('📁 Cleaning up temporary files...')
    try {
      await execAsync('rm -rf .next/test || true')
      await execAsync('rm -rf test-results || true')
    } catch (error) {
      console.log('ℹ️ Temporary file cleanup skipped')
    }
    
    console.log('✅ Smoke test global teardown completed')
    
  } catch (error) {
    console.error('❌ Smoke test global teardown failed:', error)
    // Don't throw error in teardown to avoid masking test failures
  }
}
