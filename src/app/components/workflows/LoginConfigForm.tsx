/**
 * LoginConfigForm
 * Frontend component for configuring login settings in workflows
 */

import React, { useState } from 'react'
import { LoginConfig } from '@/lib/agents/logic/schemas'

interface LoginConfigFormProps {
  workflowId: string
  initialConfig?: {
    requiresLogin: boolean
    loginConfig?: LoginConfig
  }
  onSave: (config: { requiresLogin: boolean; loginConfig?: LoginConfig }) => void
  onCancel: () => void
}

const LoginConfigForm: React.FC<LoginConfigFormProps> = ({
  workflowId,
  initialConfig,
  onSave,
  onCancel
}) => {
  const [requiresLogin, setRequiresLogin] = useState(initialConfig?.requiresLogin || false)
  const [loginConfig, setLoginConfig] = useState<LoginConfig>({
    username: initialConfig?.loginConfig?.username || '',
    password: initialConfig?.loginConfig?.password || '',
    url: initialConfig?.loginConfig?.url || '',
    tenant: initialConfig?.loginConfig?.tenant || '',
    options: initialConfig?.loginConfig?.options || {}
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (requiresLogin) {
      if (!loginConfig.username.trim()) {
        newErrors.username = 'Username is required'
      }
      if (!loginConfig.password.trim()) {
        newErrors.password = 'Password is required'
      }
      if (!loginConfig.url.trim()) {
        newErrors.url = 'Login URL is required'
      } else {
        try {
          new URL(loginConfig.url)
        } catch {
          newErrors.url = 'Please enter a valid URL'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const config = {
        requiresLogin,
        loginConfig: requiresLogin ? loginConfig : undefined
      }

      const response = await fetch(`/api/agents/${workflowId}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save login configuration')
      }

      onSave(config)
    } catch (error) {
      console.error('Error saving login configuration:', error)
      setErrors({ general: error instanceof Error ? error.message : 'Failed to save configuration' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof LoginConfig, value: string) => {
    setLoginConfig(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <div className="login-config-form">
      <div className="form-header">
        <h3>Login Configuration</h3>
        <p>Configure authentication settings for this workflow</p>
      </div>

      <div className="form-content">
        {/* Requires Login Toggle */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={requiresLogin}
              onChange={(e) => setRequiresLogin(e.target.checked)}
            />
            <span>This workflow requires login</span>
          </label>
        </div>

        {/* Login Configuration Fields */}
        {requiresLogin && (
          <div className="login-fields">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                id="username"
                type="text"
                value={loginConfig.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Enter username or email"
                className={errors.username ? 'error' : ''}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                id="password"
                type="password"
                value={loginConfig.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter password"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="url">Login URL *</label>
              <input
                id="url"
                type="url"
                value={loginConfig.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="https://example.com/login"
                className={errors.url ? 'error' : ''}
              />
              {errors.url && <span className="error-message">{errors.url}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="tenant">Tenant (Optional)</label>
              <input
                id="tenant"
                type="text"
                value={loginConfig.tenant}
                onChange={(e) => handleInputChange('tenant', e.target.value)}
                placeholder="Enter tenant identifier"
              />
            </div>

            <div className="form-group">
              <label htmlFor="options">Additional Options (JSON)</label>
              <textarea
                id="options"
                value={JSON.stringify(loginConfig.options, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setLoginConfig(prev => ({ ...prev, options: parsed }))
                  } catch {
                    // Invalid JSON, keep the text for user to fix
                  }
                }}
                placeholder='{"timeout": 30000, "headless": false}'
                rows={4}
              />
            </div>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="error-message general-error">
            {errors.general}
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-config-form {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .form-header h3 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .form-header p {
          margin: 0 0 20px 0;
          color: #666;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          margin: 0;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-group input.error,
        .form-group textarea.error {
          border-color: #e74c3c;
        }

        .error-message {
          color: #e74c3c;
          font-size: 12px;
          margin-top: 5px;
        }

        .general-error {
          background: #fdf2f2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 20px;
        }

        .login-fields {
          margin-top: 20px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 30px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

export default LoginConfigForm
