/**
 * Enhanced Recording System
 * Captures both video and granular user actions for AI analysis
 */

export interface RecordedAction {
  id: string
  timestamp: number
  type: 'click' | 'type' | 'select' | 'navigate' | 'scroll' | 'hover' | 'wait'
  selector?: string
  value?: string
  url?: string
  coordinates?: { x: number; y: number }
  element?: {
    tagName: string
    id?: string
    className?: string
    text?: string
    placeholder?: string
    type?: string
    name?: string
    value?: string
  }
  intent?: string // AI-generated intent
  parameterizable?: boolean // Whether this action can be parameterized
  confidence?: number // AI confidence score
}

export interface RecordingSession {
  id: string
  startTime: number
  endTime?: number
  url: string
  actions: RecordedAction[]
  metadata: {
    userAgent: string
    viewport: { width: number; height: number }
    recordingDuration: number
  }
}

export class EnhancedRecorder {
  private session: RecordingSession | null = null
  private isRecording = false
  private actionIdCounter = 0

  /**
   * Start recording session with action capture
   */
  startRecording(): RecordingSession {
    if (this.isRecording) {
      throw new Error('Recording already in progress')
    }

    this.session = {
      id: `session_${Date.now()}`,
      startTime: Date.now(),
      url: window.location.href,
      actions: [],
      metadata: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        recordingDuration: 0
      }
    }

    this.isRecording = true
    this.actionIdCounter = 0

    // Set up event listeners for action capture
    this.setupActionListeners()

