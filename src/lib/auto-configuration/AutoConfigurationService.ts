/**
 * AutoConfigurationService
 * 
 * Intelligently detects optimal settings for Puppeteer workflows
 * based on website analysis and user system capabilities
 */

export interface SystemInfo {
  os: string
  browser: string
  screenSize: { width: number; height: number }
  performance: 'low' | 'medium' | 'high'
  networkSpeed: 'slow' | 'medium' | 'fast'
  memory: number | 'unknown'
}

export interface WebsiteAnalysis {
  type: 'ecommerce' | 'saas' | 'blog' | 'spa' | 'corporate' | 'unknown'
  framework: 'React' | 'Vue' | 'Angular' | 'Next.js' | 'Nuxt' | 'Svelte' | 'vanilla'
  complexity: 'low' | 'medium' | 'high'
  hasAuth: boolean
  authProviders: string[]
  hasSSO: boolean
  isSlow: boolean
  hasAds: boolean
  subdomains: string[]
  cdnDomains: string[]
  adsDomains: string[]
}

export interface AutoConfiguration {
  performance: {
    captureFrequency: number
    maxScreenshots: number
    timeout: number
    viewport: { width: number; height: number }
    headless: boolean
    browserArgs: string[]
  }
  selectors: {
    strategy: 'data-testid' | 'data-cy' | 'id' | 'class' | 'hybrid'
    fallbackSelectors: string[]
    customSelectors: string[]
  }
  domainScope: {
    allowedDomains: string[]
    blockedDomains: string[]
    navigationPatterns: string[]
    ssoWhitelist: string[]
  }
  authentication: {
    requiresLogin: boolean
    loginConfig: any
    ssoProviders: string[]
    authStrategy: string
  }
}

export class AutoConfigurationService {
  /**
   * Generate optimal configuration based on URL and user system
   */
  async generateOptimalConfig(url: string, userSystem?: SystemInfo): Promise<AutoConfiguration> {
    const systemInfo = userSystem || await this.detectUserSystem()
    const websiteAnalysis = await this.analyzeWebsite(url)
    
    const [
      performance,
      selectors,
      domainScope,
      authentication
    ] = await Promise.all([
      this.detectPerformanceSettings(url, websiteAnalysis, systemInfo),
      this.detectSelectorStrategy(url, websiteAnalysis),
      this.detectDomainScope(url, websiteAnalysis),
      this.detectAuthRequirements(url, websiteAnalysis)
    ])
    
    return {
      performance,
      selectors,
      domainScope,
      authentication
    }
  }

  /**
   * Detect user's system capabilities
   */
  private async detectUserSystem(): Promise<SystemInfo> {
    // This would be called from the frontend with actual browser info
    return {
      os: 'macOS', // Would be detected from navigator.platform
      browser: 'Chrome', // Would be detected from navigator.userAgent
      screenSize: { width: 1920, height: 1080 }, // Would be detected from screen.width/height
      performance: 'high', // Would be detected from performance.now() and memory
      networkSpeed: 'fast', // Would be detected from connection speed
      memory: 8 // Would be detected from navigator.deviceMemory
    }
  }

  /**
   * Analyze website structure and characteristics
   */
  private async analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
    // In a real implementation, this would use Puppeteer to analyze the site
    // For now, we'll use intelligent heuristics based on URL patterns
    
    const domain = new URL(url).hostname
    const isEcommerce = this.detectEcommerce(domain)
    const isSaaS = this.detectSaaS(domain)
    const isBlog = this.detectBlog(domain)
    const isSPA = this.detectSPA(domain)
    
