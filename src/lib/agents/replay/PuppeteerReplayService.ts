/**
 * PuppeteerReplayService
 * Enterprise-grade workflow replay service
 */

import { Browser, Page, ElementHandle } from 'puppeteer'
import { CapturedAction } from '../capture/PuppeteerCaptureService'
import { LoginConfig } from '../logic/schemas'
import { LoginAgentAdapter } from '../login/LoginAgentAdapter'

export interface ReplayConfig {
  timeout: number
  retryAttempts: number
  waitForNavigation: boolean
  screenshotOnError: boolean
  debugMode: boolean
  requiresLogin?: boolean
  loginConfig?: LoginConfig
}

export interface ReplayResult {
  success: boolean
  actionId: string
  duration: number
  error?: string
  screenshot?: string
  metadata: {
    selector: string
    strategy: string
    confidence: number
  }
}

export interface ReplaySession {
  id: string
  startTime: number
  endTime?: number
  actions: CapturedAction[]
  results: ReplayResult[]
  config: ReplayConfig
  metadata: {
    successRate: number
    totalDuration: number
    errorCount: number
  }
}

export class PuppeteerReplayService {
  private browser: Browser | null = null
  private page: Page | null = null
  private session: ReplaySession | null = null
  private isReplaying = false
  private loginAdapter: LoginAgentAdapter | null = null

  constructor(private config: ReplayConfig) {}

  /**
   * Initialize the replay service
   */
  async initialize(browser: Browser, page: Page): Promise<void> {
    this.browser = browser
    this.page = page
    
    // Initialize login adapter if login is required
    if (this.config.requiresLogin && this.config.loginConfig) {
      this.loginAdapter = new LoginAgentAdapter()
      await this.loginAdapter.initialize(browser, page)
    }
    
    console.log('🎬 PuppeteerReplayService initialized')
  }

  /**
   * Start replaying captured actions
   */
  async startReplay(actions: CapturedAction[]): Promise<ReplaySession> {
    if (!this.page || this.isReplaying) {
      throw new Error('Cannot start replay: service not initialized or already replaying')
    }

    // Handle login if required
    if (this.config.requiresLogin && this.config.loginConfig && this.loginAdapter) {
      console.log('🔐 Authenticating before replay...')
      await this.loginAdapter.initLogin(this.page, this.config.loginConfig)
      this.page = await this.loginAdapter.getAuthenticatedPage(this.config.loginConfig)
    }

    this.session = {
      id: `replay_${Date.now()}`,
      startTime: Date.now(),
      actions,
      results: [],
      config: this.config,
      metadata: {
        successRate: 0,
        totalDuration: 0,
        errorCount: 0
      }
    }

    this.isReplaying = true
    console.log('🎬 Replay session started:', this.session.id)
    
    return this.session
  }

  /**
   * Execute a single action
   */
  async executeAction(action: CapturedAction): Promise<ReplayResult> {
    if (!this.page || !this.session) {
      throw new Error('Replay service not initialized')
    }

    const startTime = Date.now()
    let result: ReplayResult

    try {
      console.log(`🎯 Executing action: ${action.type} on ${action.selector}`)
      
      switch (action.type) {
        case 'click':
          result = await this.executeClick(action)
          break
        case 'type':
          result = await this.executeType(action)
          break
        case 'select':
          result = await this.executeSelect(action)
          break
        case 'navigate':
          result = await this.executeNavigate(action)
          break
        case 'scroll':
          result = await this.executeScroll(action)
          break
        case 'wait':
          result = await this.executeWait(action)
          break
        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      result.duration = Date.now() - startTime
      this.session.results.push(result)
      
      console.log(`✅ Action completed: ${action.type} (${result.duration}ms)`)
      
    } catch (error) {
      result = {
        success: false,
        actionId: action.id,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          selector: action.selector,
          strategy: 'unknown',
          confidence: 0
        }
      }

      if (this.config.screenshotOnError) {
        try {
          result.screenshot = await this.page.screenshot({ encoding: 'base64' })
        } catch (screenshotError) {
          console.warn('Failed to capture error screenshot:', screenshotError)
        }
      }

      this.session.results.push(result)
      this.session.metadata.errorCount++
      
      console.error(`❌ Action failed: ${action.type} - ${result.error}`)
    }

    return result
  }

  /**
   * Execute click action
   */
  private async executeClick(action: CapturedAction): Promise<ReplayResult> {
    const element = await this.findElement(action.selector)
    if (!element) {
      throw new Error(`Element not found: ${action.selector}`)
    }

    await element.click()
    
    if (this.config.waitForNavigation) {
      await this.page!.waitForNavigation({ timeout: this.config.timeout })
    }

    return {
      success: true,
      actionId: action.id,
      duration: 0, // Will be set by caller
      metadata: {
        selector: action.selector,
        strategy: 'css',
        confidence: 0.9
      }
    }
  }

