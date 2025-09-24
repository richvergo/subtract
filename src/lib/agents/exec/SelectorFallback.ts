/**
 * SelectorFallback
 * Enterprise-grade selector fallback strategies
 */

export interface SelectorFallbackOptions {
  strategies: string[]
  timeout: number
  debugMode: boolean
}

export interface FallbackResult {
  success: boolean
  selector?: string
  strategy?: string
  confidence: number
  alternatives: string[]
  error?: string
}

export class SelectorFallback {
  constructor(private options: SelectorFallbackOptions) {}

  /**
   * Get fallback selector for a failed selector
   */
  async getFallbackSelector(
    originalSelector: string,
    page: any
  ): Promise<string | null> {
    try {
      const result = await this.findFallbackSelector(originalSelector, page)
      return result.success ? result.selector || null : null
    } catch (error) {
      console.error('Selector fallback failed:', error)
      return null
    }
  }

  /**
   * Find fallback selector using multiple strategies
   */
  private async findFallbackSelector(
    originalSelector: string,
    page: any
  ): Promise<FallbackResult> {
    const strategies = this.options.strategies
    const results: FallbackResult[] = []

    for (const strategy of strategies) {
      try {
        const result = await this.applyStrategy(strategy, originalSelector, page)
        if (result.success) {
          results.push(result)
        }
      } catch (error) {
        console.warn(`Fallback strategy ${strategy} failed:`, error)
      }
    }

    // Sort by confidence and return the best result
    results.sort((a, b) => b.confidence - a.confidence)
    
    if (results.length > 0) {
      return results[0]
    }

    return {
      success: false,
      confidence: 0,
      alternatives: [],
      error: 'No fallback selector found'
    }
  }

  /**
   * Apply a specific fallback strategy
   */
  private async applyStrategy(
    strategy: string,
    originalSelector: string,
    page: any
  ): Promise<FallbackResult> {
    switch (strategy) {
      case 'text':
        return await this.textBasedFallback(originalSelector, page)
      case 'partial':
        return await this.partialSelectorFallback(originalSelector, page)
      case 'parent':
        return await this.parentElementFallback(originalSelector, page)
      case 'sibling':
        return await this.siblingElementFallback(originalSelector, page)
      case 'xpath':
        return await this.xpathFallback(originalSelector, page)
      case 'css':
        return await this.cssFallback(originalSelector, page)
      default:
        throw new Error(`Unknown fallback strategy: ${strategy}`)
    }
  }

  /**
   * Text-based fallback strategy
   */
  private async textBasedFallback(
    originalSelector: string,
    page: any
  ): Promise<FallbackResult> {
    try {
      // Try to find element by text content
      const textSelector = `text="${originalSelector}"`
      const element = await page.$(textSelector)
      
      if (element) {
        return {
          success: true,
          selector: textSelector,
          strategy: 'text',
          confidence: 0.8,
          alternatives: []
        }
      }
    } catch (error) {
      // Text-based fallback failed
    }

    return {
      success: false,
      confidence: 0,
      alternatives: [],
      error: 'Text-based fallback failed'
    }
  }

  /**
   * Partial selector fallback strategy
   */
  private async partialSelectorFallback(
    originalSelector: string,
    page: any
  ): Promise<FallbackResult> {
    try {
      // Try to find element with partial selector
      const partialSelectors = this.generatePartialSelectors(originalSelector)
      
      for (const selector of partialSelectors) {
        const element = await page.$(selector)
        if (element) {
          return {
            success: true,
            selector,
            strategy: 'partial',
            confidence: 0.7,
            alternatives: partialSelectors.filter(s => s !== selector)
          }
        }
      }
    } catch (error) {
      // Partial selector fallback failed
    }

    return {
      success: false,
      confidence: 0,
      alternatives: [],
      error: 'Partial selector fallback failed'
    }
  }

  /**
   * Parent element fallback strategy
   */
  private async parentElementFallback(
    originalSelector: string,
    page: any
  ): Promise<FallbackResult> {
    try {
      // Try to find parent element
      const parentSelector = `${originalSelector} > *`
      const element = await page.$(parentSelector)
      
      if (element) {
        return {
          success: true,
          selector: parentSelector,
          strategy: 'parent',
          confidence: 0.6,
          alternatives: []
        }
      }
    } catch (error) {
      // Parent element fallback failed
    }

    return {
      success: false,
      confidence: 0,
      alternatives: [],
      error: 'Parent element fallback failed'
    }
  }

