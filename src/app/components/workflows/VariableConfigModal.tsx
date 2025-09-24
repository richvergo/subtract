/**
 * VariableConfigModal Component
 * Enterprise-grade workflow variable management with full CRUD operations
 */

"use client"

import React, { useState, useEffect } from 'react'
import { z } from 'zod'

// API Response schemas
const VariableDefSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'date', 'file', 'url', 'email', 'phone']),
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  required: z.boolean(),
  source: z.enum(['user_input', 'api_response', 'file_upload', 'environment', 'computed', 'random', 'timestamp']).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.union([
    z.array(VariableDefSchema),
    VariableDefSchema,
    z.object({
      variableId: z.string(),
      deleted: z.boolean()
    })
  ]).optional(),
  error: z.string().optional(),
  details: z.array(z.any()).optional()
})

const VariableRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'date', 'file', 'url', 'email', 'phone']),
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  required: z.boolean().default(false),
  source: z.enum(['user_input', 'api_response', 'file_upload', 'environment', 'computed', 'random', 'timestamp']).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

type VariableDef = z.infer<typeof VariableDefSchema>
type VariableRequest = z.infer<typeof VariableRequestSchema>

interface VariableConfigModalProps {
  isOpen: boolean
  onClose: () => void
  workflowId: string
}

