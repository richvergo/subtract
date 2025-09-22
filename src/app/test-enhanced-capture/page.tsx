'use client';

import React, { useState } from 'react';
import { useEnhancedActionCapture } from '@/lib/hooks/use-enhanced-action-capture';

export default function TestEnhancedCapturePage() {
  const {
    isCapturing,
    actions,
    actionsCount,
    session,
    quality,
    startCapture,
    stopCapture,
    clearActions,
    getActionsByType,
    getQualityReport
  } = useEnhancedActionCapture();

  const [showDetails, setShowDetails] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);

  const qualityReport = getQualityReport();

  const handleStartCapture = () => {
    startCapture();
  };

  const handleStopCapture = () => {
    const sessionData = stopCapture();
    console.log('Enhanced session data:', sessionData);
  };

  const handleClearActions = () => {
    clearActions();
  };

  const handleActionClick = (action: any) => {
    setSelectedAction(action);
    setShowDetails(true);
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎬 Enhanced Action Capture Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test the advanced action capture system with DOM observation, visual detection, 
            context awareness, and smart selectors for maximum accuracy.
          </p>

          {/* Control Panel */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleStartCapture}
              disabled={isCapturing}
              className={`px-6 py-3 rounded-lg font-medium ${
                isCapturing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isCapturing ? '🔄 Capturing...' : '▶️ Start Enhanced Capture'}
            </button>

            <button
              onClick={handleStopCapture}
              disabled={!isCapturing}
              className={`px-6 py-3 rounded-lg font-medium ${
                !isCapturing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              ⏹️ Stop Capture
            </button>

            <button
              onClick={handleClearActions}
              disabled={actionsCount === 0}
              className={`px-6 py-3 rounded-lg font-medium ${
                actionsCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              🗑️ Clear Actions
            </button>
          </div>

          {/* Status */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{actionsCount}</div>
                <div className="text-sm text-gray-600">Actions Captured</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {session ? session.domChanges.length : 0}
                </div>
                <div className="text-sm text-gray-600">DOM Changes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {session ? session.visualElements.length : 0}
                </div>
                <div className="text-sm text-gray-600">Visual Elements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {session ? Math.round(session.metadata.recordingDuration / 1000) : 0}s
                </div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Dashboard */}
        {session && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Quality Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Overall Quality</div>
                <div className={`text-2xl font-bold ${getQualityColor(quality.overallScore)}`}>
                  {getQualityLabel(quality.overallScore)}
                </div>
                <div className="text-sm text-gray-500">
                  {(quality.overallScore * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Action Quality</div>
                <div className={`text-2xl font-bold ${getQualityColor(quality.actionQuality)}`}>
                  {getQualityLabel(quality.actionQuality)}
                </div>
                <div className="text-sm text-gray-500">
                  {(quality.actionQuality * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Selector Quality</div>
                <div className={`text-2xl font-bold ${getQualityColor(quality.selectorQuality)}`}>
                  {getQualityLabel(quality.selectorQuality)}
                </div>
                <div className="text-sm text-gray-500">
                  {(quality.selectorQuality * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Stability Score</div>
                <div className={`text-2xl font-bold ${getQualityColor(quality.stabilityScore)}`}>
                  {getQualityLabel(quality.stabilityScore)}
                </div>
                <div className="text-sm text-gray-500">
                  {(quality.stabilityScore * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Quality Report */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Quality Report</h3>
              <p className="text-blue-800 mb-3">{qualityReport.summary}</p>
              
              {qualityReport.strengths.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-green-800 mb-1">Strengths:</div>
                  <ul className="text-sm text-green-700 list-disc list-inside">
                    {qualityReport.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {qualityReport.recommendations.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-yellow-800 mb-1">Recommendations:</div>
                  <ul className="text-sm text-yellow-700 list-disc list-inside">
                    {qualityReport.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {qualityReport.improvements.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-red-800 mb-1">Areas for Improvement:</div>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {qualityReport.improvements.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions List */}
        {actionsCount > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Captured Actions</h2>
            
            <div className="space-y-3">
              {actions.map((action, index) => (
                <div
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {action.action.charAt(0).toUpperCase() + action.action.slice(1)}
                        </div>
                        <div className="text-sm text-gray-600">{action.target}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Confidence: {(action.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {action.context && (
                    <div className="mt-2 text-sm text-gray-600">
                      <div>Intent: {action.context.userIntent}</div>
                      <div>Category: {action.context.semanticContext.actionCategory}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Elements */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🧪 Test Elements</h2>
          <p className="text-gray-600 mb-6">
            Interact with these elements to test the enhanced action capture system:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Form Elements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Form Elements</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="name-input"
                />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="email-input"
                />
                <textarea
                  placeholder="Enter your message"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="message-textarea"
                />
                <button
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="submit-button"
                >
                  Submit Form
                </button>
              </div>
            </div>

            {/* Interactive Elements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Interactive Elements</h3>
              <div className="space-y-3">
                <button
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  data-testid="action-button"
                >
                  Perform Action
                </button>
                <button
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  data-testid="danger-button"
                >
                  Dangerous Action
                </button>
                <a
                  href="#"
                  className="block w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-center"
                  data-testid="navigation-link"
                >
                  Navigate
                </a>
              </div>
            </div>

            {/* Complex Elements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Complex Elements</h3>
              <div className="space-y-3">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="dropdown-select"
                >
                  <option value="">Select an option</option>
                  <option value="option1">Option 1</option>
                  <option value="option2">Option 2</option>
                  <option value="option3">Option 3</option>
                </select>
                <div className="flex space-x-2">
                  <input
                    type="checkbox"
                    id="checkbox1"
                    className="mt-1"
                    data-testid="checkbox-input"
                  />
                  <label htmlFor="checkbox1" className="text-sm text-gray-700">
                    Check this box
                  </label>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="radio"
                    id="radio1"
                    name="radio-group"
                    className="mt-1"
                    data-testid="radio-input"
                  />
                  <label htmlFor="radio1" className="text-sm text-gray-700">
                    Select this option
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Details Modal */}
        {showDetails && selectedAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Action Details</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Action Type</div>
                    <div className="text-lg text-gray-900">{selectedAction.action}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-600">Target</div>
                    <div className="text-lg text-gray-900 font-mono">{selectedAction.target}</div>
                  </div>
                  
                  {selectedAction.value && (
                    <div>
                      <div className="text-sm font-medium text-gray-600">Value</div>
                      <div className="text-lg text-gray-900">{selectedAction.value}</div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-sm font-medium text-gray-600">Confidence</div>
                    <div className="text-lg text-gray-900">
                      {(selectedAction.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  {selectedAction.context && (
                    <div>
                      <div className="text-sm font-medium text-gray-600">User Intent</div>
                      <div className="text-lg text-gray-900">{selectedAction.context.userIntent}</div>
                    </div>
                  )}
                  
                  {selectedAction.metadata && (
                    <div>
                      <div className="text-sm font-medium text-gray-600">Metadata</div>
                      <pre className="text-sm text-gray-900 bg-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedAction.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
