/**
 * Context-Aware Action Capturer - Understands user intent and context
 * Provides intelligent action interpretation and enhancement
 */

import { RecordedAction } from './action-capturer';
import { DOMChange } from './advanced-dom-observer';
import { VisualElement } from './visual-element-detector';

export interface ContextualAction extends RecordedAction {
  context: {
    userIntent: string;
    workflowStep: number;
    pageContext: {
      title: string;
      url: string;
      formCount: number;
      buttonCount: number;
      inputCount: number;
    };
    elementContext: {
      isFormElement: boolean;
      isNavigationElement: boolean;
      isInteractiveElement: boolean;
      hasValidation: boolean;
      isRequired: boolean;
    };
    temporalContext: {
      timeSinceLastAction: number;
      actionSequence: string[];
      isRapidFire: boolean;
    };
    semanticContext: {
      actionCategory: 'navigation' | 'input' | 'submission' | 'selection' | 'interaction';
      businessIntent: string;
      expectedOutcome: string;
    };
  };
  confidence: number;
  alternatives: string[];
  suggestions: string[];
}

export class ContextAwareCapturer {
  private actionHistory: RecordedAction[] = [];
  private domChanges: DOMChange[] = [];
  private visualElements: VisualElement[] = [];
  private workflowStep = 0;
  private lastActionTime = 0;

  /**
   * Enhance action with context awareness
   */
  enhanceAction(action: RecordedAction): ContextualAction {
    this.actionHistory.push(action);
    this.workflowStep++;
    
    const context = this.buildContext(action);
    const userIntent = this.inferUserIntent(action, context);
    const confidence = this.calculateContextualConfidence(action, context);
    const alternatives = this.generateAlternatives(action, context);
    const suggestions = this.generateSuggestions(action, context);

    return {
      ...action,
      context: {
        userIntent,
        workflowStep: this.workflowStep,
        pageContext: this.getPageContext(),
        elementContext: this.getElementContext(action),
        temporalContext: this.getTemporalContext(action),
        semanticContext: this.getSemanticContext(action, userIntent)
      },
      confidence,
      alternatives,
      suggestions
    };
  }

  /**
   * Build comprehensive context for an action
   */
  private buildContext(action: RecordedAction): any {
    return {
      actionHistory: this.actionHistory,
      domChanges: this.domChanges,
      visualElements: this.visualElements,
      currentTime: Date.now(),
      pageState: this.getPageState()
    };
  }

  /**
   * Infer user intent from action and context
   */
  private inferUserIntent(action: RecordedAction, context: any): string {
    const actionType = action.action;
    const target = action.target;
    const value = action.value;
    const previousActions = this.actionHistory.slice(-3);

    // Navigation intent
    if (actionType === 'navigate') {
      return `Navigate to ${target}`;
    }

    // Form interaction intent
    if (actionType === 'type') {
      if (target?.includes('email') || target?.includes('username')) {
        return 'Enter login credentials';
      }
      if (target?.includes('password')) {
        return 'Enter password';
      }
      if (target?.includes('search')) {
        return 'Search for information';
      }
      if (target?.includes('comment') || target?.includes('message')) {
        return 'Enter text content';
      }
      return 'Enter form data';
    }

    // Click intent
    if (actionType === 'click') {
      if (target?.includes('submit') || target?.includes('save')) {
        return 'Submit form';
      }
      if (target?.includes('login') || target?.includes('sign')) {
        return 'Authenticate user';
      }
      if (target?.includes('create') || target?.includes('add')) {
        return 'Create new item';
      }
      if (target?.includes('edit') || target?.includes('update')) {
        return 'Modify existing item';
      }
      if (target?.includes('delete') || target?.includes('remove')) {
        return 'Remove item';
      }
      if (target?.includes('next') || target?.includes('continue')) {
        return 'Proceed to next step';
      }
      if (target?.includes('back') || target?.includes('previous')) {
        return 'Return to previous step';
      }
      if (target?.includes('close') || target?.includes('cancel')) {
        return 'Cancel operation';
      }
      return 'Interact with element';
    }

    // Scroll intent
    if (actionType === 'scroll') {
      return 'Navigate page content';
    }

    return 'Perform action';
  }

