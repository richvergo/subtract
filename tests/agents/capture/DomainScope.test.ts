/**
 * DomainScope Service Tests
 * Comprehensive test suite for domain-scoped recording functionality
 */

import { DomainScope, DomainScopeConfig, NavigationEvent } from '@/lib/agents/capture/DomainScope'

describe('DomainScope Service', () => {
  let domainScope: DomainScope
  let config: DomainScopeConfig

  beforeEach(() => {
    config = {
      baseDomain: 'getvergo.com',
      allowedDomains: ['vergoerp.io'],
      ssoProviders: ['*.auth0.com', 'accounts.google.com'],
      metadata: {}
    }
    domainScope = new DomainScope(config)
  })

  describe('Domain Validation', () => {
    test('should allow base domain', () => {
      const result = domainScope.isAllowedDomain('https://getvergo.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('base_domain')
      expect(result.domain).toBe('getvergo.com')
    })

    test('should allow subdomains of base domain', () => {
      const result = domainScope.isAllowedDomain('https://app.getvergo.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('base_domain')
      expect(result.domain).toBe('app.getvergo.com')
    })

    test('should allow multiple subdomains', () => {
      const result = domainScope.isAllowedDomain('https://api.v2.getvergo.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('base_domain')
      expect(result.domain).toBe('api.v2.getvergo.com')
    })

    test('should allow domains in explicit allowlist', () => {
      const result = domainScope.isAllowedDomain('https://vergoerp.io')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('explicit_allowlist')
      expect(result.domain).toBe('vergoerp.io')
    })

    test('should allow SSO providers', () => {
      const result = domainScope.isAllowedDomain('https://login.auth0.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('sso_provider')
      expect(result.domain).toBe('login.auth0.com')
    })

    test('should allow Google SSO', () => {
      const result = domainScope.isAllowedDomain('https://accounts.google.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('sso_provider')
      expect(result.domain).toBe('accounts.google.com')
    })

    test('should deny external domains', () => {
      const result = domainScope.isAllowedDomain('https://gmail.com')
      expect(result.isAllowed).toBe(false)
      expect(result.reason).toBe('denied')
      expect(result.domain).toBe('gmail.com')
    })

    test('should deny unrelated domains', () => {
      const result = domainScope.isAllowedDomain('https://facebook.com')
      expect(result.isAllowed).toBe(false)
      expect(result.reason).toBe('denied')
      expect(result.domain).toBe('facebook.com')
    })

    test('should handle invalid URLs gracefully', () => {
      const result = domainScope.isAllowedDomain('invalid-url')
      expect(result.isAllowed).toBe(false)
      expect(result.reason).toBe('denied')
      expect(result.domain).toBe('invalid')
    })
  })

  describe('Navigation Recording', () => {
    test('should record allowed navigation', () => {
      const event = domainScope.recordNavigation('https://getvergo.com')
      
      expect(event.allowed).toBe(true)
      expect(event.reason).toBe('base_domain')
      expect(event.domain).toBe('getvergo.com')
      expect(event.url).toBe('https://getvergo.com')
      expect(event.timestamp).toBeGreaterThan(0)
    })

    test('should record denied navigation', () => {
      const event = domainScope.recordNavigation('https://gmail.com')
      
      expect(event.allowed).toBe(false)
      expect(event.reason).toBe('denied')
      expect(event.domain).toBe('gmail.com')
      expect(event.url).toBe('https://gmail.com')
    })

    test('should update recording state on denied navigation', () => {
      domainScope.recordNavigation('https://gmail.com')
      const state = domainScope.getRecordingState()
      
      expect(state.isPaused).toBe(true)
      expect(state.reason).toBe('Recording paused: outside target system (gmail.com)')
      expect(state.currentDomain).toBe('gmail.com')
    })

    test('should resume recording on allowed navigation', () => {
      // First navigate to disallowed domain
      domainScope.recordNavigation('https://gmail.com')
      expect(domainScope.getRecordingState().isPaused).toBe(true)
      
      // Then navigate back to allowed domain
      domainScope.recordNavigation('https://getvergo.com')
      expect(domainScope.getRecordingState().isPaused).toBe(false)
    })
  })

  describe('Navigation History', () => {
    test('should track navigation history', () => {
      domainScope.recordNavigation('https://getvergo.com')
      domainScope.recordNavigation('https://app.getvergo.com')
      domainScope.recordNavigation('https://gmail.com')
      
      const history = domainScope.getNavigationHistory()
      expect(history).toHaveLength(3)
      expect(history[0].domain).toBe('getvergo.com')
      expect(history[1].domain).toBe('app.getvergo.com')
      expect(history[2].domain).toBe('gmail.com')
    })

    test('should provide domain statistics', () => {
      domainScope.recordNavigation('https://getvergo.com')
      domainScope.recordNavigation('https://app.getvergo.com')
      domainScope.recordNavigation('https://gmail.com')
      domainScope.recordNavigation('https://login.auth0.com')
      
      const stats = domainScope.getDomainStats()
      expect(stats.totalNavigations).toBe(4)
      expect(stats.allowedNavigations).toBe(3)
      expect(stats.deniedNavigations).toBe(1)
      expect(stats.domainsVisited).toContain('getvergo.com')
      expect(stats.domainsVisited).toContain('gmail.com')
      expect(stats.ssoNavigations).toBe(1)
    })
  })

  describe('Configuration Updates', () => {
    test('should update configuration dynamically', () => {
      domainScope.updateConfig({
        allowedDomains: ['newdomain.com']
      })
      
      const result = domainScope.isAllowedDomain('https://newdomain.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('explicit_allowlist')
    })

    test('should add domain to allowlist', () => {
      domainScope.addAllowedDomain('newdomain.com')
      
      const result = domainScope.isAllowedDomain('https://newdomain.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('explicit_allowlist')
    })

    test('should remove domain from allowlist', () => {
      domainScope.removeAllowedDomain('vergoerp.io')
      
      const result = domainScope.isAllowedDomain('https://vergoerp.io')
      expect(result.isAllowed).toBe(false)
      expect(result.reason).toBe('denied')
    })
  })

  describe('SSO Provider Handling', () => {
    test('should handle wildcard SSO providers', () => {
      const auth0Result = domainScope.isAllowedDomain('https://company.auth0.com')
      expect(auth0Result.isAllowed).toBe(true)
      expect(auth0Result.reason).toBe('sso_provider')
      
      const oktaResult = domainScope.isAllowedDomain('https://company.okta.com')
      expect(oktaResult.isAllowed).toBe(true)
      expect(oktaResult.reason).toBe('sso_provider')
    })

    test('should handle exact SSO provider matches', () => {
      const googleResult = domainScope.isAllowedDomain('https://accounts.google.com')
      expect(googleResult.isAllowed).toBe(true)
      expect(googleResult.reason).toBe('sso_provider')
    })
  })

  describe('Domain Pattern Matching', () => {
    test('should handle complex subdomain patterns', () => {
      const result = domainScope.isAllowedDomain('https://api.v2.staging.getvergo.com')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('base_domain')
    })

    test('should handle different protocols', () => {
      const httpResult = domainScope.isAllowedDomain('http://getvergo.com')
      const httpsResult = domainScope.isAllowedDomain('https://getvergo.com')
      
      expect(httpResult.isAllowed).toBe(true)
      expect(httpsResult.isAllowed).toBe(true)
    })

    test('should handle URLs with paths and parameters', () => {
      const result = domainScope.isAllowedDomain('https://getvergo.com/path?param=value')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('base_domain')
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed URLs', () => {
      const result = domainScope.isAllowedDomain('not-a-url')
      expect(result.isAllowed).toBe(false)
      expect(result.reason).toBe('denied')
      expect(result.domain).toBe('invalid')
    })

    test('should handle empty URLs', () => {
      const result = domainScope.isAllowedDomain('')
      expect(result.isAllowed).toBe(false)
      expect(result.reason).toBe('denied')
    })

    test('should handle null/undefined URLs', () => {
      const result = domainScope.isAllowedDomain(null as any)
      expect(result.isAllowed).toBe(false)
      expect(result.reason).toBe('denied')
    })
  })

  describe('State Management', () => {
    test('should clear navigation history', () => {
      domainScope.recordNavigation('https://getvergo.com')
      domainScope.recordNavigation('https://gmail.com')
      
      expect(domainScope.getNavigationHistory()).toHaveLength(2)
      
      domainScope.clearHistory()
      
      expect(domainScope.getNavigationHistory()).toHaveLength(0)
      expect(domainScope.getRecordingState().isPaused).toBe(false)
    })

    test('should provide comprehensive summary', () => {
      domainScope.recordNavigation('https://getvergo.com')
      domainScope.recordNavigation('https://gmail.com')
      
      const summary = domainScope.getSummary()
      
      expect(summary.config).toBeDefined()
      expect(summary.stats).toBeDefined()
      expect(summary.state).toBeDefined()
      expect(summary.recentEvents).toHaveLength(2)
    })
  })

  describe('Factory Methods', () => {
    test('should create from login metadata', () => {
      const loginMetadata = {
        baseDomain: 'company.com',
        allowedDomains: ['partner.com'],
        ssoProviders: ['*.sso.company.com']
      }
      
      const scope = DomainScope.fromLoginMetadata(loginMetadata)
      expect(scope).toBeInstanceOf(DomainScope)
      
      const result = scope.isAllowedDomain('https://company.com')
      expect(result.isAllowed).toBe(true)
    })

    test('should throw error for missing base domain', () => {
      const loginMetadata = {
        allowedDomains: ['partner.com']
      }
      
      expect(() => {
        DomainScope.fromLoginMetadata(loginMetadata)
      }).toThrow('Base domain is required in login metadata')
    })

    test('should validate configuration', () => {
      const validConfig = {
        baseDomain: 'test.com',
        allowedDomains: ['partner.com']
      }
      
      const result = DomainScope.validateConfig(validConfig)
      expect(result.baseDomain).toBe('test.com')
    })

    test('should throw error for invalid configuration', () => {
      const invalidConfig = {
        baseDomain: '', // Invalid: empty string
        allowedDomains: ['partner.com']
      }
      
      expect(() => {
        DomainScope.validateConfig(invalidConfig)
      }).toThrow()
    })
  })

  describe('Edge Cases', () => {
    test('should handle case insensitive domains', () => {
      const result = domainScope.isAllowedDomain('https://GETVERGO.COM')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('base_domain')
    })

    test('should handle domains with trailing dots', () => {
      const result = domainScope.isAllowedDomain('https://getvergo.com.')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('base_domain')
    })

    test('should handle international domains', () => {
      const result = domainScope.isAllowedDomain('https://getvergo.com')
      expect(result.isAllowed).toBe(true)
    })

    test('should handle ports in URLs', () => {
      const result = domainScope.isAllowedDomain('https://getvergo.com:8080')
      expect(result.isAllowed).toBe(true)
      expect(result.reason).toBe('base_domain')
    })
  })
})
