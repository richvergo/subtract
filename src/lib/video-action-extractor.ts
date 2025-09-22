/**
 * Video Action Extractor - Analyzes existing video recordings to extract action data
 * This simulates what the ActionCapturer would have captured during recording
 */

import { RecordedAction, RecordingSession } from './action-capturer';
import { EnhancedConfidenceScorer } from './enhanced-confidence-scorer';

export interface VideoAnalysisResult {
  videoFile: string;
  duration: number;
  extractedActions: RecordedAction[];
  session: RecordingSession;
  analysisMetadata: {
    frameCount: number;
    analysisTime: number;
    confidence: number;
    confidenceScore?: any; // Enhanced confidence details
  };
}

export class VideoActionExtractor {
  private static readonly COMMON_ACTIONS = [
    { action: 'click', target: 'button[type="submit"]', elementType: 'button', elementText: 'Submit' },
    { action: 'click', target: 'input[type="submit"]', elementType: 'input', elementText: 'Login' },
    { action: 'click', target: 'a[href*="login"]', elementType: 'a', elementText: 'Sign In' },
    { action: 'type', target: 'input[name="username"]', elementType: 'input', value: 'user@example.com' },
    { action: 'type', target: 'input[name="email"]', elementType: 'input', value: 'user@example.com' },
    { action: 'type', target: 'input[type="password"]', elementType: 'input', value: 'password123' },
    { action: 'click', target: 'button[class*="login"]', elementType: 'button', elementText: 'Login' },
    { action: 'click', target: 'button[class*="submit"]', elementType: 'button', elementText: 'Submit' },
    { action: 'navigate', target: 'https://example.com/dashboard', elementType: 'navigation' },
    { action: 'click', target: 'button[class*="create"]', elementType: 'button', elementText: 'Create' },
    { action: 'click', target: 'button[class*="save"]', elementType: 'button', elementText: 'Save' },
    { action: 'type', target: 'input[placeholder*="title"]', elementType: 'input', value: 'My Document' },
    { action: 'type', target: 'textarea', elementType: 'textarea', value: 'Document content...' },
    { action: 'click', target: 'button[class*="upload"]', elementType: 'button', elementText: 'Upload' },
    { action: 'click', target: 'button[class*="download"]', elementType: 'button', elementText: 'Download' }
  ];

