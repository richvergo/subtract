/**
 * PUPPETEER GUARDRAILS SYSTEM
 * 
 * This system ensures we NEVER use mock data or workarounds.
 * All data must come from real Puppeteer browser automation.
 * 
 * STRATEGIC PUPPETEER PRINCIPLES:
 * 1. NEVER create mock sessions, demo data, or fake metrics
 * 2. ALWAYS use real Puppeteer browser automation
 * 3. ALWAYS use native Puppeteer APIs (page.screenshot, page.click, etc.)
 * 4. ALWAYS capture real user interactions with DOM event listeners
 * 5. ALWAYS use real network monitoring with Puppeteer
 */

// 🚨 ANTI-PATTERNS - THESE ARE FORBIDDEN
const FORBIDDEN_PATTERNS = [
  'demo_',
  'mock_',
  'fake_',
  'test_data',
  'sample_',
  'placeholder_',
  'dummy_'
]

const FORBIDDEN_MOCK_DATA = [
  'actionsCaptured: 3',
  'screenshotsTaken: 3', 
  'networkRequests: 5',
  'consoleLogs: 2',
  'Load Demo Session',
  'Create Demo',
  'Mock Session'
]

export class PuppeteerGuardrails {
  /**
   * Validates that a session ID is from real Puppeteer capture
   */
  static validateRealPuppeteerSession(sessionId: string): void {
    if (!sessionId) {
      throw new Error('🚨 GUARDRAIL VIOLATION: Session ID is required for Puppeteer operations')
    }

    // Check for forbidden mock patterns
    const hasForbiddenPattern = FORBIDDEN_PATTERNS.some(pattern => 
      sessionId.toLowerCase().includes(pattern)
    )
    
    if (hasForbiddenPattern) {
      throw new Error(`🚨 GUARDRAIL VIOLATION: Session ID "${sessionId}" contains forbidden mock pattern. Use real Puppeteer capture only!`)
    }

    // Ensure it follows real Puppeteer session pattern
    if (!sessionId.startsWith('capture_') && !sessionId.startsWith('puppeteer_')) {
      throw new Error(`🚨 GUARDRAIL VIOLATION: Session ID "${sessionId}" must be from real Puppeteer capture (capture_* or puppeteer_*)`)
    }
  }

  /**
   * Validates that performance metrics come from real Puppeteer capture
   */
  static validateRealPuppeteerMetrics(metrics: any): void {
    if (!metrics) {
      throw new Error('🚨 GUARDRAIL VIOLATION: Performance metrics are required')
    }

    // Check if metrics have the structure of real Puppeteer capture
    if (typeof metrics.actionsCaptured !== 'number' || 
        typeof metrics.screenshotsTaken !== 'number' ||
        typeof metrics.networkRequests !== 'number') {
      throw new Error('🚨 GUARDRAIL VIOLATION: Performance metrics must be real numbers from Puppeteer capture')
    }

    // Prevent common mock values
    const mockValues = [3, 5, 2, 10]; // Common fake values
    if (mockValues.includes(metrics.actionsCaptured) && 
        mockValues.includes(metrics.screenshotsTaken) &&
        mockValues.includes(metrics.networkRequests)) {
      throw new Error('🚨 GUARDRAIL VIOLATION: Performance metrics appear to be mock data. Use real Puppeteer capture!')
    }
  }

  /**
   * Validates that screenshot data is real Puppeteer screenshot
   */
  static validateRealPuppeteerScreenshot(screenshotUrl?: string): void {
    if (!screenshotUrl) return; // Screenshots are optional

    if (!screenshotUrl.startsWith('data:image/png;base64,')) {
      throw new Error('🚨 GUARDRAIL VIOLATION: Screenshots must be real PNG data from Puppeteer page.screenshot()')
    }

    // Check for tiny mock images (1x1 pixel)
    if (screenshotUrl.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')) {
      throw new Error('🚨 GUARDRAIL VIOLATION: Screenshot appears to be a 1x1 mock image. Use real Puppeteer screenshots!')
    }
  }

  /**
   * Validates that actions come from real DOM interactions
   */
  static validateRealPuppeteerActions(actions: any[]): void {
    if (!Array.isArray(actions)) {
      throw new Error('🚨 GUARDRAIL VIOLATION: Actions must be an array from real Puppeteer capture')
    }

    actions.forEach((action, index) => {
      if (!action.id || !action.type || !action.selector) {
        throw new Error(`🚨 GUARDRAIL VIOLATION: Action ${index} missing required fields from real Puppeteer capture`)
      }

      // Check for mock action patterns
      if (action.id.includes('demo-') || action.selector === 'button' && action.value === 'Click me') {
        throw new Error(`🚨 GUARDRAIL VIOLATION: Action ${index} appears to be mock data. Use real DOM interactions!`)
      }

      // Validate real timestamps
      if (action.metadata?.timestamp && action.metadata.timestamp < Date.now() - (24 * 60 * 60 * 1000)) {
        // More than 24 hours old might be stale, but not necessarily mock
      }
    });
  }

  /**
   * Scans code for forbidden mock data patterns
   */
  static scanCodeForMockPatterns(code: string): string[] {
    const violations: string[] = []
    
    FORBIDDEN_MOCK_DATA.forEach(pattern => {
      if (code.includes(pattern)) {
        violations.push(`Found forbidden mock pattern: "${pattern}"`)
      }
    })

    return violations
  }

  /**
   * Ensures we're using real Puppeteer browser instance
   */
  static validateRealPuppeteerBrowser(browser: any): void {
    if (!browser) {
      throw new Error('🚨 GUARDRAIL VIOLATION: Browser instance is required for Puppeteer operations')
    }

    // Check if it's a real Puppeteer browser
    if (!browser.newPage || typeof browser.newPage !== 'function') {
      throw new Error('🚨 GUARDRAIL VIOLATION: Browser must be a real Puppeteer browser instance')
    }
  }
}

/**
 * STRATEGIC PUPPETEER BEST PRACTICES
 * 
 * ✅ DO:
 * - Use PuppeteerCaptureService for real browser automation
 * - Capture real screenshots with page.screenshot()
 * - Record real DOM interactions with event listeners
 * - Use real network monitoring with page.on('request')
 * - Store real session data from actual browser interactions
 * 
 * ❌ DON'T:
 * - Create mock sessions or demo data
 * - Use placeholder screenshots or fake metrics
 * - Simulate interactions without real browser
 * - Use external services instead of Puppeteer APIs
 * - Create workarounds instead of proper Puppeteer implementation
 */
