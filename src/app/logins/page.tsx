"use client"

import { useState, useEffect } from "react"
import { useSession } from 'next-auth/react'

interface Login {
  id: string
  name: string
  loginUrl: string
  username: string
  password?: string
  oauthToken?: string
  templateId?: string
  customConfig?: string
  status: 'UNKNOWN' | 'ACTIVE' | 'BROKEN' | 'EXPIRED' | 'SUSPENDED' | 'NEEDS_RECONNECT' | 'DISCONNECTED'
  lastCheckedAt?: string
  lastSuccessAt?: string
  lastFailureAt?: string
  failureCount: number
  errorMessage?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

interface LoginTemplate {
  id: string
  name: string
  description: string
  loginUrl: string
}

interface TestResult {
  success: boolean
  status: 'ACTIVE' | 'BROKEN' | 'EXPIRED' | 'SUSPENDED' | 'NEEDS_RECONNECT' | 'DISCONNECTED'
  errorMessage?: string
  responseTime?: number
  lastChecked: string
  needsReconnect?: boolean
}

export default function LoginsPage() {
  const { data: session, status } = useSession()
  const [showAddForm, setShowAddForm] = useState(false)
  const [logins, setLogins] = useState<Login[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checkingHealth, setCheckingHealth] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState<string | null>(null)
  const [templates, setTemplates] = useState<LoginTemplate[]>([])
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [showReconnectModal, setShowReconnectModal] = useState<string | null>(null)
  const [individualTestResults, setIndividualTestResults] = useState<Record<string, TestResult>>({})
  const [formData, setFormData] = useState({
    name: "",
    loginUrl: "",
    username: "",
    password: "",
    templateId: "",
    testOnCreate: true,
  })

  // Fetch logins and templates on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchLogins()
      fetchTemplates()
    }
  }, [status])

  // Show loading while checking authentication
  if (status === 'loading') {
    return <div style={{ padding: "24px" }}>Loading...</div>
  }

  // Show login prompt if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div style={{ padding: "24px" }}>
        <div className="card">
          <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Authentication Required</h2>
          </div>
          <div>
            <p style={{ marginBottom: "16px" }}>You need to be logged in to manage logins.</p>
            <button 
              className="button"
              onClick={() => window.location.href = '/register'}
            >
              Go to Login/Register
            </button>
          </div>
        </div>
      </div>
    )
  }

  const fetchLogins = async () => {
    try {
      const response = await fetch('/api/logins', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setLogins(data.logins || [])
      }
    } catch (error) {
      console.error('Error fetching logins:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/login-templates', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/logins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setLogins([data.login, ...logins])
        
        // Show test result if available
        if (data.testResult) {
          setTestResult(data.testResult)
        }
        
        // Reset form and close if test was successful or not requested
        if (!formData.testOnCreate || (data.testResult && data.testResult.success)) {
          setFormData({ name: "", loginUrl: "", username: "", password: "", templateId: "", testOnCreate: true })
          setShowAddForm(false)
        }
      } else {
        const error = await response.json()
        console.error('Error creating login:', error)
        alert('Failed to create login: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating login:', error)
      alert('Failed to create login')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    setFormData(prev => ({ 
      ...prev, 
      templateId,
      loginUrl: template?.loginUrl || prev.loginUrl
    }))
  }

  const checkLoginHealth = async (loginId: string) => {
    setCheckingHealth(loginId)
    try {
      const response = await fetch(`/api/logins/${loginId}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const result = data.result
        
        // Store individual test result
        setIndividualTestResults(prev => ({
          ...prev,
          [loginId]: {
            success: result.success,
            status: result.status,
            errorMessage: result.errorMessage,
            responseTime: result.responseTime,
            lastChecked: result.lastChecked,
            needsReconnect: result.needsReconnect
          }
        }))
        
        // Refresh logins to show updated status
        await fetchLogins()
        
        // Show notification if needed
        if (result.needsReconnect) {
          alert(`Login requires reconnection: ${result.errorMessage || 'Session expired or 2FA required'}`)
        }
      } else {
        console.error('Health check failed')
        alert('Health check failed')
      }
    } catch (error) {
      console.error('Error checking login health:', error)
      alert('Error checking login health')
    } finally {
      setCheckingHealth(null)
    }
  }

  const startReconnect = async (loginId: string) => {
    setReconnecting(loginId)
    try {
      const response = await fetch(`/api/logins/${loginId}/reconnect/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        setShowReconnectModal(loginId)
        alert(`Browser window opened. ${result.instructions.message}`)
      } else {
        console.error('Reconnect start failed')
        alert('Failed to start reconnection')
      }
    } catch (error) {
      console.error('Error starting reconnect:', error)
      alert('Error starting reconnection')
    } finally {
      setReconnecting(null)
    }
  }

  const completeReconnect = async (loginId: string) => {
    try {
      // In a real implementation, you'd capture the current session data from the browser
      // For now, we'll simulate this
      const mockSessionData = {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        timestamp: Date.now()
      }

      const response = await fetch(`/api/logins/${loginId}/reconnect/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionData: mockSessionData,
          currentUrl: 'https://example.com/dashboard', // This would be captured from browser
          pageTitle: 'Dashboard' // This would be captured from browser
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setShowReconnectModal(null)
        await fetchLogins()
        alert('Reconnection completed successfully!')
      } else {
        const error = await response.json()
        alert(`Reconnection failed: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error completing reconnect:', error)
      alert('Error completing reconnection')
    }
  }

  const checkAllLoginsHealth = async () => {
    setCheckingHealth('all')
    try {
      const response = await fetch('/api/logins/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (response.ok) {
        // Refresh logins to show updated status
        await fetchLogins()
      } else {
        console.error('Health check failed')
      }
    } catch (error) {
      console.error('Error checking all login health:', error)
    } finally {
      setCheckingHealth(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '✅'
      case 'NEEDS_RECONNECT':
        return '⚠️'
      case 'DISCONNECTED':
        return '❌'
      case 'BROKEN':
        return '❌'
      case 'EXPIRED':
        return '⏰'
      case 'SUSPENDED':
        return '🚫'
      default:
        return '❓'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active'
      case 'NEEDS_RECONNECT':
        return 'Needs Reconnect'
      case 'DISCONNECTED':
        return 'Disconnected'
      case 'BROKEN':
        return 'Broken'
      case 'EXPIRED':
        return 'Expired'
      case 'SUSPENDED':
        return 'Suspended'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { background: '#d4edda', color: '#155724', border: '#c3e6cb' }
      case 'NEEDS_RECONNECT':
        return { background: '#fff3cd', color: '#856404', border: '#ffeaa7' }
      case 'DISCONNECTED':
        return { background: '#f8d7da', color: '#721c24', border: '#f5c6cb' }
      case 'BROKEN':
        return { background: '#f8d7da', color: '#721c24', border: '#f5c6cb' }
      case 'EXPIRED':
        return { background: '#ffeaa7', color: '#856404', border: '#ffeaa7' }
      case 'SUSPENDED':
        return { background: '#f5c6cb', color: '#721c24', border: '#f1aeb5' }
      default:
        return { background: '#e2e3e5', color: '#383d41', border: '#d6d8db' }
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        marginBottom: "24px"
      }}>
        <div>
          <h1 style={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            margin: "0 0 8px 0",
            color: "#333"
          }}>
            Logins
          </h1>
          <p style={{ 
            color: "#666",
            margin: 0
          }}>
            Manage your login credentials for automation agents.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {logins.length > 0 && (
            <button 
              className="button button-outline"
              onClick={checkAllLoginsHealth}
              disabled={checkingHealth === 'all'}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>{checkingHealth === 'all' ? '⏳' : '🔄'}</span>
              Check All Health
            </button>
          )}
          <button 
            className="button"
            onClick={() => setShowAddForm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>➕</span>
            Add Login
          </button>
        </div>
      </div>

      {/* Logins List */}
      <div className="card">
        <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Your Logins</h2>
        </div>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "#666" }}>Loading logins...</p>
          </div>
        ) : logins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔑</div>
            <h3 style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>No logins yet</h3>
            <p style={{ color: "#666", marginBottom: "16px" }}>
              Add your first login credentials to get started.
            </p>
            <button 
              className="button"
              onClick={() => setShowAddForm(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 auto"
              }}
            >
              <span>➕</span>
              Add Login
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {logins.map((login) => (
              <div key={login.id} style={{ 
                padding: "16px", 
                border: "1px solid #ddd", 
                borderRadius: "8px",
                backgroundColor: "white"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <h3 style={{ fontWeight: "500", margin: 0 }}>{login.name}</h3>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        border: `1px solid ${getStatusColor(login.status).border}`,
                        backgroundColor: getStatusColor(login.status).background,
                        color: getStatusColor(login.status).color
                      }}>
                        <span>{getStatusIcon(login.status)}</span>
                        {getStatusText(login.status)}
                      </span>
                    </div>
                    <p style={{ fontSize: "14px", color: "#666", margin: "0 0 4px 0" }}>
                      {login.loginUrl}
                    </p>
                    <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                      Username: {login.username}
                    </p>
                  </div>
                  
                  {/* Actions Dropdown */}
                  <div style={{ position: "relative" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}>
                      <button 
                        className="button button-outline"
                        onClick={() => checkLoginHealth(login.id)}
                        disabled={checkingHealth === login.id}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px"
                        }}
                      >
                        {checkingHealth === login.id ? '⏳' : '🔄'} Test
                      </button>
                      {(login.status === 'NEEDS_RECONNECT' || login.status === 'DISCONNECTED') && (
                        <button 
                          className="button"
                          onClick={() => startReconnect(login.id)}
                          disabled={reconnecting === login.id}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            backgroundColor: "#ffc107",
                            color: "#333",
                            border: "1px solid #ffc107"
                          }}
                        >
                          {reconnecting === login.id ? '⏳' : '🔑'} Reconnect
                        </button>
                      )}
                      <button 
                        className="button button-danger"
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px"
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Status Details */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
                  gap: "16px", 
                  marginTop: "12px",
                  fontSize: "12px", 
                  color: "#666"
                }}>
                  <div>
                    <span style={{ fontWeight: "500" }}>Last Checked:</span>
                    <p style={{ margin: "4px 0 0 0" }}>{formatDate(login.lastCheckedAt)}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: "500" }}>Last Success:</span>
                    <p style={{ margin: "4px 0 0 0" }}>{formatDate(login.lastSuccessAt)}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: "500" }}>Last Failure:</span>
                    <p style={{ margin: "4px 0 0 0" }}>{formatDate(login.lastFailureAt)}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: "500" }}>Failure Count:</span>
                    <p style={{ margin: "4px 0 0 0" }}>{login.failureCount}</p>
                  </div>
                </div>
                
                {login.errorMessage && (
                  <div style={{
                    marginTop: "12px",
                    padding: "8px",
                    backgroundColor: "#f8d7da",
                    border: "1px solid #f5c6cb",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#721c24"
                  }}>
                    <span style={{ fontWeight: "500" }}>Error:</span> {login.errorMessage}
                  </div>
                )}
                
                {/* Individual Test Results */}
                {individualTestResults[login.id] && (
                  <div style={{
                    marginTop: "12px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: `1px solid ${individualTestResults[login.id].success ? '#c3e6cb' : '#f5c6cb'}`,
                    backgroundColor: individualTestResults[login.id].success ? '#d4edda' : '#f8d7da'
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "16px" }}>
                        {individualTestResults[login.id].success ? '✅' : '❌'}
                      </span>
                      <span style={{
                        fontWeight: "500",
                        color: individualTestResults[login.id].success ? '#155724' : '#721c24'
                      }}>
                        {individualTestResults[login.id].success ? 'Test Successful!' : 'Test Failed'}
                      </span>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {new Date(individualTestResults[login.id].lastChecked).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      <p style={{ margin: "0 0 4px 0" }}>
                        <strong>Status:</strong> {getStatusText(individualTestResults[login.id].status)}
                      </p>
                      {individualTestResults[login.id].responseTime && (
                        <p style={{ margin: "0 0 4px 0" }}>
                          <strong>Response Time:</strong> {individualTestResults[login.id].responseTime}ms
                        </p>
                      )}
                      {individualTestResults[login.id].errorMessage && (
                        <p style={{ margin: 0, color: "#721c24" }}>
                          <strong>Error:</strong> {individualTestResults[login.id].errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Login Form */}
      {showAddForm && (
        <div className="card" style={{ marginTop: "24px" }}>
          <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>Add New Login</h2>
            <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
              Add login credentials for your automation agents.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Template Selection */}
            <div>
              <label className="label">Login Template (Optional)</label>
              <select 
                value={formData.templateId} 
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="input"
              >
                <option value="">Custom Form</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="My System Login"
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">Login URL</label>
                <input
                  type="url"
                  name="loginUrl"
                  value={formData.loginUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/login"
                  required
                  className="input"
                />
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="username@example.com"
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="input"
                />
              </div>
            </div>

            {/* Test on Create Option */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="testOnCreate"
                name="testOnCreate"
                checked={formData.testOnCreate}
                onChange={handleInputChange}
              />
              <label htmlFor="testOnCreate" className="label" style={{ margin: 0 }}>
                Test login immediately after creation
              </label>
            </div>

            {/* Test Results */}
            {testResult && (
              <div style={{
                padding: "16px",
                borderRadius: "8px",
                border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                backgroundColor: testResult.success ? '#d4edda' : '#f8d7da'
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px" }}>
                    {testResult.success ? '✅' : '❌'}
                  </span>
                  <span style={{
                    fontWeight: "500",
                    color: testResult.success ? '#155724' : '#721c24'
                  }}>
                    {testResult.success ? 'Login Test Successful!' : 'Login Test Failed'}
                  </span>
                </div>
                <div style={{ fontSize: "14px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>Status:</strong> {getStatusText(testResult.status)}
                  </p>
                  {testResult.responseTime && (
                    <p style={{ margin: "0 0 4px 0" }}>
                      <strong>Response Time:</strong> {testResult.responseTime}ms
                    </p>
                  )}
                  {testResult.errorMessage && (
                    <p style={{ margin: 0, color: "#721c24" }}>
                      <strong>Error:</strong> {testResult.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button 
                type="button" 
                className="button button-outline"
                onClick={() => {
                  setShowAddForm(false)
                  setTestResult(null)
                  setFormData({ name: "", loginUrl: "", username: "", password: "", templateId: "", testOnCreate: true })
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? (
                  <>
                    <span>⏳</span> {formData.testOnCreate ? 'Testing...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <span>🧪</span> {formData.testOnCreate ? 'Create & Test Login' : 'Create Login'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reconnect Modal */}
      {showReconnectModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            maxWidth: "400px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0" }}>
              Complete Reconnection
            </h2>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
              <p style={{ margin: "0 0 8px 0" }}>Please complete the login process in the browser window that opened:</p>
              <ul style={{ margin: "0 0 0 16px", padding: 0 }}>
                <li style={{ marginBottom: "4px" }}>Complete any required authentication steps</li>
                <li style={{ marginBottom: "4px" }}>Navigate to the main application page (not the login page)</li>
                <li>Click &quot;Complete Reconnection&quot; when finished</li>
              </ul>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button 
                className="button button-outline"
                onClick={() => setShowReconnectModal(null)}
              >
                Cancel
              </button>
              <button 
                className="button"
                onClick={() => completeReconnect(showReconnectModal)}
              >
                Complete Reconnection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}