/**
 * SystemDetectionService
 * 
 * Detects user's system capabilities and optimizes settings accordingly
 */

export interface SystemCapabilities {
  os: string
  browser: string
  browserVersion: string
  screenSize: { width: number; height: number }
  devicePixelRatio: number
  performance: 'low' | 'medium' | 'high'
  networkSpeed: 'slow' | 'medium' | 'fast'
  memory: number | 'unknown'
  cpuCores: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  connectionType: string
  timezone: string
  language: string
}

export class SystemDetectionService {
  /**
   * Detect all system capabilities from browser environment
   */
  async detectSystemCapabilities(): Promise<SystemCapabilities> {
    const [
      os,
      browser,
      browserVersion,
      screenSize,
      devicePixelRatio,
      performance,
      networkSpeed,
      memory,
      cpuCores,
      deviceType,
      connectionType,
      timezone,
      language
    ] = await Promise.all([
      this.detectOS(),
      this.detectBrowser(),
      this.detectBrowserVersion(),
      this.detectScreenSize(),
      this.detectDevicePixelRatio(),
      this.detectPerformance(),
      this.detectNetworkSpeed(),
      this.detectMemory(),
      this.detectCPUCores(),
      this.detectDeviceType(),
      this.detectConnectionType(),
      this.detectTimezone(),
      this.detectLanguage()
    ])

    return {
      os,
      browser,
      browserVersion,
      screenSize,
      devicePixelRatio,
      performance,
      networkSpeed,
      memory,
      cpuCores,
      ...deviceType,
      connectionType,
      timezone,
      language
    }
  }

  /**
   * Get optimal Puppeteer settings based on system capabilities
   */
  getOptimalPuppeteerSettings(capabilities: SystemCapabilities) {
    return {
      headless: this.shouldUseHeadless(capabilities),
      viewport: this.getOptimalViewport(capabilities),
      timeout: this.getOptimalTimeout(capabilities),
      browserArgs: this.getOptimalBrowserArgs(capabilities),
      captureFrequency: this.getOptimalCaptureFrequency(capabilities),
      maxScreenshots: this.getOptimalMaxScreenshots(capabilities)
    }
  }

  private detectOS(): string {
    const userAgent = navigator.userAgent
    
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    
    return 'Unknown'
  }

  private detectBrowser(): string {
    const userAgent = navigator.userAgent
    
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    if (userAgent.includes('Opera')) return 'Opera'
    
    return 'Unknown'
  }

  private detectBrowserVersion(): string {
    const userAgent = navigator.userAgent
    
    // Extract version numbers (simplified)
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/)
    if (chromeMatch) return chromeMatch[1]
    
    const firefoxMatch = userAgent.match(/Firefox\/(\d+)/)
    if (firefoxMatch) return firefoxMatch[1]
    
