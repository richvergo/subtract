/**
 * WebsiteAnalyzerService
 * 
 * Analyzes websites to detect optimal Puppeteer settings
 * Uses intelligent heuristics and actual website analysis
 */

import { launchPuppeteer, PuppeteerPresets } from '@/lib/puppeteer-config'
import { browserAnalysisScript } from './browser-analysis'

export interface WebsiteAnalysisResult {
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
  performanceScore: number
  interactivityLevel: 'low' | 'medium' | 'high'
  recommendedSettings: {
    captureFrequency: number
    maxScreenshots: number
    timeout: number
    selectorStrategy: string
    viewport: { width: number; height: number }
  }
}

export class WebsiteAnalyzerService {
  /**
   * Analyze a website and return optimal settings
   */
  async analyzeWebsite(url: string): Promise<WebsiteAnalysisResult> {
    try {
      // Launch a headless browser to analyze the website
      const browser = await launchPuppeteer({
        ...PuppeteerPresets.testing,
        headless: true
      })
      
      const page = await browser.newPage()
      
      // Navigate to the website
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Perform comprehensive analysis using injected script
      const analysis = await page.evaluate(browserAnalysisScript)
      
      await browser.close()
      
      // Generate recommended settings based on analysis
      const recommendedSettings = this.generateRecommendedSettings(analysis)
      
      return {
        ...analysis,
        recommendedSettings
      }
      
    } catch (error) {
      console.error('Website analysis failed:', error)
      
      // Return fallback analysis based on URL patterns
      return this.getFallbackAnalysis(url)
    }
  }

  /**
   * Generate recommended settings based on analysis
   */
  private generateRecommendedSettings(analysis: any): WebsiteAnalysisResult['recommendedSettings'] {
    const typeSettings = {
      ecommerce: { captureFrequency: 500, maxScreenshots: 100, timeout: 60000 },
      saas: { captureFrequency: 1000, maxScreenshots: 50, timeout: 45000 },
      blog: { captureFrequency: 2000, maxScreenshots: 25, timeout: 30000 },
      spa: { captureFrequency: 1500, maxScreenshots: 75, timeout: 45000 },
      corporate: { captureFrequency: 1000, maxScreenshots: 40, timeout: 30000 },
      unknown: { captureFrequency: 1000, maxScreenshots: 50, timeout: 30000 }
    }

    const baseSettings = typeSettings[analysis.type] || typeSettings.unknown
    
    // Adjust based on complexity
    const complexityMultiplier = analysis.complexity === 'low' ? 1.2 : 
                                 analysis.complexity === 'high' ? 0.8 : 1.0
    
    // Adjust based on performance score
    const performanceMultiplier = analysis.performanceScore > 80 ? 0.8 : 
                                  analysis.performanceScore < 40 ? 1.3 : 1.0

    return {
      captureFrequency: Math.round(baseSettings.captureFrequency * complexityMultiplier * performanceMultiplier),
      maxScreenshots: Math.round(baseSettings.maxScreenshots * complexityMultiplier),
      timeout: Math.round(baseSettings.timeout * performanceMultiplier),
      selectorStrategy: this.getOptimalSelectorStrategy(analysis),
      viewport: this.getOptimalViewport(analysis)
    }
  }

  /**
   * Get fallback analysis based on URL patterns
   */
  private getFallbackAnalysis(url: string): WebsiteAnalysisResult {
    const domain = new URL(url).hostname
    
    return {
      type: this.detectTypeFromURL(domain),
      framework: 'vanilla',
      complexity: 'medium',
      hasAuth: false,
      authProviders: [],
      hasSSO: false,
      isSlow: false,
      hasAds: false,
      subdomains: [],
      cdnDomains: [],
      adsDomains: [],
      performanceScore: 50,
      interactivityLevel: 'medium',
      recommendedSettings: {
        captureFrequency: 1000,
        maxScreenshots: 50,
        timeout: 30000,
        selectorStrategy: 'hybrid',
        viewport: { width: 1920, height: 1080 }
      }
    }
  }

  private detectTypeFromURL(domain: string): WebsiteAnalysisResult['type'] {
    const ecommerceKeywords = ['shop', 'store', 'cart', 'checkout', 'buy', 'sell', 'marketplace']
    const saasKeywords = ['app', 'dashboard', 'admin', 'portal', 'platform', 'cloud']
    const blogKeywords = ['blog', 'news', 'article', 'post', 'medium', 'substack']
    
    if (ecommerceKeywords.some(keyword => domain.includes(keyword))) return 'ecommerce'
    if (saasKeywords.some(keyword => domain.includes(keyword))) return 'saas'
    if (blogKeywords.some(keyword => domain.includes(keyword))) return 'blog'
    
    return 'unknown'
  }

  private getOptimalSelectorStrategy(analysis: any): string {
    if (analysis.framework === 'React') return 'data-testid'
    if (analysis.framework === 'Vue') return 'data-cy'
    if (analysis.framework === 'Angular') return 'id'
    return 'hybrid'
  }

  private getOptimalViewport(analysis: any): { width: number; height: number } {
    // Default to common desktop resolution
    return { width: 1920, height: 1080 }
  }
}

