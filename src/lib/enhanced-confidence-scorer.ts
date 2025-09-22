/**
 * Enhanced Confidence Scorer - Multi-factor confidence calculation for action capture
 */

export interface ConfidenceFactors {
  actionDensity: number;           // Actions per second
  actionVariety: number;           // Diversity of action types
  elementSpecificity: number;      // Quality of element selectors
  temporalConsistency: number;     // Logical action sequence
  metadataRichness: number;       // Amount of contextual data
  videoQuality: number;           // Video duration and clarity
  patternRecognition: number;     // Recognition of common patterns
}

export interface ConfidenceScore {
  overall: number;
  factors: ConfidenceFactors;
  breakdown: {
    primary: number;
    secondary: number;
    tertiary: number;
  };
  recommendations: string[];
}

export class EnhancedConfidenceScorer {
  
  /**
   * Calculate comprehensive confidence score
   */
  static calculateConfidence(
    actions: any[],
    duration: number,
    videoSize: number,
    sessionMetadata?: any
  ): ConfidenceScore {
    
    const factors = this.analyzeFactors(actions, duration, videoSize, sessionMetadata);
    const overall = this.computeOverallScore(factors);
    const breakdown = this.computeBreakdown(factors);
    const recommendations = this.generateRecommendations(factors);
    
    return {
      overall,
      factors,
      breakdown,
      recommendations
    };
  }
  
  /**
   * Analyze individual confidence factors
   */
  private static analyzeFactors(
    actions: any[],
    duration: number,
    videoSize: number,
    sessionMetadata?: any
  ): ConfidenceFactors {
    
    return {
      actionDensity: this.calculateActionDensity(actions, duration),
      actionVariety: this.calculateActionVariety(actions),
      elementSpecificity: this.calculateElementSpecificity(actions),
      temporalConsistency: this.calculateTemporalConsistency(actions),
      metadataRichness: this.calculateMetadataRichness(actions),
      videoQuality: this.calculateVideoQuality(duration, videoSize),
      patternRecognition: this.calculatePatternRecognition(actions)
    };
  }
  
  /**
   * Action density factor (0-1)
   */
  private static calculateActionDensity(actions: any[], duration: number): number {
    const density = actions.length / duration;
    
    // Optimal density is 0.1-0.5 actions per second
    if (density < 0.05) return 0.3;  // Too sparse
    if (density > 1.0) return 0.4;   // Too dense
    if (density >= 0.1 && density <= 0.5) return 1.0;  // Optimal
    if (density >= 0.05 && density < 0.1) return 0.8;  // Good
    if (density > 0.5 && density <= 1.0) return 0.7;   // Acceptable
    
    return 0.5; // Default
  }
  
  /**
   * Action variety factor (0-1)
   */
  private static calculateActionVariety(actions: any[]): number {
    if (actions.length === 0) return 0;
    
    const actionTypes = new Set(actions.map(a => a.action));
    const variety = actionTypes.size / actions.length;
    
    // More variety = higher confidence
    if (variety >= 0.6) return 1.0;  // High variety
    if (variety >= 0.4) return 0.8;  // Good variety
    if (variety >= 0.2) return 0.6;  // Moderate variety
    return 0.3; // Low variety
  }
  
  /**
   * Element specificity factor (0-1)
   */
  private static calculateElementSpecificity(actions: any[]): number {
    if (actions.length === 0) return 0;
    
    let specificityScore = 0;
    
    actions.forEach(action => {
      let score = 0;
      
      // ID selector (highest specificity)
      if (action.target?.includes('#') && !action.target.includes(' ')) {
        score += 1.0;
      }
      // Data attributes (high specificity)
      else if (action.target?.includes('[data-') || action.target?.includes('[name=')) {
        score += 0.9;
      }
      // Class selector (medium specificity)
      else if (action.target?.includes('.') && !action.target.includes(' ')) {
        score += 0.7;
      }
      // Tag with attribute (medium specificity)
      else if (action.target?.includes('[') && action.target?.includes(']')) {
        score += 0.6;
      }
      // Tag selector (low specificity)
      else if (action.target && !action.target.includes(' ')) {
        score += 0.4;
      }
      // Complex selector (medium-high specificity)
      else if (action.target?.includes(' ')) {
        score += 0.5;
      }
      
      specificityScore += score;
    });
    
    return Math.min(1.0, specificityScore / actions.length);
  }
  
