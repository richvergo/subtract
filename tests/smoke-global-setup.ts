/**
 * Global Setup for Smoke Tests
 * Initializes the test environment before running smoke tests
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function globalSetup() {
  console.log('🚀 Starting smoke test global setup...')
  
  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'file:./prisma/test.db'
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000'
    process.env.TEST_AGENT_ID = 'smoke-test-agent'
    
    // Generate Prisma client
    console.log('📦 Generating Prisma client...')
    await execAsync('npx prisma generate')
    
    // Setup test database
    console.log('🗄️ Setting up test database...')
    await execAsync('npx prisma db push --accept-data-loss')
    
    // Build the application
    console.log('🔨 Building application...')
    await execAsync('npm run build')
    
    console.log('✅ Smoke test global setup completed')
    
  } catch (error) {
    console.error('❌ Smoke test global setup failed:', error)
    throw error
  }
}