    return {
      type: isEcommerce ? 'ecommerce' : 
            isSaaS ? 'saas' : 
            isBlog ? 'blog' : 
            isSPA ? 'spa' : 'corporate',
      framework: this.detectFramework(domain),
      complexity: this.detectComplexity(domain),
      hasAuth: this.detectAuth(domain),
      authProviders: this.detectAuthProviders(domain),
      hasSSO: this.detectSSO(domain),
      isSlow: this.detectSlowSite(domain),
      hasAds: this.detectAds(domain),
      subdomains: this.detectSubdomains(domain),
      cdnDomains: this.detectCDNDomains(domain),
      adsDomains: this.detectAdsDomains(domain)
    }
  }

  /**
   * Auto-detect optimal performance settings
   */
  private async detectPerformanceSettings(
    url: string, 
    analysis: WebsiteAnalysis, 
    system: SystemInfo
  ): Promise<AutoConfiguration['performance']> {
    // Base settings by website type
    const typeSettings = {
      ecommerce: { captureFrequency: 500, maxScreenshots: 100, timeout: 60000 },
      saas: { captureFrequency: 1000, maxScreenshots: 50, timeout: 45000 },
      blog: { captureFrequency: 2000, maxScreenshots: 25, timeout: 30000 },
      spa: { captureFrequency: 1500, maxScreenshots: 75, timeout: 45000 },
      corporate: { captureFrequency: 1000, maxScreenshots: 40, timeout: 30000 },
      unknown: { captureFrequency: 1000, maxScreenshots: 50, timeout: 30000 }
    }

    const baseSettings = typeSettings[analysis.type]
    
    // Adjust based on system performance
    const performanceMultiplier = system.performance === 'low' ? 0.7 : 
                                 system.performance === 'high' ? 1.3 : 1.0
    
    // Adjust based on network speed
    const networkMultiplier = system.networkSpeed === 'slow' ? 0.8 : 
                             system.networkSpeed === 'fast' ? 1.2 : 1.0
    
    // Adjust based on site complexity
    const complexityMultiplier = analysis.complexity === 'low' ? 1.2 : 
                                 analysis.complexity === 'high' ? 0.8 : 1.0

    return {
      captureFrequency: Math.round(baseSettings.captureFrequency * performanceMultiplier * networkMultiplier),
      maxScreenshots: Math.round(baseSettings.maxScreenshots * performanceMultiplier),
      timeout: Math.round(baseSettings.timeout * complexityMultiplier),
      viewport: this.getOptimalViewport(system),
      headless: this.shouldUseHeadless(system, analysis),
      browserArgs: this.getOptimalBrowserArgs(system, analysis)
    }
  }

  /**
   * Auto-detect best selector strategy
   */
  private async detectSelectorStrategy(
    url: string, 
    analysis: WebsiteAnalysis
  ): Promise<AutoConfiguration['selectors']> {
    const strategy = analysis.framework === 'React' ? 'data-testid' :
                    analysis.framework === 'Vue' ? 'data-cy' :
                    analysis.framework === 'Angular' ? 'id' :
                    'hybrid'

    return {
      strategy,
      fallbackSelectors: this.generateFallbackSelectors(analysis),
      customSelectors: this.detectCustomPatterns(analysis)
    }
  }

  /**
   * Auto-detect domain scope and navigation patterns
   */
  private async detectDomainScope(
    url: string, 
    analysis: WebsiteAnalysis
  ): Promise<AutoConfiguration['domainScope']> {
    const baseDomain = new URL(url).hostname
    const allowedDomains = [
      baseDomain,
      ...analysis.subdomains,
      ...analysis.cdnDomains
    ]

    return {
      allowedDomains,
      blockedDomains: analysis.adsDomains,
      navigationPatterns: this.detectNavigationPatterns(analysis),
      ssoWhitelist: analysis.authProviders
    }
  }

  /**
   * Auto-detect authentication requirements
   */
  private async detectAuthRequirements(
    url: string, 
    analysis: WebsiteAnalysis
  ): Promise<AutoConfiguration['authentication']> {
    return {
      requiresLogin: analysis.hasAuth,
      loginConfig: analysis.hasAuth ? {
        providers: analysis.authProviders,
        ssoEnabled: analysis.hasSSO
      } : null,
      ssoProviders: analysis.authProviders,
      authStrategy: this.getAuthStrategy(analysis)
    }
  }

  // Helper methods for detection
  private detectEcommerce(domain: string): boolean {
    const ecommerceKeywords = ['shop', 'store', 'cart', 'checkout', 'buy', 'sell', 'marketplace']
    return ecommerceKeywords.some(keyword => domain.includes(keyword))
  }

  private detectSaaS(domain: string): boolean {
    const saasKeywords = ['app', 'dashboard', 'admin', 'portal', 'platform', 'cloud']
    return saasKeywords.some(keyword => domain.includes(keyword))
  }

  private detectBlog(domain: string): boolean {
    const blogKeywords = ['blog', 'news', 'article', 'post', 'medium', 'substack']
    return blogKeywords.some(keyword => domain.includes(keyword))
  }

  private detectSPA(domain: string): boolean {
    // SPAs often have specific patterns
    return domain.includes('app.') || domain.includes('dashboard.')
  }

  private detectFramework(domain: string): WebsiteAnalysis['framework'] {
    // This would be detected by analyzing the actual website
    // For now, use heuristics
    if (domain.includes('react') || domain.includes('next')) return 'React'
    if (domain.includes('vue') || domain.includes('nuxt')) return 'Vue'
    if (domain.includes('angular')) return 'Angular'
    return 'vanilla'
  }

  private detectComplexity(domain: string): WebsiteAnalysis['complexity'] {
    // Heuristic based on domain patterns
    if (domain.includes('app') || domain.includes('dashboard')) return 'high'
    if (domain.includes('blog') || domain.includes('news')) return 'low'
    return 'medium'
  }

  private detectAuth(domain: string): boolean {
    // Would be detected by analyzing the actual website
    return domain.includes('login') || domain.includes('auth') || domain.includes('signin')
  }

  private detectAuthProviders(domain: string): string[] {
    // Would be detected by analyzing the actual website
    return ['google', 'microsoft', 'github'] // Common providers
  }

  private detectSSO(domain: string): boolean {
    return domain.includes('sso') || domain.includes('saml') || domain.includes('oauth')
  }

  private detectSlowSite(domain: string): boolean {
    // Would be detected by actual performance testing
    return false
  }

  private detectAds(domain: string): boolean {
    return domain.includes('ads') || domain.includes('advertising')
  }

  private detectSubdomains(domain: string): string[] {
    return [`www.${domain}`, `app.${domain}`, `api.${domain}`]
  }

  private detectCDNDomains(domain: string): string[] {
    return ['cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com']
  }

  private detectAdsDomains(domain: string): string[] {
    return ['googleads.com', 'doubleclick.net', 'googlesyndication.com']
  }

  private getOptimalViewport(system: SystemInfo): { width: number; height: number } {
    // Use user's screen size but cap at reasonable limits
    return {
      width: Math.min(system.screenSize.width, 1920),
      height: Math.min(system.screenSize.height, 1080)
    }
  }

  private shouldUseHeadless(system: SystemInfo, analysis: WebsiteAnalysis): boolean {
    // Use headless for high-performance systems and complex sites
    return system.performance === 'high' && analysis.complexity === 'high'
  }

  private getOptimalBrowserArgs(system: SystemInfo, analysis: WebsiteAnalysis): string[] {
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]

    if (system.performance === 'low') {
      baseArgs.push('--disable-gpu', '--disable-software-rasterizer')
    }

    if (analysis.hasAds) {
      baseArgs.push('--disable-background-networking')
    }

    return baseArgs
  }

  private generateFallbackSelectors(analysis: WebsiteAnalysis): string[] {
    const selectors = ['id', 'class', 'data-testid', 'data-cy']
    
    if (analysis.framework === 'React') {
      selectors.unshift('data-testid', 'data-test')
    } else if (analysis.framework === 'Vue') {
      selectors.unshift('data-cy', 'data-test')
    }
    
    return selectors
  }

  private detectCustomPatterns(analysis: WebsiteAnalysis): string[] {
    // Would detect custom selector patterns from the actual website
    return []
  }

  private detectNavigationPatterns(analysis: WebsiteAnalysis): string[] {
    return ['click', 'hover', 'scroll', 'type', 'select']
  }

  private getAuthStrategy(analysis: WebsiteAnalysis): string {
    if (analysis.hasSSO) return 'sso'
    if (analysis.authProviders.length > 1) return 'multi-provider'
    return 'single-provider'
  }
}

