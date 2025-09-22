/**
 * Enhanced LLM Service for Granular Action Analysis
 * Processes recorded actions and generates intelligent insights
 */

import { RecordedAction, RecordingSession } from './enhanced-recorder-fixed'

export interface ActionAnalysis {
  action: RecordedAction
  intent: string
  confidence: number
  parameterizable: boolean
  parameterType?: 'text' | 'date' | 'number' | 'list' | 'file_path'
  parameterName?: string
  description: string
}

export interface WorkflowAnalysis {
  summary: string
  actionAnalyses: ActionAnalysis[]
  workflowPatterns: WorkflowPattern[]
  parameterizableActions: ActionAnalysis[]
  recommendations: string[]
}

export interface WorkflowPattern {
  type: 'form_filling' | 'navigation' | 'filtering' | 'downloading' | 'searching' | 'custom'
  actions: ActionAnalysis[]
  description: string
  reusable: boolean
}

export class EnhancedLLMService {
  private config: {
    apiKey?: string
    model?: string
    baseUrl?: string
  }

  constructor(config: any = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o-mini',
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
    }
  }

  /**
   * Analyze recording session and extract intelligent insights
   */
  async analyzeRecordingSession(session: RecordingSession): Promise<WorkflowAnalysis> {
    console.log('🧠 Analyzing recording session with enhanced AI...')
    
    try {
      // For now, use enhanced rule-based analysis
      // TODO: Replace with actual LLM calls when ready
      const actionAnalyses = this.analyzeActions(session.actions)
      const workflowPatterns = this.detectWorkflowPatterns(actionAnalyses)
      const parameterizableActions = actionAnalyses.filter(a => a.parameterizable)
      
      const summary = this.generateWorkflowSummary(session, workflowPatterns)
      const recommendations = this.generateRecommendations(parameterizableActions, workflowPatterns)
      
      console.log('✅ Enhanced analysis complete:', {
        totalActions: session.actions.length,
        parameterizableActions: parameterizableActions.length,
        patterns: workflowPatterns.length
      })
      
      return {
        summary,
        actionAnalyses,
        workflowPatterns,
        parameterizableActions,
        recommendations
      }
      
    } catch (error) {
      console.error('Enhanced analysis failed:', error)
      throw new Error('Failed to analyze recording session')
    }
  }

  /**
   * Analyze individual actions and determine their intent
   */
  private analyzeActions(actions: RecordedAction[]): ActionAnalysis[] {
    return actions.map(action => {
      const analysis = this.analyzeAction(action)
      return {
        action,
        ...analysis
      }
    })
  }

  /**
   * Analyze a single action
   */
  private analyzeAction(action: RecordedAction): Omit<ActionAnalysis, 'action'> {
    const element = action.element
    const selector = action.selector || ''
    const value = action.value || ''
    
    // Determine intent based on action type and element
    let intent = action.intent || 'unknown'
    let confidence = 0.5
    let parameterizable = false
    let parameterType: ActionAnalysis['parameterType']
    let parameterName: string | undefined
    let description = ''

    switch (action.type) {
      case 'click':
        intent = this.analyzeClickIntent(action)
        confidence = 0.8
        description = `Click on ${element?.tagName || 'element'}`
        
        // Check if click is on form elements that might be parameterizable
        if (element?.tagName === 'button' && element.text?.toLowerCase().includes('submit')) {
          description = `Submit form or ${element.text}`
        } else if (element?.tagName === 'button' && element.text?.toLowerCase().includes('filter')) {
          description = `Apply filter: ${element.text}`
        } else if (element?.tagName === 'button' && element.text?.toLowerCase().includes('download')) {
          description = `Download file or document`
        }
        break
        
      case 'type':
        intent = 'input_data'
        confidence = 0.9
        description = `Type in ${element?.tagName || 'input field'}`
        
        // Analyze if input should be parameterizable
        const inputAnalysis = this.analyzeInputParameterization(action)
        parameterizable = inputAnalysis.parameterizable
        parameterType = inputAnalysis.parameterType
        parameterName = inputAnalysis.parameterName
        
        if (parameterizable) {
          description = `Input ${parameterName}: "${value}"`
        }
        break
        
      case 'select':
        intent = 'select_option'
        confidence = 0.8
        parameterizable = true
        parameterType = 'list'
        parameterName = this.generateParameterName(element)
        description = `Select option from ${element?.tagName || 'dropdown'}`
        break
        
      case 'navigate':
        intent = 'navigate_page'
        confidence = 0.9
        description = `Navigate to ${action.url}`
        break
        
      case 'scroll':
        intent = 'scroll_page'
        confidence = 0.7
        description = 'Scroll page'
        break
        
      case 'hover':
        intent = 'hover_element'
        confidence = 0.6
        description = `Hover over ${element?.tagName || 'element'}`
        break
    }

    return {
      intent,
      confidence,
      parameterizable,
      parameterType,
      parameterName,
      description
    }
  }

  /**
   * Analyze click intent more deeply
   */
  private analyzeClickIntent(action: RecordedAction): string {
    const element = action.element
    const text = element?.text?.toLowerCase() || ''
    const className = element?.className?.toLowerCase() || ''
    const id = element?.id?.toLowerCase() || ''
    
    // Form submission
    if (text.includes('submit') || text.includes('login') || text.includes('sign in')) {
      return 'submit_form'
    }
    
    // Filtering actions
    if (text.includes('filter') || text.includes('search') || className.includes('filter')) {
      return 'apply_filter'
    }
    
    // Download actions
    if (text.includes('download') || text.includes('export') || className.includes('download')) {
      return 'download_file'
    }
    
    // Navigation
    if (element?.tagName === 'a' || className.includes('nav') || className.includes('link')) {
      return 'navigate_link'
    }
    
    // Generic button click
    if (element?.tagName === 'button') {
      return 'click_button'
    }
    
    return 'click_element'
  }

  /**
   * Analyze if input should be parameterizable
   */
  private analyzeInputParameterization(action: RecordedAction): {
    parameterizable: boolean
    parameterType?: ActionAnalysis['parameterType']
    parameterName?: string
  } {
    const element = action.element
    const value = action.value || ''
    
    // Skip if value is too short
    if (value.length < 3) {
      return { parameterizable: false }
    }
    
    // Skip password fields
    if (element?.type === 'password') {
      return { parameterizable: false }
    }
    
    // Generate parameter name based on element properties
    const parameterName = this.generateParameterName(element)
    
    // Determine parameter type based on value patterns
    let parameterType: ActionAnalysis['parameterType'] = 'text'
    
    // Date patterns
    if (this.isDateValue(value)) {
      parameterType = 'date'
    }
    // Number patterns
    else if (this.isNumberValue(value)) {
      parameterType = 'number'
    }
    // Email patterns
    else if (this.isEmailValue(value)) {
      parameterType = 'text'
    }
    
    // Check if this looks like a list item (could be parameterized as list)
    const listIndicators = ['client', 'customer', 'job', 'invoice', 'account']
    const isListCandidate = listIndicators.some(indicator => 
      parameterName.toLowerCase().includes(indicator)
    )
    
    if (isListCandidate) {
      parameterType = 'list'
    }
    
    return {
      parameterizable: true,
      parameterType,
      parameterName
    }
  }

  /**
   * Generate meaningful parameter name from element
   */
  private generateParameterName(element?: RecordedAction['element']): string {
    if (!element) return 'input_value'
    
    // Try different sources for meaningful name
    const sources = [
      element.placeholder,
      element.name,
      element.id,
      element.text
    ].filter(Boolean)
    
    for (const source of sources) {
      if (source && source.length > 2) {
        // Clean up the name
        return source
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
      }
    }
    
    return 'input_value'
  }

  /**
   * Detect workflow patterns from actions
   */
  private detectWorkflowPatterns(analyses: ActionAnalysis[]): WorkflowPattern[] {
    const patterns: WorkflowPattern[] = []
    
    // Detect form filling pattern
    const formActions = analyses.filter(a => 
      a.intent === 'input_data' || a.intent === 'submit_form'
    )
    if (formActions.length >= 2) {
      patterns.push({
        type: 'form_filling',
        actions: formActions,
        description: 'Form filling workflow with input fields and submission',
        reusable: true
      })
    }
    
    // Detect filtering pattern
    const filterActions = analyses.filter(a => 
      a.intent === 'apply_filter' || a.intent === 'input_data'
    )
    if (filterActions.length >= 2) {
      patterns.push({
        type: 'filtering',
        actions: filterActions,
        description: 'Data filtering workflow with search and filter actions',
        reusable: true
      })
    }
    
    // Detect navigation pattern
    const navActions = analyses.filter(a => 
      a.intent === 'navigate_link' || a.intent === 'navigate_page'
    )
    if (navActions.length >= 1) {
      patterns.push({
        type: 'navigation',
        actions: navActions,
        description: 'Navigation workflow between pages',
        reusable: true
      })
    }
    
    // Detect downloading pattern
    const downloadActions = analyses.filter(a => 
      a.intent === 'download_file'
    )
    if (downloadActions.length >= 1) {
      patterns.push({
        type: 'downloading',
        actions: downloadActions,
        description: 'File download workflow',
        reusable: true
      })
    }
    
    return patterns
  }

  /**
   * Generate workflow summary
   */
  private generateWorkflowSummary(session: RecordingSession, patterns: WorkflowPattern[]): string {
    const duration = Math.round(session.metadata.recordingDuration / 1000)
    const actionCount = session.actions.length
    const patternTypes = patterns.map(p => p.type).join(', ')
    
    let summary = `I've analyzed your ${actionCount}-step workflow (${duration}s recording). `
    
    if (patterns.length > 0) {
      summary += `The workflow includes: ${patternTypes}. `
    }
    
    const inputActions = session.actions.filter(a => a.type === 'type').length
    const clickActions = session.actions.filter(a => a.type === 'click').length
    
    if (inputActions > 0) {
      summary += `It involves ${inputActions} input field(s) for data entry. `
    }
    
    if (clickActions > 0) {
      summary += `It includes ${clickActions} click action(s) for navigation and form submission. `
    }
    
    summary += 'The automation is ready for parameterization and can be reused with different data inputs.'
    
    return summary
  }

  /**
   * Generate recommendations for parameterization
   */
  private generateRecommendations(
    parameterizableActions: ActionAnalysis[],
    patterns: WorkflowPattern[]
  ): string[] {
    const recommendations: string[] = []
    
    if (parameterizableActions.length > 0) {
      recommendations.push(`Consider parameterizing ${parameterizableActions.length} input field(s) for dynamic data entry`)
    }
    
    const listActions = parameterizableActions.filter(a => a.parameterType === 'list')
    if (listActions.length > 0) {
      recommendations.push(`Upload CSV files for bulk processing of ${listActions.length} list-based parameter(s)`)
    }
    
    const dateActions = parameterizableActions.filter(a => a.parameterType === 'date')
    if (dateActions.length > 0) {
      recommendations.push(`Set up date range parameters for ${dateActions.length} date field(s)`)
    }
    
    if (patterns.some(p => p.type === 'filtering')) {
      recommendations.push('This workflow is ideal for batch processing with different filter criteria')
    }
    
    if (patterns.some(p => p.type === 'downloading')) {
      recommendations.push('Consider adding file path parameters for download destinations')
    }
    
    return recommendations
  }

  /**
   * Helper methods for value type detection
   */
  private isDateValue(value: string): boolean {
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{1,2}-\d{1,2}-\d{2,4}$/ // MM-DD-YYYY
    ]
    return datePatterns.some(pattern => pattern.test(value))
  }

  private isNumberValue(value: string): boolean {
    return /^\d+(\.\d+)?$/.test(value) || /^\$?\d+(,\d{3})*(\.\d{2})?$/.test(value)
  }

  private isEmailValue(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }
}

// Export singleton instance
export const enhancedLLMService = new EnhancedLLMService()