  /**
   * Sibling element fallback strategy
   */
  private async siblingElementFallback(
    originalSelector: string,
    page: any
  ): Promise<FallbackResult> {
    try {
      // Try to find sibling element
      const siblingSelector = `${originalSelector} + *`
      const element = await page.$(siblingSelector)
      
      if (element) {
        return {
          success: true,
          selector: siblingSelector,
          strategy: 'sibling',
          confidence: 0.6,
          alternatives: []
        }
      }
    } catch (error) {
      // Sibling element fallback failed
    }

    return {
      success: false,
      confidence: 0,
      alternatives: [],
      error: 'Sibling element fallback failed'
    }
  }

  /**
   * XPath fallback strategy
   */
  private async xpathFallback(
    originalSelector: string,
    page: any
  ): Promise<FallbackResult> {
    try {
      // Convert CSS selector to XPath
      const xpathSelector = this.cssToXPath(originalSelector)
      const element = await page.$x(xpathSelector)
      
      if (element && element.length > 0) {
        return {
          success: true,
          selector: xpathSelector,
          strategy: 'xpath',
          confidence: 0.7,
          alternatives: []
        }
      }
    } catch (error) {
      // XPath fallback failed
    }

    return {
      success: false,
      confidence: 0,
      alternatives: [],
      error: 'XPath fallback failed'
    }
  }

  /**
   * CSS fallback strategy
   */
  private async cssFallback(
    originalSelector: string,
    page: any
  ): Promise<FallbackResult> {
    try {
      // Try alternative CSS selectors
      const cssSelectors = this.generateCssSelectors(originalSelector)
      
      for (const selector of cssSelectors) {
        const element = await page.$(selector)
        if (element) {
          return {
            success: true,
            selector,
            strategy: 'css',
            confidence: 0.8,
            alternatives: cssSelectors.filter(s => s !== selector)
          }
        }
      }
    } catch (error) {
      // CSS fallback failed
    }

    return {
      success: false,
      confidence: 0,
      alternatives: [],
      error: 'CSS fallback failed'
    }
  }

  /**
   * Generate partial selectors
   */
  private generatePartialSelectors(selector: string): string[] {
    const selectors: string[] = []
    
    // Remove specific attributes
    if (selector.includes('[')) {
      const baseSelector = selector.split('[')[0]
      selectors.push(baseSelector)
    }
    
    // Remove class specificity
    if (selector.includes('.')) {
      const parts = selector.split('.')
      if (parts.length > 1) {
        selectors.push(parts[0])
      }
    }
    
    // Remove ID specificity
    if (selector.includes('#')) {
      const parts = selector.split('#')
      if (parts.length > 1) {
        selectors.push(parts[0])
      }
    }
    
    return selectors
  }

  /**
   * Generate alternative CSS selectors
   */
  private generateCssSelectors(selector: string): string[] {
    const selectors: string[] = []
    
    // Try without specific attributes
    if (selector.includes('[')) {
      const baseSelector = selector.split('[')[0]
      selectors.push(baseSelector)
    }
    
    // Try with different attribute selectors
    if (selector.includes('=')) {
      const parts = selector.split('=')
      if (parts.length > 1) {
        const attribute = parts[0].split('[')[1]
        const value = parts[1].split(']')[0]
        selectors.push(`[${attribute}*="${value}"]`)
        selectors.push(`[${attribute}^="${value}"]`)
        selectors.push(`[${attribute}$="${value}"]`)
      }
    }
    
    return selectors
  }

  /**
   * Convert CSS selector to XPath
   */
  private cssToXPath(selector: string): string {
    // Simple CSS to XPath conversion
    if (selector.startsWith('#')) {
      const id = selector.substring(1)
      return `//*[@id="${id}"]`
    }
    
    if (selector.startsWith('.')) {
      const className = selector.substring(1)
      return `//*[@class="${className}"]`
    }
    
    if (selector.startsWith('[')) {
      const attribute = selector.substring(1, selector.length - 1)
      const [name, value] = attribute.split('=')
      return `//*[@${name}="${value}"]`
    }
    
    // Default to tag name
    return `//${selector}`
  }

  /**
   * Get fallback options
   */
  getOptions(): SelectorFallbackOptions {
    return { ...this.options }
  }

  /**
   * Update fallback options
   */
  updateOptions(newOptions: Partial<SelectorFallbackOptions>): void {
    this.options = { ...this.options, ...newOptions }
  }

  /**
   * Create a fallback policy with default settings
   */
  static createDefault(): SelectorFallback {
    return new SelectorFallback({
      strategies: ['text', 'partial', 'parent', 'sibling', 'xpath', 'css'],
      timeout: 5000,
      debugMode: false
    })
  }
}
