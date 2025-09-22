/**
 * Enhanced Action Capture Hook - Uses all advanced features for maximum accuracy
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { EnhancedActionCapturer, EnhancedRecordingSession, ContextualAction } from '../enhanced-action-capturer';

export interface UseEnhancedActionCaptureReturn {
  isCapturing: boolean;
  actions: ContextualAction[];
  actionsCount: number;
  session: EnhancedRecordingSession | null;
  quality: {
    overallScore: number;
    actionQuality: number;
    selectorQuality: number;
    contextQuality: number;
    stabilityScore: number;
  };
  startCapture: () => void;
  stopCapture: () => EnhancedRecordingSession;
  clearActions: () => void;
  getActionsByType: (type: string) => ContextualAction[];
  getQualityReport: () => {
    summary: string;
    recommendations: string[];
    strengths: string[];
    improvements: string[];
  };
}

export function useEnhancedActionCapture(): UseEnhancedActionCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [actions, setActions] = useState<ContextualAction[]>([]);
  const [session, setSession] = useState<EnhancedRecordingSession | null>(null);
  const [quality, setQuality] = useState({
    overallScore: 0,
    actionQuality: 0,
    selectorQuality: 0,
    contextQuality: 0,
    stabilityScore: 0
  });
  const capturerRef = useRef<EnhancedActionCapturer | null>(null);

  // Initialize capturer
  useEffect(() => {
    capturerRef.current = new EnhancedActionCapturer();
    return () => {
      if (capturerRef.current) {
        capturerRef.current.stopCapture();
      }
    };
  }, []);

  const startCapture = useCallback(() => {
    if (!capturerRef.current || isCapturing) return;

    console.log('🎬 Starting enhanced action capture...');
    capturerRef.current.startCapture();
    setIsCapturing(true);
    setActions([]);
    setSession(null);
    setQuality({
      overallScore: 0,
      actionQuality: 0,
      selectorQuality: 0,
      contextQuality: 0,
      stabilityScore: 0
    });
  }, [isCapturing]);

  const stopCapture = useCallback((): EnhancedRecordingSession => {
    if (!capturerRef.current || !isCapturing) {
      return {
        id: '',
        startTime: 0,
        endTime: 0,
        url: '',
        actions: [],
        domChanges: [],
        visualElements: [],
        metadata: {
          userAgent: '',
          viewport: { width: 0, height: 0 },
          recordingDuration: 0,
          pageTitle: '',
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

    console.log('🛑 Stopping enhanced action capture...');
    const sessionData = capturerRef.current.stopCapture();
    
    setActions(sessionData.actions);
    setSession(sessionData);
    setQuality(sessionData.quality);
    setIsCapturing(false);

    console.log(`📊 Enhanced capture complete: ${sessionData.actions.length} actions, quality: ${(sessionData.quality.overallScore * 100).toFixed(1)}%`);
    return sessionData;
  }, [isCapturing]);

  const clearActions = useCallback(() => {
    if (capturerRef.current) {
      capturerRef.current.getSession();
    }
    setActions([]);
    setSession(null);
    setQuality({
      overallScore: 0,
      actionQuality: 0,
      selectorQuality: 0,
      contextQuality: 0,
      stabilityScore: 0
    });
  }, []);

  const getActionsByType = useCallback((type: string): ContextualAction[] => {
    return actions.filter(action => action.action === type);
  }, [actions]);

  const getQualityReport = useCallback(() => {
    const overallScore = quality.overallScore;
    const actionQuality = quality.actionQuality;
    const selectorQuality = quality.selectorQuality;
    const contextQuality = quality.contextQuality;
    const stabilityScore = quality.stabilityScore;

    let summary = '';
    const recommendations: string[] = [];
    const strengths: string[] = [];
    const improvements: string[] = [];

    // Overall quality assessment
    if (overallScore >= 0.8) {
      summary = 'Excellent action capture quality! All systems are performing optimally.';
      strengths.push('High overall quality score');
    } else if (overallScore >= 0.6) {
      summary = 'Good action capture quality with room for improvement.';
      improvements.push('Overall quality could be higher');
    } else {
      summary = 'Action capture quality needs improvement.';
      improvements.push('Overall quality is below average');
    }

    // Action quality assessment
    if (actionQuality >= 0.8) {
      strengths.push('High action confidence scores');
    } else if (actionQuality >= 0.6) {
      recommendations.push('Consider improving action specificity and metadata');
    } else {
      improvements.push('Action quality is low - check element targeting');
    }

    // Selector quality assessment
    if (selectorQuality >= 0.8) {
      strengths.push('Excellent selector stability');
    } else if (selectorQuality >= 0.6) {
      recommendations.push('Use more specific selectors (IDs, data attributes)');
    } else {
      improvements.push('Selector quality is poor - many unstable selectors');
    }

    // Context quality assessment
    if (contextQuality >= 0.8) {
      strengths.push('Rich contextual information captured');
    } else if (contextQuality >= 0.6) {
      recommendations.push('Add more context to actions');
    } else {
      improvements.push('Context quality is low - missing contextual data');
    }

    // Stability assessment
    if (stabilityScore >= 0.8) {
      strengths.push('High stability score');
    } else if (stabilityScore >= 0.6) {
      recommendations.push('Minimize DOM changes during recording');
    } else {
      improvements.push('Stability is low - too many DOM changes');
    }

    // Specific recommendations based on quality scores
    if (actionQuality < 0.7) {
      recommendations.push('Ensure elements have unique identifiers');
      recommendations.push('Use more specific element selectors');
    }

    if (selectorQuality < 0.7) {
      recommendations.push('Prefer ID selectors over class selectors');
      recommendations.push('Use data attributes for testing');
    }

    if (contextQuality < 0.7) {
      recommendations.push('Perform actions in logical sequences');
      recommendations.push('Add meaningful element text and attributes');
    }

    if (stabilityScore < 0.7) {
      recommendations.push('Avoid rapid DOM changes during recording');
      recommendations.push('Wait for page stability before performing actions');
    }

    return {
      summary,
      recommendations,
      strengths,
      improvements
    };
  }, [quality]);

  // Update actions and quality periodically when capturing
  useEffect(() => {
    if (!isCapturing || !capturerRef.current) return;

    const interval = setInterval(() => {
      if (capturerRef.current) {
        const currentSession = capturerRef.current.getSession();
        setActions(currentSession.actions);
        setQuality(currentSession.quality);
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isCapturing]);

  return {
    isCapturing,
    actions,
    actionsCount: actions.length,
    session,
    quality,
    startCapture,
    stopCapture,
    clearActions,
    getActionsByType,
    getQualityReport
  };
}
