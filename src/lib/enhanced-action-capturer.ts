/**
 * Enhanced Action Capturer - Combines all advanced features for maximum accuracy
 * Integrates DOM observation, visual detection, context awareness, and smart selectors
 */

import { RecordedAction } from './action-capturer';
import { AdvancedDOMObserver, DOMChange } from './advanced-dom-observer';
import { VisualElementDetector, VisualElement } from './visual-element-detector';
import { ContextAwareCapturer, ContextualAction } from './context-aware-capturer';
import { SmartSelectorGenerator, GeneratedSelector } from './smart-selector-generator';

export interface EnhancedRecordingSession {
  id: string;
  startTime: number;
  endTime?: number;
  url: string;
  actions: ContextualAction[];
  domChanges: DOMChange[];
  visualElements: VisualElement[];
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    recordingDuration: number;
    pageTitle: string;
    totalElements: number;
    interactiveElements: number;
  };
  quality: {
    overallScore: number;
    actionQuality: number;
    selectorQuality: number;
    contextQuality: number;
    stabilityScore: number;
  };
}

export class EnhancedActionCapturer {
  private domObserver: AdvancedDOMObserver;
  private contextCapturer: ContextAwareCapturer;
  private isCapturing = false;
  private sessionId: string;
  private startTime: number;
  private currentUrl: string;
  private eventListeners: Array<{ element: EventTarget; event: string; handler: EventListener }> = [];

