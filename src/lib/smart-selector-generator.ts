/**
 * Smart Selector Generator - Generates robust, maintainable selectors
 * Prioritizes stability and uniqueness over simplicity
 */

export interface SelectorOptions {
  prioritizeId: boolean;
  prioritizeDataAttributes: boolean;
  prioritizeSemanticAttributes: boolean;
  includeTextContent: boolean;
  includePosition: boolean;
  maxComplexity: number;
}

export interface GeneratedSelector {
  primary: string;
  alternatives: string[];
  confidence: number;
  stability: 'high' | 'medium' | 'low';
  uniqueness: 'unique' | 'multiple' | 'ambiguous';
  maintainability: 'excellent' | 'good' | 'fair' | 'poor';
  reasoning: string[];
}

export class SmartSelectorGenerator {
  private static readonly DEFAULT_OPTIONS: SelectorOptions = {
    prioritizeId: true,
    prioritizeDataAttributes: true,
    prioritizeSemanticAttributes: true,
    includeTextContent: false,
    includePosition: false,
    maxComplexity: 3
  };

  /**
   * Generate smart selector for an element
   */
  static generateSelector(
    element: Element, 
    options: Partial<SelectorOptions> = {}
  ): GeneratedSelector {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const selectors: string[] = [];
    const reasoning: string[] = [];
    let confidence = 0;

    // 1. ID selector (highest priority)
    if (opts.prioritizeId && element.id) {
      const idSelector = `#${element.id}`;
      selectors.push(idSelector);
      reasoning.push(`Using unique ID: ${element.id}`);
      confidence += 0.4;
    }

    // 2. Data attributes (high priority)
    if (opts.prioritizeDataAttributes) {
      const dataSelectors = this.generateDataAttributeSelectors(element);
      selectors.push(...dataSelectors);
      if (dataSelectors.length > 0) {
        reasoning.push(`Using data attributes: ${dataSelectors.join(', ')}`);
        confidence += 0.3;
      }
    }

    // 3. Semantic attributes
    if (opts.prioritizeSemanticAttributes) {
      const semanticSelectors = this.generateSemanticSelectors(element);
      selectors.push(...semanticSelectors);
      if (semanticSelectors.length > 0) {
        reasoning.push(`Using semantic attributes: ${semanticSelectors.join(', ')}`);
        confidence += 0.2;
      }
    }

    // 4. Role-based selectors
    const roleSelectors = this.generateRoleSelectors(element);
    selectors.push(...roleSelectors);
    if (roleSelectors.length > 0) {
      reasoning.push(`Using role attributes: ${roleSelectors.join(', ')}`);
      confidence += 0.15;
    }

    // 5. Class-based selectors
    const classSelectors = this.generateClassSelectors(element);
    selectors.push(...classSelectors);
    if (classSelectors.length > 0) {
      reasoning.push(`Using class attributes: ${classSelectors.join(', ')}`);
      confidence += 0.1;
    }

    // 6. Text content selectors
    if (opts.includeTextContent) {
      const textSelectors = this.generateTextSelectors(element);
      selectors.push(...textSelectors);
      if (textSelectors.length > 0) {
        reasoning.push(`Using text content: ${textSelectors.join(', ')}`);
        confidence += 0.05;
      }
    }

    // 7. Position-based selectors (fallback)
    if (opts.includePosition) {
      const positionSelectors = this.generatePositionSelectors(element);
      selectors.push(...positionSelectors);
      if (positionSelectors.length > 0) {
        reasoning.push(`Using position: ${positionSelectors.join(', ')}`);
        confidence += 0.05;
      }
    }

    // 8. Hierarchical selectors
    const hierarchicalSelectors = this.generateHierarchicalSelectors(element);
    selectors.push(...hierarchicalSelectors);
    if (hierarchicalSelectors.length > 0) {
      reasoning.push(`Using hierarchy: ${hierarchicalSelectors.join(', ')}`);
      confidence += 0.1;
    }

    // Remove duplicates and validate selectors
    const uniqueSelectors = [...new Set(selectors)];
    const validSelectors = uniqueSelectors.filter(sel => this.validateSelector(sel));

    // Choose primary selector
    const primary = this.choosePrimarySelector(validSelectors, element);
    const alternatives = validSelectors.filter(sel => sel !== primary);

    // Calculate metrics
    const stability = this.calculateStability(primary, element);
    const uniqueness = this.calculateUniqueness(primary);
    const maintainability = this.calculateMaintainability(primary);

    return {
      primary,
      alternatives: alternatives.slice(0, 5), // Limit alternatives
      confidence: Math.min(1.0, confidence),
      stability,
      uniqueness,
      maintainability,
      reasoning
    };
  }

