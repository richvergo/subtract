/**
 * PuppeteerCaptureService
 * Enterprise-grade capture service for workflow recording
 */

import { Browser, Page, CDPSession } from 'puppeteer'
import { prisma } from '@/lib/db'
import { validateAction, LoginConfig } from '../logic/schemas'
import { SelectorStrategy } from './selector/SelectorStrategy'
import { LoginAgentAdapter } from '../login/LoginAgentAdapter'
import { DomainScope, DomainScopeConfig, NavigationEvent } from './DomainScope'

export interface CaptureConfig {
  includeScreenshots: boolean
  captureFrequency: number // milliseconds
  selectorStrategy: 'css' | 'xpath' | 'text' | 'hybrid'
  includeNetworkRequests: boolean
  includeConsoleLogs: boolean
  timeout: number
  requiresLogin?: boolean
  loginConfig?: LoginConfig
  domainScope?: DomainScopeConfig
  onRecordingPaused?: (reason: string) => void
  onRecordingResumed?: () => void
}

export interface WorkflowAction {
  id: string
  type: 'click' | 'type' | 'select' | 'navigate' | 'scroll' | 'wait' | 'hover' | 'double_click' | 'right_click' | 'drag_drop' | 'key_press' | 'screenshot' | 'custom'
  selector: string
  value?: string
  url?: string
  coordinates?: { x: number; y: number }
  waitFor?: string
  timeout?: number
  retryCount?: number
  dependencies?: string[]
  metadata?: Record<string, any>
}

export interface CaptureSession {
  id: string
  workflowId: string
  startTime: number
  endTime?: number
  actions: WorkflowAction[]
  config: CaptureConfig
  domainScope?: DomainScope
  metadata: {
    userAgent: string
    viewport: { width: number; height: number }
    pageTitle: string
    url: string
    domainScope?: {
      isPaused: boolean
      currentDomain: string | null
      allowedDomains: string[]
      navigationHistory: NavigationEvent[]
    }
  }
}

export class PuppeteerCaptureService {
  // private browser: Browser | null = null // Unused
  private page: Page | null = null
  private cdpSession: CDPSession | null = null
  private session: CaptureSession | null = null
  private isCapturing = false
  // private selectorStrategy: SelectorStrategy // Unused
  private eventListeners: Array<() => void> = []
  private loginAdapter: LoginAgentAdapter | null = null
  private domainScope: DomainScope | null = null
  private isRecordingPaused = false

  constructor(private config: CaptureConfig) {
    // this.selectorStrategy = new SelectorStrategy({
    //   strategy: config.selectorStrategy,
    //   priority: ['id', 'data-testid', 'name', 'role', 'class', 'nth-child'],
    //   fallback: true,
    //   timeout: config.timeout
    // })
  }

  /**
   * Initialize the capture service with Puppeteer
   */
  async initialize(browser: Browser, page: Page): Promise<void> {
    this.browser = browser
    this.page = page
    this.cdpSession = await page.target().createCDPSession()
    
    // Initialize domain scope if configured
    if (this.config.domainScope) {
      this.domainScope = new DomainScope(this.config.domainScope)
      console.log('🌐 Domain scope initialized:', this.config.domainScope.baseDomain)
    }
    
    // Initialize login adapter if login is required
    if (this.config.requiresLogin && this.config.loginConfig) {
      this.loginAdapter = new LoginAgentAdapter()
      await this.loginAdapter.initialize(browser, page)
    }
    
    console.log('🎬 PuppeteerCaptureService initialized')
  }

