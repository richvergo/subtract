// 🚫 BACKEND LOCKED
// Do not edit unless on a backend-scoped branch with explicit approval.
// This file is part of the stable backend queue system and should not be modified
// during frontend development tasks.

import { db } from './db';
import { llmService } from './llm-service';
import { AgentConfig } from './schemas/agents';

// Simple in-memory queue for MVP
// In production, this would be replaced with Redis/Bull or similar
interface ProcessingJob {
  agentId: string;
  // recordingPath removed - using screen recording approach instead
  purposePrompt: string;
}

const processingQueue: ProcessingJob[] = [];
let isProcessing = false;

/**
 * Enqueue an agent processing job
 */
export async function enqueueAgentProcessing(job: ProcessingJob) {
  // Check if Redis is available
  if (!process.env.REDIS_URL) {
    console.warn("⚠️ Redis not configured, using in-memory queue for dev/test");
  }
  
  processingQueue.push(job);
  
  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
  
  // Return a job object with an id for API compatibility
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    data: job,
  };
}

/**
 * Process the queue (background worker)
 */
async function processQueue() {
  if (isProcessing || processingQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (processingQueue.length > 0) {
    const job = processingQueue.shift();
    if (!job) continue;

    try {
      await processAgentRecording(job);
    } catch (error) {
      console.error('Error processing agent recording:', error);
      
      // Mark agent as failed
      await db.agent.update({
        where: { id: job.agentId },
        data: {
          processingStatus: 'failed',
          processingProgress: 0,
        },
      });
    }
  }

  isProcessing = false;
}

/**
 * Process a single agent recording
 */
async function processAgentRecording(job: ProcessingJob) {
  const { agentId, purposePrompt } = job;

  try {
    // Update progress to 10%
    await db.agent.update({
      where: { id: agentId },
      data: { processingProgress: 10 },
    });

    // Step 1: Extract workflow steps from recording
    // This is a stub - in production, this would use computer vision/AI
    // to analyze the screen recording and extract click/type/navigate actions
    // extractWorkflowSteps removed - using screen recording approach instead
    const agentConfig: unknown[] = []; // Placeholder for now

    // Update progress to 50%
    await db.agent.update({
      where: { id: agentId },
      data: { processingProgress: 50 },
    });

    // Step 2: Generate intent annotations using LLM
    const agentIntents = await llmService.annotateWorkflow(
      agentConfig as AgentConfig,
      purposePrompt
    );

    // Step 3: Merge LLM intents into agent config metadata
    const enrichedAgentConfig = (agentConfig as AgentConfig).map((step, index) => {
      const intent = agentIntents[index];
      if (intent && step.metadata) {
        return {
          ...step,
          metadata: {
            ...step.metadata,
            intent: intent.intent,
          },
        };
      }
      return step;
    });

    // Update progress to 90%
    await db.agent.update({
      where: { id: agentId },
      data: { processingProgress: 90 },
    });

    // Step 4: Save results and mark as ready
    await db.agent.update({
      where: { id: agentId },
      data: {
        agentConfig: JSON.stringify(enrichedAgentConfig),
        agentIntents: JSON.stringify(agentIntents),
        processingStatus: 'ready',
        processingProgress: 100,
      },
    });

    console.log(`Successfully processed agent ${agentId}`);

  } catch (error) {
    console.error(`Failed to process agent ${agentId}:`, error);
    throw error;
  }
}

/**
 * Extract workflow steps from recording with rich DOM metadata
 * 
 * In production, this would:
 * 1. Use computer vision to analyze the recording
 * 2. Detect mouse clicks, keyboard input, navigation
 * 3. Extract DOM metadata for each action
 * 4. Generate structured workflow steps with metadata
 * 
 * For MVP, we return a sample workflow with realistic metadata
 */
/*
async function extractWorkflowSteps(): Promise<unknown[]> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return sample workflow steps with rich metadata
  // In production, this would be extracted from the actual recording
  const currentTimestamp = Date.now();
  
  return [
    {
      action: 'goto',
      url: 'https://example.com/login',
      metadata: {
        timestamp: currentTimestamp - 4000,
      },
    },
    {
      action: 'type',
      selector: '#username',
      value: '{{username}}',
      metadata: {
        selector: '#username',
        tag: 'input',
        type: 'text',
        innerText: null,
        ariaLabel: 'Username field',
        placeholder: 'Enter your username',
        timestamp: currentTimestamp - 3000,
        intent: null, // Will be filled by LLM annotation
      },
    },
    {
      action: 'type',
      selector: '#password',
      value: '{{password}}',
      metadata: {
        selector: '#password',
        tag: 'input',
        type: 'password',
        innerText: null,
        ariaLabel: 'Password field',
        placeholder: 'Enter your password',
        timestamp: currentTimestamp - 2000,
        intent: null, // Will be filled by LLM annotation
      },
    },
    {
      action: 'click',
      selector: '#login-button',
      metadata: {
        selector: '#login-button',
        tag: 'button',
        type: null,
        innerText: 'Sign In',
        ariaLabel: 'Sign in to your account',
        placeholder: null,
        timestamp: currentTimestamp - 1000,
        intent: null, // Will be filled by LLM annotation
      },
    },
    {
      action: 'waitForSelector',
      selector: '.dashboard',
      timeout: 10000,
      metadata: {
        selector: '.dashboard',
        tag: 'div',
        type: null,
        innerText: null,
        ariaLabel: 'Dashboard container',
        placeholder: null,
        timestamp: currentTimestamp,
        intent: null, // Will be filled by LLM annotation
      },
    },
  ];
}

/**
 * Sample enriched agentConfig JSON schema with metadata:
 * 
 * [
 *   {
 *     "action": "goto",
 *     "url": "https://example.com/login",
 *     "metadata": {
 *       "timestamp": 1694721600000
 *     }
 *   },
 *   {
 *     "action": "type",
 *     "selector": "#username",
 *     "value": "{{username}}",
 *     "metadata": {
 *       "selector": "#username",
 *       "tag": "input",
 *       "type": "text",
 *       "innerText": null,
 *       "ariaLabel": "Username field",
 *       "placeholder": "Enter your username",
 *       "timestamp": 1694721601000,
 *       "intent": "Enter the username in the login form field"
 *     }
 *   },
 *   {
 *     "action": "click",
 *     "selector": "#login-button",
 *     "metadata": {
 *       "selector": "#login-button",
 *       "tag": "button",
 *       "type": null,
 *       "innerText": "Sign In",
 *       "ariaLabel": "Sign in to your account",
 *       "placeholder": null,
 *       "timestamp": 1694721602000,
 *       "intent": "Submit the login form to authenticate the user"
 *     }
 *   },
 *   {
 *     "action": "waitForSelector",
 *     "selector": ".dashboard",
 *     "timeout": 10000,
 *     "metadata": {
 *       "selector": ".dashboard",
 *       "tag": "div",
 *       "type": null,
 *       "innerText": null,
 *       "ariaLabel": "Dashboard container",
 *       "placeholder": null,
 *       "timestamp": 1694721603000,
 *       "intent": "Wait for the dashboard to load, confirming successful login"
 *     }
 *   }
 * ]
 */

/**
 * Sample agentIntents JSON schema (parallel storage):
 * 
 * [
 *   {
 *     "action": "goto",
 *     "selector": "https://example.com/login",
 *     "intent": "Navigate to the login page to begin authentication",
 *     "stepIndex": 0,
 *     "metadata": {}
 *   },
 *   {
 *     "action": "type",
 *     "selector": "#username",
 *     "intent": "Enter the username in the login form field",
 *     "stepIndex": 1,
 *     "metadata": {}
 *   },
 *   {
 *     "action": "click",
 *     "selector": "#login-button",
 *     "intent": "Submit the login form to authenticate the user",
 *     "stepIndex": 2,
 *     "metadata": {}
 *   },
 *   {
 *     "action": "waitForSelector",
 *     "selector": ".dashboard",
 *     "intent": "Wait for the dashboard to load, confirming successful login",
 *     "stepIndex": 3,
 *     "metadata": {}
 *   }
 * ]
 */

/**
 * Enqueue an agent run job
 */
export async function enqueueAgentRun(agentId: string) {
  // For MVP, we'll use the same processing queue
  // In production, this would be a separate run queue
  const job: ProcessingJob = {
    agentId,
    // recordingPath removed - using screen recording approach instead
    purposePrompt: "Manual run triggered by user"
  };
  
  return await enqueueAgentProcessing(job);
}