  /**
   * Calculate contextual confidence
   */
  private calculateContextualConfidence(action: RecordedAction, context: any): number {
    let confidence = 0.5; // Base confidence

    // Element specificity bonus
    if (action.target?.includes('#')) confidence += 0.2;
    if (action.target?.includes('[data-')) confidence += 0.15;
    if (action.target?.includes('[name=')) confidence += 0.1;

    // Action sequence bonus
    const recentActions = this.actionHistory.slice(-3);
    if (this.isLogicalSequence(recentActions)) confidence += 0.1;

    // Temporal consistency bonus
    const timeSinceLastAction = action.timestamp - this.lastActionTime;
    if (timeSinceLastAction > 100 && timeSinceLastAction < 10000) confidence += 0.1;

    // Page context bonus
    if (this.isExpectedAction(action, context)) confidence += 0.1;

    // Element context bonus
    if (action.metadata?.innerText) confidence += 0.05;
    if (action.metadata?.className) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate alternative selectors
   */
  private generateAlternatives(action: RecordedAction, context: any): string[] {
    const alternatives: string[] = [];
    
    if (action.target) {
      // Generate alternatives based on element attributes
      const element = document.querySelector(action.target);
      if (element) {
        // ID alternative
        if (element.id) {
          alternatives.push(`#${element.id}`);
        }
        
        // Class alternatives
        if (element.className) {
          const classes = element.className.split(' ').filter(c => c.length > 0);
          classes.forEach(cls => {
            alternatives.push(`.${cls}`);
          });
        }
        
        // Attribute alternatives
        const attributes = ['name', 'type', 'value', 'placeholder', 'title', 'alt', 'aria-label'];
        attributes.forEach(attr => {
          const value = element.getAttribute(attr);
          if (value) {
            alternatives.push(`[${attr}="${value}"]`);
          }
        });
        
        // Text content alternative
        const textContent = element.textContent?.trim();
        if (textContent && textContent.length < 50) {
          alternatives.push(`:contains("${textContent}")`);
        }
      }
    }

    return alternatives.slice(0, 5); // Limit to 5 alternatives
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(action: RecordedAction, context: any): string[] {
    const suggestions: string[] = [];
    
    // Selector quality suggestions
    if (action.target?.includes('div') || action.target?.includes('span')) {
      suggestions.push('Consider using more specific selectors (IDs, data attributes)');
    }
    
    // Action sequence suggestions
    if (action.action === 'click' && !this.hasRecentInput()) {
      suggestions.push('Consider adding input actions before clicking');
    }
    
    if (action.action === 'type' && !this.hasRecentNavigation()) {
      suggestions.push('Consider navigating to the correct page first');
    }
    
    // Timing suggestions
    const timeSinceLastAction = action.timestamp - this.lastActionTime;
    if (timeSinceLastAction < 100) {
      suggestions.push('Consider adding small delays between rapid actions');
    }
    
    if (timeSinceLastAction > 30000) {
      suggestions.push('Consider breaking long workflows into smaller steps');
    }
    
    // Context suggestions
    if (action.action === 'click' && action.target?.includes('submit')) {
      suggestions.push('Ensure all required form fields are filled before submission');
    }
    
    return suggestions;
  }

  /**
   * Get page context
   */
  private getPageContext(): ContextualAction['context']['pageContext'] {
    const forms = document.querySelectorAll('form');
    const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
    const inputs = document.querySelectorAll('input, textarea, select');
    
    return {
      title: document.title,
      url: window.location.href,
      formCount: forms.length,
      buttonCount: buttons.length,
      inputCount: inputs.length
    };
  }

  /**
   * Get element context
   */
  private getElementContext(action: RecordedAction): ContextualAction['context']['elementContext'] {
    const element = action.target ? document.querySelector(action.target) : null;
    
    return {
      isFormElement: element?.tagName === 'FORM' || element?.closest('form') !== null,
      isNavigationElement: element?.tagName === 'A' || element?.getAttribute('role') === 'link',
      isInteractiveElement: element?.hasAttribute('onclick') || element?.hasAttribute('tabindex'),
      hasValidation: element?.hasAttribute('required') || element?.hasAttribute('pattern'),
      isRequired: element?.hasAttribute('required') || false
    };
  }

  /**
   * Get temporal context
   */
  private getTemporalContext(action: RecordedAction): ContextualAction['context']['temporalContext'] {
    const timeSinceLastAction = action.timestamp - this.lastActionTime;
    const actionSequence = this.actionHistory.slice(-5).map(a => a.action);
    const isRapidFire = timeSinceLastAction < 500;
    
    this.lastActionTime = action.timestamp;
    
    return {
      timeSinceLastAction,
      actionSequence,
      isRapidFire
    };
  }

  /**
   * Get semantic context
   */
  private getSemanticContext(action: RecordedAction, userIntent: string): ContextualAction['context']['semanticContext'] {
    let actionCategory: ContextualAction['context']['semanticContext']['actionCategory'] = 'interaction';
    
    if (action.action === 'navigate') actionCategory = 'navigation';
    else if (action.action === 'type') actionCategory = 'input';
    else if (action.target?.includes('submit')) actionCategory = 'submission';
    else if (action.target?.includes('select')) actionCategory = 'selection';
    
    const businessIntent = this.inferBusinessIntent(userIntent);
    const expectedOutcome = this.predictOutcome(action, userIntent);
    
    return {
      actionCategory,
      businessIntent,
      expectedOutcome
    };
  }

  /**
   * Infer business intent
   */
  private inferBusinessIntent(userIntent: string): string {
    if (userIntent.includes('login') || userIntent.includes('authenticate')) {
      return 'User authentication';
    }
    if (userIntent.includes('search')) {
      return 'Information retrieval';
    }
    if (userIntent.includes('create') || userIntent.includes('add')) {
      return 'Content creation';
    }
    if (userIntent.includes('edit') || userIntent.includes('update')) {
      return 'Content modification';
    }
    if (userIntent.includes('delete') || userIntent.includes('remove')) {
      return 'Content deletion';
    }
    if (userIntent.includes('submit') || userIntent.includes('save')) {
      return 'Data persistence';
    }
    return 'General interaction';
  }

  /**
   * Predict expected outcome
   */
  private predictOutcome(action: RecordedAction, userIntent: string): string {
    if (action.action === 'navigate') {
      return 'Page transition';
    }
    if (action.action === 'type') {
      return 'Form field populated';
    }
    if (action.action === 'click' && action.target?.includes('submit')) {
      return 'Form submission';
    }
    if (action.action === 'click' && action.target?.includes('login')) {
      return 'Authentication attempt';
    }
    return 'Element interaction';
  }

  /**
   * Check if action sequence is logical
   */
  private isLogicalSequence(actions: RecordedAction[]): boolean {
    if (actions.length < 2) return true;
    
    const sequence = actions.map(a => a.action);
    
    // Common logical sequences
    const logicalSequences = [
      ['navigate', 'type', 'type', 'click'],
      ['navigate', 'click', 'type', 'click'],
      ['type', 'click'],
      ['click', 'navigate'],
      ['navigate', 'click']
    ];
    
    return logicalSequences.some(seq => 
      sequence.slice(-seq.length).join(',') === seq.join(',')
    );
  }

  /**
   * Check if action is expected in current context
   */
  private isExpectedAction(action: RecordedAction, context: any): boolean {
    // Check if action makes sense given page state
    if (action.action === 'type' && document.querySelectorAll('input, textarea').length === 0) {
      return false;
    }
    
    if (action.action === 'click' && action.target?.includes('submit') && 
        document.querySelectorAll('form').length === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if there are recent input actions
   */
  private hasRecentInput(): boolean {
    return this.actionHistory.slice(-3).some(a => a.action === 'type');
  }

  /**
   * Check if there are recent navigation actions
   */
  private hasRecentNavigation(): boolean {
    return this.actionHistory.slice(-3).some(a => a.action === 'navigate');
  }

  /**
   * Get current page state
   */
  private getPageState(): any {
    return {
      url: window.location.href,
      title: document.title,
      formCount: document.querySelectorAll('form').length,
      inputCount: document.querySelectorAll('input, textarea, select').length,
      buttonCount: document.querySelectorAll('button, input[type="button"], input[type="submit"]').length
    };
  }

  /**
   * Update DOM changes
   */
  updateDOMChanges(changes: DOMChange[]): void {
    this.domChanges = changes;
  }

  /**
   * Update visual elements
   */
  updateVisualElements(elements: VisualElement[]): void {
    this.visualElements = elements;
  }

  /**
   * Get action history
   */
  getActionHistory(): RecordedAction[] {
    return [...this.actionHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.actionHistory = [];
    this.domChanges = [];
    this.visualElements = [];
    this.workflowStep = 0;
    this.lastActionTime = 0;
  }
}
