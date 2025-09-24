/**
 * DomainScope Service
 * Handles domain-scoped recording with flexible allowlist management
 * Supports SSO flows, redirects, and explicit domain allowlists
 */

import { z } from 'zod'

// Domain scope configuration schema
export const DomainScopeConfigSchema = z.object({
  baseDomain: z.string().min(1, 'Base domain is required'),
  allowedDomains: z.array(z.string()).optional().default([]),
  ssoProviders: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional()
})

// Navigation event schema
export const NavigationEventSchema = z.object({
  url: z.string().url(),
  domain: z.string(),
  allowed: z.boolean(),
  reason: z.enum(['base_domain', 'subdomain', 'sso_provider', 'explicit_allowlist', 'denied']),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.any()).optional()
})

// Domain scope result schema
export const DomainScopeResultSchema = z.object({
  isAllowed: z.boolean(),
  reason: z.enum(['base_domain', 'subdomain', 'sso_provider', 'explicit_allowlist', 'denied']),
  domain: z.string(),
  url: z.string(),
  metadata: z.record(z.string(), z.any()).optional()
})

export type DomainScopeConfig = z.infer<typeof DomainScopeConfigSchema>
export type NavigationEvent = z.infer<typeof NavigationEventSchema>
export type DomainScopeResult = z.infer<typeof DomainScopeResultSchema>

// Predefined SSO providers
const DEFAULT_SSO_PROVIDERS = [
  '*.auth0.com',
  '*.okta.com', 
  '*.microsoftonline.com',
  'accounts.google.com',
  'login.salesforce.com',
  '*.sso.company.com',
  'auth.company.com'
]

export class DomainScope {
  private config: DomainScopeConfig
  private navigationEvents: NavigationEvent[] = []
  private isRecordingPaused = false
  private pauseReason: string | null = null

  constructor(config: DomainScopeConfig) {
    this.config = DomainScopeConfigSchema.parse(config)
    
    // Add default SSO providers if none specified
    if (this.config.ssoProviders.length === 0) {
      this.config.ssoProviders = DEFAULT_SSO_PROVIDERS
    }
  }

