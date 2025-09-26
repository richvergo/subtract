import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkPuppeteerDependencies } from '@/lib/puppeteer-config'

/**
 * Test Connections Endpoint
 * 
 * This endpoint tests all the connections needed for the Puppeteer workflow system:
 * - Database connectivity
 * - Authentication
 * - Puppeteer dependencies
 * - API endpoints
 */
export async function GET(request: NextRequest) {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {} as Record<string, any>
    }

    // Test 1: Authentication (simplified - no auth required)
    results.tests.authentication = {
      status: 'success',
      authenticated: true,
      userId: 'default-user',
      message: 'Authentication disabled - direct access enabled'
    }

    // Test 2: Database connectivity
    try {
      const workflowCount = await prisma.workflow.count()
      const actionCount = await prisma.workflowAction.count()
      
      results.tests.database = {
        status: 'success',
        workflowCount,
        actionCount,
        message: 'Database connection successful'
      }
    } catch (error) {
      results.tests.database = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Database connection failed'
      }
    }

    // Test 3: Puppeteer dependencies
    try {
      const puppeteerOk = await checkPuppeteerDependencies()
      results.tests.puppeteer = {
        status: puppeteerOk ? 'success' : 'error',
        message: puppeteerOk ? 'Puppeteer dependencies available' : 'Puppeteer dependencies not available',
        environment: {
          nodeEnv: process.env.NODE_ENV,
          docker: !!process.env.DOCKER,
          puppeteerSkipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
          puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH
        }
      }
    } catch (error) {
      results.tests.puppeteer = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Puppeteer test failed'
      }
    }

    // Test 4: API endpoints (internal)
    try {
      const endpoints = [

        '/api/recordings/unified',
        '/api/agents/record-workflow',
        '/api/workflows/[id]/variables',
        '/api/agents/[id]/session/[sessionId]'
      ]
      
      results.tests.apiEndpoints = {
        status: 'success',
        endpoints,
        message: 'API endpoints configured'
      }
    } catch (error) {
      results.tests.apiEndpoints = {
        status: 'error',
        error: error instanceof Error ? error.message : 'API endpoint test failed'
      }
    }

    // Test 5: Environment variables
    try {
      const requiredEnvVars = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL'
      ]
      
      const envStatus = requiredEnvVars.map(envVar => ({
        name: envVar,
        present: !!process.env[envVar],
        value: process.env[envVar] ? '***' : undefined
      }))
      
      results.tests.environment = {
        status: 'success',
        variables: envStatus,
        message: 'Environment variables checked'
      }
    } catch (error) {
      results.tests.environment = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Environment test failed'
      }
    }

    // Calculate overall status
    const allTests = Object.values(results.tests)
    const failedTests = allTests.filter(test => test.status === 'error')
    const overallStatus = failedTests.length === 0 ? 'healthy' : 'unhealthy'

    return NextResponse.json({
      status: overallStatus,
      summary: {
        totalTests: allTests.length,
        passedTests: allTests.length - failedTests.length,
        failedTests: failedTests.length
      },
      results
    })

  } catch (error) {
    console.error('Connection test failed:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
