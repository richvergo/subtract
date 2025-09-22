/**
 * Parameter substitution utilities for task execution
 * Handles replacing {{parameterName}} placeholders in agent configurations
 * with actual values from task parameters
 */

// import { agentActionSchema, agentConfigSchema } from './schemas/agents';

export interface TaskParameters {
  jobName?: string;
  customerName?: string;
  dateFrom?: string;
  dateTo?: string;
  userEmail?: string;
  customParams?: Record<string, string>;
}

/**
 * Substitute parameters in a string using {{parameterName}} syntax
 */
export function substituteParameters(
  template: string,
  parameters: TaskParameters
): string {
  if (!template || typeof template !== 'string') {
    return template;
  }

  let result = template;
  
  // Replace standard parameters
  if (parameters.jobName) {
    result = result.replace(/\{\{jobName\}\}/g, parameters.jobName);
  }
  if (parameters.customerName) {
    result = result.replace(/\{\{customerName\}\}/g, parameters.customerName);
  }
  if (parameters.dateFrom) {
    result = result.replace(/\{\{dateFrom\}\}/g, parameters.dateFrom);
  }
  if (parameters.dateTo) {
    result = result.replace(/\{\{dateTo\}\}/g, parameters.dateTo);
  }
  if (parameters.userEmail) {
    result = result.replace(/\{\{userEmail\}\}/g, parameters.userEmail);
  }
  
  // Replace custom parameters
  if (parameters.customParams) {
    Object.entries(parameters.customParams).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
  }
  
  return result;
}

/**
 * Substitute parameters in an agent configuration array
 */
export function substituteAgentConfig(
  agentConfig: unknown[],
  parameters: TaskParameters
): unknown[] {
  if (!Array.isArray(agentConfig)) {
    return agentConfig;
  }

  return agentConfig.map(action => {
    if (typeof action !== 'object' || action === null) {
      return action;
    }

    const substitutedAction = { ...action } as Record<string, unknown>;

    // Substitute parameters in action properties
    if (substitutedAction.url) {
      substitutedAction.url = substituteParameters(substitutedAction.url as string, parameters);
    }
    if (substitutedAction.selector) {
      substitutedAction.selector = substituteParameters(substitutedAction.selector as string, parameters);
    }
    if (substitutedAction.value) {
      substitutedAction.value = substituteParameters(substitutedAction.value as string, parameters);
    }
    if (substitutedAction.target) {
      substitutedAction.target = substituteParameters(substitutedAction.target as string, parameters);
    }

    // Substitute parameters in metadata
    if (substitutedAction.metadata && typeof substitutedAction.metadata === 'object') {
      const substitutedMetadata = { ...substitutedAction.metadata } as Record<string, unknown>;
      Object.keys(substitutedMetadata).forEach(key => {
        if (typeof substitutedMetadata[key] === 'string') {
          substitutedMetadata[key] = substituteParameters(substitutedMetadata[key] as string, parameters);
        }
      });
      substitutedAction.metadata = substitutedMetadata;
    }

    return substitutedAction;
  });
}

/**
 * Validate that all required parameters are provided
 */
export function validateTaskParameters(
  agentConfig: unknown[],
  parameters: TaskParameters
): { isValid: boolean; missingParameters: string[] } {
  const missingParameters: string[] = [];
  
  if (!Array.isArray(agentConfig)) {
    return { isValid: true, missingParameters: [] };
  }

  // Extract all parameter placeholders from the agent config
  const parameterPlaceholders = new Set<string>();
  
  const extractPlaceholders = (str: string) => {
    if (typeof str !== 'string') return;
    const matches = str.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const paramName = match.replace(/\{\{|\}\}/g, '');
        parameterPlaceholders.add(paramName);
      });
    }
  };

  agentConfig.forEach(action => {
    if (typeof action !== 'object' || action === null) return;
    
    const actionObj = action as Record<string, unknown>;
    extractPlaceholders(actionObj.url as string);
    extractPlaceholders(actionObj.selector as string);
    extractPlaceholders(actionObj.value as string);
    extractPlaceholders(actionObj.target as string);
    
    if (actionObj.metadata && typeof actionObj.metadata === 'object') {
      Object.values(actionObj.metadata).forEach(value => {
        extractPlaceholders(value as string);
      });
    }
  });

  // Check if all required parameters are provided
  parameterPlaceholders.forEach(placeholder => {
    const isProvided = 
      (placeholder === 'jobName' && parameters.jobName) ||
      (placeholder === 'customerName' && parameters.customerName) ||
      (placeholder === 'dateFrom' && parameters.dateFrom) ||
      (placeholder === 'dateTo' && parameters.dateTo) ||
      (placeholder === 'userEmail' && parameters.userEmail) ||
      (placeholder === 'username' && parameters.userEmail) || // username can be derived from userEmail
      (parameters.customParams && parameters.customParams[placeholder]);
    
    if (!isProvided) {
      missingParameters.push(placeholder);
    }
  });

  return {
    isValid: missingParameters.length === 0,
    missingParameters: Array.from(missingParameters)
  };
}