  /**
   * Check if a domain is allowed for recording
   */
  isAllowedDomain(url: string): DomainScopeResult {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname
      const fullUrl = urlObj.href

      // Check base domain and subdomains
      if (this.isBaseDomainOrSubdomain(domain)) {
        return {
          isAllowed: true,
          reason: 'base_domain',
          domain,
          url: fullUrl,
          metadata: {
            baseDomain: this.config.baseDomain,
            isSubdomain: domain !== this.config.baseDomain
          }
        }
      }

      // Check explicit allowlist
      if (this.isInExplicitAllowlist(domain)) {
        return {
          isAllowed: true,
          reason: 'explicit_allowlist',
          domain,
          url: fullUrl,
          metadata: {
            allowedDomains: this.config.allowedDomains
          }
        }
      }

      // Check SSO providers
      if (this.isSSOProvider(domain)) {
        return {
          isAllowed: true,
          reason: 'sso_provider',
          domain,
          url: fullUrl,
          metadata: {
            ssoProviders: this.config.ssoProviders
          }
        }
      }

      // Domain not allowed
      return {
        isAllowed: false,
        reason: 'denied',
        domain,
        url: fullUrl,
        metadata: {
          baseDomain: this.config.baseDomain,
          allowedDomains: this.config.allowedDomains,
          ssoProviders: this.config.ssoProviders
        }
      }

    } catch (error) {
      // Invalid URL - not allowed
      return {
        isAllowed: false,
        reason: 'denied',
        domain: 'invalid',
        url,
        metadata: {
          error: 'Invalid URL format'
        }
      }
    }
  }

  /**
   * Check if domain is base domain or subdomain
   */
  private isBaseDomainOrSubdomain(domain: string): boolean {
    const baseDomain = this.config.baseDomain.toLowerCase()
    const testDomain = domain.toLowerCase()

    // Exact match
    if (testDomain === baseDomain) {
      return true
    }

    // Subdomain match (e.g., app.getvergo.com matches getvergo.com)
    if (testDomain.endsWith('.' + baseDomain)) {
      return true
    }

    return false
  }

  /**
   * Check if domain is in explicit allowlist
   */
  private isInExplicitAllowlist(domain: string): boolean {
    return this.config.allowedDomains.some(allowedDomain => {
      return this.matchesDomainPattern(domain, allowedDomain)
    })
  }

  /**
   * Check if domain is a known SSO provider
   */
  private isSSOProvider(domain: string): boolean {
    return this.config.ssoProviders.some(ssoProvider => {
      return this.matchesDomainPattern(domain, ssoProvider)
    })
  }

  /**
   * Match domain against pattern (supports wildcards)
   */
  private matchesDomainPattern(domain: string, pattern: string): boolean {
    const testDomain = domain.toLowerCase()
    const testPattern = pattern.toLowerCase()

    // Exact match
    if (testDomain === testPattern) {
      return true
    }

    // Wildcard match (e.g., *.auth0.com matches login.auth0.com)
    if (testPattern.startsWith('*.')) {
      const basePattern = testPattern.substring(2)
      return testDomain.endsWith('.' + basePattern) || testDomain === basePattern
    }

    return false
  }

  /**
   * Record navigation event
   */
  recordNavigation(url: string): NavigationEvent {
    const result = this.isAllowedDomain(url)
    
    const event: NavigationEvent = {
      url,
      domain: result.domain,
      allowed: result.isAllowed,
      reason: result.reason,
      timestamp: Date.now(),
      metadata: result.metadata
    }

    this.navigationEvents.push(event)

    // Update recording pause state
    this.isRecordingPaused = !result.isAllowed
    this.pauseReason = result.isAllowed ? null : `Recording paused: outside target system (${result.domain})`

    return event
  }

  /**
   * Get current recording state
   */
  getRecordingState(): {
    isPaused: boolean
    reason: string | null
    currentDomain: string | null
    allowedDomains: string[]
  } {
    const lastEvent = this.navigationEvents[this.navigationEvents.length - 1]
    
    return {
      isPaused: this.isRecordingPaused,
      reason: this.pauseReason,
      currentDomain: lastEvent?.domain || null,
      allowedDomains: [
        this.config.baseDomain,
        ...this.config.allowedDomains,
        ...this.config.ssoProviders
      ]
    }
  }

  /**
   * Get navigation history
   */
  getNavigationHistory(): NavigationEvent[] {
    return [...this.navigationEvents]
  }

  /**
   * Get domain statistics
   */
  getDomainStats(): {
    totalNavigations: number
    allowedNavigations: number
    deniedNavigations: number
    domainsVisited: string[]
    ssoNavigations: number
  } {
    const allowed = this.navigationEvents.filter(e => e.allowed)
    const denied = this.navigationEvents.filter(e => !e.allowed)
    const sso = this.navigationEvents.filter(e => e.reason === 'sso_provider')
    const domains = [...new Set(this.navigationEvents.map(e => e.domain))]

    return {
      totalNavigations: this.navigationEvents.length,
      allowedNavigations: allowed.length,
      deniedNavigations: denied.length,
      domainsVisited: domains,
      ssoNavigations: sso.length
    }
  }

  /**
   * Update configuration (for dynamic allowlist expansion)
   */
  updateConfig(updates: Partial<DomainScopeConfig>): void {
    const newConfig = { ...this.config, ...updates }
    this.config = DomainScopeConfigSchema.parse(newConfig)
  }

  /**
   * Add domain to allowlist dynamically
   */
  addAllowedDomain(domain: string): void {
    if (!this.config.allowedDomains.includes(domain)) {
      this.config.allowedDomains.push(domain)
    }
  }

  /**
   * Remove domain from allowlist
   */
  removeAllowedDomain(domain: string): void {
    this.config.allowedDomains = this.config.allowedDomains.filter(d => d !== domain)
  }

  /**
   * Clear navigation history
   */
  clearHistory(): void {
    this.navigationEvents = []
    this.isRecordingPaused = false
    this.pauseReason = null
  }

  /**
   * Get configuration
   */
  getConfig(): DomainScopeConfig {
    return { ...this.config }
  }

  /**
   * Validate domain scope configuration
   */
  static validateConfig(config: unknown): DomainScopeConfig {
    return DomainScopeConfigSchema.parse(config)
  }

  /**
   * Create domain scope from login metadata
   */
  static fromLoginMetadata(loginMetadata: Record<string, any>): DomainScope {
    const baseDomain = loginMetadata.baseDomain
    if (!baseDomain) {
      throw new Error('Base domain is required in login metadata')
    }

    const config: DomainScopeConfig = {
      baseDomain,
      allowedDomains: loginMetadata.allowedDomains || [],
      ssoProviders: loginMetadata.ssoProviders || DEFAULT_SSO_PROVIDERS,
      metadata: loginMetadata
    }

    return new DomainScope(config)
  }

  /**
   * Get domain scope summary for debugging
   */
  getSummary(): {
    config: DomainScopeConfig
    stats: ReturnType<DomainScope['getDomainStats']>
    state: ReturnType<DomainScope['getRecordingState']>
    recentEvents: NavigationEvent[]
  } {
    return {
      config: this.getConfig(),
      stats: this.getDomainStats(),
      state: this.getRecordingState(),
      recentEvents: this.navigationEvents.slice(-10) // Last 10 events
    }
  }
}
