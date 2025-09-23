/**
 * React hook for action capture during recording
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordedAction, RecordingSession, enhancedRecorderFixed } from '../enhanced-recorder-fixed';

export interface UseActionCaptureReturn {
  isCapturing: boolean;
  actions: RecordedAction[];
  actionsCount: number;
  session: RecordingSession | null;
  startCapture: () => void;
  stopCapture: () => RecordedAction[];
  clearActions: () => void;
  getActionsByType: (type: RecordedAction['type']) => RecordedAction[];
}

export function useActionCapture(): UseActionCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [actions, setActions] = useState<RecordedAction[]>([]);
  const [session, setSession] = useState<RecordingSession | null>(null);

  const startCapture = useCallback(() => {
    if (isCapturing) return;

    console.log('🎬 Starting action capture...');
    const session = enhancedRecorderFixed.startRecording();
    setIsCapturing(true);
    setActions([]);
    setSession(session);
  }, [isCapturing]);

  const stopCapture = useCallback((): RecordedAction[] => {
    if (!isCapturing) return [];

    console.log('🛑 Stopping action capture...');
    const sessionData = enhancedRecorderFixed.stopRecording();
    const capturedActions = sessionData?.actions || [];
    
    setActions(capturedActions);
    setSession(sessionData);
    setIsCapturing(false);

    console.log(`📊 Captured ${capturedActions.length} actions`);
    return capturedActions;
  }, [isCapturing]);

  const clearActions = useCallback(() => {
    // Reset the recorder state
    enhancedRecorderFixed.stopRecording();
    setActions([]);
    setSession(null);
  }, []);

  const getActionsByType = useCallback((type: RecordedAction['type']): RecordedAction[] => {
    return actions.filter(action => action.type === type);
  }, [actions]);

  // Update actions count periodically when capturing
  useEffect(() => {
    if (!isCapturing) return;

    const interval = setInterval(() => {
      const session = enhancedRecorderFixed.getSession();
      if (session) {
        setActions(session.actions);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isCapturing]);

  return {
    isCapturing,
    actions,
    actionsCount: actions.length,
    session,
    startCapture,
    stopCapture,
    clearActions,
    getActionsByType
  };
}
