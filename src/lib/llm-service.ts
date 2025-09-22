import { AgentConfig, AgentIntents, ActionMetadata } from './schemas/agents';

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
   * Annotate recorded workflow steps with human-readable intents
   */
  async annotateWorkflow(
    recordedSteps: AgentConfig,
    userPrompt: string,
    context?: string
  ): Promise<AgentIntents> {
    const prompt = this.buildAnnotationPrompt(recordedSteps, userPrompt, context);
    
    try {
      const response = await this.callLLM(prompt);
      const annotations = this.parseAnnotations(response);
      
      // Validate and return annotations
      return this.validateAnnotations(annotations, recordedSteps);
    } catch (error) {
      console.error('Error annotating workflow:', error);
      throw error; // Propagate the original error
    }
  }

  // Template-based recording analysis removed - using screen recording approach instead

  /**
   * Summarize recorded workflow steps in a clean, user-friendly format
   */
  async summarizeWorkflow(recordedSteps: unknown[], transcript?: string): Promise<string> {
    try {
      const stepsText = JSON.stringify(recordedSteps, null, 2);
      const transcriptText = transcript || 'No narration provided';
      
      const summaryPrompt = `
You are analyzing a recorded workflow that a user performed manually. Your goal is to provide a clean, confident summary that shows you understand what the user did.

Here are the recorded steps:
${stepsText}

Here is the user's narration (if any):
${transcriptText}

Please provide a clear, step-by-step summary that:

1. **Shows understanding**: Demonstrate you clearly understand what the user did
2. **Builds confidence**: Use language that makes the user feel confident the automation will work
3. **Highlights key actions**: Focus on the most important steps and outcomes
4. **Uses simple language**: Avoid technical jargon, use everyday terms
5. **Shows the flow**: Explain how each step leads to the next

Format your response as a clean summary with:
- A brief overview of what was accomplished
- Numbered steps showing the key actions
- Confidence indicators (e.g., "I can see you...", "The workflow shows...")
- A final confirmation that the process is ready for automation

Keep it concise but comprehensive - aim for 3-5 key steps maximum.
`;

      const response = await this.callLLM(summaryPrompt);
      return response.trim();
    } catch (error) {
      console.error('Error summarizing workflow:', error);
      throw new Error('Failed to summarize workflow with LLM');
    }
  }

  /**
   * Repair a failed selector using intent, DOM snapshot, and rich metadata
   */
  async repairSelector(
    failedSelector: string,
    intent: string,
    domSnapshot: string,
    actionType: string,
    metadata?: ActionMetadata
  ): Promise<{ selector: string; confidence: number; reasoning: string }> {
    const prompt = this.buildRepairPrompt(failedSelector, intent, domSnapshot, actionType, metadata);
    
    try {
      const response = await this.callLLM(prompt);
      const repair = this.parseRepairResponse(response);
      
      return repair;
    } catch (error) {
      console.error('Error repairing selector:', error);
      throw error; // Propagate the original error
    }
  }

  private buildAnnotationPrompt(
    recordedSteps: AgentConfig,
    userPrompt: string,
    context?: string
  ): string {
    const stepsText = recordedSteps.map((step, index) => {
      let stepDesc = `${index + 1}. ${step.action}`;
      if ('selector' in step) {
        stepDesc += ` - selector: "${step.selector}"`;
      }
      if ('url' in step) {
        stepDesc += ` - url: "${step.url}"`;
      }
      if ('value' in step) {
        stepDesc += ` - value: "${step.value}"`;
      }
      return stepDesc;
    }).join('\n');

    return `You are an expert at analyzing browser automation workflows. 

User's Goal: "${userPrompt}"

${context ? `Context: ${context}\n` : ''}

Recorded Steps:
${stepsText}

For each step above, provide a human-readable intent that explains what the user is trying to accomplish. Focus on the business purpose, not the technical implementation.

Return your response as a JSON array where each object has:
- action: the action type (goto, click, type, etc.)
- selector: the original selector (if applicable)
- intent: a clear, human-readable description of what this step accomplishes
- stepIndex: the 0-based index of this step
- metadata: unknown additional context (optional)

Example response:
[
  {
    "action": "goto",
    "intent": "Navigate to the login page to access the application",
    "stepIndex": 0
  },
  {
    "action": "type",
    "selector": "#email",
    "intent": "Enter email address in the login form",
    "stepIndex": 1,
    "metadata": { "fieldType": "email" }
  },
  {
    "action": "click",
    "selector": "#login-btn",
    "intent": "Click the login button to authenticate into the system",
    "stepIndex": 2
  }
]

Make the intents specific and business-focused. Avoid generic descriptions like "click button" - instead explain why that button is being clicked.`;
  }

  private buildRepairPrompt(
    failedSelector: string,
    intent: string,
    domSnapshot: string,
    actionType: string,
    metadata?: ActionMetadata
  ): string {
    const metadataInfo = metadata ? `
Original Element Metadata:
- Tag: ${metadata.tag}
- Type: ${metadata.type || 'N/A'}
- Inner Text: ${metadata.innerText || 'N/A'}
- ARIA Label: ${metadata.ariaLabel || 'N/A'}
- Placeholder: ${metadata.placeholder || 'N/A'}
- Timestamp: ${new Date(metadata.timestamp).toISOString()}
` : '';

    return `You are an expert at browser automation and DOM analysis. A selector has failed and needs to be repaired.

Failed Action: ${actionType}
Failed Selector: "${failedSelector}"
Intent: "${intent}"
${metadataInfo}
Current DOM Snapshot:
${domSnapshot}

Your task is to find a new selector that will accomplish the same intent. Use the rich metadata above to help identify the target element. Look for:
1. Elements with similar text content (innerText)
2. Elements with similar attributes (class, id, data-*, aria-label)
3. Elements with the same HTML tag and type
4. Elements in similar positions in the DOM
5. Elements with similar semantic meaning
6. Elements with matching placeholder text

Priority order for selector matching:
1. Exact text matches (innerText)
2. ARIA label matches
3. Placeholder text matches
4. Tag and type combinations
5. Positional and structural similarities

Return your response as JSON with:
- selector: the new CSS selector (be specific and robust, prefer data attributes and ARIA labels)
- confidence: a number from 0-1 indicating how confident you are this selector will work
- reasoning: explain why this selector should work and what you based your decision on

Example response:
{
  "selector": "button[aria-label='Sign in to your account']",
  "confidence": 0.95,
  "reasoning": "Found a button with matching aria-label that exactly matches the original metadata, indicating this is the same login button"
}

Important: Return only valid JSON, no additional text.`;
  }

  private async callLLM(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('LLM API key not configured');
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at browser automation and workflow analysis. Always respond with valid JSON when requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private parseAnnotations(response: string): AgentIntents {
    try {
      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }
      return parsed;
    } catch (error) {
      console.error('Failed to parse LLM annotations:', error);
      console.error('Raw response:', response);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  private parseRepairResponse(response: string): { selector: string; confidence: number; reasoning: string } {
    try {
      const parsed = JSON.parse(response);
      if (!parsed.selector || typeof parsed.selector !== 'string') {
        throw new Error('Missing or invalid selector in response');
      }
      return {
        selector: parsed.selector,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.error('Failed to parse LLM repair response:', error);
      console.error('Raw response:', response);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  private validateAnnotations(annotations: AgentIntents, recordedSteps: AgentConfig): AgentIntents {
    // Validate that we have the right number of annotations
    if (annotations.length !== recordedSteps.length) {
      throw new Error(`Expected ${recordedSteps.length} annotations, got ${annotations.length}`);
    }

    // Validate each annotation
    return annotations.map((annotation, index) => {
      const step = recordedSteps[index];
      
      // Ensure step index matches
      if (annotation.stepIndex !== index) {
        annotation.stepIndex = index;
      }

      // Ensure action type matches
      if (annotation.action !== step.action) {
        annotation.action = step.action;
      }

      // Ensure selector matches (if applicable)
      if ('selector' in step && step.selector !== annotation.selector) {
        annotation.selector = step.selector;
      }

      // Validate intent is present and meaningful
      if (!annotation.intent || annotation.intent.trim().length < 10) {
        throw new Error(`Invalid intent for step ${index}: "${annotation.intent}"`);
      }

      return annotation;
    });
  }
}

// Export a default instance
export const llmService = new LLMService();
