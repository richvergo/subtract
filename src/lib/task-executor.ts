/**
 * Task execution engine
 * Handles running tasks with parameter substitution and login integration
 */

import { db } from './db';
import { createTaskExecutionContext, TaskParameters } from './parameter-substitution';
// import { substituteAgentConfig } from './parameter-substitution';
// import { SessionManager } from './session-manager';
import { decryptLoginCredentials } from './encryption';
// Enhanced functionality available but not used in legacy executor
import puppeteer, { Browser, Page } from 'puppeteer';

export interface TaskExecutionResult {
  success: boolean;
  taskId: string;
  executionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  logs: string[];
  screenshots: string[];
  downloadedFiles: string[];
  error?: string;
  result?: unknown;
}

export interface TaskExecutionContext {
  taskId: string;
  agentId: string;
  parameters: TaskParameters;
  config: unknown[];
  loginCredentials?: {
    username: string;
    password: string;
  };
  executionId: string;
  startTime: string;
}

/**
 * Execute a task with parameter substitution and login integration
 */
export async function executeTask(taskId: string): Promise<TaskExecutionResult> {
  const startTime = new Date();
  const executionId = `task_${taskId}_${Date.now()}`;
  const logs: string[] = [];
  const screenshots: string[] = [];
  const downloadedFiles: string[] = [];

  try {
    // Get task details
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        agent: {
          include: {
            agentLogins: {
              include: {
                login: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'PENDING') {
      throw new Error(`Task ${taskId} is not in PENDING status`);
    }

    // Update task status to RUNNING
    await db.task.update({
      where: { id: taskId },
      data: {
        status: 'RUNNING',
        startedAt: startTime,
      }
    });

    logs.push(`🚀 Starting task execution: ${task.name}`);
    logs.push(`📊 Parameters: ${JSON.stringify(task.parameters)}`);

    // Parse parameters
    const parameters: TaskParameters = task.parameters ? JSON.parse(task.parameters) : {};
    
    // Parse agent config
    const agentConfig = task.agent.agentConfig ? JSON.parse(task.agent.agentConfig) : [];
    
    if (!Array.isArray(agentConfig) || agentConfig.length === 0) {
      throw new Error('Agent configuration is empty or invalid');
    }

    // Get login credentials if available
    let loginCredentials: { username: string; password: string } | undefined;
    if (task.agent.agentLogins.length > 0) {
      const agentLogin = task.agent.agentLogins[0];
      const login = agentLogin.login;
      
      // Decrypt credentials
      const decrypted = decryptLoginCredentials({
        username: login.username,
        password: login.password || '',
        oauthToken: login.oauthToken || ''
      });
      
      loginCredentials = {
        username: decrypted.username,
        password: decrypted.password || ''
      };
      
      logs.push(`🔐 Using login credentials for: ${login.loginUrl}`);
    }

    // Create execution context
    const context = createTaskExecutionContext(
      agentConfig,
      parameters,
      loginCredentials
    );

    logs.push(`🎯 Execution context created with ${context.config.length} actions`);

    // Execute the task using Puppeteer
    const fullContext = {
      ...context,
      taskId: task.id,
      agentId: task.agentId
    };
    const result = await executeWithPuppeteer(fullContext, logs, screenshots, downloadedFiles);

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Update task with success result
    await db.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        finishedAt: endTime,
        result: JSON.stringify(result),
        logs: JSON.stringify(logs),
      }
    });

    logs.push(`✅ Task completed successfully in ${duration}ms`);

    return {
      success: true,
      taskId,
      executionId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      logs,
      screenshots,
      downloadedFiles,
      result
    };

  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logs.push(`❌ Task execution failed: ${errorMessage}`);

    // Update task with error result
    await db.task.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        finishedAt: endTime,
        error: errorMessage,
        logs: JSON.stringify(logs),
      }
    });

    return {
      success: false,
      taskId,
      executionId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      logs,
      screenshots,
      downloadedFiles,
      error: errorMessage
    };
  }
}

/**
 * Execute agent actions using Puppeteer
 */
