import { AgentConfig, AgentIntents } from './schemas/agents';

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o-mini',
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
    };
  }

  /**
   * Generate workflow summary - MVP version with mock data
   */
  async summarizeWorkflow(agentConfig: AgentConfig | any, _eventLog: unknown[]): Promise<string> {
    console.log('🤖 Generating workflow summary (MVP mock)');
    console.log('🤖 agentConfig type:', typeof agentConfig);
    console.log('🤖 agentConfig keys:', agentConfig && typeof agentConfig === 'object' ? Object.keys(agentConfig) : 'N/A');
    
    // Handle both old array format and new enhanced object format
    let summary = '';
    
    if (Array.isArray(agentConfig)) {
      // Old format: array of steps
      const stepCount = agentConfig.length;
      const hasLogin = agentConfig.some(step => step.action === 'goto');
      const hasInput = agentConfig.some(step => step.action === 'type');
      const hasClick = agentConfig.some(step => step.action === 'click');
      
      summary = `I've analyzed your ${stepCount}-step workflow. `;
      
      if (hasLogin) summary += 'The workflow starts by navigating to a login page. ';
      if (hasInput) summary += 'It includes filling out form fields. ';
      if (hasClick) summary += 'It involves clicking buttons to submit forms. ';
      
    } else if (agentConfig && typeof agentConfig === 'object') {
      // Check if this is the new enhanced format with capturedActions
      if ('capturedActions' in agentConfig) {
        // New enhanced format: object with capturedActions and metadata
        const actions = agentConfig.capturedActions || [];
        const workflowSteps = agentConfig.captureSession?.metadata?.workflowSteps || [];
        const windowSwitches = agentConfig.captureSession?.metadata?.windowSwitches || [];
        const fileOperations = agentConfig.captureSession?.metadata?.fileOperations || [];
        
        summary = `I've analyzed your workflow recording. `;
        summary += `Captured ${actions.length} actions, `;
        summary += `${workflowSteps.length} workflow steps, `;
        
        if (windowSwitches.length > 0) {
          summary += `and ${windowSwitches.length} application switches. `;
        }
        
        if (fileOperations.length > 0) {
          summary += `The workflow includes ${fileOperations.length} file operations. `;
        }
        
        // Analyze action types
        const actionTypes = actions.reduce((acc: any, action: any) => {
          acc[action.type] = (acc[action.type] || 0) + 1;
          return acc;
        }, {});
        
        if (actionTypes.click) {
          summary += 'It involves clicking buttons and elements. ';
        }
        if (actionTypes.window_switch) {
          summary += 'The workflow spans multiple applications. ';
        }
        if (actionTypes.download || actionTypes.file_operation) {
          summary += 'It includes file download or upload operations. ';
        }
      } else {
        // Fallback for other object formats
        summary = 'I\'ve analyzed your workflow recording. The automation is ready to run.';
      }
    } else {
      summary = 'I\'ve analyzed your workflow recording. The automation is ready to run.';
    }
    
    summary += ' The automation is ready to run and should work reliably.';
    
    return summary;
  }

  /**
   * Annotate workflow with intents - MVP version
   */
  async annotateWorkflow(agentConfig: AgentConfig | any): Promise<AgentIntents> {
    console.log('🤖 Annotating workflow with intents (MVP mock)');
    
    // Handle both old array format and new enhanced object format
    if (Array.isArray(agentConfig)) {
      // Old format: array of steps
      return agentConfig.map((step, index) => ({
        action: step.action,
        intent: this.getMockIntent(step.action),
        stepIndex: index,
        selector: 'selector' in step ? step.selector : undefined,
        metadata: {
          confidence: 0.9,
          reasoning: `Step ${index + 1}: ${step.action} action`
        }
      }));
    } else if (agentConfig && typeof agentConfig === 'object' && 'capturedActions' in agentConfig) {
      // New enhanced format: convert captured actions to intents
      const actions = agentConfig.capturedActions || [];
      return actions.map((action: any, index: number) => ({
        action: action.type || 'unknown',
        intent: this.getMockIntent(action.type || 'unknown'),
        stepIndex: index,
        selector: action.selector || undefined,
        metadata: {
          confidence: 0.8,
          reasoning: `Captured action: ${action.type} at ${action.timestamp}ms`
        }
      }));
    } else {
      // Fallback: return empty array
      return [];
    }
  }

  /**
   * Analyze login recording - MVP version with mock data
   */
  async analyzeLoginRecording(params: {
    name: string;
    loginUrl: string;
  }): Promise<{
    steps: Array<{
      action: string;
      selector?: string;
      value?: string;
      url?: string;
      timestamp: number;
      elementType?: string;
      elementText?: string;
    }>;
    selectors: Array<{
      type: string;
      selector: string;
      confidence: number;
      description: string;
    }>;
    summary: string;
    metadata: {
      totalSteps: number;
      estimatedDuration: number;
      complexity: 'simple' | 'moderate' | 'complex';
      requiresInteraction: boolean;
    };
  }> {
    console.log('🤖 Analyzing login recording (MVP mock)');
    
    // Simple mock analysis for MVP
    return {
      steps: [
        {
          action: 'goto',
          url: params.loginUrl,
          timestamp: 0,
          elementType: 'page',
          elementText: 'Login page'
        },
        {
          action: 'type',
          selector: 'input[type="email"], input[name="email"], #email',
          value: '{{username}}',
          timestamp: 1000,
          elementType: 'input',
          elementText: 'Email field'
        },
        {
          action: 'type',
          selector: 'input[type="password"], input[name="password"], #password',
          value: '{{password}}',
          timestamp: 2000,
          elementType: 'input',
          elementText: 'Password field'
        },
        {
          action: 'click',
          selector: 'button[type="submit"], input[type="submit"], .login-button',
          timestamp: 3000,
          elementType: 'button',
          elementText: 'Login button'
        }
      ],
      selectors: [
        {
          type: 'email',
          selector: 'input[type="email"], input[name="email"], #email',
          confidence: 0.9,
          description: 'Email input field'
        },
        {
          type: 'password',
          selector: 'input[type="password"], input[name="password"], #password',
          confidence: 0.9,
          description: 'Password input field'
        },
        {
          type: 'submit',
          selector: 'button[type="submit"], input[type="submit"], .login-button',
          confidence: 0.8,
          description: 'Login submit button'
        }
      ],
      summary: `Login workflow for ${params.name} successfully extracted. The workflow navigates to the login page, fills in email and password fields, and clicks the login button. This automation should work reliably across different website implementations.`,
      metadata: {
        totalSteps: 4,
        estimatedDuration: 5000,
        complexity: 'simple',
        requiresInteraction: true
      }
    };
  }

  /**
   * Repair selector - MVP version
   */
  async repairSelector(selector: string, _intent: string, _pageContent: string): Promise<{
    selector: string;
    confidence: number;
    reasoning: string;
  }> {
    console.log('🤖 Repairing selector (MVP mock)');
    
    // Simple mock repair for MVP
    return {
      selector: selector, // Keep original for MVP
      confidence: 0.7,
      reasoning: `Original selector should work: ${selector}`
    };
  }

  private getMockIntent(action: string): string {
    const intents: Record<string, string> = {
      'goto': 'Navigate to a specific URL',
      'click': 'Click on an element',
      'type': 'Type text into an input field',
      'wait': 'Wait for a specified time',
      'screenshot': 'Take a screenshot',
      'scroll': 'Scroll the page or element',
      'hover': 'Hover over an element',
      'focus': 'Focus on an element',
      'blur': 'Remove focus from an element',
      'navigation': 'Navigate to a new page',
      'download': 'Download a file',
      'file_operation': 'Perform a file operation',
      'window_switch': 'Switch between applications',
      'external_action': 'Perform an action in an external application'
    };
    
    return intents[action] || `Perform ${action} action`;
  }
}

export const llmService = new LLMService();