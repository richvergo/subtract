/**
 * LoginAgentAdapter
 * Enterprise-grade adapter for integrating Puppeteer workflows with existing Login Agent
 */

import { Browser, Page } from 'puppeteer'
import { SessionManager } from '@/lib/session-manager'
import { UniversalLoginDetector } from '@/lib/universal-login-detector'
import { LoginConfigSchema, validateLoginConfig } from '../logic/schemas'

export interface LoginConfig {
  username: string
  password: string
  url: string
  tenant?: string
  options?: Record<string, unknown>
}

export interface LoginResult {
  success: boolean
  sessionData?: string
  error?: string
  metadata: {
    loginUrl: string
    duration: number
    timestamp: number
    userAgent: string
    cookies: string[]
  }
}

export interface LoginSession {
  id: string
  credentials: LoginConfig
  sessionData: string
  expiresAt: Date
  metadata: {
    userAgent: string
    cookies: string[]
    headers: Record<string, string>
  }
}

export interface LoginError {
  code: string
  message: string
  cause?: Error
}

export class LoginAgentAdapter {
  private browser: Browser | null = null
  private page: Page | null = null
  private sessions: Map<string, LoginSession> = new Map()
  private currentSession: LoginSession | null = null

  constructor() {
    console.log('🔐 LoginAgentAdapter initialized')
  }

  /**
   * Initialize the login adapter with browser and page
   */
  async initialize(browser: Browser, page: Page): Promise<void> {
    this.browser = browser
    this.page = page
    console.log('🔐 LoginAgentAdapter initialized with browser and page')
  }

  /**
   * Initialize login process with configuration
   */
  async initLogin(page: Page, loginConfig: LoginConfig): Promise<void> {
    if (!page) {
      throw new Error('Page is required for login initialization')
    }

    // Validate login configuration
    const validatedConfig = validateLoginConfig(loginConfig)
    
    console.log(`🔐 Initializing login for: ${validatedConfig.url}`)
    
    // Navigate to login page
    await page.goto(validatedConfig.url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })

    // Wait for page to stabilize
    await this.waitForPageStabilization(page)
    