    console.log('🎬 Enhanced recording started:', this.session.id)
    return this.session
  }

  /**
   * Stop recording and return session data
   */
  stopRecording(): RecordingSession | null {
    if (!this.isRecording || !this.session) {
      return null
    }

    this.isRecording = false
    this.session.endTime = Date.now()
    this.session.metadata.recordingDuration = this.session.endTime - this.session.startTime

    // Remove event listeners
    this.removeActionListeners()

    console.log('🛑 Enhanced recording stopped:', {
      sessionId: this.session.id,
      duration: this.session.metadata.recordingDuration,
      actionCount: this.session.actions.length
    })

    return this.session
  }

  /**
   * Get current recording session
   */
  getSession(): RecordingSession | null {
    return this.session
  }

  /**
   * Set up event listeners to capture user actions
   */
  private setupActionListeners(): void {
    // Click events
    document.addEventListener('click', this.handleClick.bind(this), true)
    
    // Input events (typing)
    document.addEventListener('input', this.handleInput.bind(this), true)
    
    // Form submission
    document.addEventListener('submit', this.handleSubmit.bind(this), true)
    
    // Navigation events
    window.addEventListener('beforeunload', this.handleNavigation.bind(this))
    
    // Scroll events (throttled)
    let scrollTimeout: NodeJS.Timeout
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        this.handleScroll()
      }, 100)
    }, true)
    
    // Hover events (throttled)
    let hoverTimeout: NodeJS.Timeout
    document.addEventListener('mouseover', (event) => {
      clearTimeout(hoverTimeout)
      hoverTimeout = setTimeout(() => {
        this.handleHover(event)
      }, 500)
    }, true)
  }

  /**
   * Remove event listeners
   */
  private removeActionListeners(): void {
    document.removeEventListener('click', this.handleClick.bind(this), true)
    document.removeEventListener('input', this.handleInput.bind(this), true)
    document.removeEventListener('submit', this.handleSubmit.bind(this), true)
    window.removeEventListener('beforeunload', this.handleNavigation.bind(this))
    window.removeEventListener('scroll', this.handleScroll.bind(this), true)
    document.removeEventListener('mouseover', this.handleHover.bind(this), true)
  }

  /**
   * Handle click events
   */
  private handleClick(event: MouseEvent): void {
    if (!this.isRecording || !this.session) return

    const target = event.target as HTMLElement
    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'click',
      selector: this.generateSelector(target),
      coordinates: { x: event.clientX, y: event.clientY },
      element: this.getElementInfo(target),
      intent: this.inferClickIntent(target)
    }

    this.session.actions.push(action)
    console.log('🖱️ Click captured:', action)
  }

  /**
   * Handle input events (typing)
   */
  private handleInput(event: Event): void {
    if (!this.isRecording || !this.session) return

    const target = event.target as HTMLInputElement
    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'type',
      selector: this.generateSelector(target),
      value: target.value,
      element: this.getElementInfo(target),
      parameterizable: this.isParameterizableInput(target)
    }

    this.session.actions.push(action)
    console.log('⌨️ Input captured:', action)
  }

  /**
   * Handle form submission
   */
  private handleSubmit(event: Event): void {
    if (!this.isRecording || !this.session) return

    const target = event.target as HTMLFormElement
    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'click', // Treat as click action
      selector: this.generateSelector(target),
      element: this.getElementInfo(target),
      intent: 'submit_form'
    }

    this.session.actions.push(action)
    console.log('📝 Form submission captured:', action)
  }

  /**
   * Handle navigation events
   */
  private handleNavigation(): void {
    if (!this.isRecording || !this.session) return

    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'navigate',
      url: window.location.href,
      intent: 'page_navigation'
    }

    this.session.actions.push(action)
    console.log('🧭 Navigation captured:', action)
  }

  /**
   * Handle scroll events
   */
  private handleScroll(): void {
    if (!this.isRecording || !this.session) return

    // Only record significant scrolls
    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'scroll',
      coordinates: { x: window.scrollX, y: window.scrollY },
      intent: 'scroll_page'
    }

    this.session.actions.push(action)
  }

  /**
   * Handle hover events
   */
  private handleHover(event: MouseEvent): void {
    if (!this.isRecording || !this.session) return

    const target = event.target as HTMLElement
    
    // Only record hovers on interactive elements
    if (!this.isInteractiveElement(target)) return

    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'hover',
      selector: this.generateSelector(target),
      coordinates: { x: event.clientX, y: event.clientY },
      element: this.getElementInfo(target),
      intent: 'hover_element'
    }

    this.session.actions.push(action)
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${++this.actionIdCounter}_${Date.now()}`
  }

  /**
   * Generate CSS selector for element
   */
  private generateSelector(element: HTMLElement): string {
    // Try ID first
    if (element.id) {
      return `#${element.id}`
    }

    // Try data attributes
    if (element.dataset.testid) {
      return `[data-testid="${element.dataset.testid}"]`
    }

    // Try name attribute
    if (element.getAttribute('name')) {
      return `[name="${element.getAttribute('name')}"]`
    }

    // Try class combination
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0)
      if (classes.length > 0) {
        return `.${classes.join('.')}`
      }
    }

    // Fallback to tag name with nth-child
    const parent = element.parentElement
    if (parent) {
      const siblings = Array.from(parent.children)
      const index = siblings.indexOf(element)
      return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`
    }

    return element.tagName.toLowerCase()
  }

  /**
   * Extract element information
   */
  private getElementInfo(element: HTMLElement): RecordedAction['element'] {
    const inputElement = element as HTMLInputElement
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      text: element.textContent?.trim() || undefined,
      placeholder: inputElement.placeholder || undefined,
      type: inputElement.type || undefined,
      name: inputElement.name || element.getAttribute('name') || undefined,
      value: inputElement.value || undefined
    }
  }

  /**
   * Infer click intent based on element
   */
  private inferClickIntent(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase()
    const className = element.className.toLowerCase()
    const text = element.textContent?.toLowerCase() || ''
    const id = element.id.toLowerCase()

    // Button intents
    if (tagName === 'button') {
      if (text.includes('submit') || text.includes('login') || text.includes('sign in')) {
        return 'submit_form'
      }
      if (text.includes('filter') || text.includes('search')) {
        return 'apply_filter'
      }
      if (text.includes('download')) {
        return 'download_file'
      }
      return 'click_button'
    }

    // Link intents
    if (tagName === 'a') {
      if (text.includes('logout') || text.includes('sign out')) {
        return 'logout'
      }
      return 'navigate_link'
    }

    // Input field intents
    if (tagName === 'input') {
      const type = (element as HTMLInputElement).type
      if (type === 'checkbox' || type === 'radio') {
        return 'toggle_option'
      }
      if (type === 'submit') {
        return 'submit_form'
      }
      return 'select_input'
    }

    // Dropdown intents
    if (tagName === 'select') {
      return 'select_option'
    }

    // Generic click
    return 'click_element'
  }

  /**
   * Determine if input should be parameterizable
   */
  private isParameterizableInput(element: HTMLInputElement): boolean {
    const type = element.type
    const name = element.name?.toLowerCase() || ''
    const placeholder = element.placeholder?.toLowerCase() || ''
    const id = element.id?.toLowerCase() || ''
    const value = element.value || ''

    // Skip if value is too short (likely not meaningful)
    if (value.length < 3) return false

    // Skip if it's a password field
    if (type === 'password') return false

    // Skip if it's a search field with generic placeholder
    if (type === 'search' || placeholder.includes('search')) return false

    // Likely parameterizable fields
    const parameterizablePatterns = [
      'client', 'customer', 'job', 'invoice', 'account',
      'email', 'username', 'name', 'id', 'number',
      'date', 'amount', 'quantity', 'reference'
    ]

    return parameterizablePatterns.some(pattern => 
      name.includes(pattern) || 
      id.includes(pattern) || 
      placeholder.includes(pattern)
    )
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'label']
    const tagName = element.tagName.toLowerCase()
    
    if (interactiveTags.includes(tagName)) return true
    
    // Check for interactive attributes
    const hasClickHandler = element.onclick !== null
    const hasRole = element.getAttribute('role')?.includes('button') || 
                   element.getAttribute('role')?.includes('link')
    
    return hasClickHandler || !!hasRole
  }
}

// Export singleton instance
export const enhancedRecorder = new EnhancedRecorder()
