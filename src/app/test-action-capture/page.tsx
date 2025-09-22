/**
 * Test page for action capture functionality
 */

import ActionCaptureTest from '@/components/ActionCaptureTest';

export default function TestActionCapturePage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '24px',
          marginBottom: '20px',
          color: '#333'
        }}>
          Action Capture Test Page
        </h1>
        
        <p style={{
          marginBottom: '20px',
          color: '#666',
          lineHeight: '1.5'
        }}>
          This page allows you to test the action capture functionality. 
          The system will record your clicks, typing, navigation, and other interactions.
        </p>

        <ActionCaptureTest />

        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ marginTop: 0 }}>Test Interactions</h3>
          <p>Try these interactions while action capture is running:</p>
          
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="test-input" style={{ display: 'block', marginBottom: '5px' }}>
              Test Input:
            </label>
            <input
              id="test-input"
              type="text"
              placeholder="Type something here..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={() => alert('Button clicked!')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Test Button 1
            </button>
            
            <button
              onClick={() => console.log('Button 2 clicked')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Test Button 2
            </button>
            
            <button
              onClick={() => window.scrollTo(0, 0)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffc107',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Scroll to Top
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <select
              onChange={(e) => console.log('Select changed:', e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginRight: '10px'
              }}
            >
              <option value="">Choose an option...</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
              <option value="option3">Option 3</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              <input type="checkbox" onChange={(e) => console.log('Checkbox:', e.target.checked)} />
              Test Checkbox
            </label>
          </div>
        </div>

        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#e8f4fd',
          borderRadius: '8px',
          border: '1px solid #b8daff'
        }}>
          <h3 style={{ marginTop: 0, color: '#004085' }}>How It Works</h3>
          <ul style={{ color: '#004085', lineHeight: '1.6' }}>
            <li><strong>Click Detection:</strong> Records clicks on buttons, links, and other elements</li>
            <li><strong>Input Capture:</strong> Captures typing in text inputs, textareas, and selects</li>
            <li><strong>Navigation:</strong> Tracks page navigation and URL changes</li>
            <li><strong>Scroll Events:</strong> Records scrolling behavior</li>
            <li><strong>Keyboard Events:</strong> Captures important key presses (Enter, Tab, etc.)</li>
            <li><strong>Rich Metadata:</strong> Stores element selectors, text content, and positioning</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