  /**
   * Start capturing user actions for a workflow
   */
  async startCapture(workflowId: string, url: string): Promise<void> {
    if (!this.page || this.isCapturing) {
      throw new Error('Cannot start capture: service not initialized or already capturing')
    }

    // Handle login if required
    if (this.config.requiresLogin && this.config.loginConfig && this.loginAdapter) {
      console.log('🔐 Authenticating before capture...')
      await this.loginAdapter.initLogin(this.page, this.config.loginConfig)
      this.page = await this.loginAdapter.getAuthenticatedPage(this.config.loginConfig)
    }

    // Navigate to the target URL
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: this.config.timeout 
    })

    // Check domain scope for initial URL
    if (this.domainScope) {
      const navigationEvent = this.domainScope.recordNavigation(url)
      if (!navigationEvent.allowed) {
        console.warn('⚠️ Initial URL not in allowed domain scope:', navigationEvent.domain)
        this.isRecordingPaused = true
        this.config.onRecordingPaused?.(`Recording paused: outside target system (${navigationEvent.domain})`)
      }
    }

    this.session = {
      id: `capture_${Date.now()}`,
      workflowId,
      startTime: Date.now(),
      actions: [],
      config: this.config,
      domainScope: this.domainScope || undefined,
      metadata: {
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        viewport: await this.page.viewport() || { width: 1920, height: 1080 },
        pageTitle: await this.page.title(),
        url: this.page.url(),
        domainScope: this.domainScope ? {
          isPaused: this.isRecordingPaused,
          currentDomain: this.domainScope.getRecordingState().currentDomain,
          allowedDomains: this.domainScope.getRecordingState().allowedDomains,
          navigationHistory: this.domainScope.getNavigationHistory()
        } : undefined
      }
    }

    this.isCapturing = true
    await this.setupEventListeners()
    
    console.log('🎬 Capture session started:', {
      sessionId: this.session.id,
      workflowId,
      url
    })
  }

  /**
   * Stop capturing and return captured actions
   */
  async stopCapture(): Promise<WorkflowAction[]> {
    if (!this.isCapturing || !this.session) {
      return []
    }

    this.isCapturing = false
    this.session.endTime = Date.now()
    
    await this.cleanupEventListeners()
    
    // Validate and persist actions to database
    const validatedActions = await this.validateAndPersistActions()
    
    console.log('🛑 Capture session stopped:', {
      sessionId: this.session.id,
      duration: this.session.endTime - this.session.startTime,
      actionCount: this.session.actions.length,
      validatedCount: validatedActions.length
    })

    return validatedActions
  }

  /**
   * Get currently captured actions
   */
  getCapturedActions(): WorkflowAction[] {
    return this.session?.actions || []
  }

  /**
   * Set up comprehensive event listeners using CDP
   */
  private async setupEventListeners(): Promise<void> {
    if (!this.page || !this.cdpSession) return

    try {
      // Enable necessary domains
      await this.cdpSession.send('Runtime.enable')
      await this.cdpSession.send('DOM.enable')
      await this.cdpSession.send('Page.enable')
      await this.cdpSession.send('Network.enable')

      // Set up CDP event listeners
      this.cdpSession.on('Runtime.consoleAPICalled', this.handleConsoleMessage.bind(this))
      this.cdpSession.on('Page.frameNavigated', this.handleNavigation.bind(this))
      this.cdpSession.on('Network.requestWillBeSent', this.handleNetworkRequest.bind(this))
      
      // Set up domain scope navigation monitoring
      if (this.domainScope) {
        this.page.on('framenavigated', this.handleDomainScopeNavigation.bind(this))
        this.page.on('request', this.handleDomainScopeRequest.bind(this))
      }

      // Inject comprehensive capture script
      await this.page.evaluateOnNewDocument(() => {
        // Global capture state
        (window as any).__captureActions = []
        (window as any).__captureConfig = {
          includeScreenshots: true,
          captureFrequency: 1000,
          selectorStrategy: 'hybrid'
        }

        // Enhanced selector generation
        function generateSelector(element: any): string {
          // Priority: id > data-* > name > role > class combo > nth-child
          if (element.id) return `#${element.id}`
          
          if (element.dataset.testid) return `[data-testid="${element.dataset.testid}"]`
          if (element.dataset.id) return `[data-id="${element.dataset.id}"]`
          
          if (element.name) return `[name="${element.name}"]`
          
          if (element.getAttribute('role')) return `[role="${element.getAttribute('role')}"]`
          
          if (element.className) {
            const classes = element.className.split(' ').filter(c => c.length > 0)
            if (classes.length > 0) {
              return `.${classes.join('.')}`
            }
          }
          
          // Fallback to nth-child
          const parent = element.parentElement
          if (parent) {
            const siblings = Array.from(parent.children)
            const index = siblings.indexOf(element)
            return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`
          }
          
          return element.tagName.toLowerCase()
        }

        // Capture click events
        document.addEventListener('click', (event) => {
          const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'click',
            selector: generateSelector(event.target),
            coordinates: { x: event.clientX, y: event.clientY },
            metadata: {
              elementType: event.target.tagName,
              elementText: event.target.textContent?.trim() || '',
              innerText: event.target.innerText?.trim() || '',
              inputType: (event.target as HTMLInputElement).type || '',
              timestamp: Date.now(),
              confidence: 0.9
            }
          }
          ;(window as any).__captureActions.push(action)
        }, true)

        // Capture input/change events
        document.addEventListener('input', (event) => {
          const target = event.target as HTMLInputElement
          const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'type',
            selector: generateSelector(event.target),
            value: target.value,
            metadata: {
              elementType: event.target.tagName,
              elementText: target.placeholder || '',
              inputType: target.type,
              innerText: target.innerText?.trim() || '',
              timestamp: Date.now(),
              confidence: 0.9
            }
          }
          ;(window as any).__captureActions.push(action)
        }, true)

        // Capture change events (select, checkbox, radio)
        document.addEventListener('change', (event) => {
          const target = event.target as HTMLSelectElement | HTMLInputElement
          const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'select',
            selector: generateSelector(event.target),
            value: target.value,
            metadata: {
              elementType: event.target.tagName,
              elementText: target.textContent?.trim() || '',
              inputType: target.type,
              innerText: target.innerText?.trim() || '',
              timestamp: Date.now(),
              confidence: 0.9
            }
          }
          ;(window as any).__captureActions.push(action)
        }, true)

        // Capture form submissions
        document.addEventListener('submit', (event) => {
          const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'click',
            selector: generateSelector(event.target),
            metadata: {
              elementType: 'form',
              elementText: 'Form submission',
              innerText: 'Form submission',
              timestamp: Date.now(),
              confidence: 0.9
            }
          }
          ;(window as any).__captureActions.push(action)
        }, true)

        // Capture navigation events
        window.addEventListener('beforeunload', () => {
          const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'navigate',
            url: window.location.href,
            metadata: {
              elementType: 'window',
              elementText: 'Navigation',
              innerText: 'Navigation',
              timestamp: Date.now(),
              confidence: 1.0
            }
          }
          ;(window as any).__captureActions.push(action)
        })

        // Capture scroll events (throttled)
        let scrollTimeout: NodeJS.Timeout
        window.addEventListener('scroll', () => {
          clearTimeout(scrollTimeout)
          scrollTimeout = setTimeout(() => {
            const action = {
              id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'scroll',
              coordinates: { x: window.scrollX, y: window.scrollY },
              metadata: {
                elementType: 'window',
                elementText: 'Scroll',
                innerText: 'Scroll',
                timestamp: Date.now(),
                confidence: 0.8
              }
            }
            ;(window as any).__captureActions.push(action)
          }, 300)
        }, true)
      })

      // Set up periodic action retrieval
      this.startPeriodicCapture()

    } catch (error) {
      console.error('Error setting up event listeners:', error)
      throw error
    }
  }

  /**
   * Start periodic capture of actions
   */
  private startPeriodicCapture(): void {
    if (!this.page || !this.session) return

    const interval = setInterval(async () => {
      if (!this.isCapturing || !this.page || !this.session) {
        clearInterval(interval)
        return
      }

      try {
        const actions = await this.page.evaluate(() => {
          const actions = (window as any).__captureActions || []
          ;(window as any).__captureActions = [] // Clear captured actions
          return actions
        })

        for (const action of actions) {
          this.session!.actions.push(action)
        }

        // Capture screenshot if configured
        if (this.config.includeScreenshots && this.session.actions.length % 5 === 0) {
          try {
            const screenshot = await this.page.screenshot({ encoding: 'base64' })
            const lastAction = this.session.actions[this.session.actions.length - 1]
            if (lastAction) {
              lastAction.metadata = lastAction.metadata || {}
              lastAction.metadata.screenshot = screenshot
            }
          } catch (screenshotError) {
            console.warn('Failed to capture screenshot:', screenshotError)
          }
        }
      } catch (error) {
        console.error('Error during periodic capture:', error)
      }
    }, this.config.captureFrequency)
  }

  /**
   * Handle console messages
   */
  private handleConsoleMessage(event: any): void {
    if (this.config.includeConsoleLogs) {
      console.log('Console message captured:', event)
    }
  }

  /**
   * Handle navigation events
   */
  private handleNavigation(event: any): void {
    if (this.session && event.frame.parentId === null) {
      const action: WorkflowAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'navigate',
        selector: 'body', // Required field
        url: event.frame.url,
        metadata: {
          elementType: 'window',
          elementText: 'Navigation',
          innerText: 'Navigation',
          timestamp: Date.now(),
          confidence: 1.0
        }
      }
      this.session.actions.push(action)
    }
  }

  /**
   * Handle network requests
   */
  private handleNetworkRequest(event: any): void {
    if (this.config.includeNetworkRequests) {
      console.log('Network request captured:', event.request.url)
    }
  }

  /**
   * Clean up event listeners
   */
  private async cleanupEventListeners(): Promise<void> {
    if (!this.page || !this.cdpSession) return

    try {
      // Remove CDP event listeners
      this.cdpSession.removeAllListeners()
      
      // Clear global capture state
      await this.page.evaluate(() => {
        delete (window as any).__captureActions
        delete (window as any).__captureConfig
      })

      // Clean up any remaining listeners
      this.eventListeners.forEach(cleanup => cleanup())
      this.eventListeners = []

    } catch (error) {
      console.error('Error cleaning up event listeners:', error)
    }
  }

  /**
   * Validate and persist actions to database
   */
  private async validateAndPersistActions(): Promise<WorkflowAction[]> {
    if (!this.session) return []

    const validatedActions: WorkflowAction[] = []
    const errors: string[] = []

    for (const action of this.session.actions) {
      try {
        // Validate with Zod schema
        const validatedAction = validateAction(action)
        
        // Additional runtime validation
        if (!this.isValidSelector(validatedAction.selector)) {
          errors.push(`Invalid selector for action ${action.id}: ${validatedAction.selector}`)
          continue
        }

        validatedActions.push(validatedAction)

        // Persist to database
        await prisma.workflowAction.create({
          data: {
            workflowId: this.session.workflowId,
            action: validatedAction,
            order: validatedActions.length - 1
          }
        })

      } catch (error) {
        const errorMessage = `Validation failed for action ${action.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMessage)
        console.error(errorMessage)
      }
    }

    if (errors.length > 0) {
      console.warn('Validation errors encountered:', errors)
    }

    console.log(`✅ Persisted ${validatedActions.length} validated actions to database`)
    return validatedActions
  }

  /**
   * Validate selector format
   */
  private isValidSelector(selector: string): boolean {
    if (!selector || selector.trim() === '') return false
    
    // Basic CSS selector validation
    const cssSelectorRegex = /^[#.\w\[\]="':\s\-_()>+~*]+$/
    return cssSelectorRegex.test(selector)
  }

  /**
   * Get current capture session
   */
  getSession(): CaptureSession | null {
    return this.session
  }

  /**
   * Check if currently capturing
   */
  isActive(): boolean {
    return this.isCapturing
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.cleanupEventListeners()
    
    if (this.cdpSession) {
      await this.cdpSession.detach()
      this.cdpSession = null
    }
    
    if (this.loginAdapter) {
      await this.loginAdapter.cleanup()
      this.loginAdapter = null
    }
    
    this.browser = null
    this.page = null
    this.session = null
    this.isCapturing = false
    
    console.log('🧹 PuppeteerCaptureService cleaned up')
  }

  /**
   * Handle domain scope navigation events
   */
  private async handleDomainScopeNavigation(frame: any): Promise<void> {
    if (!this.domainScope || !frame.url) return

    const navigationEvent = this.domainScope.recordNavigation(frame.url)
    
    // Log navigation decision
    console.log(`🌐 Domain scope navigation:`, {
      url: frame.url,
      domain: navigationEvent.domain,
      allowed: navigationEvent.allowed,
      reason: navigationEvent.reason
    })

    // Update recording pause state
    const wasPaused = this.isRecordingPaused
    this.isRecordingPaused = !navigationEvent.allowed

    // Handle state changes
    if (!wasPaused && this.isRecordingPaused) {
      // Recording just paused
      const reason = `Recording paused: outside target system (${navigationEvent.domain})`
      console.warn(`⚠️ ${reason}`)
      this.config.onRecordingPaused?.(reason)
    } else if (wasPaused && !this.isRecordingPaused) {
      // Recording just resumed
      console.log('✅ Recording resumed: returned to allowed domain')
      this.config.onRecordingResumed?.()
    }

    // Update session metadata
    if (this.session && this.domainScope) {
      this.session.metadata.domainScope = {
        isPaused: this.isRecordingPaused,
        currentDomain: this.domainScope.getRecordingState().currentDomain,
        allowedDomains: this.domainScope.getRecordingState().allowedDomains,
        navigationHistory: this.domainScope.getNavigationHistory()
      }
    }
  }

  /**
   * Handle domain scope request events
   */
  private async handleDomainScopeRequest(request: any): Promise<void> {
    if (!this.domainScope || !request.url()) return

    const url = request.url()
    const result = this.domainScope.isAllowedDomain(url)
    
    // Log request decision
    if (!result.isAllowed) {
      console.log(`🚫 Blocked request to disallowed domain:`, {
        url,
        domain: result.domain,
        reason: result.reason
      })
    }
  }

  /**
   * Check if current domain is allowed for recording
   */
  private isCurrentDomainAllowed(): boolean {
    if (!this.domainScope || !this.page) return true

    const currentUrl = this.page.url()
    const result = this.domainScope.isAllowedDomain(currentUrl)
    return result.isAllowed
  }

  /**
   * Get domain scope status
   */
  getDomainScopeStatus(): {
    isPaused: boolean
    currentDomain: string | null
    allowedDomains: string[]
    navigationHistory: NavigationEvent[]
    stats: any
  } | null {
    if (!this.domainScope) return null

    const state = this.domainScope.getRecordingState()
    const stats = this.domainScope.getDomainStats()
    
    return {
      isPaused: this.isRecordingPaused,
      currentDomain: state.currentDomain,
      allowedDomains: state.allowedDomains,
      navigationHistory: this.domainScope.getNavigationHistory(),
      stats
    }
  }

  /**
   * Update domain scope configuration dynamically
   */
  updateDomainScope(config: Partial<DomainScopeConfig>): void {
    if (!this.domainScope) return

    this.domainScope.updateConfig(config)
    console.log('🌐 Domain scope updated:', config)
  }

  /**
   * Add domain to allowlist dynamically
   */
  addAllowedDomain(domain: string): void {
    if (!this.domainScope) return

    this.domainScope.addAllowedDomain(domain)
    console.log('🌐 Added domain to allowlist:', domain)
  }

  /**
   * Remove domain from allowlist
   */
  removeAllowedDomain(domain: string): void {
    if (!this.domainScope) return

    this.domainScope.removeAllowedDomain(domain)
    console.log('🌐 Removed domain from allowlist:', domain)
  }
}
