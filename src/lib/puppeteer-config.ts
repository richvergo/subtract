import puppeteer, { LaunchOptions } from 'puppeteer'

/**
 * Puppeteer Configuration Utility
 * 
 * This utility provides robust Puppeteer configuration for different environments
 * and handles common issues with browser launching.
 */

export interface PuppeteerConfigOptions {
  headless?: boolean
  showBrowser?: boolean
  viewport?: { width: number; height: number }
  timeout?: number
  protocolTimeout?: number
  executablePath?: string
  additionalArgs?: readonly string[]
}

/**
 * Get environment-aware Puppeteer configuration
 */
export function getPuppeteerConfig(options: PuppeteerConfigOptions = {}): LaunchOptions {
  const {
    headless = true,
    showBrowser = false,
    viewport = { width: 1280, height: 720 },
    timeout = 30000,
    protocolTimeout = 30000,
    executablePath,
    additionalArgs = []
  } = options

  // Base arguments for stability and performance
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-pings',
    '--password-store=basic',
    '--use-mock-keychain'
  ]

  // Add environment-specific arguments
  if (process.env.NODE_ENV === 'production' || process.env.DOCKER) {
    baseArgs.push('--single-process')
  }

  // Add user-provided arguments
  if (additionalArgs.length > 0) {
    baseArgs.push(...additionalArgs)
  }

  // Add environment variables if available
  if (process.env.PUPPETEER_ARGS) {
    const envArgs = process.env.PUPPETEER_ARGS.split(' ')
    baseArgs.push(...envArgs)
  }

  const config: LaunchOptions = {
    headless: headless && !showBrowser,
    args: baseArgs,
    timeout,
    protocolTimeout,
    defaultViewport: viewport
  }

  // Set executable path if provided or from environment
  if (executablePath || process.env.PUPPETEER_EXECUTABLE_PATH) {
    config.executablePath = executablePath || process.env.PUPPETEER_EXECUTABLE_PATH
  }

  return config
}

/**
 * Launch Puppeteer with robust error handling
 */
export async function launchPuppeteer(options: PuppeteerConfigOptions = {}) {
  try {
    const config = getPuppeteerConfig(options)
    console.log('🚀 Launching Puppeteer with config:', {
      headless: config.headless,
      executablePath: config.executablePath,
      argsCount: config.args?.length || 0
    })
    
    const browser = await puppeteer.launch(config)
    console.log('✅ Puppeteer browser launched successfully')
    return browser
  } catch (error) {
    console.error('❌ Failed to launch Puppeteer browser:', error)
    
    // Provide helpful error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('Could not find browser')) {
        throw new Error('Chrome/Chromium not found. Please install Chrome or set PUPPETEER_EXECUTABLE_PATH')
      }
      if (error.message.includes('Permission denied')) {
        throw new Error('Permission denied. Try running with --no-sandbox or check file permissions')
      }
      if (error.message.includes('ENOENT')) {
        throw new Error('Chrome executable not found. Please install Chrome or set PUPPETEER_EXECUTABLE_PATH')
      }
    }
    
    throw new Error(`Browser launch failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if Puppeteer dependencies are available
 */
export async function checkPuppeteerDependencies(): Promise<boolean> {
  try {
    const browser = await launchPuppeteer({ headless: true })
    await browser.close()
    return true
  } catch (error) {
    console.error('Puppeteer dependency check failed:', error)
    return false
  }
}

/**
 * Get recommended Puppeteer configuration for different environments
 */
export const PuppeteerPresets = {
  development: {
    headless: false,
    showBrowser: true,
    viewport: { width: 1920, height: 1080 },
    additionalArgs: ['--start-maximized'] as string[]
  },
  
  production: {
    headless: true,
    showBrowser: false,
    viewport: { width: 1280, height: 720 },
    additionalArgs: ['--single-process'] as string[]
  },
  
  docker: {
    headless: true,
    showBrowser: false,
    viewport: { width: 1280, height: 720 },
    executablePath: '/usr/bin/google-chrome-stable',
    additionalArgs: ['--single-process', '--disable-dev-shm-usage'] as string[]
  },
  
  testing: {
    headless: true,
    showBrowser: false,
    viewport: { width: 1280, height: 720 },
    timeout: 10000,
    additionalArgs: ['--single-process'] as string[]
  }
}