/**
 * Generate a preview of the agent config with parameters substituted
 */
export function generateConfigPreview(
  agentConfig: unknown[],
  parameters: TaskParameters
): { preview: unknown[]; hasUnresolvedParameters: boolean } {
  const substitutedConfig = substituteAgentConfig(agentConfig, parameters);
  
  // Check if there are still unresolved parameters
  const hasUnresolvedParameters = substitutedConfig.some(action => {
    if (typeof action !== 'object' || action === null) return false;
    
    const checkForPlaceholders = (str: string) => {
      if (typeof str !== 'string') return false;
      return /\{\{[^}]+\}\}/.test(str);
    };
    
    const actionObj = action as Record<string, unknown>;
    return (
      checkForPlaceholders(actionObj.url as string) ||
      checkForPlaceholders(actionObj.selector as string) ||
      checkForPlaceholders(actionObj.value as string) ||
      checkForPlaceholders(actionObj.target as string) ||
      (actionObj.metadata && Object.values(actionObj.metadata).some(value => 
        checkForPlaceholders(value as string)
      ))
    );
  });

  return {
    preview: substitutedConfig,
    hasUnresolvedParameters
  };
}

/**
 * Create a task execution context with substituted parameters
 */
export function createTaskExecutionContext(
  agentConfig: unknown[],
  parameters: TaskParameters,
  loginCredentials?: { username: string; password: string }
) {
  const substitutedConfig = substituteAgentConfig(agentConfig, parameters);
  
  // Add login credentials if provided
  const context = {
    config: substitutedConfig,
    parameters,
    loginCredentials,
    executionId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date().toISOString(),
  };

  return context;
}

/**
 * Example usage and testing
 */
export const parameterSubstitutionExamples = {
  // Example agent config with parameters
  sampleAgentConfig: [
    {
      action: 'goto',
      url: 'https://apply.getvergo.com/login',
      metadata: { description: 'Navigate to login page' }
    },
    {
      action: 'type',
      selector: 'input[name="email"]',
      value: '{{userEmail}}',
      metadata: { description: 'Enter user email' }
    },
    {
      action: 'click',
      selector: 'button[type="submit"]',
      metadata: { description: 'Click login button' }
    },
    {
      action: 'goto',
      url: 'https://apply.getvergo.com/invoices?job={{jobName}}&from={{dateFrom}}&to={{dateTo}}',
      metadata: { description: 'Navigate to filtered invoices' }
    },
    {
      action: 'download',
      selector: 'a[href*="download"]',
      metadata: { 
        description: 'Download invoice files',
        downloadPath: '/downloads/{{customerName}}/{{jobName}}'
      }
    }
  ],

  // Example task parameters
  sampleParameters: {
    jobName: 'TechCorp Project',
    customerName: 'TechCorp',
    dateFrom: '2024-10-01',
    dateTo: '2024-12-31',
    userEmail: 'john.doe@techcorp.com',
    customParams: {
      downloadPath: '/Users/john/Desktop/Invoices'
    }
  },

  // Test the substitution
  testSubstitution() {
    const { sampleAgentConfig, sampleParameters } = this;
    
    console.log('🧪 Testing Parameter Substitution...');
    
    // Test validation
    const validation = validateTaskParameters(sampleAgentConfig, sampleParameters);
    console.log('✅ Validation:', validation);
    
    // Test preview generation
    const preview = generateConfigPreview(sampleAgentConfig, sampleParameters);
    console.log('📋 Preview:', preview);
    
    // Test full substitution
    const substituted = substituteAgentConfig(sampleAgentConfig, sampleParameters);
    console.log('🔄 Substituted Config:', substituted);
    
    return {
      validation,
      preview,
      substituted
    };
  }
};
