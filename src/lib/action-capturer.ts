/**
 * Action Capturer - Real-time capture of user interactions during recording
 * Captures clicks, typing, navigation, and rich DOM metadata
 */

export interface RecordedAction {
  id: string;
  step: number;
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'wait' | 'screenshot';
  target?: string; // CSS selector or XPath
  value?: string; // For typing actions
  url: string; // Current page URL
  elementType?: string; // Type of element (input, button, etc.)
  elementText?: string; // Text content of element
  timestamp: number; // Unix timestamp
  screenshot?: string; // Base64 screenshot data
  metadata?: {
    x?: number; // Mouse position
    y?: number;
    width?: number; // Element dimensions
    height?: number;
    tagName?: string; // HTML tag name
    className?: string; // CSS classes
    id?: string; // Element ID
    placeholder?: string; // Input placeholder
    ariaLabel?: string; // Accessibility label
    innerText?: string; // Element text content
    outerHTML?: string; // Full HTML element
  };
}

export interface RecordingSession {
  id: string;
  startTime: number;
  endTime?: number;
  url: string;
  actions: RecordedAction[];
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    recordingDuration: number;
  };
}

export class ActionCapturer {
  private actions: RecordedAction[] = [];
  private isCapturing = false;
  private stepCounter = 0;
  private sessionId: string;
  private startTime: number;
  private currentUrl: string;
  private eventListeners: Array<{ element: EventTarget; event: string; handler: EventListener }> = [];

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    this.currentUrl = window.location.href;
  }

  /**
   * Start capturing user actions
   */
  startCapture(): void {
    if (this.isCapturing) {
      console.warn('Action capture already started');
      return;
    }

    console.log('🎬 Starting action capture...');
    this.isCapturing = true;
    this.actions = [];
    this.stepCounter = 0;

    // Add event listeners for different types of interactions
    this.addClickListeners();
    this.addInputListeners();
    this.addNavigationListeners();
    this.addScrollListeners();
    this.addKeyboardListeners();

    // Capture initial state
    this.captureScreenshot('Initial page state');
  }

  /**
   * Stop capturing user actions
   */
  stopCapture(): RecordedAction[] {
    if (!this.isCapturing) {
      console.warn('Action capture not started');
      return [];
    }

    console.log('🛑 Stopping action capture...');
    this.isCapturing = false;

    // Remove all event listeners
    this.removeAllListeners();

    // Capture final state
    this.captureScreenshot('Final page state');

    console.log(`📊 Captured ${this.actions.length} actions`);
    return [...this.actions];
  }

  /**
   * Get current session data
   */
  getSession(): RecordingSession {
    return {
      id: this.sessionId,
      startTime: this.startTime,
      endTime: this.isCapturing ? undefined : Date.now(),
      url: this.currentUrl,
      actions: [...this.actions],
      metadata: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        recordingDuration: Date.now() - this.startTime
      }
    };
  }

  /**
   * Add click event listeners
   */
  private addClickListeners(): void {
    const clickHandler = (event: MouseEvent) => {
      if (!this.isCapturing) return;

      const target = event.target as HTMLElement;
      if (!target) return;

      // Skip clicks on recording UI elements
      if (this.isRecordingUI(target)) return;

      const action: RecordedAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        step: ++this.stepCounter,
        action: 'click',
        target: this.generateSelector(target),
        url: window.location.href,
        elementType: target.tagName.toLowerCase(),
        elementText: this.getElementText(target),
        timestamp: Date.now(),
        metadata: {
          x: event.clientX,
          y: event.clientY,
          width: target.offsetWidth,
          height: target.offsetHeight,
          tagName: target.tagName,
          className: target.className,
          id: target.id,
          ariaLabel: target.getAttribute('aria-label') || undefined,
          innerText: target.innerText,
          outerHTML: target.outerHTML
        }
      };

      this.actions.push(action);
      console.log(`🖱️ Captured click: ${action.target} (${action.elementType})`);
    };

    document.addEventListener('click', clickHandler, true);
    this.eventListeners.push({ element: document, event: 'click', handler: clickHandler });
  }

  /**
   * Add input event listeners
   */
  private addInputListeners(): void {
    const inputHandler = (event: Event) => {
      if (!this.isCapturing) return;

      const target = event.target as HTMLInputElement;
      if (!target || !this.isInputElement(target)) return;

      // Skip inputs in recording UI
      if (this.isRecordingUI(target)) return;

      const action: RecordedAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        step: ++this.stepCounter,
        action: 'type',
        target: this.generateSelector(target),
        value: target.value,
        url: window.location.href,
        elementType: target.tagName.toLowerCase(),
        elementText: this.getElementText(target),
        timestamp: Date.now(),
        metadata: {
          width: target.offsetWidth,
          height: target.offsetHeight,
          tagName: target.tagName,
          className: target.className,
          id: target.id,
          placeholder: target.placeholder,
          ariaLabel: target.getAttribute('aria-label') || undefined,
          innerText: target.innerText,
          outerHTML: target.outerHTML
        }
      };

      this.actions.push(action);
      console.log(`⌨️ Captured input: ${action.target} = "${action.value}"`);
    };

    document.addEventListener('input', inputHandler, true);
    this.eventListeners.push({ element: document, event: 'input', handler: inputHandler });
  }

  /**
   * Add navigation event listeners
   */
  private addNavigationListeners(): void {
    const navigationHandler = () => {
      if (!this.isCapturing) return;

      const newUrl = window.location.href;
      if (newUrl !== this.currentUrl) {
        this.currentUrl = newUrl;

        const action: RecordedAction = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          step: ++this.stepCounter,
          action: 'navigate',
          target: newUrl,
          url: newUrl,
          timestamp: Date.now()
        };

        this.actions.push(action);
        console.log(`🧭 Captured navigation: ${newUrl}`);
      }
    };

    window.addEventListener('popstate', navigationHandler);
    this.eventListeners.push({ element: window, event: 'popstate', handler: navigationHandler });
  }

  /**
   * Add scroll event listeners
   */
  private addScrollListeners(): void {
    let scrollTimeout: NodeJS.Timeout;

    const scrollHandler = () => {
      if (!this.isCapturing) return;

      // Debounce scroll events
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const action: RecordedAction = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          step: ++this.stepCounter,
          action: 'scroll',
          target: 'window',
          url: window.location.href,
          timestamp: Date.now(),
          metadata: {
            x: window.scrollX,
            y: window.scrollY
          }
        };

        this.actions.push(action);
        console.log(`📜 Captured scroll: ${window.scrollX}, ${window.scrollY}`);
      }, 100);
    };

    window.addEventListener('scroll', scrollHandler, true);
    this.eventListeners.push({ element: window, event: 'scroll', handler: scrollHandler });
  }

  /**
   * Add keyboard event listeners
   */
  private addKeyboardListeners(): void {
    const keyHandler = (event: KeyboardEvent) => {
      if (!this.isCapturing) return;

      // Only capture important keys (Enter, Tab, Escape, etc.)
      const importantKeys = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!importantKeys.includes(event.key)) return;

      const target = event.target as HTMLElement;
      if (!target || this.isRecordingUI(target)) return;

      const action: RecordedAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        step: ++this.stepCounter,
        action: 'type',
        target: this.generateSelector(target),
        value: event.key,
        url: window.location.href,
        elementType: target.tagName.toLowerCase(),
        timestamp: Date.now(),
        metadata: {
          tagName: target.tagName,
          className: target.className,
          id: target.id
        }
      };

      this.actions.push(action);
      console.log(`⌨️ Captured key: ${event.key} on ${action.target}`);
    };

    document.addEventListener('keydown', keyHandler, true);
    this.eventListeners.push({ element: document, event: 'keydown', handler: keyHandler });
  }

  /**
   * Capture a screenshot
   */
  private captureScreenshot(label: string): void {
    if (!this.isCapturing) return;

    try {
      // Use html2canvas if available, otherwise skip
      if (typeof window !== 'undefined' && (window as any).html2canvas) {
        (window as any).html2canvas(document.body).then((canvas: HTMLCanvasElement) => {
          const screenshot = canvas.toDataURL('image/png');
          
          const action: RecordedAction = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            step: ++this.stepCounter,
            action: 'screenshot',
            target: 'page',
            url: window.location.href,
            timestamp: Date.now(),
            screenshot,
            metadata: {
              width: canvas.width,
              height: canvas.height
            }
          };

          this.actions.push(action);
          console.log(`📸 Captured screenshot: ${label}`);
        });
      }
    } catch (error) {
      console.warn('Failed to capture screenshot:', error);
    }
  }

  /**
   * Generate a CSS selector for an element
   */
  private generateSelector(element: HTMLElement): string {
    if (!element || element === document.body) return 'body';

    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }

    // Try data attributes
    const dataTestId = element.getAttribute('data-testid');
    if (dataTestId) {
      return `[data-testid="${dataTestId}"]`;
    }

    const dataCy = element.getAttribute('data-cy');
    if (dataCy) {
      return `[data-cy="${dataCy}"]`;
    }

    // Try name attribute for form elements
    const name = element.getAttribute('name');
    if (name) {
      return `[name="${name}"]`;
    }

    // Try class names
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }

    // Fallback to tag name with position
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      if (index >= 0) {
        return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
      }
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Get text content of an element
   */
  private getElementText(element: HTMLElement): string {
    if (!element) return '';

    // For input elements, return placeholder or value
    if (element.tagName === 'INPUT') {
      const input = element as HTMLInputElement;
      return input.placeholder || input.value || '';
    }

    // For buttons, return text content
    if (element.tagName === 'BUTTON') {
      return element.textContent?.trim() || '';
    }

    // For other elements, return text content (limited length)
    const text = element.textContent?.trim() || '';
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  /**
   * Check if element is an input element
   */
  private isInputElement(element: HTMLElement): boolean {
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(element.tagName.toLowerCase());
  }

  /**
   * Check if element is part of recording UI
   */
  private isRecordingUI(element: HTMLElement): boolean {
    if (!element) return false;

    // Check if element is inside recording UI
    const recordingUI = document.querySelector('[data-recording-ui]');
    if (recordingUI && recordingUI.contains(element)) {
      return true;
    }

    // Check for common recording UI classes/IDs
    const recordingSelectors = [
      '[data-testid*="recording"]',
      '[data-cy*="recording"]',
      '.recording-ui',
      '#recording-ui'
    ];

    return recordingSelectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector) !== null;
      } catch {
        return false;
      }
    });
  }

  /**
   * Remove all event listeners
   */
  private removeAllListeners(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler, true);
    });
    this.eventListeners = [];
  }

  /**
   * Get current actions count
   */
  getActionsCount(): number {
    return this.actions.length;
  }

  /**
   * Get actions by type
   */
  getActionsByType(type: RecordedAction['action']): RecordedAction[] {
    return this.actions.filter(action => action.action === type);
  }

  /**
   * Clear all captured actions
   */
  clearActions(): void {
    this.actions = [];
    this.stepCounter = 0;
  }
}
