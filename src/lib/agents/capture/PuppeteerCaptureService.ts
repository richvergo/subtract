import { Browser, Page } from 'puppeteer'
import { launchPuppeteer, PuppeteerPresets } from '@/lib/puppeteer-config'

export interface CaptureConfig {
  includeScreenshots?: boolean
  captureFrequency?: number
  maxScreenshots?: number
  showBrowser?: boolean
  browserViewport?: { width: number; height: number }
  allowUserInteraction?: boolean
  autoClose?: boolean
}

export interface CapturedAction {
  id: string
  type: string
  selector: string
  value?: string
  coordinates?: { x: number; y: number }
  metadata?: {
    elementType?: string
    elementText?: string
    innerText?: string
    inputType?: string
    timestamp?: number
    confidence?: number
    screenshotUrl?: string
    annotations?: Record<string, any>
  }
  screenshotUrl?: string
  selectorBox?: { x: number; y: number; width: number; height: number }
  order?: number
}

export interface CaptureSession {
  sessionId: string
  workflowId: string
  url: string
  startTime: number
  actions: CapturedAction[]
  metadata: Record<string, any>
}

export class PuppeteerCaptureService {
  private browser: Browser | null = null
  private page: Page | null = null
  private session: CaptureSession | null = null
  private config: CaptureConfig
  private isCapturing: boolean = false
  private screenshotCount: number = 0
  private captureInterval: NodeJS.Timeout | null = null

  constructor(config: CaptureConfig = {}) {
    this.config = {
      includeScreenshots: true,
      captureFrequency: 2000,
      maxScreenshots: 50,
      showBrowser: false,
      browserViewport: { width: 1280, height: 720 },
      allowUserInteraction: false,
      autoClose: true,
      ...config
    }
  }

  async startCapture(workflowId: string, url: string): Promise<CaptureSession> {
    if (this.isCapturing) {
      throw new Error('Capture is already in progress')
    }

    // Launch browser with robust configuration
    const preset = this.config.showBrowser ? PuppeteerPresets.development : PuppeteerPresets.production
    this.browser = await launchPuppeteer({
      headless: preset.headless,
      showBrowser: this.config.showBrowser,
      viewport: this.config.browserViewport || preset.viewport,
      timeout: (preset as any).timeout,
      executablePath: (preset as any).executablePath,
      additionalArgs: [...preset.additionalArgs]
    })

    this.page = await this.browser.newPage()
    
    if (this.config.browserViewport) {
      await this.page.setViewport(this.config.browserViewport)
    }

    // Navigate to URL
    await this.page.goto(url, { waitUntil: 'networkidle2' })

    // Initialize session
    this.session = {
      sessionId: `capture_${Date.now()}`,
      workflowId,
      url,
      startTime: Date.now(),
      actions: [],
      metadata: {
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        viewport: this.config.browserViewport,
        timestamp: new Date().toISOString()
      }
    }

    // Inject capture script
    await this.injectCaptureScript()

    // Start periodic capture
    this.startPeriodicCapture()

    this.isCapturing = true
    console.log(`🎬 Puppeteer capture started for workflow ${workflowId} at ${url}`)

    return this.session
  }

  private async injectCaptureScript(): Promise<void> {
    if (!this.page) return

    await this.page.evaluate(() => {
      // Initialize capture actions array
      ;(window as any).__captureActions = []

      // Enhanced selector generation
      function generateSelector(element: any): string {
        // Ensure element exists
        if (!element) return 'body'
        
        // Priority: id > data-* > name > role > class combo > nth-child
        if (element.id) return `#${element.id}`
        
        if (element.dataset && element.dataset.testid) return `[data-testid="${element.dataset.testid}"]`
        if (element.dataset && element.dataset.id) return `[data-id="${element.dataset.id}"]`
        
        if (element.name) return `[name="${element.name}"]`
        
        if (element.getAttribute && element.getAttribute('role')) return `[role="${element.getAttribute('role')}"]`
        
        if (element.className) {
          const classes = element.className.split(' ').filter((c: string) => c.length > 0)
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
        
        // Final fallback
        return element.tagName ? element.tagName.toLowerCase() : 'body'
      }

      // Click event listener
      document.addEventListener('click', (event) => {
        const selector = generateSelector(event.target || document.body)
        const action = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'click',
          selector: selector || 'body', // Ensure selector is always a string
          coordinates: { x: event.clientX, y: event.clientY },
          metadata: {
            elementType: (event.target as HTMLElement)?.tagName || '',
            elementText: (event.target as HTMLElement)?.textContent?.trim() || '',
            innerText: (event.target as HTMLElement)?.innerText?.trim() || '',
            inputType: (event.target as HTMLInputElement)?.type || '',
            timestamp: Date.now(),
            confidence: 0.9
          }
        }
        ;(window as any).__captureActions.push(action)
      }, true)

      // Input event listener
      document.addEventListener('input', (event) => {
        const selector = generateSelector(event.target || document.body)
        const action = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'input',
          selector: selector || 'body', // Ensure selector is always a string
          value: (event.target as HTMLInputElement)?.value || '',
          coordinates: { x: (event as MouseEvent).clientX || 0, y: (event as MouseEvent).clientY || 0 },
          metadata: {
            elementType: (event.target as HTMLElement)?.tagName || '',
            elementText: (event.target as HTMLElement)?.textContent?.trim() || '',
            innerText: (event.target as HTMLElement)?.innerText?.trim() || '',
            inputType: (event.target as HTMLInputElement)?.type || '',
            timestamp: Date.now(),
            confidence: 0.9
          }
        }
        ;(window as any).__captureActions.push(action)
      }, true)

      // Change event listener
      document.addEventListener('change', (event) => {
        const selector = generateSelector(event.target || document.body)
        const action = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'change',
          selector: selector || 'body', // Ensure selector is always a string
          value: (event.target as HTMLInputElement)?.value || '',
          coordinates: { x: (event as MouseEvent).clientX || 0, y: (event as MouseEvent).clientY || 0 },
          metadata: {
            elementType: (event.target as HTMLElement)?.tagName || '',
            elementText: (event.target as HTMLElement)?.textContent?.trim() || '',
            innerText: (event.target as HTMLElement)?.innerText?.trim() || '',
            inputType: (event.target as HTMLInputElement)?.type || '',
            timestamp: Date.now(),
            confidence: 0.9
          }
        }
        ;(window as any).__captureActions.push(action)
      }, true)

      // Submit event listener
      document.addEventListener('submit', (event) => {
        const selector = generateSelector(event.target || document.body)
        const action = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'submit',
          selector: selector || 'body', // Ensure selector is always a string
          coordinates: { x: 0, y: 0 }, // Submit events don't have coordinates
          metadata: {
            elementType: (event.target as HTMLElement)?.tagName || '',
            elementText: (event.target as HTMLElement)?.textContent?.trim() || '',
            innerText: (event.target as HTMLElement)?.innerText?.trim() || '',
            inputType: (event.target as HTMLInputElement)?.type || '',
            timestamp: Date.now(),
            confidence: 0.9
          }
        }
        ;(window as any).__captureActions.push(action)
      }, true)