  /**
   * Temporal consistency factor (0-1)
   */
  private static calculateTemporalConsistency(actions: any[]): number {
    if (actions.length < 2) return 0.5;
    
    let consistencyScore = 0;
    const sortedActions = actions.sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 1; i < sortedActions.length; i++) {
      const prev = sortedActions[i - 1];
      const curr = sortedActions[i];
      const timeDiff = curr.timestamp - prev.timestamp;
      
      // Check for logical sequence
      let sequenceScore = 0;
      
      // Navigation before interaction
      if (prev.action === 'navigate' && curr.action !== 'navigate') {
        sequenceScore += 0.8;
      }
      // Type before submit
      else if (prev.action === 'type' && curr.action === 'click') {
        sequenceScore += 0.9;
      }
      // Click before navigation
      else if (prev.action === 'click' && curr.action === 'navigate') {
        sequenceScore += 0.7;
      }
      // Same action type (acceptable)
      else if (prev.action === curr.action) {
        sequenceScore += 0.5;
      }
      // Different actions (neutral)
      else {
        sequenceScore += 0.6;
      }
      
      // Time gap analysis
      if (timeDiff > 0 && timeDiff < 10000) { // 10 seconds
        sequenceScore += 0.2;
      }
      
      consistencyScore += sequenceScore;
    }
    