  /**
   * Generate data attribute selectors
   */
  private static generateDataAttributeSelectors(element: Element): string[] {
    const selectors: string[] = [];
    const dataAttributes = [
      'data-testid', 'data-cy', 'data-test', 'data-qa', 'data-automation',
      'data-id', 'data-key', 'data-value', 'data-name', 'data-label'
    ];

    dataAttributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        selectors.push(`[${attr}="${value}"]`);
      }
    });

    return selectors;
  }

  /**
   * Generate semantic attribute selectors
   */
  private static generateSemanticSelectors(element: Element): string[] {
    const selectors: string[] = [];
    const semanticAttributes = [
      'name', 'type', 'value', 'placeholder', 'title', 'alt', 'aria-label',
      'aria-labelledby', 'aria-describedby', 'role', 'tabindex'
    ];

    semanticAttributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        selectors.push(`[${attr}="${value}"]`);
      }
    });

    return selectors;
  }

  /**
   * Generate role-based selectors
   */
  private static generateRoleSelectors(element: Element): string[] {
    const selectors: string[] = [];
    const role = element.getAttribute('role');
    
    if (role) {
      selectors.push(`[role="${role}"]`);
    }

    // Tag-based role inference
    const tagName = element.tagName.toLowerCase();
    const roleMap: Record<string, string> = {
      'button': 'button',
      'input': 'textbox',
      'a': 'link',
      'img': 'img',
      'form': 'form',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo'
    };

    if (roleMap[tagName]) {
      selectors.push(`[role="${roleMap[tagName]}"]`);
    }

    return selectors;
  }

  /**
   * Generate class-based selectors
   */
  private static generateClassSelectors(element: Element): string[] {
    const selectors: string[] = [];
    const className = element.className;
    
    if (className && typeof className === 'string') {
      const classes = className.split(' ').filter(c => c.length > 0);
      
      // Single class selectors
      classes.forEach(cls => {
        selectors.push(`.${cls}`);
      });

      // Multi-class selectors (up to 2 classes)
      if (classes.length >= 2) {
        for (let i = 0; i < classes.length; i++) {
          for (let j = i + 1; j < classes.length; j++) {
            selectors.push(`.${classes[i]}.${classes[j]}`);
          }
        }
      }
    }

    return selectors;
  }

  /**
   * Generate text content selectors
   */
  private static generateTextSelectors(element: Element): string[] {
    const selectors: string[] = [];
    const textContent = element.textContent?.trim();
    
    if (textContent && textContent.length > 0 && textContent.length < 50) {
      // Exact text match
      selectors.push(`:contains("${textContent}")`);
      
      // Partial text match (first 20 chars)
      if (textContent.length > 20) {
        selectors.push(`:contains("${textContent.substring(0, 20)}")`);
      }
    }

    return selectors;
  }

  /**
   * Generate position-based selectors
   */
  private static generatePositionSelectors(element: Element): string[] {
    const selectors: string[] = [];
    const parent = element.parentElement;
    
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      
      if (index >= 0) {
        // nth-child selector
        selectors.push(`${element.tagName.toLowerCase()}:nth-child(${index + 1})`);
        
        // nth-of-type selector
        const sameTypeSiblings = siblings.filter(s => s.tagName === element.tagName);
        const typeIndex = sameTypeSiblings.indexOf(element);
        if (typeIndex >= 0) {
          selectors.push(`${element.tagName.toLowerCase()}:nth-of-type(${typeIndex + 1})`);
        }
      }
    }

    return selectors;
  }

  /**
   * Generate hierarchical selectors
   */
  private static generateHierarchicalSelectors(element: Element): string[] {
    const selectors: string[] = [];
    const path: string[] = [];
    let current: Element | null = element;

    // Build path from element to root
    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      const id = current.id;
      const className = current.className;
      
      if (id) {
        path.unshift(`#${id}`);
      } else if (className && typeof className === 'string') {
        const classes = className.split(' ').filter(c => c.length > 0);
        if (classes.length > 0) {
          path.unshift(`.${classes[0]}`);
        } else {
          path.unshift(tagName);
        }
      } else {
        path.unshift(tagName);
      }
      
      current = current.parentElement;
    }

    // Generate hierarchical selectors
    if (path.length > 0) {
      // Full path
      selectors.push(path.join(' > '));
      
      // Partial paths (skip some levels)
      if (path.length > 2) {
        selectors.push(path.slice(-2).join(' > '));
      }
      if (path.length > 3) {
        selectors.push(path.slice(-3).join(' > '));
      }
    }

    return selectors;
  }

  /**
   * Choose primary selector
   */
  private static choosePrimarySelector(selectors: string[], element: Element): string {
    if (selectors.length === 0) return element.tagName.toLowerCase();

    // Priority order: ID > Data attributes > Semantic > Role > Class > Hierarchy
    const priorityOrder = [
      (sel: string) => sel.startsWith('#'),
      (sel: string) => sel.includes('[data-'),
      (sel: string) => sel.includes('[name=') || sel.includes('[type='),
      (sel: string) => sel.includes('[role='),
      (sel: string) => sel.startsWith('.'),
      (sel: string) => sel.includes(' > ')
    ];

    for (const priority of priorityOrder) {
      const matching = selectors.find(priority);
      if (matching) return matching;
    }

    return selectors[0];
  }

  /**
   * Validate selector
   */
  private static validateSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate selector stability
   */
  private static calculateStability(selector: string, element: Element): 'high' | 'medium' | 'low' {
    if (selector.startsWith('#')) return 'high';
    if (selector.includes('[data-')) return 'high';
    if (selector.includes('[name=') || selector.includes('[type=')) return 'high';
    if (selector.includes('[role=')) return 'medium';
    if (selector.startsWith('.')) return 'medium';
    if (selector.includes(' > ')) return 'medium';
    if (selector.includes(':nth-')) return 'low';
    if (selector.includes(':contains(')) return 'low';
    return 'low';
  }

  /**
   * Calculate selector uniqueness
   */
  private static calculateUniqueness(selector: string): 'unique' | 'multiple' | 'ambiguous' {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 1) return 'unique';
      if (elements.length <= 5) return 'multiple';
      return 'ambiguous';
    } catch {
      return 'ambiguous';
    }
  }

  /**
   * Calculate selector maintainability
   */
  private static calculateMaintainability(selector: string): 'excellent' | 'good' | 'fair' | 'poor' {
    if (selector.startsWith('#') && !selector.includes(' ')) return 'excellent';
    if (selector.includes('[data-') && !selector.includes(' ')) return 'excellent';
    if (selector.includes('[name=') && !selector.includes(' ')) return 'good';
    if (selector.includes('[role=') && !selector.includes(' ')) return 'good';
    if (selector.startsWith('.') && !selector.includes(' ')) return 'good';
    if (selector.includes(' > ') && selector.split(' > ').length <= 3) return 'fair';
    if (selector.includes(':nth-')) return 'poor';
    if (selector.includes(':contains(')) return 'poor';
    return 'fair';
  }

  /**
   * Generate selector for multiple elements
   */
  static generateMultiElementSelector(elements: Element[]): GeneratedSelector {
    if (elements.length === 0) {
      return {
        primary: '',
        alternatives: [],
        confidence: 0,
        stability: 'low',
        uniqueness: 'ambiguous',
        maintainability: 'poor',
        reasoning: ['No elements provided']
      };
    }

    if (elements.length === 1) {
      return this.generateSelector(elements[0]);
    }

    // Find common attributes
    const commonAttributes = this.findCommonAttributes(elements);
    const commonClasses = this.findCommonClasses(elements);
    const commonTag = this.findCommonTag(elements);

    const selectors: string[] = [];
    const reasoning: string[] = [];

    // Generate selectors based on common attributes
    if (commonAttributes.length > 0) {
      const attrSelector = commonAttributes.map(attr => `[${attr.name}="${attr.value}"]`).join('');
      selectors.push(attrSelector);
      reasoning.push(`Common attributes: ${commonAttributes.map(a => a.name).join(', ')}`);
    }

    // Generate selectors based on common classes
    if (commonClasses.length > 0) {
      const classSelector = commonClasses.map(cls => `.${cls}`).join('');
      selectors.push(classSelector);
      reasoning.push(`Common classes: ${commonClasses.join(', ')}`);
    }

    // Generate tag-based selector
    if (commonTag) {
      selectors.push(commonTag);
      reasoning.push(`Common tag: ${commonTag}`);
    }

    const primary = selectors[0] || commonTag || 'div';
    const alternatives = selectors.slice(1);

    return {
      primary,
      alternatives,
      confidence: 0.7, // Multi-element selectors are inherently less confident
      stability: 'medium',
      uniqueness: 'multiple',
      maintainability: 'fair',
      reasoning
    };
  }

  /**
   * Find common attributes across elements
   */
  private static findCommonAttributes(elements: Element[]): Array<{name: string, value: string}> {
    const attributeCounts: Record<string, Record<string, number>> = {};
    
    elements.forEach(element => {
      const attrs = element.attributes;
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        if (!attributeCounts[attr.name]) {
          attributeCounts[attr.name] = {};
        }
        attributeCounts[attr.name][attr.value] = (attributeCounts[attr.name][attr.value] || 0) + 1;
      }
    });

    const commonAttributes: Array<{name: string, value: string}> = [];
    
    Object.entries(attributeCounts).forEach(([attrName, valueCounts]) => {
      Object.entries(valueCounts).forEach(([attrValue, count]) => {
        if (count === elements.length) {
          commonAttributes.push({ name: attrName, value: attrValue });
        }
      });
    });

    return commonAttributes;
  }

  /**
   * Find common classes across elements
   */
  private static findCommonClasses(elements: Element[]): string[] {
    const classCounts: Record<string, number> = {};
    
    elements.forEach(element => {
      const className = element.className;
      if (className && typeof className === 'string') {
        const classes = className.split(' ').filter(c => c.length > 0);
        classes.forEach(cls => {
          classCounts[cls] = (classCounts[cls] || 0) + 1;
        });
      }
    });

    return Object.entries(classCounts)
      .filter(([, count]) => count === elements.length)
      .map(([cls]) => cls);
  }

  /**
   * Find common tag across elements
   */
  private static findCommonTag(elements: Element[]): string | null {
    const tagCounts: Record<string, number> = {};
    
    elements.forEach(element => {
      const tagName = element.tagName.toLowerCase();
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    });

    const commonTag = Object.entries(tagCounts)
      .find(([, count]) => count === elements.length);
    
    return commonTag ? commonTag[0] : null;
  }
}
