import { NextRequest, NextResponse } from 'next/server'
import { AutoConfigurationService } from '@/lib/auto-configuration/AutoConfigurationService'
import { SystemDetectionService } from '@/lib/auto-configuration/SystemDetectionService'
import { WebsiteAnalyzerService } from '@/lib/auto-configuration/WebsiteAnalyzerService'

/**
 * Auto-Configuration API Endpoint
 * 
 * Automatically detects optimal settings for Puppeteer workflows
 * based on website analysis and user system capabilities
 */

export async function POST(request: NextRequest) {
  try {
    const { url, systemInfo } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Auto-configuring settings for: ${url}`)

    // Initialize services
    const autoConfigService = new AutoConfigurationService()
    const systemDetectionService = new SystemDetectionService()
    const websiteAnalyzerService = new WebsiteAnalyzerService()

    // Detect system capabilities (if not provided)
    let systemCapabilities
    if (systemInfo) {
      systemCapabilities = systemInfo
    } else {
      // Use default system info for server-side analysis
      systemCapabilities = {
        os: 'macOS',
        browser: 'Chrome',
        screenSize: { width: 1920, height: 1080 },
        performance: 'high' as const,
        networkSpeed: 'fast' as const,
        memory: 8
      }
    }

    // Analyze website
    console.log('📊 Analyzing website...')
    const websiteAnalysis = await websiteAnalyzerService.analyzeWebsite(url)
    
    // Generate optimal configuration
    console.log('⚙️ Generating optimal configuration...')
    const optimalConfig = await autoConfigService.generateOptimalConfig(url, systemCapabilities)
    
    // Get system-optimized Puppeteer settings
    const puppeteerSettings = systemDetectionService.getOptimalPuppeteerSettings(systemCapabilities)
    
    // Combine all settings
    const finalConfiguration = {
      // Website analysis results
      websiteAnalysis: {
        type: websiteAnalysis.type,
        framework: websiteAnalysis.framework,
        complexity: websiteAnalysis.complexity,
        hasAuth: websiteAnalysis.hasAuth,
        performanceScore: websiteAnalysis.performanceScore,
        interactivityLevel: websiteAnalysis.interactivityLevel
      },
      
      // System capabilities
      systemCapabilities,
      
      // Optimal settings
      settings: {
        // Performance settings
        captureFrequency: optimalConfig.performance.captureFrequency,
        maxScreenshots: optimalConfig.performance.maxScreenshots,
        timeout: optimalConfig.performance.timeout,
        
        // Puppeteer settings
        headless: optimalConfig.performance.headless,
        viewport: optimalConfig.performance.viewport,
        browserArgs: optimalConfig.performance.browserArgs,
        
        // Selector strategy
        selectorStrategy: optimalConfig.selectors.strategy,
        fallbackSelectors: optimalConfig.selectors.fallbackSelectors,
        
        // Domain scope
        allowedDomains: optimalConfig.domainScope.allowedDomains,
        blockedDomains: optimalConfig.domainScope.blockedDomains,
        
        // Authentication
        requiresLogin: optimalConfig.authentication.requiresLogin,
        loginConfig: optimalConfig.authentication.loginConfig,
        ssoProviders: optimalConfig.authentication.ssoProviders
      },
      
      // Recommended settings from website analysis
      recommendedSettings: websiteAnalysis.recommendedSettings,
      
      // Auto-detection confidence score
      confidenceScore: calculateConfidenceScore(websiteAnalysis, systemCapabilities),
      
      // Timestamp
      generatedAt: new Date().toISOString()
    }

    console.log('✅ Auto-configuration complete:', {
      type: finalConfiguration.websiteAnalysis.type,
      framework: finalConfiguration.websiteAnalysis.framework,
      complexity: finalConfiguration.websiteAnalysis.complexity,
      confidence: finalConfiguration.confidenceScore
    })

    return NextResponse.json({
      success: true,
      configuration: finalConfiguration
    })

  } catch (error) {
    console.error('❌ Auto-configuration failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Auto-configuration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate confidence score for auto-configuration
 */
function calculateConfidenceScore(websiteAnalysis: any, systemCapabilities: any): number {
  let score = 50 // Base score
  
  // Increase confidence based on website analysis quality
  if (websiteAnalysis.type !== 'unknown') score += 20
  if (websiteAnalysis.framework !== 'vanilla') score += 15
  if (websiteAnalysis.performanceScore > 70) score += 10
  if (websiteAnalysis.hasAuth) score += 5
  
  // Increase confidence based on system detection
  if (systemCapabilities.performance === 'high') score += 10
  if (systemCapabilities.memory !== 'unknown') score += 5
  
  return Math.min(100, score)
}