    return Math.min(1.0, consistencyScore / (actions.length - 1));
  }
  
  /**
   * Metadata richness factor (0-1)
   */
  private static calculateMetadataRichness(actions: any[]): number {
    if (actions.length === 0) return 0;
    
    let richnessScore = 0;
    
    actions.forEach(action => {
      let score = 0;
      
      // Basic metadata
      if (action.target) score += 0.2;
      if (action.elementType) score += 0.1;
      if (action.elementText) score += 0.1;
      if (action.value) score += 0.1;
      
      // Rich metadata
      if (action.metadata) {
        if (action.metadata.x !== undefined && action.metadata.y !== undefined) score += 0.1;
        if (action.metadata.width && action.metadata.height) score += 0.1;
        if (action.metadata.tagName) score += 0.1;
        if (action.metadata.className) score += 0.1;
        if (action.metadata.id) score += 0.1;
        if (action.metadata.innerText) score += 0.1;
        if (action.metadata.outerHTML) score += 0.1;
      }
      
      richnessScore += Math.min(1.0, score);
    });
    
    return Math.min(1.0, richnessScore / actions.length);
  }
  
  /**
   * Video quality factor (0-1)
   */
  private static calculateVideoQuality(duration: number, videoSize: number): number {
    let qualityScore = 0;
    
    // Duration analysis
    if (duration >= 30 && duration <= 300) { // 30s - 5min optimal
      qualityScore += 0.4;
    } else if (duration >= 10 && duration < 30) { // Short but usable
      qualityScore += 0.3;
    } else if (duration > 300) { // Very long
      qualityScore += 0.2;
    } else { // Too short
      qualityScore += 0.1;
    }
    
    // File size analysis (proxy for quality)
    const sizeMB = videoSize / (1024 * 1024);
    if (sizeMB >= 1 && sizeMB <= 50) { // 1-50MB optimal
      qualityScore += 0.3;
    } else if (sizeMB >= 0.5 && sizeMB < 1) { // Small but usable
      qualityScore += 0.2;
    } else if (sizeMB > 50) { // Very large
      qualityScore += 0.1;
    } else { // Too small
      qualityScore += 0.1;
    }
    
    // Bitrate analysis (size/duration)
    const bitrate = sizeMB / (duration / 60); // MB per minute
    if (bitrate >= 2 && bitrate <= 20) { // Good bitrate
      qualityScore += 0.3;
    } else if (bitrate >= 1 && bitrate < 2) { // Low bitrate
      qualityScore += 0.2;
    } else if (bitrate > 20) { // Very high bitrate
      qualityScore += 0.1;
    } else { // Very low bitrate
      qualityScore += 0.1;
    }
    
    return Math.min(1.0, qualityScore);
  }
  
  /**
   * Pattern recognition factor (0-1)
   */
  private static calculatePatternRecognition(actions: any[]): number {
    if (actions.length === 0) return 0;
    
    let patternScore = 0;
    
    // Common workflow patterns
    const patterns = [
      ['navigate', 'type', 'type', 'click'], // Login pattern
      ['navigate', 'click', 'type', 'click'], // Form submission
      ['navigate', 'click', 'navigate'], // Navigation flow
      ['click', 'type', 'click'], // Quick interaction
      ['navigate', 'type', 'click', 'navigate'] // Full workflow
    ];
    
    // Check for pattern matches
    patterns.forEach(pattern => {
      if (actions.length >= pattern.length) {
        let matches = 0;
        for (let i = 0; i < pattern.length; i++) {
          if (actions[i]?.action === pattern[i]) {
            matches++;
          }
        }
        const matchRatio = matches / pattern.length;
        if (matchRatio >= 0.8) {
          patternScore += 0.3;
        } else if (matchRatio >= 0.6) {
          patternScore += 0.2;
        }
      }
    });
    
    // Check for logical action sequences
    let sequenceScore = 0;
    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1];
      const curr = actions[i];
      
      // Logical sequences
      if (prev.action === 'navigate' && curr.action !== 'navigate') sequenceScore += 0.1;
      if (prev.action === 'type' && curr.action === 'click') sequenceScore += 0.1;
      if (prev.action === 'click' && curr.action === 'navigate') sequenceScore += 0.1;
    }
    
    return Math.min(1.0, patternScore + (sequenceScore / actions.length));
  }
  
  /**
   * Compute overall confidence score
   */
  private static computeOverallScore(factors: ConfidenceFactors): number {
    // Weighted average with emphasis on key factors
    const weights = {
      actionDensity: 0.15,
      actionVariety: 0.15,
      elementSpecificity: 0.20,
      temporalConsistency: 0.20,
      metadataRichness: 0.15,
      videoQuality: 0.10,
      patternRecognition: 0.05
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([factor, weight]) => {
      weightedSum += factors[factor as keyof ConfidenceFactors] * weight;
      totalWeight += weight;
    });
    
    return Math.min(0.99, Math.max(0.1, weightedSum / totalWeight));
  }
  
  /**
   * Compute confidence breakdown
   */
  private static computeBreakdown(factors: ConfidenceFactors): {
    primary: number;
    secondary: number;
    tertiary: number;
  } {
    const sortedFactors = Object.entries(factors)
      .sort(([,a], [,b]) => b - a);
    
    return {
      primary: sortedFactors[0]?.[1] || 0,
      secondary: sortedFactors[1]?.[1] || 0,
      tertiary: sortedFactors[2]?.[1] || 0
    };
  }
  
  /**
   * Generate improvement recommendations
   */
  private static generateRecommendations(factors: ConfidenceFactors): string[] {
    const recommendations: string[] = [];
    
    if (factors.actionDensity < 0.5) {
      recommendations.push("Increase action density by performing more interactions during recording");
    }
    
    if (factors.actionVariety < 0.6) {
      recommendations.push("Add more variety to actions (clicks, typing, navigation)");
    }
    
    if (factors.elementSpecificity < 0.7) {
      recommendations.push("Use more specific element selectors (IDs, data attributes)");
    }
    
    if (factors.temporalConsistency < 0.6) {
      recommendations.push("Follow a more logical action sequence (navigate → interact → submit)");
    }
    
    if (factors.metadataRichness < 0.7) {
      recommendations.push("Ensure elements have rich metadata (text, attributes, positioning)");
    }
    
    if (factors.videoQuality < 0.6) {
      recommendations.push("Record longer videos (30s-5min) with good quality");
    }
    
    if (factors.patternRecognition < 0.5) {
      recommendations.push("Follow common workflow patterns (login, form submission, navigation)");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Excellent action capture! All factors are optimal.");
    }
    
    return recommendations;
  }
}