      // Network request listener
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const response = await originalFetch(...args)
        const action = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'network',
          selector: 'body',
          metadata: {
            url: args[0],
            method: args[1]?.method || 'GET',
            timestamp: Date.now(),
            confidence: 0.8
          }
        }
        ;(window as any).__captureActions.push(action)
        return response
      }

      // Console message listener
      const originalLog = console.log
      console.log = (...args) => {
        const action = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'console',
          selector: 'body',
          metadata: {
            message: args.join(' '),
            timestamp: Date.now(),
            confidence: 0.7
          }
        }
        ;(window as any).__captureActions.push(action)
        return originalLog(...args)
      }
    })
  }

  private startPeriodicCapture(): void {
    if (!this.page || this.captureInterval) return

    this.captureInterval = setInterval(async () => {
      if (!this.page || this.page.isClosed()) {
        this.cleanupEventListeners()
        return
      }

      try {
        // Check if page is still valid and not closed
        if (!this.page || this.page.isClosed()) {
          console.log('Page is closed, stopping capture')
          this.cleanupEventListeners()
          return
        }

        // Check if page is still connected to browser
        if (!this.page.url() || this.page.url() === 'about:blank') {
          console.log('Page is not properly loaded, skipping capture')
          return
        }

        let actions = []
        try {
          actions = await this.page.evaluate(() => {
            const actions = (window as any).__captureActions || []
            ;(window as any).__captureActions = [] // Clear captured actions
            return actions
          })
        } catch (error) {
          if (error.message.includes('Execution context was destroyed')) {
            console.log('Page context destroyed during navigation, skipping capture cycle')
            return
          }
          if (error.message.includes('Protocol error') || error.message.includes('Target closed')) {
            console.log('Browser target closed, stopping capture')
            this.cleanupEventListeners()
            return
          }
          console.error('Error during page evaluation:', error)
          return
        }

        for (const action of actions) {
          // CRITICAL: Ensure selector is always a valid string to prevent validation failures
          if (!action.selector || typeof action.selector !== 'string') {
            action.selector = 'body' // Fallback to body if selector is null/undefined
            console.log(`⚠️ Fixed invalid selector for action ${action.id}: ${action.selector}`)
          }
          
          // Capture screenshot for each action if configured and within limits
          if (this.config.includeScreenshots && this.shouldCaptureScreenshot()) {
            await this.captureActionScreenshot(action)
          }
          
          this.session!.actions.push(action)
        }
      } catch (error) {
        console.error('Error during periodic capture:', error)
      }
    }, this.config.captureFrequency)
  }

  private async captureActionScreenshot(action: CapturedAction): Promise<void> {
    if (!this.page || this.screenshotCount >= this.config.maxScreenshots!) return

    try {
      const screenshot = await this.page.screenshot({ 
        type: 'png'
      })

      // In a real implementation, you'd save this to a file or cloud storage
      // For now, we'll just store the base64 data
      action.screenshotUrl = `data:image/png;base64,${Buffer.from(screenshot).toString('base64')}`
      this.screenshotCount++
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
    }
  }

  private shouldCaptureScreenshot(): boolean {
    return this.screenshotCount < this.config.maxScreenshots!
  }

  private cleanupEventListeners(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval)
      this.captureInterval = null
    }
  }

  async stopCapture(): Promise<CapturedAction[]> {
    if (!this.isCapturing) {
      return []
    }

    this.cleanupEventListeners()
    this.isCapturing = false

    const actions = this.session?.actions || []
    console.log(`🛑 Capture session stopped: ${JSON.stringify({
      sessionId: this.session?.sessionId,
      duration: Date.now() - (this.session?.startTime || 0),
      actionCount: actions.length,
      validatedCount: actions.length
    })}`)

    return actions
  }

  async cleanup(): Promise<void> {
    this.cleanupEventListeners()
    
    if (this.page && !this.page.isClosed()) {
      await this.page.close()
    }
    
    if (this.browser) {
      await this.browser.close()
    }

    this.browser = null
    this.page = null
    this.session = null
    this.screenshotCount = 0

    console.log('🧹 PuppeteerCaptureService cleaned up')
  }

  getSession(): CaptureSession | null {
    return this.session
  }

  isActive(): boolean {
    return this.isCapturing
  }
}