  /**
   * Execute type action
   */
  private async executeType(action: CapturedAction): Promise<ReplayResult> {
    const element = await this.findElement(action.selector)
    if (!element) {
      throw new Error(`Element not found: ${action.selector}`)
    }

    // Clear existing value
    await element.click({ clickCount: 3 })
    await this.page!.keyboard.press('Backspace')
    
    // Type new value
    await element.type(action.value || '')

    return {
      success: true,
      actionId: action.id,
      duration: 0, // Will be set by caller
      metadata: {
        selector: action.selector,
        strategy: 'css',
        confidence: 0.9
      }
    }
  }

  /**
   * Execute select action
   */
  private async executeSelect(action: CapturedAction): Promise<ReplayResult> {
    const element = await this.findElement(action.selector)
    if (!element) {
      throw new Error(`Element not found: ${action.selector}`)
    }

    await element.select(action.value || '')

    return {
      success: true,
      actionId: action.id,
      duration: 0, // Will be set by caller
      metadata: {
        selector: action.selector,
        strategy: 'css',
        confidence: 0.9
      }
    }
  }

  /**
   * Execute navigate action
   */
  private async executeNavigate(action: CapturedAction): Promise<ReplayResult> {
    if (!action.url) {
      throw new Error('No URL provided for navigation')
    }

    await this.page!.goto(action.url, { 
      waitUntil: 'networkidle2',
      timeout: this.config.timeout 
    })

    return {
      success: true,
      actionId: action.id,
      duration: 0, // Will be set by caller
      metadata: {
        selector: action.url,
        strategy: 'url',
        confidence: 1.0
      }
    }
  }

  /**
   * Execute scroll action
   */
  private async executeScroll(action: CapturedAction): Promise<ReplayResult> {
    const coordinates = action.metadata?.coordinates
    if (coordinates) {
      await this.page!.mouse.move(coordinates.x, coordinates.y)
      await this.page!.mouse.wheel({ deltaY: coordinates.y })
    } else {
      // Default scroll down
      await this.page!.mouse.wheel({ deltaY: 100 })
    }

    return {
      success: true,
      actionId: action.id,
      duration: 0, // Will be set by caller
      metadata: {
        selector: 'scroll',
        strategy: 'mouse',
        confidence: 0.8
      }
    }
  }

  /**
   * Execute wait action
   */
  private async executeWait(action: CapturedAction): Promise<ReplayResult> {
    const waitTime = parseInt(action.value || '1000')
    await this.page!.waitForTimeout(waitTime)

    return {
      success: true,
      actionId: action.id,
      duration: 0, // Will be set by caller
      metadata: {
        selector: 'wait',
        strategy: 'timeout',
        confidence: 1.0
      }
    }
  }

  /**
   * Find element using selector with retry logic
   */
  private async findElement(selector: string): Promise<ElementHandle | null> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const element = await this.page!.$(selector)
        if (element) {
          return element
        }
      } catch (error) {
        console.warn(`Attempt ${attempt} failed for selector: ${selector}`, error)
      }

      if (attempt < this.config.retryAttempts) {
        await this.page!.waitForTimeout(1000) // Wait 1 second between attempts
      }
    }

    return null
  }

  /**
   * Stop replay and return session data
   */
  async stopReplay(): Promise<ReplaySession | null> {
    if (!this.isReplaying || !this.session) {
      return null
    }

    this.isReplaying = false
    this.session.endTime = Date.now()
    this.session.metadata.totalDuration = this.session.endTime - this.session.startTime
    
    // Calculate success rate
    const totalActions = this.session.actions.length
    const successfulActions = this.session.results.filter(r => r.success).length
    this.session.metadata.successRate = totalActions > 0 ? successfulActions / totalActions : 0

    console.log('🛑 Replay session stopped:', {
      sessionId: this.session.id,
      duration: this.session.metadata.totalDuration,
      successRate: this.session.metadata.successRate,
      errorCount: this.session.metadata.errorCount
    })

    return this.session
  }

  /**
   * Get current replay session
   */
  getSession(): ReplaySession | null {
    return this.session
  }

  /**
   * Check if currently replaying
   */
  isActive(): boolean {
    return this.isReplaying
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.loginAdapter) {
      await this.loginAdapter.cleanup()
      this.loginAdapter = null
    }
    
    this.browser = null
    this.page = null
    this.session = null
    this.isReplaying = false
    
    console.log('🧹 PuppeteerReplayService cleaned up')
  }
}
