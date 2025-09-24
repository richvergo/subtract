/**
 * RetryPolicy
 * Enterprise-grade retry logic for reliable automation
 */

export interface RetryOptions {
  maxAttempts: number
  backoffMultiplier: number
  baseDelay: number
  maxDelay: number
  jitter: boolean
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: string
  attempts: number
  totalDuration: number
}

export class RetryPolicy {
  constructor(private options: RetryOptions) {}

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts?: number
  ): Promise<RetryResult<T>> {
    const attempts = maxAttempts || this.options.maxAttempts
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await fn()
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: Date.now() - startTime
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on the last attempt
        if (attempt === attempts) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt)
        console.log(`⏳ Retry attempt ${attempt}/${attempts} failed, waiting ${delay}ms before retry`)
        await this.sleep(delay)
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      totalDuration: Date.now() - startTime
    }
  }

  /**
   * Execute a function with retry logic and custom error handling
   */
  async executeWithRetryAndErrorHandling<T>(
    fn: () => Promise<T>,
    errorHandler: (error: Error, attempt: number) => boolean,
    maxAttempts?: number
  ): Promise<RetryResult<T>> {
    const attempts = maxAttempts || this.options.maxAttempts
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await fn()
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: Date.now() - startTime
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Check if we should retry based on error type
        const shouldRetry = errorHandler(lastError, attempt)
        
        if (!shouldRetry || attempt === attempts) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt)
        console.log(`⏳ Retry attempt ${attempt}/${attempts} failed, waiting ${delay}ms before retry`)
        await this.sleep(delay)
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      totalDuration: Date.now() - startTime
    }
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number): number {
    let delay = this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1)
    
    // Apply maximum delay limit
    if (delay > this.options.maxDelay) {
      delay = this.options.maxDelay
    }
    
    // Add jitter to prevent thundering herd
    if (this.options.jitter) {
      const jitter = Math.random() * 0.1 * delay
      delay += jitter
    }
    
    return Math.floor(delay)
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get retry options
   */
  getOptions(): RetryOptions {
    return { ...this.options }
  }

  /**
   * Update retry options
   */
  updateOptions(newOptions: Partial<RetryOptions>): void {
    this.options = { ...this.options, ...newOptions }
  }

  /**
   * Create a retry policy with default settings
   */
  static createDefault(): RetryPolicy {
    return new RetryPolicy({
      maxAttempts: 3,
      backoffMultiplier: 2,
      baseDelay: 1000,
      maxDelay: 10000,
      jitter: true
    })
  }

  /**
   * Create a retry policy for quick operations
   */
  static createQuick(): RetryPolicy {
    return new RetryPolicy({
      maxAttempts: 2,
      backoffMultiplier: 1.5,
      baseDelay: 500,
      maxDelay: 2000,
      jitter: false
    })
  }

  /**
   * Create a retry policy for slow operations
   */
  static createSlow(): RetryPolicy {
    return new RetryPolicy({
      maxAttempts: 5,
      backoffMultiplier: 2,
      baseDelay: 2000,
      maxDelay: 30000,
      jitter: true
    })
  }
}
