/**
 * LoginAgentAdapter Simple Tests
 * Basic functionality tests for login integration
 */

import { LoginAgentAdapter, LoginConfig } from '@/lib/agents/login/LoginAgentAdapter'
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

// Mock the schemas to avoid Zod issues
jest.mock('@/lib/agents/logic/schemas', () => ({
  validateLoginConfig: jest.fn().mockImplementation((config: any) => {
    if (!config.username || !config.password || !config.url) {
      throw new Error('Invalid login configuration')
    }
    return config
  })
}))

describe('LoginAgentAdapter - Basic Functionality', () => {
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

  describe('Basic Operations', () => {
    it('should initialize with browser and page', async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
      expect(mockPage).toBeDefined()
    })

    it('should throw error if page is not provided for initLogin', async () => {
      await expect(loginAdapter.initLogin(null as any, validLoginConfig))
        .rejects.toThrow('Page is required for login initialization')
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
