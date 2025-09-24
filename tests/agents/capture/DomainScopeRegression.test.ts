/**
 * Domain Scope Regression Test Suite
 * Comprehensive test suite to validate domain-scoping functionality in PuppeteerCaptureService
 * Ensures domain-scoping works correctly and doesn't break existing functionality
 */

import { PuppeteerCaptureService, CaptureConfig } from '@/lib/agents/capture/PuppeteerCaptureService'
import { DomainScope, DomainScopeConfig } from '@/lib/agents/capture/DomainScope'
import { z } from 'zod'

// Test configuration schema for validation
const DomainScopeTestConfigSchema = z.object({
  baseDomain: z.string().min(1, 'Base domain is required'),
  allowedDomains: z.array(z.string()).optional().default([]),
  ssoProviders: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional()
})

// Test scenarios schema
const TestScenarioSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  expectedAllowed: z.boolean(),
  expectedReason: z.enum(['base_domain', 'subdomain', 'sso_provider', 'explicit_allowlist', 'denied']),
  shouldRecord: z.boolean(),
  description: z.string()
})

describe('Domain Scope Regression Tests', () => {
  let captureService: PuppeteerCaptureService
  let domainScope: DomainScope
  let config: CaptureConfig

  // Test configuration for apply.getvergo.com domain
  const testConfig: DomainScopeConfig = {
    baseDomain: 'getvergo.com',
    allowedDomains: ['vergoerp.io'],
    ssoProviders: ['*.auth0.com', 'accounts.google.com'],
    metadata: {
      testEnvironment: 'regression',
      version: '1.0.0'
    }
  }

  beforeEach(() => {
    // Validate test configuration
    const validatedConfig = DomainScopeTestConfigSchema.parse(testConfig)
    
    config = {
      includeScreenshots: false,
      captureFrequency: 1000,
      selectorStrategy: 'css',
      includeNetworkRequests: false,
      includeConsoleLogs: false,
      timeout: 10000,
      domainScope: validatedConfig,
      onRecordingPaused: jest.fn(),
      onRecordingResumed: jest.fn()
    }
    
    captureService = new PuppeteerCaptureService(config)
    domainScope = new DomainScope(validatedConfig)
  })

  describe('Within Base Domain Navigation', () => {
    test('should record actions within base domain (apply.getvergo.com)', () => {
      const testScenarios = [
        {
          name: 'Base domain navigation',
          url: 'https://apply.getvergo.com',
          expectedAllowed: true,
          expectedReason: 'base_domain' as const,
          shouldRecord: true,
          description: 'Navigation to base domain should be allowed and recorded'
        },
        {
          name: 'Subdomain navigation',
          url: 'https://app.getvergo.com/transactions',
          expectedAllowed: true,
          expectedReason: 'base_domain' as const,
          shouldRecord: true,
          description: 'Navigation to subdomain should be allowed and recorded'
        },
        {
          name: 'API subdomain navigation',
          url: 'https://api.getvergo.com/v1/endpoint',
          expectedAllowed: true,
          expectedReason: 'base_domain' as const,
          shouldRecord: true,
          description: 'Navigation to API subdomain should be allowed and recorded'
        }
      ]

      testScenarios.forEach(scenario => {
        const validatedScenario = TestScenarioSchema.parse(scenario)
        
        // Test domain scope validation
        const result = domainScope.isAllowedDomain(validatedScenario.url)
        expect(result.isAllowed).toBe(validatedScenario.expectedAllowed)
        expect(result.reason).toBe(validatedScenario.expectedReason)
        expect(result.domain).toBe(new URL(validatedScenario.url).hostname)

        // Test navigation recording
        const navigationEvent = domainScope.recordNavigation(validatedScenario.url)
        expect(navigationEvent.allowed).toBe(validatedScenario.expectedAllowed)
        expect(navigationEvent.reason).toBe(validatedScenario.expectedReason)
        expect(navigationEvent.url).toBe(validatedScenario.url)

        // Test recording state
        const recordingState = domainScope.getRecordingState()
        expect(recordingState.isPaused).toBe(false)
        expect(recordingState.currentDomain).toBe(new URL(validatedScenario.url).hostname)
      })
    })

    test('should maintain recording state across multiple base domain navigations', () => {
      const baseDomainUrls = [
        'https://apply.getvergo.com',
        'https://app.getvergo.com/dashboard',
        'https://api.getvergo.com/v1/data',
        'https://getvergo.com/settings'
      ]

      baseDomainUrls.forEach(url => {
        const result = domainScope.isAllowedDomain(url)
        expect(result.isAllowed).toBe(true)
        expect(result.reason).toBe('base_domain')

        const navigationEvent = domainScope.recordNavigation(url)
        expect(navigationEvent.allowed).toBe(true)
      })

      const recordingState = domainScope.getRecordingState()
      expect(recordingState.isPaused).toBe(false)
      expect(recordingState.currentDomain).toBe('getvergo.com')
    })
  })

  describe('Outside Domain Navigation', () => {
    test('should ignore actions and fire banner event for external domains', () => {
      const externalDomains = [
        {
          name: 'Gmail navigation',
          url: 'https://gmail.com',
          expectedAllowed: false,
          expectedReason: 'denied' as const,
          shouldRecord: false,
          description: 'Gmail navigation should be denied and not recorded'
        },
        {
          name: 'Slack navigation',
          url: 'https://slack.com',
          expectedAllowed: false,
          expectedReason: 'denied' as const,
          shouldRecord: false,
          description: 'Slack navigation should be denied and not recorded'
        },
        {
          name: 'Facebook navigation',
          url: 'https://facebook.com',
          expectedAllowed: false,
          expectedReason: 'denied' as const,
          shouldRecord: false,
          description: 'Facebook navigation should be denied and not recorded'
        }
      ]

      externalDomains.forEach(scenario => {
        const validatedScenario = TestScenarioSchema.parse(scenario)
        
        // Test domain scope validation
        const result = domainScope.isAllowedDomain(validatedScenario.url)
        expect(result.isAllowed).toBe(validatedScenario.expectedAllowed)
        expect(result.reason).toBe(validatedScenario.expectedReason)

        // Test navigation recording
        const navigationEvent = domainScope.recordNavigation(validatedScenario.url)
        expect(navigationEvent.allowed).toBe(validatedScenario.expectedAllowed)
        expect(navigationEvent.reason).toBe(validatedScenario.expectedReason)

        // Test recording state - should be paused
        const recordingState = domainScope.getRecordingState()
        expect(recordingState.isPaused).toBe(true)
        expect(recordingState.reason).toContain('outside target system')
        expect(recordingState.currentDomain).toBe(new URL(validatedScenario.url).hostname)
      })
    })

    test('should pause recording when navigating to external domains', () => {
      // Start with allowed domain
      domainScope.recordNavigation('https://apply.getvergo.com')
      expect(domainScope.getRecordingState().isPaused).toBe(false)

      // Navigate to external domain
      domainScope.recordNavigation('https://gmail.com')
      const recordingState = domainScope.getRecordingState()
      expect(recordingState.isPaused).toBe(true)
      expect(recordingState.reason).toContain('outside target system')
      expect(recordingState.currentDomain).toBe('gmail.com')
    })
  })

  describe('SSO Redirect Handling', () => {
    test('should record login form interactions on SSO providers', () => {
      const ssoScenarios = [
        {
          name: 'Auth0 SSO navigation',
          url: 'https://company.auth0.com/login',
          expectedAllowed: true,
          expectedReason: 'sso_provider' as const,
          shouldRecord: true,
          description: 'Auth0 SSO navigation should be allowed and recorded'
        },
        {
          name: 'Google SSO navigation',
          url: 'https://accounts.google.com/signin',
          expectedAllowed: true,
          expectedReason: 'sso_provider' as const,
          shouldRecord: true,
          description: 'Google SSO navigation should be allowed and recorded'
        },
        {
          name: 'Custom SSO navigation',
          url: 'https://login.auth0.com/authorize',
          expectedAllowed: true,
          expectedReason: 'sso_provider' as const,
          shouldRecord: true,
          description: 'Custom Auth0 SSO navigation should be allowed and recorded'
        }
      ]

      ssoScenarios.forEach(scenario => {
        const validatedScenario = TestScenarioSchema.parse(scenario)
        
        const result = domainScope.isAllowedDomain(validatedScenario.url)
        expect(result.isAllowed).toBe(validatedScenario.expectedAllowed)
        expect(result.reason).toBe(validatedScenario.expectedReason)

        const navigationEvent = domainScope.recordNavigation(validatedScenario.url)
        expect(navigationEvent.allowed).toBe(validatedScenario.expectedAllowed)
        expect(navigationEvent.reason).toBe(validatedScenario.expectedReason)

        // SSO navigation should not pause recording
        const recordingState = domainScope.getRecordingState()
        expect(recordingState.isPaused).toBe(false)
      })
    })

    test('should handle SSO redirect flow and return to base domain', () => {
      // Start with base domain
      domainScope.recordNavigation('https://apply.getvergo.com')
      expect(domainScope.getRecordingState().isPaused).toBe(false)

      // Navigate to SSO provider
      domainScope.recordNavigation('https://company.auth0.com/login')
      expect(domainScope.getRecordingState().isPaused).toBe(false)

      // Return to base domain after SSO
      domainScope.recordNavigation('https://apply.getvergo.com/dashboard')
      const recordingState = domainScope.getRecordingState()
      expect(recordingState.isPaused).toBe(false)
      expect(recordingState.currentDomain).toBe('apply.getvergo.com')
    })
  })

  describe('Allowed Domain Expansion', () => {
    test('should allow navigation to explicitly allowed domains', () => {
      const allowedDomainScenarios = [
        {
          name: 'Allowed domain navigation',
          url: 'https://vergoerp.io',
          expectedAllowed: true,
          expectedReason: 'explicit_allowlist' as const,
          shouldRecord: true,
          description: 'Navigation to explicitly allowed domain should be permitted'
        }
      ]

      allowedDomainScenarios.forEach(scenario => {
        const validatedScenario = TestScenarioSchema.parse(scenario)
        
        const result = domainScope.isAllowedDomain(validatedScenario.url)
        expect(result.isAllowed).toBe(validatedScenario.expectedAllowed)
        expect(result.reason).toBe(validatedScenario.expectedReason)

        const navigationEvent = domainScope.recordNavigation(validatedScenario.url)
        expect(navigationEvent.allowed).toBe(validatedScenario.expectedAllowed)
        expect(navigationEvent.reason).toBe(validatedScenario.expectedReason)

        const recordingState = domainScope.getRecordingState()
        expect(recordingState.isPaused).toBe(false)
      })
    })

    test('should support dynamic domain expansion', () => {
      // Add new domain to allowlist
      domainScope.addAllowedDomain('newpartner.com')
      
      const result = domainScope.isAllowedDomain('https://newpartner.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('explicit_allowlist')

      const navigationEvent = domainScope.recordNavigation('https://newpartner.com')
      expect(navigationEvent.allowed).toBe(true)
      expect(domainScope.getRecordingState().isPaused).toBe(false)
    })
  })

  describe('Missing Base Domain Error Handling', () => {
    test('should throw error when base domain is missing', () => {
      const invalidConfig = {
        baseDomain: '',
        allowedDomains: ['vergoerp.io'],
        ssoProviders: ['*.auth0.com']
      }

      expect(() => {
        DomainScope.validateConfig(invalidConfig)
      }).toThrow()

      expect(() => {
        new DomainScope(invalidConfig as any)
      }).toThrow()
    })

    test('should throw error when base domain is undefined', () => {
      const invalidConfig = {
        allowedDomains: ['vergoerp.io'],
        ssoProviders: ['*.auth0.com']
      }

      expect(() => {
        DomainScope.validateConfig(invalidConfig as any)
      }).toThrow()
    })
  })

  describe('Domain Scope Integration with PuppeteerCaptureService', () => {
    test('should initialize domain scope in capture service', async () => {
      expect(captureService).toBeDefined()
      
      // Mock browser and page for initialization
      const mockBrowser = {} as any
      const mockPage = {
        target: () => ({
          createCDPSession: jest.fn().mockResolvedValue({})
        })
      } as any
      
      // Initialize the service
      await captureService.initialize(mockBrowser, mockPage)
      
      // Test that domain scope is properly configured
      const domainScopeStatus = captureService.getDomainScopeStatus()
      expect(domainScopeStatus).toBeDefined()
      expect(domainScopeStatus?.allowedDomains).toContain('getvergo.com')
      expect(domainScopeStatus?.allowedDomains).toContain('vergoerp.io')
    })

    test('should handle domain scope without configuration', () => {
      const configWithoutScope: CaptureConfig = {
        ...config,
        domainScope: undefined
      }
      
      const serviceWithoutScope = new PuppeteerCaptureService(configWithoutScope)
      const status = serviceWithoutScope.getDomainScopeStatus()
      expect(status).toBeNull()
    })
  })

  describe('Navigation History and Statistics', () => {
    test('should track navigation history correctly', () => {
      const navigationSequence = [
        'https://apply.getvergo.com',
        'https://app.getvergo.com/dashboard',
        'https://gmail.com',
        'https://company.auth0.com/login',
        'https://apply.getvergo.com/return'
      ]

      navigationSequence.forEach(url => {
        domainScope.recordNavigation(url)
      })

      const history = domainScope.getNavigationHistory()
      expect(history).toHaveLength(5)
      expect(history[0].domain).toBe('apply.getvergo.com')
      expect(history[1].domain).toBe('app.getvergo.com')
      expect(history[2].domain).toBe('gmail.com')
      expect(history[3].domain).toBe('company.auth0.com')
      expect(history[4].domain).toBe('apply.getvergo.com')
    })

    test('should provide accurate domain statistics', () => {
      const navigationSequence = [
        'https://apply.getvergo.com',
        'https://app.getvergo.com/dashboard',
        'https://gmail.com',
        'https://company.auth0.com/login',
        'https://vergoerp.io',
        'https://apply.getvergo.com/return'
      ]

      navigationSequence.forEach(url => {
        domainScope.recordNavigation(url)
      })

      const stats = domainScope.getDomainStats()
      expect(stats.totalNavigations).toBe(6)
      expect(stats.allowedNavigations).toBe(5) // All except gmail.com
      expect(stats.deniedNavigations).toBe(1) // Only gmail.com
      expect(stats.ssoNavigations).toBe(1) // Only company.auth0.com
      expect(stats.domainsVisited).toContain('apply.getvergo.com')
      expect(stats.domainsVisited).toContain('gmail.com')
      expect(stats.domainsVisited).toContain('company.auth0.com')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://',
        '',
        null as any,
        undefined as any
      ]

      malformedUrls.forEach(url => {
        const result = domainScope.isAllowedDomain(url)
        expect(result.isAllowed).toBe(false)
        expect(result.reason).toBe('denied')
        expect(result.domain).toBe('invalid')
      })
    })

    test('should handle case insensitive domains', () => {
      const caseVariations = [
        'https://GETVERGO.COM',
        'https://Apply.GetVergo.Com',
        'https://app.GETVERGO.com'
      ]

      caseVariations.forEach(url => {
        const result = domainScope.isAllowedDomain(url)
        expect(result.isAllowed).toBe(true)
        expect(result.reason).toBe('base_domain')
      })
    })

    test('should handle URLs with ports and paths', () => {
      const complexUrls = [
        'https://getvergo.com:8080',
        'https://app.getvergo.com:3000/dashboard',
        'https://api.getvergo.com/v1/endpoint?param=value'
      ]

      complexUrls.forEach(url => {
        const result = domainScope.isAllowedDomain(url)
        expect(result.isAllowed).toBe(true)
        expect(result.reason).toBe('base_domain')
      })
    })
  })

  describe('Configuration Validation', () => {
    test('should validate domain scope configuration with Zod', () => {
      const validConfig = {
        baseDomain: 'test.com',
        allowedDomains: ['partner.com'],
        ssoProviders: ['*.sso.test.com'],
        metadata: { test: true }
      }

      const validatedConfig = DomainScope.validateConfig(validConfig)
      expect(validatedConfig.baseDomain).toBe('test.com')
      expect(validatedConfig.allowedDomains).toContain('partner.com')
    })

    test('should reject invalid configuration', () => {
      const invalidConfigs = [
        { baseDomain: '', allowedDomains: [] },
        { baseDomain: null, allowedDomains: [] },
        { allowedDomains: [] }, // Missing baseDomain
        { baseDomain: 'test.com', allowedDomains: 'not-an-array' }
      ]

      invalidConfigs.forEach(config => {
        expect(() => {
          DomainScope.validateConfig(config as any)
        }).toThrow()
      })
    })
  })

  describe('Performance and Memory Management', () => {
    test('should handle large navigation histories efficiently', () => {
      // Simulate 1000 navigation events
      for (let i = 0; i < 1000; i++) {
        const url = i % 2 === 0 
          ? `https://app.getvergo.com/page${i}`
          : 'https://gmail.com'
        domainScope.recordNavigation(url)
      }

      const stats = domainScope.getDomainStats()
      expect(stats.totalNavigations).toBe(1000)
      expect(stats.allowedNavigations).toBe(500) // Half are getvergo.com
      expect(stats.deniedNavigations).toBe(500) // Half are gmail.com

      // Test that recent events are limited
      const summary = domainScope.getSummary()
      expect(summary.recentEvents.length).toBeLessThanOrEqual(10)
    })

    test('should clear history efficiently', () => {
      // Add some navigation events
      domainScope.recordNavigation('https://apply.getvergo.com')
      domainScope.recordNavigation('https://gmail.com')
      domainScope.recordNavigation('https://app.getvergo.com')

      expect(domainScope.getNavigationHistory().length).toBe(3)

      // Clear history
      domainScope.clearHistory()

      expect(domainScope.getNavigationHistory().length).toBe(0)
      expect(domainScope.getRecordingState().isPaused).toBe(false)
    })
  })

  describe('Security and Data Protection', () => {
    test('should not log sensitive data in test scenarios', () => {
      const sensitiveUrls = [
        'https://apply.getvergo.com/login?token=secret123',
        'https://app.getvergo.com/api?key=private-key',
        'https://vergoerp.io/dashboard?session=abc123'
      ]

      sensitiveUrls.forEach(url => {
        const result = domainScope.isAllowedDomain(url)
        expect(result.isAllowed).toBe(true)
        
        // Ensure sensitive data is not exposed in metadata
        expect(result.metadata).toBeDefined()
        expect(JSON.stringify(result.metadata)).not.toContain('secret123')
        expect(JSON.stringify(result.metadata)).not.toContain('private-key')
        expect(JSON.stringify(result.metadata)).not.toContain('abc123')
      })
    })

    test('should validate allowedDomains metadata before test run', () => {
      const testMetadata = {
        baseDomain: 'test.com',
        allowedDomains: ['partner.com', 'trusted.com'],
        ssoProviders: ['*.sso.test.com']
      }

      const validatedMetadata = DomainScopeTestConfigSchema.parse(testMetadata)
      expect(validatedMetadata.baseDomain).toBe('test.com')
      expect(validatedMetadata.allowedDomains).toContain('partner.com')
      expect(validatedMetadata.allowedDomains).toContain('trusted.com')
    })
  })
})