    return 'Unknown'
  }

  private detectScreenSize(): { width: number; height: number } {
    return {
      width: screen.width,
      height: screen.height
    }
  }

  private detectDevicePixelRatio(): number {
    return window.devicePixelRatio || 1
  }

  private async detectPerformance(): Promise<'low' | 'medium' | 'high'> {
    // Use performance.now() to measure system performance
    const start = performance.now()
    
    // Perform a simple computation test
    let result = 0
    for (let i = 0; i < 1000000; i++) {
      result += Math.random()
    }
    
    const end = performance.now()
    const duration = end - start
    
    // Classify performance based on computation time
    if (duration < 10) return 'high'
    if (duration < 50) return 'medium'
    return 'low'
  }

  private async detectNetworkSpeed(): Promise<'slow' | 'medium' | 'fast'> {
    // Use navigator.connection if available
    const connection = (navigator as any).connection
    
    if (connection) {
      const effectiveType = connection.effectiveType
      if (effectiveType === '4g' || effectiveType === '5g') return 'fast'
      if (effectiveType === '3g') return 'medium'
      return 'slow'
    }
    
    // Fallback: measure network speed with a simple request
    try {
      const start = performance.now()
      await fetch('/api/health', { cache: 'no-cache' })
      const end = performance.now()
      const duration = end - start
      
      if (duration < 100) return 'fast'
      if (duration < 500) return 'medium'
      return 'slow'
    } catch {
      return 'medium' // Default fallback
    }
  }

  private detectMemory(): number | 'unknown' {
    // Use navigator.deviceMemory if available
    const deviceMemory = (navigator as any).deviceMemory
    if (deviceMemory) return deviceMemory
    
    // Fallback: estimate based on other factors
    return 'unknown'
  }

  private detectCPUCores(): number {
    return navigator.hardwareConcurrency || 4 // Default to 4 cores
  }

  private detectDeviceType(): { isMobile: boolean; isTablet: boolean; isDesktop: boolean } {
    const userAgent = navigator.userAgent
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?=.*Mobile)/i.test(userAgent)
    
    return {
      isMobile: isMobile && !isTablet,
      isTablet,
      isDesktop: !isMobile && !isTablet
    }
  }

  private detectConnectionType(): string {
    const connection = (navigator as any).connection
    return connection?.type || 'unknown'
  }

  private detectTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  private detectLanguage(): string {
    return navigator.language || 'en-US'
  }

  private shouldUseHeadless(capabilities: SystemCapabilities): boolean {
    // Use headless for high-performance systems
    return capabilities.performance === 'high' && 
           capabilities.isDesktop && 
           capabilities.memory !== 'unknown' && 
           (capabilities.memory as number) >= 8
  }

  private getOptimalViewport(capabilities: SystemCapabilities): { width: number; height: number } {
    // Use screen size but cap at reasonable limits
    const maxWidth = 1920
    const maxHeight = 1080
    
    return {
      width: Math.min(capabilities.screenSize.width, maxWidth),
      height: Math.min(capabilities.screenSize.height, maxHeight)
    }
  }

  private getOptimalTimeout(capabilities: SystemCapabilities): number {
    // Adjust timeout based on system performance and network speed
    let baseTimeout = 30000 // 30 seconds base
    
    if (capabilities.performance === 'low') baseTimeout *= 1.5
    if (capabilities.performance === 'high') baseTimeout *= 0.8
    
    if (capabilities.networkSpeed === 'slow') baseTimeout *= 2
    if (capabilities.networkSpeed === 'fast') baseTimeout *= 0.7
    
    return Math.round(baseTimeout)
  }

  private getOptimalBrowserArgs(capabilities: SystemCapabilities): string[] {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]

    // Add performance optimizations for low-end systems
    if (capabilities.performance === 'low') {
      args.push(
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      )
    }

    // Add memory optimizations for systems with limited memory
    if (capabilities.memory !== 'unknown' && (capabilities.memory as number) < 4) {
      args.push('--memory-pressure-off')
    }

    // Add network optimizations for slow connections
    if (capabilities.networkSpeed === 'slow') {
      args.push('--disable-background-networking')
    }

    return args
  }

  private getOptimalCaptureFrequency(capabilities: SystemCapabilities): number {
    let baseFrequency = 1000 // 1 second base
    
    // Adjust based on performance
    if (capabilities.performance === 'low') baseFrequency *= 1.5
    if (capabilities.performance === 'high') baseFrequency *= 0.7
    
    // Adjust based on network speed
    if (capabilities.networkSpeed === 'slow') baseFrequency *= 1.3
    if (capabilities.networkSpeed === 'fast') baseFrequency *= 0.8
    
    return Math.round(baseFrequency)
  }

  private getOptimalMaxScreenshots(capabilities: SystemCapabilities): number {
    let baseMax = 50 // Base maximum screenshots
    
    // Adjust based on performance and memory
    if (capabilities.performance === 'high') baseMax *= 1.5
    if (capabilities.performance === 'low') baseMax *= 0.7
    
    if (capabilities.memory !== 'unknown') {
      if ((capabilities.memory as number) >= 8) baseMax *= 1.3
      if ((capabilities.memory as number) < 4) baseMax *= 0.7
    }
    
    return Math.round(baseMax)
  }
}