  constructor() {
    this.domObserver = new AdvancedDOMObserver();
    this.contextCapturer = new ContextAwareCapturer();
    this.sessionId = `enhanced_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    this.currentUrl = window.location.href;
  }

  /**
   * Start enhanced action capture
   */
  startCapture(): void {
    if (this.isCapturing) {
      console.warn('Enhanced action capture already started');
      return;
    }

    console.log('🎬 Starting enhanced action capture...');
    this.isCapturing = true;

    // Start DOM observation
    this.domObserver.startObserving();

    // Add enhanced event listeners
    this.addEnhancedClickListeners();
    this.addEnhancedInputListeners();
    this.addEnhancedNavigationListeners();
    this.addEnhancedScrollListeners();
    this.addEnhancedKeyboardListeners();
    this.addEnhancedFocusListeners();
    this.addEnhancedHoverListeners();

    // Capture initial state
    this.captureInitialState();

    console.log('✅ Enhanced action capture started with all features');
  }

  /**
   * Stop enhanced action capture
   */
  stopCapture(): EnhancedRecordingSession {
    if (!this.isCapturing) {
      console.warn('Enhanced action capture not started');
      return this.getEmptySession();
    }

    console.log('🛑 Stopping enhanced action capture...');
    this.isCapturing = false;

    // Stop DOM observation
    const domChanges = this.domObserver.stopObserving();

    // Remove all event listeners
    this.removeAllListeners();

    // Get visual elements
    const visualElements = VisualElementDetector.detectElements();

    // Update context capturer
    this.contextCapturer.updateDOMChanges(domChanges);
    this.contextCapturer.updateVisualElements(visualElements);

    // Get enhanced actions
    const actions = this.contextCapturer.getActionHistory();
    const enhancedActions = actions.map(action => this.contextCapturer.enhanceAction(action));

    // Create enhanced session
    const session = this.createEnhancedSession(enhancedActions, domChanges, visualElements);

    console.log(`📊 Enhanced capture complete: ${enhancedActions.length} actions, ${domChanges.length} DOM changes, ${visualElements.length} visual elements`);
    
    return session;
  }

  /**
   * Get current session data
   */
  getSession(): EnhancedRecordingSession {
    const actions = this.contextCapturer.getActionHistory();
    const enhancedActions = actions.map(action => this.contextCapturer.enhanceAction(action));
    const domChanges = this.domObserver.getChangesSummary();
    const visualElements = VisualElementDetector.detectElements();

    return this.createEnhancedSession(enhancedActions, domChanges.recentChanges, visualElements);
  }

  /**
   * Add enhanced click listeners
   */
  private addEnhancedClickListeners(): void {
    const clickHandler = (event: MouseEvent) => {
      if (!this.isCapturing) return;

      const target = event.target as HTMLElement;
      if (!target || this.isRecordingUI(target)) return;

      // Generate smart selector
      const selectorInfo = SmartSelectorGenerator.generateSelector(target);
      
      // Create enhanced action
      const action: RecordedAction = {
        id: `enhanced_action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        step: this.contextCapturer.getActionHistory().length + 1,
        action: 'click',
        target: selectorInfo.primary,
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
          outerHTML: target.outerHTML,
          // Enhanced metadata
          selectorAlternatives: selectorInfo.alternatives,
          selectorConfidence: selectorInfo.confidence,
          selectorStability: selectorInfo.stability,
          selectorUniqueness: selectorInfo.uniqueness,
          selectorMaintainability: selectorInfo.maintainability
        }
      };

      this.contextCapturer.getActionHistory().push(action);
      console.log(`🖱️ Enhanced click captured: ${action.target} (${selectorInfo.stability} stability)`);
    };

    document.addEventListener('click', clickHandler, true);
    this.eventListeners.push({ element: document, event: 'click', handler: clickHandler });
  }

  /**
   * Add enhanced input listeners
   */
  private addEnhancedInputListeners(): void {
    const inputHandler = (event: Event) => {
      if (!this.isCapturing) return;

      const target = event.target as HTMLInputElement;
      if (!target || !this.isInputElement(target) || this.isRecordingUI(target)) return;

      // Generate smart selector
      const selectorInfo = SmartSelectorGenerator.generateSelector(target);
      
      const action: RecordedAction = {
        id: `enhanced_action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        step: this.contextCapturer.getActionHistory().length + 1,
        action: 'type',
        target: selectorInfo.primary,
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
          outerHTML: target.outerHTML,
          // Enhanced metadata
          selectorAlternatives: selectorInfo.alternatives,
          selectorConfidence: selectorInfo.confidence,
          selectorStability: selectorInfo.stability,
          selectorUniqueness: selectorInfo.uniqueness,
          selectorMaintainability: selectorInfo.maintainability,
          inputType: target.type,
          isRequired: target.required,
          hasValidation: target.hasAttribute('pattern') || target.hasAttribute('required')
        }
      };

      this.contextCapturer.getActionHistory().push(action);
      console.log(`⌨️ Enhanced input captured: ${action.target} = "${action.value}" (${selectorInfo.stability} stability)`);
    };

    document.addEventListener('input', inputHandler, true);
    this.eventListeners.push({ element: document, event: 'input', handler: inputHandler });
  }

  /**
   * Add enhanced navigation listeners
   */
  private addEnhancedNavigationListeners(): void {
    const navigationHandler = () => {
      if (!this.isCapturing) return;

      const newUrl = window.location.href;
      if (newUrl !== this.currentUrl) {
        this.currentUrl = newUrl;

        const action: RecordedAction = {
          id: `enhanced_action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          step: this.contextCapturer.getActionHistory().length + 1,
          action: 'navigate',
          target: newUrl,
          url: newUrl,
          timestamp: Date.now(),
          metadata: {
            previousUrl: this.currentUrl,
            pageTitle: document.title,
            referrer: document.referrer
          }
        };

        this.contextCapturer.getActionHistory().push(action);
        console.log(`🧭 Enhanced navigation captured: ${newUrl}`);
      }
    };

    window.addEventListener('popstate', navigationHandler);
    this.eventListeners.push({ element: window, event: 'popstate', handler: navigationHandler });
  }

  /**
   * Add enhanced scroll listeners
   */
  private addEnhancedScrollListeners(): void {
    let scrollTimeout: NodeJS.Timeout;

    const scrollHandler = () => {
      if (!this.isCapturing) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const action: RecordedAction = {
          id: `enhanced_action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          step: this.contextCapturer.getActionHistory().length + 1,
          action: 'scroll',
          target: 'window',
          url: window.location.href,
          timestamp: Date.now(),
          metadata: {
            x: window.scrollX,
            y: window.scrollY,
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight
          }
        };

        this.contextCapturer.getActionHistory().push(action);
        console.log(`📜 Enhanced scroll captured: ${window.scrollX}, ${window.scrollY}`);
      }, 100);
    };

    window.addEventListener('scroll', scrollHandler, true);
    this.eventListeners.push({ element: window, event: 'scroll', handler: scrollHandler });
  }

  /**
   * Add enhanced keyboard listeners
   */
  private addEnhancedKeyboardListeners(): void {
    const keyHandler = (event: KeyboardEvent) => {
      if (!this.isCapturing) return;

      const importantKeys = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F5'];
      if (!importantKeys.includes(event.key)) return;

      const target = event.target as HTMLElement;
      if (!target || this.isRecordingUI(target)) return;

      const action: RecordedAction = {
        id: `enhanced_action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        step: this.contextCapturer.getActionHistory().length + 1,
        action: 'type',
        target: this.generateSelector(target),
        value: event.key,
        url: window.location.href,
        elementType: target.tagName.toLowerCase(),
        timestamp: Date.now(),
        metadata: {
          tagName: target.tagName,
          className: target.className,
          id: target.id,
          keyCode: event.keyCode,
          key: event.key,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey
        }
      };

      this.contextCapturer.getActionHistory().push(action);
      console.log(`⌨️ Enhanced key captured: ${event.key} on ${action.target}`);
    };

    document.addEventListener('keydown', keyHandler, true);
    this.eventListeners.push({ element: document, event: 'keydown', handler: keyHandler });
  }

  /**
   * Add enhanced focus listeners
   */
  private addEnhancedFocusListeners(): void {
    const focusHandler = (event: FocusEvent) => {
      if (!this.isCapturing) return;

      const target = event.target as HTMLElement;
      if (!target || this.isRecordingUI(target)) return;

      const action: RecordedAction = {
        id: `enhanced_action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        step: this.contextCapturer.getActionHistory().length + 1,
        action: 'focus',
        target: this.generateSelector(target),
        url: window.location.href,
        elementType: target.tagName.toLowerCase(),
        timestamp: Date.now(),
        metadata: {
          tagName: target.tagName,
          className: target.className,
          id: target.id,
          tabIndex: target.tabIndex
        }
      };

      this.contextCapturer.getActionHistory().push(action);
      console.log(`🎯 Enhanced focus captured: ${action.target}`);
    };

    document.addEventListener('focus', focusHandler, true);
    this.eventListeners.push({ element: document, event: 'focus', handler: focusHandler });
  }

  /**
   * Add enhanced hover listeners
   */
  private addEnhancedHoverListeners(): void {
    const hoverHandler = (event: MouseEvent) => {
      if (!this.isCapturing) return;

      const target = event.target as HTMLElement;
      if (!target || this.isRecordingUI(target)) return;

      // Only capture hover on interactive elements
      if (!this.isInteractiveElement(target)) return;

      const action: RecordedAction = {
        id: `enhanced_action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        step: this.contextCapturer.getActionHistory().length + 1,
        action: 'hover',
        target: this.generateSelector(target),
        url: window.location.href,
        elementType: target.tagName.toLowerCase(),
        timestamp: Date.now(),
        metadata: {
          x: event.clientX,
          y: event.clientY,
          tagName: target.tagName,
          className: target.className,
          id: target.id
        }
      };

      this.contextCapturer.getActionHistory().push(action);
      console.log(`🖱️ Enhanced hover captured: ${action.target}`);
    };

    document.addEventListener('mouseover', hoverHandler, true);
    this.eventListeners.push({ element: document, event: 'mouseover', handler: hoverHandler });
  }

  /**
   * Capture initial state
   */
  private captureInitialState(): void {
    const action: RecordedAction = {
      id: `enhanced_action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      step: 0,
      action: 'screenshot',
      target: 'page',
      url: window.location.href,
      timestamp: Date.now(),
      metadata: {
        pageTitle: document.title,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        totalElements: document.querySelectorAll('*').length,
        interactiveElements: document.querySelectorAll('button, input, select, textarea, a').length
      }
    };

    this.contextCapturer.getActionHistory().push(action);
    console.log('📸 Initial state captured');
  }

  /**
   * Create enhanced session
   */
  private createEnhancedSession(
    actions: ContextualAction[],
    domChanges: DOMChange[],
    visualElements: VisualElement[]
  ): EnhancedRecordingSession {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Calculate quality scores
    const quality = this.calculateQualityScores(actions, domChanges, visualElements);

    return {
      id: this.sessionId,
      startTime: this.startTime,
      endTime,
      url: this.currentUrl,
      actions,
      domChanges,
      visualElements,
      metadata: {
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        recordingDuration: duration,
        pageTitle: document.title,
        totalElements: document.querySelectorAll('*').length,
        interactiveElements: document.querySelectorAll('button, input, select, textarea, a').length
      },
      quality
    };
  }

  /**
   * Calculate quality scores
   */
  private calculateQualityScores(
    actions: ContextualAction[],
    domChanges: DOMChange[],
    visualElements: VisualElement[]
  ): EnhancedRecordingSession['quality'] {
    const actionQuality = actions.length > 0 ? actions.reduce((sum, action) => sum + action.confidence, 0) / actions.length : 0;
    const selectorQuality = actions.length > 0 ? actions.reduce((sum, action) => {
      const stability = action.metadata?.selectorStability === 'high' ? 1 : action.metadata?.selectorStability === 'medium' ? 0.7 : 0.3;
      return sum + stability;
    }, 0) / actions.length : 0;
    const contextQuality = actions.length > 0 ? actions.reduce((sum, action) => sum + (action.context ? 1 : 0), 0) / actions.length : 0;
    const stabilityScore = this.calculateStabilityScore(actions, domChanges);
    const overallScore = (actionQuality + selectorQuality + contextQuality + stabilityScore) / 4;

    return {
      overallScore,
      actionQuality,
      selectorQuality,
      contextQuality,
      stabilityScore
    };
  }

  /**
   * Calculate stability score
   */
  private calculateStabilityScore(actions: ContextualAction[], domChanges: DOMChange[]): number {
    let stabilityScore = 0;
    
    // Check for stable selectors
    const stableSelectors = actions.filter(action => 
      action.metadata?.selectorStability === 'high'
    ).length;
    
    stabilityScore += (stableSelectors / actions.length) * 0.5;
    
    // Check for minimal DOM changes
    const changeRate = domChanges.length / (actions.length || 1);
    stabilityScore += Math.max(0, 1 - changeRate) * 0.5;
    
    return Math.min(1.0, stabilityScore);
  }

  /**
   * Generate selector for element
   */
  private generateSelector(element: HTMLElement): string {
    const selectorInfo = SmartSelectorGenerator.generateSelector(element);
    return selectorInfo.primary;
  }

  /**
   * Get element text
   */
  private getElementText(element: HTMLElement): string {
    if (!element) return '';

    if (element.tagName === 'INPUT') {
      const input = element as HTMLInputElement;
      return input.placeholder || input.value || '';
    }

    if (element.tagName === 'BUTTON') {
      return element.textContent?.trim() || '';
    }

    const text = element.textContent?.trim() || '';
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  /**
   * Check if element is input element
   */
  private isInputElement(element: HTMLElement): boolean {
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(element.tagName.toLowerCase());
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
    const interactiveRoles = ['button', 'link', 'textbox', 'combobox'];
    
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveRoles.includes(element.getAttribute('role') || '') ||
           element.hasAttribute('onclick') ||
           element.hasAttribute('tabindex');
  }

  /**
   * Check if element is part of recording UI
   */
  private isRecordingUI(element: HTMLElement): boolean {
    if (!element) return false;

    const recordingUI = document.querySelector('[data-recording-ui]');
    if (recordingUI && recordingUI.contains(element)) {
      return true;
    }

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
   * Get empty session
   */
  private getEmptySession(): EnhancedRecordingSession {
    return {
      id: this.sessionId,
      startTime: this.startTime,
      endTime: Date.now(),
      url: this.currentUrl,
      actions: [],
      domChanges: [],
      visualElements: [],
      metadata: {
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        recordingDuration: 0,
        pageTitle: document.title,
        totalElements: 0,
        interactiveElements: 0
      },
      quality: {
        overallScore: 0,
        actionQuality: 0,
        selectorQuality: 0,
        contextQuality: 0,
        stabilityScore: 0
      }
    };
  }
}
