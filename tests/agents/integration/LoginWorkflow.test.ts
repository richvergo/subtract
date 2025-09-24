/**
 * LoginWorkflow Integration Tests
 * Tests for workflows that require authentication
 */

import { PuppeteerCaptureService } from '@/lib/agents/capture/PuppeteerCaptureService'
import { PuppeteerReplayService } from '@/lib/agents/replay/PuppeteerReplayService'
import { AgentRunner } from '@/lib/agents/exec/AgentRunner'
import { LoginAgentAdapter } from '@/lib/agents/login/LoginAgentAdapter'
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

describe('LoginWorkflow Integration Tests', () => {
  let mockBrowser: jest.Mocked<Browser>
  let mockPage: jest.Mocked<Page>
  let captureService: PuppeteerCaptureService
  let replayService: PuppeteerReplayService
  let agentRunner: AgentRunner
  let loginAdapter: LoginAgentAdapter

  const mockLoginConfig = {
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
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
      url: jest.fn().mockReturnValue('https://example.com'),
      title: jest.fn().mockResolvedValue('Test Page')
    } as any

    // Create mock browser
    mockBrowser = {
      version: jest.fn().mockResolvedValue('Chrome/91.0.4472.124')
    } as any

    // Initialize services
    captureService = new PuppeteerCaptureService({
      includeScreenshots: true,
      captureFrequency: 1000,
      selectorStrategy: 'hybrid',
      includeNetworkRequests: false,
      includeConsoleLogs: false,
      timeout: 30000
    })

    replayService = new PuppeteerReplayService({
      timeout: 30000,
      retryAttempts: 3,
      waitForNavigation: true,
      screenshotOnError: true,
      debugMode: false
    })

    agentRunner = new AgentRunner()
    loginAdapter = new LoginAgentAdapter()
  })

  afterEach(async () => {
    await captureService.cleanup()
    await replayService.cleanup()
    await agentRunner.cleanup()
    await loginAdapter.cleanup()
  })

  describe('Case 1: Workflow without login runs normally', () => {
    it('should execute workflow without authentication', async () => {
      // Initialize services
      await captureService.initialize(mockBrowser, mockPage)
      await replayService.initialize(mockBrowser, mockPage)

      // Test capture without login
      await captureService.startCapture('workflow-123', 'https://example.com')
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      // Test replay without login
      const mockActions = [
        {
          id: 'action-1',
          type: 'click',
          selector: '#button',
          metadata: { timestamp: Date.now() }
        }
      ]

      const session = await replayService.startReplay(mockActions)
      expect(session).toBeDefined()
      expect(session.actions).toEqual(mockActions)
    })
  })

  describe('Case 2: Workflow with login authenticates, then captures actions', () => {
    it('should authenticate before capturing actions', async () => {
      // Configure capture service with login
      const captureServiceWithLogin = new PuppeteerCaptureService({
        includeScreenshots: true,
        captureFrequency: 1000,
        selectorStrategy: 'hybrid',
        includeNetworkRequests: false,
        includeConsoleLogs: false,
        timeout: 30000,
        requiresLogin: true,
        loginConfig: mockLoginConfig
      })

      await captureServiceWithLogin.initialize(mockBrowser, mockPage)
      await captureServiceWithLogin.startCapture('workflow-123', 'https://example.com')

      // Verify login process was initiated
      expect(mockPage.goto).toHaveBeenCalledWith(mockLoginConfig.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      await captureServiceWithLogin.cleanup()
    })
  })

  describe('Case 3: Replay with login works on authenticated session', () => {
    it('should authenticate before replaying actions', async () => {
      // Configure replay service with login
      const replayServiceWithLogin = new PuppeteerReplayService({
        timeout: 30000,
        retryAttempts: 3,
        waitForNavigation: true,
        screenshotOnError: true,
        debugMode: false,
        requiresLogin: true,
        loginConfig: mockLoginConfig
      })

      await replayServiceWithLogin.initialize(mockBrowser, mockPage)

      const mockActions = [
        {
          id: 'action-1',
          type: 'click',
          selector: '#button',
          metadata: { timestamp: Date.now() }
        }
      ]

      const session = await replayServiceWithLogin.startReplay(mockActions)

      // Verify login process was initiated
      expect(mockPage.goto).toHaveBeenCalledWith(mockLoginConfig.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      expect(session).toBeDefined()
      expect(session.actions).toEqual(mockActions)

      await replayServiceWithLogin.cleanup()
    })
  })

  describe('Case 4: Runner fails gracefully if login credentials are invalid', () => {
    it('should handle invalid login credentials', async () => {
      // Mock login failure
      const { UniversalLoginDetector } = require('@/lib/universal-login-detector')
      UniversalLoginDetector.performLogin.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials'
      })

      const agentConfig = {
        name: 'Test Agent',
        description: 'Test agent with login',
        actions: [
          {
            id: 'action-1',
            type: 'click',
            selector: '#button'
          }
        ],
        variables: {},
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false
        },
        requiresLogin: true,
        loginConfig: mockLoginConfig
      }

      const context = {
        browser: mockBrowser,
        page: mockPage,
        variables: {},
        config: agentConfig
      }

      // Execute agent with invalid credentials
      const result = await agentRunner.executeAgent(agentConfig, context)

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('Login failed'))
    })
  })

  describe('Integration with LoginAgentAdapter', () => {
    it('should work with LoginAgentAdapter for authentication', async () => {
      await loginAdapter.initialize(mockBrowser, mockPage)
      await loginAdapter.initLogin(mockPage, mockLoginConfig)
      
      const authenticatedPage = await loginAdapter.getAuthenticatedPage(mockLoginConfig)
      
      expect(authenticatedPage).toBe(mockPage)
      expect(mockPage.goto).toHaveBeenCalledWith(mockLoginConfig.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })
    })

    it('should handle login failures gracefully', async () => {
      // Mock login failure
      const { UniversalLoginDetector } = require('@/lib/universal-login-detector')
      UniversalLoginDetector.performLogin.mockResolvedValueOnce({
        success: false,
        error: 'Network timeout'
      })

      await loginAdapter.initialize(mockBrowser, mockPage)
      
      await expect(loginAdapter.getAuthenticatedPage(mockLoginConfig))
        .rejects.toThrow('Login failed: Network timeout')
    })
  })

  describe('End-to-End Workflow with Login', () => {
    it('should complete full workflow: capture -> replay -> execute with login', async () => {
      // Step 1: Capture with login
      const captureServiceWithLogin = new PuppeteerCaptureService({
        includeScreenshots: true,
        captureFrequency: 1000,
        selectorStrategy: 'hybrid',
        includeNetworkRequests: false,
        includeConsoleLogs: false,
        timeout: 30000,
        requiresLogin: true,
        loginConfig: mockLoginConfig
      })

      await captureServiceWithLogin.initialize(mockBrowser, mockPage)
      await captureServiceWithLogin.startCapture('workflow-123', 'https://example.com')
      
      // Simulate some actions being captured
      const capturedActions = [
        {
          id: 'action-1',
          type: 'click',
          selector: '#button',
          metadata: { timestamp: Date.now() }
        },
        {
          id: 'action-2',
          type: 'type',
          selector: '#input',
          value: 'test value',
          metadata: { timestamp: Date.now() }
        }
      ]

      // Step 2: Replay with login
      const replayServiceWithLogin = new PuppeteerReplayService({
        timeout: 30000,
        retryAttempts: 3,
        waitForNavigation: true,
        screenshotOnError: true,
        debugMode: false,
        requiresLogin: true,
        loginConfig: mockLoginConfig
      })

      await replayServiceWithLogin.initialize(mockBrowser, mockPage)
      const replaySession = await replayServiceWithLogin.startReplay(capturedActions)

      expect(replaySession).toBeDefined()
      expect(replaySession.actions).toEqual(capturedActions)

      // Step 3: Execute with login
      const agentConfig = {
        name: 'Test Agent',
        description: 'Test agent with login',
        actions: capturedActions,
        variables: {},
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false
        },
        requiresLogin: true,
        loginConfig: mockLoginConfig
      }

      const context = {
        browser: mockBrowser,
        page: mockPage,
        variables: {},
        config: agentConfig
      }

      const result = await agentRunner.executeAgent(agentConfig, context)

      expect(result).toBeDefined()
      expect(result.agentId).toBe('Test Agent')

      // Cleanup
      await captureServiceWithLogin.cleanup()
      await replayServiceWithLogin.cleanup()
      await agentRunner.cleanup()
    })
  })
})
