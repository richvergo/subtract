/**
 * Fixed Enhanced Recording System
 * Captures both video and granular user actions for AI analysis
 */

export interface RecordedAction {
  id: string
  timestamp: number
  type: 'click' | 'type' | 'select' | 'navigate' | 'scroll' | 'hover' | 'wait' | 'keydown' | 'change' | 'focus' | 'blur'
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

export class EnhancedRecorderFixed {
  private session: RecordingSession | null = null
  private isRecording = false
  private actionIdCounter = 0
  
  // Store bound event handlers for proper cleanup
  private boundHandlers: {
    click?: (event: MouseEvent) => void
    input?: (event: Event) => void
    keydown?: (event: KeyboardEvent) => void
    change?: (event: Event) => void
    focus?: (event: FocusEvent) => void
    blur?: (event: FocusEvent) => void
    submit?: (event: Event) => void
    beforeunload?: () => void
    scroll?: () => void
    mouseover?: (event: MouseEvent) => void
  } = {}
  
  // Throttling
  private scrollTimeout: NodeJS.Timeout | null = null
  private hoverTimeout: NodeJS.Timeout | null = null
  private lastScrollY = 0
  private lastScrollX = 0

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
    this.lastScrollY = window.scrollY
    this.lastScrollX = window.scrollX

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
    this.boundHandlers.click = (event: MouseEvent) => this.handleClick(event)
    document.addEventListener('click', this.boundHandlers.click, true)
    
    // Input events (typing)
    this.boundHandlers.input = (event: Event) => this.handleInput(event)
    document.addEventListener('input', this.boundHandlers.input, true)
    
    // Keydown events (for better typing detection)
    this.boundHandlers.keydown = (event: KeyboardEvent) => this.handleKeydown(event)
    document.addEventListener('keydown', this.boundHandlers.keydown, true)
    
    // Change events (for dropdowns, checkboxes, etc.)
    this.boundHandlers.change = (event: Event) => this.handleChange(event)
    document.addEventListener('change', this.boundHandlers.change, true)
    
    // Focus/blur events
    this.boundHandlers.focus = (event: FocusEvent) => this.handleFocus(event)
    this.boundHandlers.blur = (event: FocusEvent) => this.handleBlur(event)
    document.addEventListener('focus', this.boundHandlers.focus, true)
    document.addEventListener('blur', this.boundHandlers.blur, true)
    
    // Form submission
    this.boundHandlers.submit = (event: Event) => this.handleSubmit(event)
    document.addEventListener('submit', this.boundHandlers.submit, true)
    
    // Navigation events
    this.boundHandlers.beforeunload = () => this.handleNavigation()
    window.addEventListener('beforeunload', this.boundHandlers.beforeunload)
    
    // Scroll events (throttled)
    this.boundHandlers.scroll = () => this.handleScrollThrottled()
    window.addEventListener('scroll', this.boundHandlers.scroll, true)
    
    // Hover events (throttled)
    this.boundHandlers.mouseover = (event: MouseEvent) => this.handleHoverThrottled(event)
    document.addEventListener('mouseover', this.boundHandlers.mouseover, true)
    
    console.log('🎯 Event listeners attached for enhanced recording')
  }