export default function VariableConfigModal({ 
  isOpen, 
  onClose, 
  workflowId 
}: VariableConfigModalProps) {
  // State management
  const [variables, setVariables] = useState<VariableDef[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingVariable, setEditingVariable] = useState<VariableDef | null>(null)
  const [formData, setFormData] = useState<VariableRequest>({
    name: '',
    type: 'string',
    description: '',
    defaultValue: '',
    required: false,
    source: 'user_input',
    validation: {
      min: undefined,
      max: undefined,
      pattern: '',
      options: []
    },
    metadata: {}
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // API Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

  // Fetch variables on mount
  useEffect(() => {
    if (isOpen) {
      fetchVariables()
    }
  }, [isOpen, workflowId])

  // Fetch variables from API
  const fetchVariables = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('📊 Fetching workflow variables:', workflowId)

      const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/variables`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Validate API response with Zod
      const validatedResult = ApiResponseSchema.parse(result)
      
      if (validatedResult.success && Array.isArray(validatedResult.data)) {
        setVariables(validatedResult.data)
        console.log('✅ Variables loaded:', validatedResult.data.length)
      } else {
        throw new Error(validatedResult.error || 'Failed to load variables')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('❌ Failed to fetch variables:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Create new variable
  const createVariable = async (variableData: VariableRequest) => {
    try {
      setIsSaving(true)

      console.log('➕ Creating variable:', variableData.name)

      const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(variableData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Validate API response with Zod
      const validatedResult = ApiResponseSchema.parse(result)
      
      if (validatedResult.success && !Array.isArray(validatedResult.data)) {
        // Optimistic update
        setVariables(prev => [...prev, validatedResult.data as VariableDef])
        console.log('✅ Variable created successfully')
        return validatedResult.data as VariableDef
      } else {
        throw new Error(validatedResult.error || 'Failed to create variable')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('❌ Failed to create variable:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  // Update existing variable
  const updateVariable = async (variableId: string, variableData: VariableRequest) => {
    try {
      setIsSaving(true)

      console.log('✏️ Updating variable:', variableId)

      const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/variables?variableId=${variableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(variableData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Validate API response with Zod
      const validatedResult = ApiResponseSchema.parse(result)
      
      if (validatedResult.success && !Array.isArray(validatedResult.data)) {
        // Optimistic update
        setVariables(prev => prev.map(v => 
          v.id === variableId ? validatedResult.data as VariableDef : v
        ))
        console.log('✅ Variable updated successfully')
        return validatedResult.data as VariableDef
      } else {
        throw new Error(validatedResult.error || 'Failed to update variable')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('❌ Failed to update variable:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  // Delete variable
  const deleteVariable = async (variableId: string) => {
    try {
      setIsSaving(true)

      console.log('🗑️ Deleting variable:', variableId)

      const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/variables?variableId=${variableId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Validate API response with Zod
      const validatedResult = ApiResponseSchema.parse(result)
      
      if (validatedResult.success) {
        // Optimistic update
        setVariables(prev => prev.filter(v => v.id !== variableId))
        console.log('✅ Variable deleted successfully')
      } else {
        throw new Error(validatedResult.error || 'Failed to delete variable')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('❌ Failed to delete variable:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  // Form handlers
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleValidationChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [field]: value
      }
    }))
  }

  const handleOptionsChange = (index: number, value: string) => {
    const newOptions = [...formData.validation.options]
    newOptions[index] = value
    setFormData(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        options: newOptions
      }
    }))
  }

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        options: [...prev.validation.options, '']
      }
    }))
  }

  const removeOption = (index: number) => {
    const newOptions = formData.validation.options.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        options: newOptions
      }
    }))
  }

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Check for duplicate names
    const existingNames = variables
      .filter(v => !editingVariable || v.id !== editingVariable.id)
      .map(v => v.name.toLowerCase())
    
    if (existingNames.includes(formData.name.toLowerCase())) {
      newErrors.name = 'Variable name already exists'
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    // Validate type-specific fields
    if (formData.type === 'number') {
      if (formData.validation.min !== undefined && formData.validation.max !== undefined) {
        if (formData.validation.min >= formData.validation.max) {
          newErrors.validation = 'Min value must be less than max value'
        }
      }
    }

    // Validate pattern
    if (formData.validation.pattern) {
      try {
        new RegExp(formData.validation.pattern)
      } catch {
        newErrors.pattern = 'Invalid regular expression'
      }
    }

    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      // Validate with Zod
      const validatedData = VariableRequestSchema.parse(formData)

      if (editingVariable) {
        await updateVariable(editingVariable.id, validatedData)
      } else {
        await createVariable(validatedData)
      }
      
      // Reset form
      resetForm()
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setFormErrors(newErrors)
      }
    }
  }

  // Form reset
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'string',
      description: '',
      defaultValue: '',
      required: false,
      source: 'user_input',
      validation: {
        min: undefined,
        max: undefined,
        pattern: '',
        options: []
      },
      metadata: {}
    })
    setFormErrors({})
    setEditingVariable(null)
    setShowForm(false)
  }

  // Edit variable
  const handleEdit = (variable: VariableDef) => {
    setEditingVariable(variable)
    setFormData({
      name: variable.name,
      type: variable.type,
      description: variable.description || '',
      defaultValue: variable.defaultValue || '',
      required: variable.required,
      source: variable.source || 'user_input',
      validation: {
        min: variable.validation?.min,
        max: variable.validation?.max,
        pattern: variable.validation?.pattern || '',
        options: variable.validation?.options || []
      },
      metadata: variable.metadata || {}
    })
    setFormErrors({})
    setShowForm(true)
  }

  // Delete variable with confirmation
  const handleDelete = async (variable: VariableDef) => {
    if (window.confirm(`Are you sure you want to delete the variable "${variable.name}"?`)) {
      try {
        await deleteVariable(variable.id)
      } catch (error) {
        // Error already handled in deleteVariable
      }
    }
  }

  // Add new variable
  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  // Get variable type icon
  const getVariableTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
        return '📝'
      case 'number':
        return '🔢'
      case 'boolean':
        return '✅'
      case 'array':
        return '📋'
      case 'object':
        return '📦'
      case 'date':
        return '📅'
      case 'file':
        return '📁'
      case 'url':
        return '🔗'
      case 'email':
        return '📧'
      case 'phone':
        return '📞'
      default:
        return '⚙️'
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            margin: 0,
            color: '#333'
          }}>
            📊 Workflow Variables
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f8d7da',
            borderRadius: '6px',
            border: '1px solid #f5c6cb',
            color: '#721c24'
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              ❌ Error
            </h4>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            gap: '12px',
            color: '#007bff'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #007bff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Loading variables...
          </div>
        )}

        {/* Variables List */}
        {!isLoading && !showForm && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: 0,
                color: '#495057'
              }}>
                Variables ({variables.length})
              </h3>
              <button
                onClick={handleAddNew}
                style={{
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>➕</span>
                Add Variable
              </button>
            </div>

            {variables.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6c757d'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No variables configured
                </div>
                <div style={{ fontSize: '14px' }}>
                  Click "Add Variable" to create your first workflow variable
                </div>
              </div>
            ) : (
              <div style={{
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                {variables.map((variable, index) => (
                  <div
                    key={variable.id}
                    style={{
                      padding: '16px',
                      borderBottom: index < variables.length - 1 ? '1px solid #e9ecef' : 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontSize: '16px' }}>
                            {getVariableTypeIcon(variable.type)}
                          </span>
                          <span style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#333'
                          }}>
                            {variable.name}
                          </span>
                          {variable.required && (
                            <span style={{
                              fontSize: '12px',
                              color: '#dc3545',
                              fontWeight: '500'
                            }}>
                              (Required)
                            </span>
                          )}
                        </div>
                        
                        <div style={{
                          fontSize: '14px',
                          color: '#6c757d',
                          marginBottom: '4px'
                        }}>
                          Type: {variable.type}
                        </div>
                        
                        {variable.description && (
                          <div style={{
                            fontSize: '14px',
                            color: '#495057',
                            marginBottom: '4px'
                          }}>
                            {variable.description}
                          </div>
                        )}
                        
                        {variable.defaultValue && (
                          <div style={{
                            fontSize: '12px',
                            color: '#6c757d',
                            fontFamily: 'monospace',
                            backgroundColor: '#f8f9fa',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            Default: {String(variable.defaultValue)}
                          </div>
                        )}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}>
                        <button
                          onClick={() => handleEdit(variable)}
                          style={{
                            background: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(variable)}
                          style={{
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Variable Form */}
        {!isLoading && showForm && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: 0,
                color: '#495057'
              }}>
                {editingVariable ? '✏️ Edit Variable' : '➕ Add New Variable'}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                ← Back to List
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: '#495057'
                }}>
                  Basic Information
                </h4>
                
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px',
                      color: '#495057'
                    }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${formErrors.name ? '#dc3545' : '#ced4da'}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter variable name"
                    />
                    {formErrors.name && (
                      <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                        {formErrors.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px',
                      color: '#495057'
                    }}>
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="string">📝 String</option>
                      <option value="number">🔢 Number</option>
                      <option value="boolean">✅ Boolean</option>
                      <option value="array">📋 Array</option>
                      <option value="object">📦 Object</option>
                      <option value="date">📅 Date</option>
                      <option value="file">📁 File</option>
                      <option value="url">🔗 URL</option>
                      <option value="email">📧 Email</option>
                      <option value="phone">📞 Phone</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px',
                      color: '#495057'
                    }}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                      placeholder="Enter variable description"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px',
                      color: '#495057'
                    }}>
                      Default Value
                    </label>
                    <input
                      type="text"
                      value={formData.defaultValue}
                      onChange={(e) => handleChange('defaultValue', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter default value"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#495057'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.required}
                        onChange={(e) => handleChange('required', e.target.checked)}
                      />
                      Required variable
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #dee2e6'
              }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    background: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    background: isSaving ? '#6c757d' : '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: isSaving ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isSaving && (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid #fff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  )}
                  {isSaving ? 'Saving...' : (editingVariable ? 'Update Variable' : 'Create Variable')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CSS for animations */}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
