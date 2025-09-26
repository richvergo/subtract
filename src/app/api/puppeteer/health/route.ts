import { NextRequest, NextResponse } from 'next/server'
import { checkPuppeteerDependencies } from '@/lib/puppeteer-config'

/**
 * Puppeteer Health Check Endpoint
 * 
 * This endpoint checks if Puppeteer is properly configured and can launch browsers.
 * Useful for debugging Puppeteer issues in different environments.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking Puppeteer health...')
    
    // Check if Puppeteer dependencies are available
    const depsOk = await checkPuppeteerDependencies()
    
    if (!depsOk) {
      return NextResponse.json({
        status: 'unhealthy',
        message: 'Puppeteer dependencies not available',
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          docker: !!process.env.DOCKER,
          puppeteerSkipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
          puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH
        }
      }, { status: 503 })
    }
    
    return NextResponse.json({
      status: 'healthy',
      message: 'Puppeteer is working correctly',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        docker: !!process.env.DOCKER,
        puppeteerSkipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
        puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH
      }
    })
    
  } catch (error) {
    console.error('Puppeteer health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Puppeteer health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        docker: !!process.env.DOCKER,
        puppeteerSkipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
        puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH
      }
    }, { status: 500 })
  }
}

