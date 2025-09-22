/**
 * Visual Element Detector - Uses computer vision techniques to detect and identify elements
 * Provides fallback when traditional selectors fail
 */

export interface VisualElement {
  id: string;
  type: 'button' | 'input' | 'link' | 'image' | 'text' | 'container' | 'unknown';
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
  visualFeatures: {
    color: string;
    backgroundColor: string;
    fontSize?: number;
    fontWeight?: string;
    textContent?: string;
    imageSrc?: string;
    borderStyle?: string;
    borderRadius?: number;
  };
  selector: string;
  fallbackSelectors: string[];
  timestamp: number;
}

export class VisualElementDetector {
  private static readonly ELEMENT_PATTERNS = {
    button: [
      'button', 'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]',
      '[role="button"]', '.btn', '.button', '[onclick]'
    ],
    input: [
      'input', 'textarea', 'select', '[contenteditable]',
      '[role="textbox"]', '[role="combobox"]'
    ],
    link: [
      'a', '[role="link"]', '[href]', '.link'
    ],
    image: [
      'img', '[role="img"]', '.image', '.icon'
    ],
    text: [
      'p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '[role="text"]', '.text', '.label'
    ]
  };

  /**
   * Detect visual elements in the viewport
   */
  static detectElements(): VisualElement[] {
    const elements: VisualElement[] = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach((element, index) => {
      if (this.isVisible(element)) {
        const visualElement = this.analyzeElement(element, index);
        if (visualElement) {
          elements.push(visualElement);
        }
      }
    });

    return elements.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze a single element
   */
  private static analyzeElement(element: Element, index: number): VisualElement | null {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    // Skip if element is too small or not visible
    if (rect.width < 10 || rect.height < 10) return null;
    
    const elementType = this.detectElementType(element, computedStyle);
    const confidence = this.calculateConfidence(element, computedStyle, elementType);
    
    if (confidence < 0.3) return null; // Skip low-confidence elements

    return {
      id: `visual_${Date.now()}_${index}`,
      type: elementType,
      confidence,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      visualFeatures: {
        color: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,
        fontSize: parseInt(computedStyle.fontSize) || undefined,
        fontWeight: computedStyle.fontWeight,
        textContent: element.textContent?.substring(0, 50) || undefined,
        imageSrc: (element as HTMLImageElement).src || undefined,
        borderStyle: computedStyle.borderStyle,
        borderRadius: parseInt(computedStyle.borderRadius) || undefined
      },
      selector: this.generateVisualSelector(element),
      fallbackSelectors: this.generateFallbackSelectors(element),
      timestamp: Date.now()
    };
  }

  /**
   * Detect element type based on visual and structural features
   */
  private static detectElementType(element: Element, style: CSSStyleDeclaration): VisualElement['type'] {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const className = element.className.toLowerCase();
    const textContent = element.textContent?.toLowerCase() || '';

    // Button detection
    if (tagName === 'button' || 
        tagName === 'input' && (element as HTMLInputElement).type === 'button' ||
        role === 'button' ||
        className.includes('btn') || className.includes('button') ||
        this.looksLikeButton(style, textContent)) {
      return 'button';
    }

    // Input detection
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' ||
        role === 'textbox' || role === 'combobox' ||
        element.hasAttribute('contenteditable') ||
        this.looksLikeInput(style)) {
      return 'input';
    }

    // Link detection
    if (tagName === 'a' || role === 'link' || element.hasAttribute('href') ||
        this.looksLikeLink(style, textContent)) {
      return 'link';
    }

    // Image detection
    if (tagName === 'img' || role === 'img' ||
        className.includes('image') || className.includes('icon') ||
        this.looksLikeImage(style)) {
      return 'image';
    }

    // Text detection
    if (['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName) ||
        role === 'text' ||
        this.looksLikeText(style, textContent)) {
      return 'text';
    }

    // Container detection
    if (this.looksLikeContainer(style, element)) {
      return 'container';
    }

    return 'unknown';
  }

  /**
   * Calculate confidence score for element detection
   */
  private static calculateConfidence(element: Element, style: CSSStyleDeclaration, type: VisualElement['type']): number {
    let confidence = 0;

    // Base confidence from tag name
    const tagName = element.tagName.toLowerCase();
    if (this.ELEMENT_PATTERNS[type]?.includes(tagName)) {
      confidence += 0.4;
    }

    // Role attribute confidence
    const role = element.getAttribute('role');
    if (role && this.ELEMENT_PATTERNS[type]?.includes(`[role="${role}"]`)) {
      confidence += 0.3;
    }

    // Visual characteristics confidence
    if (type === 'button') {
      if (this.looksLikeButton(style, element.textContent || '')) confidence += 0.3;
    } else if (type === 'input') {
      if (this.looksLikeInput(style)) confidence += 0.3;
    } else if (type === 'link') {
      if (this.looksLikeLink(style, element.textContent || '')) confidence += 0.3;
    }

    // Interactive element confidence
    if (element.hasAttribute('onclick') || element.hasAttribute('onmousedown')) {
      confidence += 0.2;
    }

    // Accessibility confidence
    if (element.hasAttribute('tabindex') || element.hasAttribute('aria-label')) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Check if element looks like a button
   */
  private static looksLikeButton(style: CSSStyleDeclaration, textContent: string): boolean {
    const hasButtonText = /^(click|submit|save|cancel|ok|yes|no|login|sign|register|create|edit|delete|add|remove|update|send|go|next|back|continue|finish|start|stop|play|pause|close|open|show|hide|toggle|switch|on|off|enable|disable|activate|deactivate)$/i.test(textContent.trim());
    const hasButtonStyle = style.cursor === 'pointer' || 
                          style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                          style.border !== 'none' ||
                          style.borderRadius !== '0px';
    
    return hasButtonText || hasButtonStyle;
  }

  /**
   * Check if element looks like an input
   */
  private static looksLikeInput(style: CSSStyleDeclaration): boolean {
    return style.cursor === 'text' || 
           style.border !== 'none' ||
           style.backgroundColor !== 'rgba(0, 0, 0, 0)';
  }

  /**
   * Check if element looks like a link
   */
  private static looksLikeLink(style: CSSStyleDeclaration, textContent: string): boolean {
    const hasLinkText = /^(http|www|\.com|\.org|\.net|\.edu|\.gov|click|here|more|details|read|view|see|learn|about|contact|help|support|faq|documentation|guide|tutorial|manual|instructions|steps|process|workflow|procedure|method|way|how|what|when|where|why|who|which|how|much|many|long|short|big|small|large|tiny|huge|massive|enormous|giant|mini|micro|nano|pico|femto|atto|zepto|yocto|kilo|mega|giga|tera|peta|exa|zetta|yotta|deca|hecto|deci|centi|milli|micro|nano|pico|femto|atto|zepto|yocto)$/i.test(textContent.trim());
    const hasLinkStyle = style.color !== 'rgba(0, 0, 0, 0)' ||
                        style.textDecoration?.includes('underline') ||
                        style.cursor === 'pointer';
    
    return hasLinkText || hasLinkStyle;
  }

  /**
   * Check if element looks like an image
   */
  private static looksLikeImage(style: CSSStyleDeclaration): boolean {
    return style.backgroundImage !== 'none' ||
           style.objectFit !== 'initial' ||
           style.aspectRatio !== 'auto';
  }

  /**
   * Check if element looks like text
   */
  private static looksLikeText(style: CSSStyleDeclaration, textContent: string): boolean {
    return textContent.length > 0 && 
           textContent.length < 1000 &&
           style.display !== 'none' &&
           style.visibility !== 'hidden';
  }

  /**
   * Check if element looks like a container
   */
  private static looksLikeContainer(style: CSSStyleDeclaration, element: Element): boolean {
    const hasChildren = element.children.length > 0;
    const hasLayoutStyle = style.display === 'flex' || 
                          style.display === 'grid' || 
                          style.display === 'block' ||
                          style.position === 'relative' ||
                          style.position === 'absolute';
    
    return hasChildren && hasLayoutStyle;
  }

  /**
   * Generate visual selector
   */
  private static generateVisualSelector(element: Element): string {
    // Try data attributes first
    const dataTestId = element.getAttribute('data-testid');
    if (dataTestId) return `[data-testid="${dataTestId}"]`;

    const dataCy = element.getAttribute('data-cy');
    if (dataCy) return `[data-cy="${dataCy}"]`;

    // Try ID
    if (element.id) return `#${element.id}`;

    // Try role
    const role = element.getAttribute('role');
    if (role) return `[role="${role}"]`;

    // Try aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return `[aria-label="${ariaLabel}"]`;

    // Fallback to position-based selector
    const rect = element.getBoundingClientRect();
    return `[data-visual-x="${Math.round(rect.left)}"][data-visual-y="${Math.round(rect.top)}"]`;
  }

  /**
   * Generate fallback selectors
   */
  private static generateFallbackSelectors(element: Element): string[] {
    const selectors: string[] = [];
    
    // Class-based selectors
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      classes.forEach(cls => {
        selectors.push(`.${cls}`);
      });
    }

    // Attribute-based selectors
    const attributes = ['name', 'type', 'value', 'placeholder', 'title', 'alt'];
    attributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        selectors.push(`[${attr}="${value}"]`);
      }
    });

    // Text content selector
    const textContent = element.textContent?.trim();
    if (textContent && textContent.length < 50) {
      selectors.push(`:contains("${textContent}")`);
    }

    return selectors;
  }

  /**
   * Check if element is visible
   */
  private static isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 &&
           style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           rect.top < window.innerHeight &&
           rect.bottom > 0 &&
           rect.left < window.innerWidth &&
           rect.right > 0;
  }
}
