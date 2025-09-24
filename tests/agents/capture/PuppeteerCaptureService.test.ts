/**
 * PuppeteerCaptureService Integration Tests
 * Test suite for domain-scoped recording functionality
 */

import { PuppeteerCaptureService, CaptureConfig } from '@/lib/agents/capture/PuppeteerCaptureService'
import { DomainScopeConfig } from '@/lib/agents/capture/DomainScope'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    workflowAction: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  }
}))

jest.mock('@/lib/agents/login/LoginAgentAdapter', () => ({
  LoginAgentAdapter: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    initLogin: jest.fn(),
    getAuthenticatedPage: jest.fn(),
    cleanup: jest.fn()
  }))
}))

describe('PuppeteerCaptureService with Domain Scoping', () => {
  let captureService: PuppeteerCaptureService
  let config: CaptureConfig

  beforeEach(() => {
    config = {
      includeScreenshots: false,
      captureFrequency: 1000,
      selectorStrategy: 'css',
      includeNetworkRequests: false,
      includeConsoleLogs: false,
      timeout: 10000,
      domainScope: {
        baseDomain: 'getvergo.com',
        allowedDomains: ['vergoerp.io'],
        ssoProviders: ['*.auth0.com', 'accounts.google.com'],
        metadata: {}
      },
      onRecordingPaused: jest.fn(),
      onRecordingResumed: jest.fn()
    }
    
    captureService = new PuppeteerCaptureService(config)
  })

  describe('Domain Scope Initialization', () => {
    test('should initialize with domain scope configuration', () => {
      expect(captureService).toBeDefined()
      
      const status = captureService.getDomainScopeStatus()
      expect(status).toBeDefined()
      expect(status?.allowedDomains).toContain('getvergo.com')
      expect(status?.allowedDomains).toContain('vergoerp.io')
    })

    test('should handle missing domain scope gracefully', () => {
      const configWithoutScope: CaptureConfig = {
        ...config,
        domainScope: undefined
      }
      
      const serviceWithoutScope = new PuppeteerCaptureService(configWithoutScope)
      
      const status = serviceWithoutScope.getDomainScopeStatus()
      expect(status).toBeNull()
    })
  })

  describe('Dynamic Domain Management', () => {
    test('should add domain to allowlist dynamically', () => {
      captureService.addAllowedDomain('newdomain.com')
      
      const status = captureService.getDomainScopeStatus()
      expect(status?.allowedDomains).toContain('newdomain.com')
    })

    test('should remove domain from allowlist', () => {
      captureService.removeAllowedDomain('vergoerp.io')
      
      const status = captureService.getDomainScopeStatus()
      expect(status?.allowedDomains).not.toContain('vergoerp.io')
    })

    test('should update domain scope configuration', () => {
      captureService.updateDomainScope({
        allowedDomains: ['updateddomain.com']
      })
      
      const status = captureService.getDomainScopeStatus()
      expect(status?.allowedDomains).toContain('updateddomain.com')
    })
  })

  describe('Error Handling', () => {
    test('should handle missing domain scope gracefully', () => {
      const serviceWithoutScope = new PuppeteerCaptureService({
        ...config,
        domainScope: undefined
      })
      
      expect(() => {
        serviceWithoutScope.addAllowedDomain('test.com')
      }).not.toThrow()
    })
  })
})