  /**
   * Remove event listeners
   */
  private removeActionListeners(): void {
    if (this.boundHandlers.click) {
      document.removeEventListener('click', this.boundHandlers.click, true)
    }
    if (this.boundHandlers.input) {
      document.removeEventListener('input', this.boundHandlers.input, true)
    }
    if (this.boundHandlers.keydown) {
      document.removeEventListener('keydown', this.boundHandlers.keydown, true)
    }
    if (this.boundHandlers.change) {
      document.removeEventListener('change', this.boundHandlers.change, true)
    }
    if (this.boundHandlers.focus) {
      document.removeEventListener('focus', this.boundHandlers.focus, true)
    }
    if (this.boundHandlers.blur) {
      document.removeEventListener('blur', this.boundHandlers.blur, true)
    }
    if (this.boundHandlers.submit) {
      document.removeEventListener('submit', this.boundHandlers.submit, true)
    }
    if (this.boundHandlers.beforeunload) {
      window.removeEventListener('beforeunload', this.boundHandlers.beforeunload)
    }
    if (this.boundHandlers.scroll) {
      window.removeEventListener('scroll', this.boundHandlers.scroll, true)
    }
    if (this.boundHandlers.mouseover) {
      document.removeEventListener('mouseover', this.boundHandlers.mouseover, true)
    }
    
    // Clear timeouts
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
      this.scrollTimeout = null
    }
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout)
      this.hoverTimeout = null
    }
    
    console.log('🧹 Event listeners removed from enhanced recording')
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
    console.log('🖱️ Click captured:', action.type, action.element?.tagName, action.element?.text?.substring(0, 20))
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
    console.log('⌨️ Input captured:', action.element?.tagName, action.value?.substring(0, 20))
  }

  /**
   * Handle keydown events
   */
  private handleKeydown(event: KeyboardEvent): void {
    if (!this.isRecording || !this.session) return

    // Only capture significant keys (not arrow keys, tab, etc.)
    if (event.key.length === 1 || ['Enter', 'Space', 'Backspace', 'Delete'].includes(event.key)) {
      const target = event.target as HTMLElement
      const action: RecordedAction = {
        id: this.generateActionId(),
        timestamp: Date.now() - this.session.startTime,
        type: 'keydown',
        selector: this.generateSelector(target),
        element: this.getElementInfo(target),
        intent: `key_${event.key.toLowerCase()}`
      }

      this.session.actions.push(action)
      console.log('⌨️ Key captured:', event.key, action.element?.tagName)
    }
  }

  /**
   * Handle change events (dropdowns, checkboxes, etc.)
   */
  private handleChange(event: Event): void {
    if (!this.isRecording || !this.session) return

    const target = event.target as HTMLElement
    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'change',
      selector: this.generateSelector(target),
      value: (target as any).value || '',
      element: this.getElementInfo(target),
      intent: 'change_value'
    }

    this.session.actions.push(action)
    console.log('🔄 Change captured:', action.element?.tagName, action.value)
  }

  /**
   * Handle focus events
   */
  private handleFocus(event: FocusEvent): void {
    if (!this.isRecording || !this.session) return

    const target = event.target as HTMLElement
    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'focus',
      selector: this.generateSelector(target),
      element: this.getElementInfo(target),
      intent: 'focus_element'
    }

    this.session.actions.push(action)
    console.log('🎯 Focus captured:', action.element?.tagName)
  }

  /**
   * Handle blur events
   */
  private handleBlur(event: FocusEvent): void {
    if (!this.isRecording || !this.session) return

    const target = event.target as HTMLElement
    const action: RecordedAction = {
      id: this.generateActionId(),
      timestamp: Date.now() - this.session.startTime,
      type: 'blur',
      selector: this.generateSelector(target),
      element: this.getElementInfo(target),
      intent: 'blur_element'
    }

    this.session.actions.push(action)
    console.log('👁️ Blur captured:', action.element?.tagName)
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
    console.log('📝 Form submission captured:', action.element?.tagName)
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
    console.log('🧭 Navigation captured:', action.url)
  }

  /**
   * Handle scroll events (throttled)
   */
  private handleScrollThrottled(): void {
    if (!this.isRecording || !this.session) return

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }

    // Set new timeout
    this.scrollTimeout = setTimeout(() => {
      this.handleScroll()
    }, 200) // Increased throttle time
  }

  private handleScroll(): void {
    if (!this.isRecording || !this.session) return

    // Only record significant scrolls (more than 50px)
    const scrollDeltaX = Math.abs(window.scrollX - this.lastScrollX)
    const scrollDeltaY = Math.abs(window.scrollY - this.lastScrollY)
    
    if (scrollDeltaX > 50 || scrollDeltaY > 50) {
      const action: RecordedAction = {
        id: this.generateActionId(),
        timestamp: Date.now() - this.session.startTime,
        type: 'scroll',
        coordinates: { x: window.scrollX, y: window.scrollY },
        intent: 'scroll_page'
      }

      this.session.actions.push(action)
      console.log('📜 Scroll captured:', action.coordinates)
      
      this.lastScrollX = window.scrollX
      this.lastScrollY = window.scrollY
    }
  }

  /**
   * Handle hover events (throttled)
   */
  private handleHoverThrottled(event: MouseEvent): void {
    if (!this.isRecording || !this.session) return

    // Clear existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout)
    }

    // Set new timeout
    this.hoverTimeout = setTimeout(() => {
      this.handleHover(event)
    }, 300) // Reduced throttle time
  }

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
    console.log('👆 Hover captured:', action.element?.tagName)
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
export const enhancedRecorderFixed = new EnhancedRecorderFixed()
