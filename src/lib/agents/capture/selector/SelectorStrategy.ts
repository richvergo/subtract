/**
 * SelectorStrategy
 * Enterprise-grade selector generation and validation
 */

export interface SelectorOptions {
  strategy: 'css' | 'xpath' | 'text' | 'hybrid'
  priority: string[]
  fallback: boolean
  timeout: number
}

export interface SelectorResult {
  selector: string
  confidence: number
  strategy: string
  alternatives: string[]
  metadata: {
    elementType: string
    elementText: string
    attributes: Record<string, string>
    position: { x: number; y: number }
  }
}

export interface ElementInfo {
  tagName: string
  id?: string
  className?: string
  text?: string
  attributes: Record<string, string>
  position: { x: number; y: number }
  parent?: ElementInfo
  children: ElementInfo[]
}

export class SelectorStrategy {
  constructor(private options: SelectorOptions) {}

  /**
   * Generate the best selector for an element
   */
  generateSelector(element: ElementInfo): SelectorResult {
    const strategies = this.getStrategies()
    const results: Array<{ selector: string; confidence: number; strategy: string }> = []

    for (const strategy of strategies) {
      try {
        const selector = this.applyStrategy(strategy, element)
        const confidence = this.calculateConfidence(selector, element)
        
        if (selector && confidence > 0) {
          results.push({ selector, confidence, strategy })
        }
      } catch (error) {
        console.warn(`Selector strategy ${strategy} failed:`, error)
      }
    }

    // Sort by confidence and return the best result
    results.sort((a, b) => b.confidence - a.confidence)
    
    const best = results[0]
    if (!best) {
      throw new Error('No valid selector could be generated')
    }

    return {
      selector: best.selector,
      confidence: best.confidence,
      strategy: best.strategy,
      alternatives: results.slice(1).map(r => r.selector),
      metadata: {
        elementType: element.tagName,
        elementText: element.text || '',
        attributes: element.attributes,
        position: element.position
      }
    }
  }

  /**
   * Get available strategies based on configuration
   */
  private getStrategies(): string[] {
    const allStrategies = ['id', 'data-testid', 'name', 'class', 'text', 'xpath', 'css']
    
    if (this.options.strategy === 'css') {
      return ['id', 'data-testid', 'name', 'class', 'css']
    } else if (this.options.strategy === 'xpath') {
      return ['id', 'data-testid', 'name', 'xpath']
    } else if (this.options.strategy === 'text') {
      return ['id', 'data-testid', 'text', 'name']
    } else {
      // hybrid - use all strategies
      return this.options.priority.length > 0 ? this.options.priority : allStrategies
    }
  }

  /**
   * Apply a specific strategy to generate a selector
   */
  private applyStrategy(strategy: string, element: ElementInfo): string {
    switch (strategy) {
      case 'id':
        return this.generateIdSelector(element)
      case 'data-testid':
        return this.generateDataTestIdSelector(element)
      case 'name':
        return this.generateNameSelector(element)
      case 'class':
        return this.generateClassSelector(element)
      case 'text':
        return this.generateTextSelector(element)
      case 'xpath':
        return this.generateXPathSelector(element)
      case 'css':
        return this.generateCssSelector(element)
      default:
        throw new Error(`Unknown strategy: ${strategy}`)
    }
  }

  /**
   * Generate ID-based selector
   */
  private generateIdSelector(element: ElementInfo): string {
    if (element.id) {
      return `#${element.id}`
    }
    return ''
  }

  /**
   * Generate data-testid selector
   */
  private generateDataTestIdSelector(element: ElementInfo): string {
    const testId = element.attributes['data-testid']
    if (testId) {
      return `[data-testid="${testId}"]`
    }
    return ''
  }

  /**
   * Generate name-based selector
   */
  private generateNameSelector(element: ElementInfo): string {
    const name = element.attributes.name
    if (name) {
      return `[name="${name}"]`
    }
    return ''
  }

  /**
   * Generate class-based selector
   */
  private generateClassSelector(element: ElementInfo): string {
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0)
      if (classes.length > 0) {
        return `.${classes.join('.')}`
      }
    }
    return ''
  }

  /**
   * Generate text-based selector
   */
  private generateTextSelector(element: ElementInfo): string {
    if (element.text && element.text.length > 0 && element.text.length < 50) {
      const cleanText = element.text.replace(/['"]/g, "\\'")
      return `text="${cleanText}"`
    }
    return ''
  }

  /**
   * Generate XPath selector
   */
  private generateXPathSelector(element: ElementInfo): string {
    // Simple XPath generation - can be enhanced
    if (element.id) {
      return `//*[@id="${element.id}"]`
    }
    
    if (element.text && element.text.length > 0) {
      const cleanText = element.text.replace(/['"]/g, "\\'")
      return `//${element.tagName.toLowerCase()}[text()="${cleanText}"]`
    }
    
    return `//${element.tagName.toLowerCase()}`
  }

  /**
   * Generate CSS selector
   */
  private generateCssSelector(element: ElementInfo): string {
    let selector = element.tagName.toLowerCase()
    
    if (element.id) {
      selector += `#${element.id}`
    } else if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0)
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`
      }
    }
    
    return selector
  }

  /**
   * Calculate confidence score for a selector
   */
  private calculateConfidence(selector: string, element: ElementInfo): number {
    if (!selector) return 0
    
    let confidence = 0.5 // Base confidence
    
    // Higher confidence for ID selectors
    if (selector.startsWith('#')) {
      confidence = 0.95
    }
    // High confidence for data-testid
    else if (selector.includes('data-testid')) {
      confidence = 0.9
    }
    // Medium confidence for name attributes
    else if (selector.includes('[name=')) {
      confidence = 0.8
    }
    // Lower confidence for class selectors
    else if (selector.startsWith('.')) {
      confidence = 0.7
    }
    // Medium confidence for text selectors
    else if (selector.includes('text=')) {
      confidence = 0.75
    }
    // Lower confidence for XPath
    else if (selector.startsWith('//')) {
      confidence = 0.6
    }
    
    // Boost confidence for unique attributes
    if (element.attributes['data-testid']) {
      confidence += 0.1
    }
    
    // Reduce confidence for very long text
    if (element.text && element.text.length > 100) {
      confidence -= 0.2
    }
    
    return Math.min(confidence, 1.0)
  }

  /**
   * Validate a selector
   */
  async validateSelector(selector: string, page: any): Promise<boolean> {
    try {
      const elements = await page.$$(selector)
      return elements.length === 1
    } catch (error) {
      return false
    }
  }

  /**
   * Get fallback selectors
   */
  getFallbackSelectors(element: ElementInfo): string[] {
    const fallbacks: string[] = []
    
    // Try different strategies as fallbacks
    const strategies = ['id', 'data-testid', 'name', 'class', 'text']
    
    for (const strategy of strategies) {
      try {
        const selector = this.applyStrategy(strategy, element)
        if (selector && !fallbacks.includes(selector)) {
          fallbacks.push(selector)
        }
      } catch (error) {
        // Skip failed strategies
      }
    }
    
    return fallbacks
  }
}
