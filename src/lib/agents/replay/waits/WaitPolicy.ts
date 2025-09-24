/**
 * WaitPolicy
 * Enterprise-grade wait strategies for reliable automation
 */

export interface WaitOptions {
  timeout: number
  polling: number
  visible: boolean
  hidden: boolean
  stable: boolean
}

export interface WaitResult {
  success: boolean
  duration: number
  error?: string
  metadata: {
    strategy: string
    selector: string
    conditions: string[]
  }
}

export enum WaitStrategy {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  CLICKABLE = 'clickable',
  STABLE = 'stable',
  NETWORK_IDLE = 'network_idle',
  CUSTOM = 'custom'
}

export class WaitPolicy {
  constructor(private options: WaitOptions) {}

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string, page: any): Promise<WaitResult> {
    const startTime = Date.now()
    
    try {
      await page.waitForSelector(selector, {
        visible: true,
        timeout: this.options.timeout,
        polling: this.options.polling
      })
      
      return {
        success: true,
        duration: Date.now() - startTime,
        metadata: {
          strategy: WaitStrategy.VISIBLE,
          selector,
          conditions: ['visible']
        }
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          strategy: WaitStrategy.VISIBLE,
          selector,
          conditions: ['visible']
        }
      }
    }
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string, page: any): Promise<WaitResult> {
    const startTime = Date.now()
    
    try {
      await page.waitForSelector(selector, {
        hidden: true,
        timeout: this.options.timeout,
        polling: this.options.polling
      })
      
      return {
        success: true,
        duration: Date.now() - startTime,
        metadata: {
          strategy: WaitStrategy.HIDDEN,
          selector,
          conditions: ['hidden']
        }
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          strategy: WaitStrategy.HIDDEN,
          selector,
          conditions: ['hidden']
        }
      }
    }
  }

  /**
   * Wait for element to be clickable
   */
  async waitForClickable(selector: string, page: any): Promise<WaitResult> {
    const startTime = Date.now()
    
    try {
      await page.waitForSelector(selector, {
        visible: true,
        timeout: this.options.timeout,
        polling: this.options.polling
      })
      
      // Additional check for clickability
      const element = await page.$(selector)
      if (element) {
        const isClickable = await page.evaluate((el: any) => {
          const style = window.getComputedStyle(el)
          return style.pointerEvents !== 'none' && 
                 style.visibility !== 'hidden' && 
                 !el.disabled
        }, element)
        
        if (!isClickable) {
          throw new Error('Element is not clickable')
        }
      }
      
      return {
        success: true,
        duration: Date.now() - startTime,
        metadata: {
          strategy: WaitStrategy.CLICKABLE,
          selector,
          conditions: ['visible', 'clickable']
        }
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          strategy: WaitStrategy.CLICKABLE,
          selector,
          conditions: ['visible', 'clickable']
        }
      }
    }
  }

  /**
   * Wait for element to be stable (no position/size changes)
   */
  async waitForStable(selector: string, page: any): Promise<WaitResult> {
    const startTime = Date.now()
    
    try {
      await page.waitForSelector(selector, {
        visible: true,
        timeout: this.options.timeout,
        polling: this.options.polling
      })
      
      if (this.options.stable) {
        await this.waitForStability(selector, page)
      }
      
      return {
        success: true,
        duration: Date.now() - startTime,
        metadata: {
          strategy: WaitStrategy.STABLE,
          selector,
          conditions: ['visible', 'stable']
        }
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          strategy: WaitStrategy.STABLE,
          selector,
          conditions: ['visible', 'stable']
        }
      }
    }
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(page: any): Promise<WaitResult> {
    const startTime = Date.now()
    
    try {
      await page.waitForLoadState('networkidle', { timeout: this.options.timeout })
      
      return {
        success: true,
        duration: Date.now() - startTime,
        metadata: {
          strategy: WaitStrategy.NETWORK_IDLE,
          selector: 'page',
          conditions: ['network_idle']
        }
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          strategy: WaitStrategy.NETWORK_IDLE,
          selector: 'page',
          conditions: ['network_idle']
        }
      }
    }
  }

  /**
   * Wait for custom condition
   */
  async waitForCustom(condition: () => Promise<boolean>, page: any): Promise<WaitResult> {
    const startTime = Date.now()
    
    try {
      await page.waitForFunction(condition, {
        timeout: this.options.timeout,
        polling: this.options.polling
      })
      
      return {
        success: true,
        duration: Date.now() - startTime,
        metadata: {
          strategy: WaitStrategy.CUSTOM,
          selector: 'custom',
          conditions: ['custom_condition']
        }
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          strategy: WaitStrategy.CUSTOM,
          selector: 'custom',
          conditions: ['custom_condition']
        }
      }
    }
  }

  /**
   * Wait for element stability
   */
  private async waitForStability(selector: string, page: any): Promise<void> {
    const stabilityCheck = async () => {
      const element = await page.$(selector)
      if (!element) return false
      
      const rect1 = await element.boundingBox()
      await page.waitForTimeout(100) // Wait 100ms
      const rect2 = await element.boundingBox()
      
      return rect1 && rect2 && 
             rect1.x === rect2.x && 
             rect1.y === rect2.y && 
             rect1.width === rect2.width && 
             rect1.height === rect2.height
    }
    
    await page.waitForFunction(stabilityCheck, {
      timeout: this.options.timeout,
      polling: this.options.polling
    })
  }

  /**
   * Wait for multiple conditions
   */
  async waitForMultiple(conditions: Array<{
    strategy: WaitStrategy
    selector?: string
    condition?: () => Promise<boolean>
  }>, page: any): Promise<WaitResult[]> {
    const results: WaitResult[] = []
    
    for (const condition of conditions) {
      let result: WaitResult
      
      switch (condition.strategy) {
        case WaitStrategy.VISIBLE:
          result = await this.waitForVisible(condition.selector!, page)
          break
        case WaitStrategy.HIDDEN:
          result = await this.waitForHidden(condition.selector!, page)
          break
        case WaitStrategy.CLICKABLE:
          result = await this.waitForClickable(condition.selector!, page)
          break
        case WaitStrategy.STABLE:
          result = await this.waitForStable(condition.selector!, page)
          break
        case WaitStrategy.NETWORK_IDLE:
          result = await this.waitForNetworkIdle(page)
          break
        case WaitStrategy.CUSTOM:
          result = await this.waitForCustom(condition.condition!, page)
          break
        default:
          result = {
            success: false,
            duration: 0,
            error: `Unknown strategy: ${condition.strategy}`,
            metadata: {
              strategy: condition.strategy,
              selector: condition.selector || 'unknown',
              conditions: []
            }
          }
      }
      
      results.push(result)
    }
    
    return results
  }

  /**
   * Get wait options
   */
  getOptions(): WaitOptions {
    return { ...this.options }
  }

  /**
   * Update wait options
   */
  updateOptions(newOptions: Partial<WaitOptions>): void {
    this.options = { ...this.options, ...newOptions }
  }
}
