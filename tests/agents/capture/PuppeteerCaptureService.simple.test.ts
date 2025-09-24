/**
 * PuppeteerCaptureService Simple Tests
 * Basic functionality tests for enterprise-grade action recording
 */

import { PuppeteerCaptureService, CaptureConfig, WorkflowAction } from '@/lib/agents/capture/PuppeteerCaptureService'

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  Browser: jest.fn(),
  Page: jest.fn(),
  CDPSession: jest.fn()
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    workflowAction: {
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({})
    }
  }
}))

describe('PuppeteerCaptureService - Basic Functionality', () => {
  let captureService: PuppeteerCaptureService
  let mockBrowser: jest.Mocked<any>
  let mockPage: jest.Mocked<any>
  let mockCDPSession: any

  const defaultConfig: CaptureConfig = {
    includeScreenshots: true,
    captureFrequency: 1000,
    selectorStrategy: 'hybrid',
    includeNetworkRequests: false,
    includeConsoleLogs: false,
    timeout: 30000
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock CDP session
    mockCDPSession = {
      send: jest.fn().mockResolvedValue({}),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      detach: jest.fn().mockResolvedValue(undefined)
    }

    // Create mock page
    mockPage = {
      target: jest.fn().mockReturnValue({
        createCDPSession: jest.fn().mockResolvedValue(mockCDPSession)
      }),
      goto: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue([]),
      evaluateOnNewDocument: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue('base64screenshot'),
      viewport: jest.fn().mockReturnValue({ width: 1920, height: 1080 }),
      title: jest.fn().mockResolvedValue('Test Page'),
      url: jest.fn().mockReturnValue('https://example.com')
    }

    // Create mock browser
    mockBrowser = {}

    // Create capture service
    captureService = new PuppeteerCaptureService(defaultConfig)
  })

  afterEach(async () => {
    await captureService.cleanup()
  })

  describe('Basic Operations', () => {
    it('should initialize successfully', async () => {
      await captureService.initialize(mockBrowser, mockPage)
      expect(mockPage.target).toHaveBeenCalled()
    })

    it('should start capture session', async () => {
      await captureService.initialize(mockBrowser, mockPage)
      await captureService.startCapture('workflow-123', 'https://example.com')
      
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
      })
      expect(captureService.isActive()).toBe(true)
    })

    it('should stop capture session', async () => {
      await captureService.initialize(mockBrowser, mockPage)
      await captureService.startCapture('workflow-123', 'https://example.com')
      
      const actions = await captureService.stopCapture()
      
      expect(Array.isArray(actions)).toBe(true)
      expect(captureService.isActive()).toBe(false)
    })

    it('should get captured actions', async () => {
      await captureService.initialize(mockBrowser, mockPage)
      await captureService.startCapture('workflow-123', 'https://example.com')
      
      const actions = captureService.getCapturedActions()
      expect(Array.isArray(actions)).toBe(true)
    })
  })

  describe('Configuration', () => {
    it('should use provided configuration', () => {
      const customConfig: CaptureConfig = {
        includeScreenshots: false,
        captureFrequency: 500,
        selectorStrategy: 'css',
        includeNetworkRequests: true,
        includeConsoleLogs: true,
        timeout: 60000
      }

      const service = new PuppeteerCaptureService(customConfig)
      expect(service).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      mockPage.target.mockImplementation(() => {
        throw new Error('Target error')
      })

      await expect(captureService.initialize(mockBrowser, mockPage))
        .rejects.toThrow('Target error')
    })

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'))

      await captureService.initialize(mockBrowser, mockPage)
      
      await expect(captureService.startCapture('workflow-123', 'https://example.com'))
        .rejects.toThrow('Navigation failed')
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources', async () => {
      await captureService.initialize(mockBrowser, mockPage)
      await captureService.cleanup()

      expect(mockCDPSession.removeAllListeners).toHaveBeenCalled()
      expect(mockCDPSession.detach).toHaveBeenCalled()
    })
  })
})
