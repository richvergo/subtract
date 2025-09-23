/**
 * Advanced DOM Mutation Observer - Captures dynamic content changes
 * Tracks element additions, removals, attribute changes, and text modifications
 */

export interface DOMChange {
  id: string;
  type: 'added' | 'removed' | 'modified' | 'moved';
  element: {
    tagName: string;
    id?: string;
    className?: string;
    attributes: Record<string, string>;
    textContent?: string;
    selector: string;
    position: { x: number; y: number; width: number; height: number };
  };
  timestamp: number;
  context: {
    parentSelector: string;
    siblingSelectors: string[];
    pageUrl: string;
    viewport: { width: number; height: number };
  };
}

export class AdvancedDOMObserver {
  private observer: MutationObserver | null = null;
  private changes: DOMChange[] = [];
  private isObserving = false;
  private changeCounter = 0;

  /**
   * Start observing DOM changes
   */
  startObserving(): void {
    if (this.isObserving) return;

    this.isObserving = true;
    this.changes = [];
    this.changeCounter = 0;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        this.processMutation(mutation);
      });
    });

    // Observe all types of changes
    this.observer.observe(document.body, {
      childList: true,        // Node additions/removals
      subtree: true,         // Observe all descendants
      attributes: true,      // Attribute changes
      attributeOldValue: true, // Track old attribute values
      characterData: true,   // Text content changes
      characterDataOldValue: true, // Track old text values
      attributeFilter: [     // Specific attributes to watch
        'class', 'id', 'style', 'data-*', 'aria-*', 'role', 'tabindex'
      ]
    });

    console.log('🔍 Advanced DOM Observer started');
  }

  /**
   * Stop observing DOM changes
   */
  stopObserving(): DOMChange[] {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isObserving = false;
    
    console.log(`🔍 DOM Observer stopped - captured ${this.changes.length} changes`);
    return [...this.changes];
  }

  /**
   * Process a single mutation
   */
  private processMutation(mutation: MutationRecord): void {
    const timestamp = Date.now();

    // Handle added nodes
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          this.changes.push(this.createDOMChange('added', element, timestamp));
        }
      });
    }

    // Handle removed nodes
    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          this.changes.push(this.createDOMChange('removed', element, timestamp));
        }
      });
    }

    // Handle attribute changes
    if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
      const element = mutation.target as Element;
      this.changes.push(this.createDOMChange('modified', element, timestamp, {
        attributeName: mutation.attributeName,
        oldValue: mutation.oldValue
      }));
    }

    // Handle text content changes
    if (mutation.type === 'characterData') {
      const element = mutation.target.parentElement;
      if (element) {
        this.changes.push(this.createDOMChange('modified', element, timestamp, {
          textChange: true,
          oldValue: mutation.oldValue
        }));
      }
    }
  }

  /**
   * Create a DOM change record
   */
  private createDOMChange(
    type: DOMChange['type'],
    element: Element,
    timestamp: number,
    metadata?: any
  ): DOMChange {
    const rect = element.getBoundingClientRect();
    const selector = this.generateRobustSelector(element);
    
    return {
      id: `dom_change_${timestamp}_${++this.changeCounter}`,
      type,
      element: {
        tagName: element.tagName.toLowerCase(),
        id: element.id || undefined,
        className: element.className || undefined,
        attributes: this.getElementAttributes(element),
        textContent: element.textContent?.substring(0, 100) || undefined,
        selector,
        position: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        }
      },
      timestamp,
      context: {
        parentSelector: element.parentElement ? this.generateRobustSelector(element.parentElement) : '',
        siblingSelectors: this.getSiblingSelectors(element),
        pageUrl: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };
  }

  /**
   * Generate a robust selector for an element
   */
  private generateRobustSelector(element: Element): string {
    if (!element || element === document.body) return 'body';

    // Try ID first (most reliable)
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

    // Try role attribute
    const role = element.getAttribute('role');
    if (role) {
      return `[role="${role}"]`;
    }

    // Try aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return `[aria-label="${ariaLabel}"]`;
    }

    // Try class names (prefer unique ones)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        // Use the most specific class
        const specificClass = classes.find(c => 
          c.includes('button') || c.includes('input') || c.includes('form') ||
          c.includes('nav') || c.includes('menu') || c.includes('item')
        ) || classes[0];
        return `.${specificClass}`;
      }
    }

    // Fallback to tag with position
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
   * Get element attributes
   */
  private getElementAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attrs = element.attributes;
    
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      attributes[attr.name] = attr.value;
    }
    
    return attributes;
  }

  /**
   * Get sibling selectors for context
   */
  private getSiblingSelectors(element: Element): string[] {
    const parent = element.parentElement;
    if (!parent) return [];

    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element);
    
    if (index === -1) return [];

    return siblings
      .filter((_, i) => i !== index)
      .slice(0, 3) // Limit to 3 siblings
      .map(sibling => this.generateRobustSelector(sibling));
  }

  /**
   * Get current changes count
   */
  getChangesCount(): number {
    return this.changes.length;
  }

  /**
   * Get changes by type
   */
  getChangesByType(type: DOMChange['type']): DOMChange[] {
    return this.changes.filter(change => change.type === type);
  }

  /**
   * Clear all changes
   */
  clearChanges(): void {
    this.changes = [];
    this.changeCounter = 0;
  }

  /**
   * Get changes summary
   */
  getChangesSummary(): {
    total: number;
    byType: Record<string, number>;
    recentChanges: DOMChange[];
  } {
    const byType: Record<string, number> = {};
    this.changes.forEach(change => {
      byType[change.type] = (byType[change.type] || 0) + 1;
    });

    return {
      total: this.changes.length,
      byType,
      recentChanges: this.changes.slice(-10) // Last 10 changes
    };
  }
}