    console.log('✅ Login initialization completed')
  }

  /**
   * Get authenticated page using existing Login Agent service
   */
  async getAuthenticatedPage(loginConfig: LoginConfig): Promise<Page> {
    if (!this.browser || !this.page) {
      throw new Error('LoginAgentAdapter not initialized with browser and page')
    }

    // Validate login configuration
    const validatedConfig = validateLoginConfig(loginConfig)
    
    console.log(`🔐 Getting authenticated page for: ${validatedConfig.url}`)

    try {
      // Check if we have a valid session
      if (this.currentSession && this.isSessionValid(this.currentSession)) {
        console.log('🔄 Using existing valid session')
        await this.restoreSessionToPage(this.page, this.currentSession)
        return this.page
      }

      // Perform fresh login using existing Login Agent service
      const loginResult = await this.performLogin(validatedConfig)
      
      if (!loginResult.success) {
        throw new Error(`Login failed: ${loginResult.error}`)
      }

      // Store session for reuse
      if (loginResult.sessionData) {
        this.currentSession = await this.storeSession(validatedConfig, loginResult.sessionData)
      }

      console.log('✅ Successfully authenticated page')
      return this.page

    } catch (error) {
      const loginError: LoginError = {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Unknown login error',
        cause: error instanceof Error ? error : undefined
      }
      
      console.error('❌ Login failed:', loginError)
      throw loginError
    }
  }

  /**
   * Perform login using existing Login Agent service
   */
  private async performLogin(loginConfig: LoginConfig): Promise<LoginResult> {
    if (!this.page) {
      throw new Error('Page not available for login')
    }

    const startTime = Date.now()
    const result: LoginResult = {
      success: false,
      metadata: {
        loginUrl: loginConfig.url,
        duration: 0,
        timestamp: Date.now(),
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        cookies: []
      }
    }

    try {
      console.log(`🔐 Performing login to: ${loginConfig.url}`)
      
      // Use existing UniversalLoginDetector to detect login form
      const loginForm = await UniversalLoginDetector.detectLoginForm(this.page)
      
      if (!loginForm) {
        throw new Error('No login form detected on page')
      }

      // Use existing UniversalLoginDetector to perform login
      const loginResult = await UniversalLoginDetector.performLogin(this.page, loginForm, {
        username: loginConfig.username,
        password: loginConfig.password
      })

      if (!loginResult.success) {
        throw new Error(loginResult.error || 'Login failed')
      }

      // Extract session data using existing SessionManager
      const sessionData = await this.extractSessionData()
      
      result.success = true
      result.sessionData = sessionData
      result.metadata.duration = Date.now() - startTime
      result.metadata.cookies = await this.getCookies()

      console.log('✅ Login successful')
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.metadata.duration = Date.now() - startTime
      
      console.error('❌ Login failed:', error)
    }

    return result
  }

  /**
   * Extract session data using existing SessionManager
   */
  private async extractSessionData(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available for session extraction')
    }

    try {
      // Get cookies
      const cookies = await this.page.cookies()
      
      // Get localStorage and sessionStorage
      const localStorage = await this.page.evaluate(() => {
        const storage: Record<string, string> = {}
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key) {
            storage[key] = window.localStorage.getItem(key) || ''
          }
        }
        return storage
      })

      const sessionStorage = await this.page.evaluate(() => {
        const storage: Record<string, string> = {}
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i)
          if (key) {
            storage[key] = window.sessionStorage.getItem(key) || ''
          }
        }
        return storage
      })

      // Get user agent
      const userAgent = await this.page.evaluate(() => navigator.userAgent)

      // Create session data
      const sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        userAgent,
        timestamp: Date.now()
      }

      // Encrypt using existing SessionManager
      return SessionManager.encryptSessionData(sessionData)

    } catch (error) {
      console.error('Failed to extract session data:', error)
      throw new Error('Session extraction failed')
    }
  }

  /**
   * Get cookies from current page
   */
  private async getCookies(): Promise<string[]> {
    if (!this.page) return []
    
    try {
      const cookies = await this.page.cookies()
      return cookies.map(cookie => `${cookie.name}=${cookie.value}`)
    } catch (error) {
      console.error('Failed to get cookies:', error)
      return []
    }
  }

  /**
   * Store login session
   */
  private async storeSession(credentials: LoginConfig, sessionData: string): Promise<LoginSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const session: LoginSession = {
      id: sessionId,
      credentials,
      sessionData,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      metadata: {
        userAgent: await this.page?.evaluate(() => navigator.userAgent) || '',
        cookies: await this.getCookies(),
        headers: {}
      }
    }

    this.sessions.set(sessionId, session)
    console.log(`🔐 Login session stored: ${sessionId}`)
    
    return session
  }

  /**
   * Restore session to page using existing SessionManager
   */
  private async restoreSessionToPage(page: Page, session: LoginSession): Promise<void> {
    try {
      const sessionData = SessionManager.decryptSessionData(session.sessionData)
      await SessionManager.applySessionToPage(page, sessionData)
      console.log('✅ Session restored to page')
    } catch (error) {
      console.error('Failed to restore session:', error)
      throw new Error('Session restoration failed')
    }
  }

  /**
   * Check if session is valid
   */
  private isSessionValid(session: LoginSession): boolean {
    return session.expiresAt > new Date()
  }

  /**
   * Wait for page to stabilize
   */
  private async waitForPageStabilization(page: Page): Promise<void> {
    try {
      // Wait for network to be idle
      await page.waitForLoadState?.('networkidle') || 
            await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Wait for any dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.warn('Page stabilization timeout, continuing...')
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): LoginSession | null {
    return this.currentSession
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.currentSession = null
    console.log('🔐 Current session cleared')
  }

  /**
   * Get all stored sessions
   */
  getAllSessions(): LoginSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.sessions.clear()
    this.currentSession = null
    this.browser = null
    this.page = null
    console.log('🧹 LoginAgentAdapter cleaned up')
  }
}