  /**
   * Analyze a video file and extract simulated action data
   */
  static async analyzeVideo(videoPath: string): Promise<VideoAnalysisResult> {
    const startTime = Date.now();
    
    // Simulate video analysis based on file size and timestamp
    const fileStats = await this.getFileStats(videoPath);
    const duration = this.estimateVideoDuration(fileStats.size);
    const frameCount = Math.floor(duration * 30); // Assume 30fps
    
    // Generate realistic action sequence based on common patterns
    const extractedActions = this.generateActionSequence(duration, videoPath);
    
    // Create session data
    const session: RecordingSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: fileStats.birthtime.getTime(),
      endTime: fileStats.birthtime.getTime() + (duration * 1000),
      url: this.extractUrlFromPath(videoPath),
      actions: extractedActions,
      metadata: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
        recordingDuration: duration * 1000
      }
    };

    const analysisTime = Date.now() - startTime;
    
    // Get file stats for enhanced confidence calculation
    const fileStats = await this.getFileStats(videoPath);
    
    // Calculate enhanced confidence score
    const confidenceScore = EnhancedConfidenceScorer.calculateConfidence(
      extractedActions,
      duration,
      fileStats.size,
      session.metadata
    );

    return {
      videoFile: videoPath,
      duration,
      extractedActions,
      session,
      analysisMetadata: {
        frameCount,
        analysisTime,
        confidence: confidenceScore.overall,
        confidenceScore
      }
    };
  }

  /**
   * Analyze multiple videos and return combined results
   */
  static async analyzeMultipleVideos(videoPaths: string[]): Promise<VideoAnalysisResult[]> {
    const results: VideoAnalysisResult[] = [];
    
    for (const videoPath of videoPaths) {
      try {
        const result = await this.analyzeVideo(videoPath);
        results.push(result);
        console.log(`✅ Analyzed: ${videoPath} (${result.extractedActions.length} actions)`);
      } catch (error) {
        console.error(`❌ Failed to analyze ${videoPath}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Generate a realistic action sequence based on video duration and common patterns
   */
  private static generateActionSequence(duration: number, videoPath: string): RecordedAction[] {
    const actions: RecordedAction[] = [];
    const actionCount = Math.max(3, Math.floor(duration / 10)); // ~1 action per 10 seconds
    const baseTime = Date.now() - (duration * 1000);
    
    // Determine action pattern based on video path/name
    const isLoginFlow = videoPath.includes('login') || videoPath.includes('auth');
    const isDataEntry = videoPath.includes('data') || videoPath.includes('entry');
    const isNavigation = videoPath.includes('nav') || videoPath.includes('browse');
    
    let actionPattern: string[] = [];
    
    if (isLoginFlow) {
      actionPattern = ['navigate', 'type', 'type', 'click', 'navigate'];
    } else if (isDataEntry) {
      actionPattern = ['click', 'type', 'type', 'type', 'click', 'click'];
    } else if (isNavigation) {
      actionPattern = ['navigate', 'click', 'navigate', 'click', 'navigate'];
    } else {
      // Generic pattern
      actionPattern = ['navigate', 'click', 'type', 'click', 'navigate'];
    }
    
    // Generate actions
    for (let i = 0; i < actionCount; i++) {
      const actionType = actionPattern[i % actionPattern.length];
      const actionTemplate = this.COMMON_ACTIONS.find(a => a.action === actionType) || this.COMMON_ACTIONS[0];
      
      const timestamp = baseTime + (i * (duration * 1000 / actionCount));
      
      const action: RecordedAction = {
        id: `action_${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
        step: i + 1,
        action: actionType as any,
        target: actionTemplate.target,
        value: actionTemplate.value,
        url: this.extractUrlFromPath(videoPath),
        elementType: actionTemplate.elementType,
        elementText: actionTemplate.elementText,
        timestamp,
        metadata: {
          x: Math.floor(Math.random() * 800) + 100,
          y: Math.floor(Math.random() * 600) + 100,
          width: actionTemplate.elementType === 'input' ? 200 : 100,
          height: 40,
          tagName: actionTemplate.elementType.toUpperCase(),
          className: `class-${Math.floor(Math.random() * 10)}`,
          id: `id-${Math.floor(Math.random() * 100)}`,
          innerText: actionTemplate.elementText,
          outerHTML: `<${actionTemplate.elementType} class="${actionTemplate.elementType}-${i}">${actionTemplate.elementText}</${actionTemplate.elementType}>`
        }
      };
      
      actions.push(action);
    }
    
    return actions;
  }

  /**
   * Get file statistics
   */
  private static async getFileStats(filePath: string): Promise<{ size: number; birthtime: Date }> {
    // Simulate file stats - in real implementation, use fs.stat
    const size = Math.floor(Math.random() * 5000000) + 1000000; // 1-6MB
    const birthtime = new Date(Date.now() - Math.random() * 86400000); // Random time in last 24h
    
    return { size, birthtime };
  }

  /**
   * Estimate video duration based on file size
   */
  private static estimateVideoDuration(fileSize: number): number {
    // Rough estimate: 1MB ≈ 10 seconds of video
    return Math.max(30, Math.floor(fileSize / 100000)); // Minimum 30 seconds
  }

  /**
   * Extract URL from video path
   */
  private static extractUrlFromPath(videoPath: string): string {
    // Extract domain from path or use common domains
    const domains = [
      'https://example.com',
      'https://app.example.com',
      'https://dashboard.example.com',
      'https://login.example.com',
      'https://admin.example.com'
    ];
    
    return domains[Math.floor(Math.random() * domains.length)];
  }


  /**
   * Get action statistics from analysis results
   */
  static getActionStatistics(results: VideoAnalysisResult[]): {
    totalActions: number;
    actionTypes: Record<string, number>;
    averageConfidence: number;
    totalDuration: number;
  } {
    let totalActions = 0;
    const actionTypes: Record<string, number> = {};
    let totalConfidence = 0;
    let totalDuration = 0;
    
    results.forEach(result => {
      totalActions += result.extractedActions.length;
      totalConfidence += result.analysisMetadata.confidence;
      totalDuration += result.duration;
      
      result.extractedActions.forEach(action => {
        actionTypes[action.action] = (actionTypes[action.action] || 0) + 1;
      });
    });
    
    return {
      totalActions,
      actionTypes,
      averageConfidence: totalConfidence / results.length,
      totalDuration
    };
  }
}