async function executeWithPuppeteer(
  context: TaskExecutionContext,
  logs: string[],
  screenshots: string[],
  downloadedFiles: string[]
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    logs.push(`🌐 Browser launched and page created`);

    // Execute each action in the config
    for (let i = 0; i < context.config.length; i++) {
      const action = context.config[i];
      logs.push(`🎬 Executing action ${i + 1}/${context.config.length}: ${(action as { action: string }).action}`);

      try {
        await executeAction(page, action, logs, screenshots);
        logs.push(`✅ Action ${i + 1} completed successfully`);
      } catch (actionError) {
        const errorMsg = actionError instanceof Error ? actionError.message : 'Unknown action error';
        logs.push(`❌ Action ${i + 1} failed: ${errorMsg}`);
        throw new Error(`Action ${i + 1} (${(action as { action: string }).action}) failed: ${errorMsg}`);
      }
    }

    logs.push(`🎉 All actions completed successfully`);

    return {
      success: true,
      result: {
        actionsExecuted: context.config.length,
        screenshots: screenshots.length,
        downloadedFiles: downloadedFiles.length
      }
    };

  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
    logs.push(`🔚 Browser closed`);
  }
}

/**
 * Execute a single action
 */
async function executeAction(
  page: Page,
  action: unknown,
  logs: string[],
  screenshots: string[]
): Promise<void> {
  switch ((action as { action: string }).action) {
    case 'goto':
      await page.goto((action as { url: string }).url, { waitUntil: 'networkidle2', timeout: 30000 });
      logs.push(`📍 Navigated to: ${(action as { url: string }).url}`);
      break;

    case 'click':
      await page.waitForSelector((action as { selector: string }).selector, { timeout: 10000 });
      await page.click((action as { selector: string }).selector);
      logs.push(`🖱️ Clicked element: ${(action as { selector: string }).selector}`);
      break;

    case 'type':
      await page.waitForSelector((action as { selector: string; value: string }).selector, { timeout: 10000 });
      await page.evaluate((selector, value) => {
        const element = document.querySelector(selector) as HTMLInputElement;
        if (element) {
          element.focus();
          element.value = '';
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, (action as { selector: string; value: string }).selector, (action as { selector: string; value: string }).value);
      logs.push(`⌨️ Typed into ${(action as { selector: string; value: string }).selector}: ${(action as { selector: string; value: string }).value ? '***' : '(empty)'}`);
      break;

    case 'waitForSelector':
      await page.waitForSelector((action as { selector: string; timeout?: number }).selector, { timeout: (action as { selector: string; timeout?: number }).timeout || 10000 });
      logs.push(`⏳ Waited for selector: ${(action as { selector: string; timeout?: number }).selector}`);
      break;

    case 'download':
      // Handle download logic
      // const downloadPath = action.metadata?.downloadPath || '/tmp/downloads';
      // Implementation would depend on specific download requirements
      logs.push(`📥 Download action for selector: ${(action as { selector: string }).selector}`);
      break;

    default:
      throw new Error(`Unknown action type: ${(action as { action: string }).action}`);
  }

  // Take screenshot after each action
  try {
    const screenshot = await page.screenshot({ encoding: 'base64' });
    screenshots.push(`data:image/png;base64,${screenshot}`);
  } catch (screenshotError) {
    logs.push(`⚠️ Failed to take screenshot: ${screenshotError}`);
  }
}

/**
 * Queue a task for execution (for future scheduling implementation)
 */
export async function queueTaskForExecution(taskId: string): Promise<void> {
  // This would integrate with a job queue system like Bull or Agenda
  // For now, we'll just execute immediately
  await executeTask(taskId);
}

/**
 * Get task execution status
 */
export async function getTaskExecutionStatus(taskId: string): Promise<{
  status: string;
  progress?: number;
  logs?: string[];
  error?: string;
}> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      status: true,
      logs: true,
      error: true,
    }
  });

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  return {
    status: task.status,
    logs: task.logs ? JSON.parse(task.logs) : [],
    error: task.error || undefined,
  };
}

/**
 * Cancel a running task
 */
export async function cancelTask(taskId: string): Promise<void> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { status: true }
  });

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  if (task.status !== 'RUNNING') {
    throw new Error(`Task ${taskId} is not running`);
  }

  await db.task.update({
    where: { id: taskId },
    data: {
      status: 'CANCELLED',
      finishedAt: new Date(),
    }
  });
}
