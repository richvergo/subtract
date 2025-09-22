/**
 * Test component for action capture functionality
 */

"use client";

import { useActionCapture } from '@/lib/hooks/use-action-capture';

export default function ActionCaptureTest() {
  const {
    isCapturing,
    actions,
    actionsCount,
    session,
    startCapture,
    stopCapture,
    clearActions,
    getActionsByType
  } = useActionCapture();

  const handleStartCapture = () => {
    startCapture();
    console.log('🎬 Action capture started');
  };

  const handleStopCapture = () => {
    const capturedActions = stopCapture();
    console.log('🛑 Action capture stopped:', capturedActions);
  };

  const handleClearActions = () => {
    clearActions();
    console.log('🗑️ Actions cleared');
  };

  const clickActions = getActionsByType('click');
  const typeActions = getActionsByType('type');
  const navigateActions = getActionsByType('navigate');

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      margin: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Action Capture Test</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <p><strong>Status:</strong> {isCapturing ? '🟢 Capturing' : '🔴 Not capturing'}</p>
        <p><strong>Actions Count:</strong> {actionsCount}</p>
        <p><strong>Session ID:</strong> {session?.id || 'None'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleStartCapture}
          disabled={isCapturing}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: isCapturing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isCapturing ? 'not-allowed' : 'pointer'
          }}
        >
          Start Capture
        </button>

        <button
          onClick={handleStopCapture}
          disabled={!isCapturing}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: !isCapturing ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isCapturing ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Capture
        </button>

        <button
          onClick={handleClearActions}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Actions
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4>Action Summary:</h4>
        <p>Clicks: {clickActions.length}</p>
        <p>Typing: {typeActions.length}</p>
        <p>Navigation: {navigateActions.length}</p>
      </div>

      {actions.length > 0 && (
        <div>
          <h4>Recent Actions:</h4>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'white',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            {actions.slice(-10).map((action, index) => (
              <div key={action.id} style={{
                padding: '5px',
                borderBottom: '1px solid #eee',
                fontSize: '12px'
              }}>
                <strong>{action.step}.</strong> {action.action} 
                {action.target && ` on ${action.target}`}
                {action.value && ` = "${action.value}"`}
                <br />
                <span style={{ color: '#666' }}>
                  {new Date(action.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Click "Start Capture" to begin recording actions</li>
          <li>Click around, type in inputs, navigate between pages</li>
          <li>Click "Stop Capture" to see captured actions</li>
          <li>Check the browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
}
