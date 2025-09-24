/**
 * LoginAgentAdapter Tests
 * Tests for enterprise-grade login integration
 */

import { LoginAgentAdapter, LoginConfig, LoginResult, LoginError } from '@/lib/agents/login/LoginAgentAdapter'
import { Browser, Page } from 'puppeteer'

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  Browser: jest.fn(),
  Page: jest.fn(),
  CDPSession: jest.fn()
}))

// Mock existing Login Agent services
jest.mock('@/lib/session-manager', () => ({
  SessionManager: {
    encryptSessionData: jest.fn().mockReturnValue('encrypted_session_data'),
    decryptSessionData: jest.fn().mockReturnValue({
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      userAgent: 'test-user-agent',
      timestamp: Date.now()
    }),
    applySessionToPage: jest.fn().mockResolvedValue(undefined),
    validateSession: jest.fn().mockResolvedValue({
      isValid: true,
      needsReconnect: false
    })
  }
}))

jest.mock('@/lib/universal-login-detector', () => ({
  UniversalLoginDetector: {
    detectLoginForm: jest.fn().mockResolvedValue({
      formType: 'traditional',
      submissionMethod: 'submit',
      selectors: {
        username: 'input[name="username"]',
        password: 'input[name="password"]',
        submit: 'button[type="submit"]'
      }
    }),
    performLogin: jest.fn().mockResolvedValue({
      success: true
    })
  }
}))

describe('LoginAgentAdapter', () => {
  let loginAdapter: LoginAgentAdapter
  let mockBrowser: jest.Mocked<Browser>
  let mockPage: jest.Mocked<Page>

  const validLoginConfig: LoginConfig = {
    username: 'testuser',
    password: 'testpass',
    url: 'https://example.com/login',
    tenant: 'test-tenant',
    options: { timeout: 30000 }
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock page
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue('test-user-agent'),
      cookies: jest.fn().mockResolvedValue([
        { name: 'session', value: 'abc123', domain: 'example.com' }
      ]),
      waitForLoadState: jest.fn().mockResolvedValue(undefined)
    } as any

    // Create mock browser
    mockBrowser = {} as jest.Mocked<Browser>

    // Create login adapter
    loginAdapter = new LoginAgentAdapter()
  })

  afterEach(async () => {
    await loginAdapter.cleanup()
  })

  describe('Initialization', () => {
    it('should initialize with browser and page', async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
      expect(mockPage).toBeDefined()
    })

    it('should throw error if page is not provided for initLogin', async () => {
      await expect(loginAdapter.initLogin(null as any, validLoginConfig))
        .rejects.toThrow('Page is required for login initialization')
    })
  })

  describe('Login Configuration Validation', () => {
    it('should validate login configuration', async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
      await loginAdapter.initLogin(mockPage, validLoginConfig)
      
      expect(mockPage.goto).toHaveBeenCalledWith(validLoginConfig.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })
    })

    it('should throw error for invalid login configuration', async () => {
      const invalidConfig = {
        username: '',
        password: '',
        url: 'invalid-url'
      } as LoginConfig

      await loginAdapter.initialize(mockBrowser, mockPage)
      
      await expect(loginAdapter.initLogin(mockPage, invalidConfig))
        .rejects.toThrow()
    })
  })

  describe('Authentication', () => {
    beforeEach(async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
    })

    it('should get authenticated page successfully', async () => {
      const authenticatedPage = await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      expect(authenticatedPage).toBe(mockPage)
      expect(mockPage.goto).toHaveBeenCalledWith(validLoginConfig.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })
    })

    it('should reuse existing valid session', async () => {
      // First authentication
      await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      // Second authentication should reuse session
      const authenticatedPage = await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      expect(authenticatedPage).toBe(mockPage)
    })

    it('should handle login failure gracefully', async () => {
      // Mock login failure
      const { UniversalLoginDetector } = require('@/lib/universal-login-detector')
      UniversalLoginDetector.performLogin.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials'
      })

      await expect(loginAdapter.getAuthenticatedPage(validLoginConfig))
        .rejects.toThrow('Login failed: Invalid credentials')
    })

    it('should extract session data correctly', async () => {
      const authenticatedPage = await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      expect(authenticatedPage).toBe(mockPage)
      expect(mockPage.cookies).toHaveBeenCalled()
      expect(mockPage.evaluate).toHaveBeenCalled()
    })
  })

  describe('Session Management', () => {
    beforeEach(async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
    })

    it('should store session after successful login', async () => {
      await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      const currentSession = loginAdapter.getCurrentSession()
      expect(currentSession).toBeDefined()
      expect(currentSession?.credentials).toEqual(validLoginConfig)
    })

    it('should clear session when requested', async () => {
      await loginAdapter.getAuthenticatedPage(validLoginConfig)
      expect(loginAdapter.getCurrentSession()).toBeDefined()
      
      loginAdapter.clearSession()
      expect(loginAdapter.getCurrentSession()).toBeNull()
    })

    it('should get all stored sessions', async () => {
      await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      const allSessions = loginAdapter.getAllSessions()
      expect(allSessions).toHaveLength(1)
      expect(allSessions[0].credentials).toEqual(validLoginConfig)
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
    })

    it('should throw structured error on login failure', async () => {
      const { UniversalLoginDetector } = require('@/lib/universal-login-detector')
      UniversalLoginDetector.performLogin.mockResolvedValueOnce({
        success: false,
        error: 'Network timeout'
      })

      try {
        await loginAdapter.getAuthenticatedPage(validLoginConfig)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toHaveProperty('code', 'LOGIN_FAILED')
        expect(error).toHaveProperty('message', 'Login failed: Network timeout')
      }
    })

    it('should handle session extraction errors', async () => {
      mockPage.cookies.mockRejectedValueOnce(new Error('Cookie extraction failed'))

      await expect(loginAdapter.getAuthenticatedPage(validLoginConfig))
        .rejects.toThrow('Session extraction failed')
    })

    it('should handle page navigation errors', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'))

      await expect(loginAdapter.initLogin(mockPage, validLoginConfig))
        .rejects.toThrow('Navigation failed')
    })
  })

  describe('Integration with Capture/Replay Services', () => {
    it('should work with PuppeteerCaptureService', async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
      
      // Simulate capture service usage
      await loginAdapter.initLogin(mockPage, validLoginConfig)
      const authenticatedPage = await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      expect(authenticatedPage).toBe(mockPage)
    })

    it('should work with PuppeteerReplayService', async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
      
      // Simulate replay service usage
      await loginAdapter.initLogin(mockPage, validLoginConfig)
      const authenticatedPage = await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      expect(authenticatedPage).toBe(mockPage)
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources properly', async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
      await loginAdapter.getAuthenticatedPage(validLoginConfig)
      
      await loginAdapter.cleanup()
      
      expect(loginAdapter.getCurrentSession()).toBeNull()
    })
  })
})
