/**
 * React hook for action capture during recording
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { ActionCapturer, RecordedAction, RecordingSession } from '../action-capturer';

export interface UseActionCaptureReturn {
  isCapturing: boolean;
  actions: RecordedAction[];
  actionsCount: number;
  session: RecordingSession | null;
  startCapture: () => void;
  stopCapture: () => RecordedAction[];
  clearActions: () => void;
  getActionsByType: (type: RecordedAction['action']) => RecordedAction[];
}

export function useActionCapture(): UseActionCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [actions, setActions] = useState<RecordedAction[]>([]);
  const [session, setSession] = useState<RecordingSession | null>(null);
  const capturerRef = useRef<ActionCapturer | null>(null);

  // Initialize capturer
  useEffect(() => {
    capturerRef.current = new ActionCapturer();
    return () => {
      if (capturerRef.current) {
        capturerRef.current.stopCapture();
      }
    };
  }, []);

  const startCapture = useCallback(() => {
    if (!capturerRef.current || isCapturing) return;

    console.log('🎬 Starting action capture...');
    capturerRef.current.startCapture();
    setIsCapturing(true);
    setActions([]);
    setSession(null);
  }, [isCapturing]);

  const stopCapture = useCallback((): RecordedAction[] => {
    if (!capturerRef.current || !isCapturing) return [];

    console.log('🛑 Stopping action capture...');
    const capturedActions = capturerRef.current.stopCapture();
    const sessionData = capturerRef.current.getSession();
    
    setActions(capturedActions);
    setSession(sessionData);
    setIsCapturing(false);

    console.log(`📊 Captured ${capturedActions.length} actions`);
    return capturedActions;
  }, [isCapturing]);

  const clearActions = useCallback(() => {
    if (capturerRef.current) {
      capturerRef.current.clearActions();
    }
    setActions([]);
    setSession(null);
  }, []);

  const getActionsByType = useCallback((type: RecordedAction['action']): RecordedAction[] => {
    return actions.filter(action => action.action === type);
  }, [actions]);

  // Update actions count periodically when capturing
  useEffect(() => {
    if (!isCapturing || !capturerRef.current) return;

    const interval = setInterval(() => {
      if (capturerRef.current) {
        const currentActions = capturerRef.current.getSession().actions;
        setActions(currentActions);
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
