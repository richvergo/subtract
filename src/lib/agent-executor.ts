import puppeteer, { Browser, Page } from 'puppeteer';
import { db } from '@/lib/db';
import { decryptLoginCredentials } from '@/lib/encryption';
import { AgentAction, AgentIntent, ActionMetadata } from '@/lib/schemas/agents';
import { RunStatus } from '@prisma/client';
import { llmService } from '@/lib/llm-service';
import path from 'path';
import fs from 'fs/promises';

export interface ExecutionContext {
  agentId: string;
  runId: string;
  agentConfig: AgentAction[];
  agentIntents: AgentIntent[];
  logins: Array<{
    id: string;
    name: string;
    loginUrl: string;
    username: string;
    password?: string;
    oauthToken?: string;
  }>;
}

export interface ExecutionResult {
  status: RunStatus;
  logs: unknown;
  outputPath?: string;
  screenshotPath?: string;
  error?: string;
  repairs?: Array<{
    stepIndex: number;
    originalSelector: string;
    repairedSelector: string;
    confidence: number;
    reasoning: string;
  }>;
}

export class AgentExecutor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private context: ExecutionContext;
  private executionLogs: any[] = [];
  private repairs: Array<{
    stepIndex: number;
    originalSelector: string;
    repairedSelector: string;
    confidence: number;
    reasoning: string;
  }> = [];

  constructor(context: ExecutionContext) {
    this.context = context;
  }

  /**
   * Execute the agent workflow
   */
  async execute(): Promise<ExecutionResult> {
    try {
      this.log('Starting agent execution', { agentId: this.context.agentId, runId: this.context.runId });
      
      // Launch browser
      await this.launchBrowser();
      
      // Execute each action in the agent config
      for (let i = 0; i < this.context.agentConfig.length; i++) {
        const action = this.context.agentConfig[i];
        this.log(`Executing action ${i + 1}/${this.context.agentConfig.length}`, { action });
        
        await this.executeAction(action);
      }

      // Take final screenshot
      const screenshotPath = await this.takeScreenshot('final');
      
      this.log('Agent execution completed successfully');
      
      return {
        status: RunStatus.COMPLETED,
        logs: {
          actions: this.executionLogs,
          summary: {
            totalActions: this.context.agentConfig.length,
            completedAt: new Date().toISOString(),
          },
        },
        screenshotPath,
        repairs: this.repairs.length > 0 ? this.repairs : undefined,
      };
    } catch (error) {
      this.log('Agent execution failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      // Take error screenshot
      const screenshotPath = await this.takeScreenshot('error');
      
      return {
        status: RunStatus.FAILED,
        logs: {
          actions: this.executionLogs,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        },
        screenshotPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        repairs: this.repairs.length > 0 ? this.repairs : undefined,
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Launch Puppeteer browser
   */
  private async launchBrowser(): Promise<void> {
    this.log('Launching browser');
    
    this.browser = await puppeteer.launch({
      headless: true, // Set to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    this.log('Browser launched successfully');
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: AgentAction): Promise<void> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    const startTime = Date.now();

    try {
      switch (action.action) {
        case 'goto':
          await this.handleGoto(action);
          break;
        case 'type':
          await this.handleType(action);
          break;
        case 'click':
          await this.handleClick(action);
          break;
        case 'waitForSelector':
          await this.handleWaitForSelector(action);
          break;
        case 'download':
          await this.handleDownload(action);
          break;
        default:
          throw new Error(`Unknown action: ${action.action}`);
      }

      const duration = Date.now() - startTime;
      this.log(`Action completed successfully`, { action: action.action, duration: `${duration}ms` });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`Action failed`, { action: action.action, duration: `${duration}ms`, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Handle goto action
   */
  private async handleGoto(action: AgentAction): Promise<void> {
    if (!action.url) {
      throw new Error('URL is required for goto action');
    }

    this.log(`Navigating to: ${action.url}`);
    await this.page!.goto(action.url, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  /**
   * Handle type action
   */
  private async handleType(action: AgentAction): Promise<void> {
    if (!action.selector || !action.value) {
      throw new Error('Selector and value are required for type action');
    }

    // Resolve variables in the value
    const resolvedValue = this.resolveVariables(action.value);
    
    this.log(`Typing into selector: ${action.selector}`, { value: resolvedValue });
    
    try {
      await this.page!.waitForSelector(action.selector, { timeout: 10000 });
      await this.page!.click(action.selector);
      await this.page!.type(action.selector, resolvedValue);
    } catch (error) {
      // Try to repair the selector using LLM
      const repairedSelector = await this.attemptRepair(action, 'type');
      if (repairedSelector) {
        await this.page!.waitForSelector(repairedSelector, { timeout: 10000 });
        await this.page!.click(repairedSelector);
        await this.page!.type(repairedSelector, resolvedValue);
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle click action
   */
  private async handleClick(action: AgentAction): Promise<void> {
    if (!action.selector) {
      throw new Error('Selector is required for click action');
    }

    this.log(`Clicking selector: ${action.selector}`);
    
    try {
      await this.page!.waitForSelector(action.selector, { timeout: 10000 });
      await this.page!.click(action.selector);
    } catch (error) {
      // Try to repair the selector using LLM
      const repairedSelector = await this.attemptRepair(action, 'click');
      if (repairedSelector) {
        await this.page!.waitForSelector(repairedSelector, { timeout: 10000 });
        await this.page!.click(repairedSelector);
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle waitForSelector action
   */
  private async handleWaitForSelector(action: AgentAction): Promise<void> {
    if (!action.selector) {
      throw new Error('Selector is required for waitForSelector action');
    }

    const timeout = action.timeout || 10000;
    this.log(`Waiting for selector: ${action.selector}`, { timeout: `${timeout}ms` });
    
    await this.page!.waitForSelector(action.selector, { timeout });
  }

  /**
   * Handle download action
   */
  private async handleDownload(action: AgentAction): Promise<void> {
    if (!action.selector) {
      throw new Error('Selector is required for download action');
    }

    this.log(`Downloading from selector: ${action.selector}`);
    
    // Set up download behavior
    await this.page!.setDownloadBehavior({ behavior: 'allow', downloadPath: './downloads' });
    
    // Click the download link/button
    await this.page!.waitForSelector(action.selector, { timeout: 10000 });
    await this.page!.click(action.selector);
    
    // Wait for download to complete (simplified - in production you'd want more robust handling)
    await this.page!.waitForTimeout(3000);
  }

  /**
   * Attempt to repair a failed selector using LLM with rich metadata
   */
  private async attemptRepair(action: AgentAction, actionType: string): Promise<string | null> {
    if (!action.selector) {
      return null;
    }

    // Find the intent for this action
    const stepIndex = this.context.agentConfig.findIndex(step => step === action);
    const intent = this.context.agentIntents.find(i => i.stepIndex === stepIndex);
    
    if (!intent) {
      this.log(`No intent found for step ${stepIndex}, cannot repair selector`);
      return null;
    }

    try {
      // Get DOM snapshot
      const domSnapshot = await this.page!.content();
      
      // Extract metadata from the action
      const metadata = (action as any).metadata as ActionMetadata | undefined;
      
      this.log(`Attempting to repair selector: ${action.selector}`, { 
        intent: intent.intent, 
        stepIndex,
        metadata: metadata ? {
          tag: metadata.tag,
          innerText: metadata.innerText,
          ariaLabel: metadata.ariaLabel,
          placeholder: metadata.placeholder,
        } : undefined,
      });

      // Use LLM to repair the selector with rich context
      const repairResult = await llmService.repairSelector(
        action.selector,
        intent.intent,
        domSnapshot,
        actionType,
        metadata
      );

      // Log the repair attempt
      this.repairs.push({
        stepIndex,
        originalSelector: action.selector,
        repairedSelector: repairResult.selector,
        confidence: repairResult.confidence,
        reasoning: repairResult.reasoning,
      });

      this.log(`Selector repaired successfully`, {
        original: action.selector,
        repaired: repairResult.selector,
        confidence: repairResult.confidence,
        reasoning: repairResult.reasoning,
        metadata: metadata ? {
          tag: metadata.tag,
          innerText: metadata.innerText,
          ariaLabel: metadata.ariaLabel,
        } : undefined,
      });

      // Update the action with the repaired selector
      action.selector = repairResult.selector;
      
      // Update metadata if present
      if (metadata) {
        metadata.selector = repairResult.selector;
      }
      
      return repairResult.selector;
    } catch (error) {
      this.log(`Failed to repair selector: ${action.selector}`, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Resolve variables in action values
   */
  private resolveVariables(value: string): string {
    let resolved = value;
    
    // Replace {{login.username}} with actual username
    const usernameMatch = value.match(/\{\{login\.username\}\}/);
    if (usernameMatch && this.context.logins.length > 0) {
      resolved = resolved.replace(/\{\{login\.username\}\}/g, this.context.logins[0].username);
    }
    
    // Replace {{login.password}} with actual password
    const passwordMatch = value.match(/\{\{login\.password\}\}/);
    if (passwordMatch && this.context.logins.length > 0 && this.context.logins[0].password) {
      resolved = resolved.replace(/\{\{login\.password\}\}/g, this.context.logins[0].password);
    }
    
    // Replace {{login.loginUrl}} with actual login URL
    const loginUrlMatch = value.match(/\{\{login\.loginUrl\}\}/);
    if (loginUrlMatch && this.context.logins.length > 0) {
      resolved = resolved.replace(/\{\{login\.loginUrl\}\}/g, this.context.logins[0].loginUrl);
    }
    
    return resolved;
  }

  /**
   * Take a screenshot
   */
  private async takeScreenshot(name: string): Promise<string> {
    if (!this.page) {
      return '';
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${name}-${timestamp}.png`;
      const filepath = path.join('./screenshots', filename);
      
      // Ensure screenshots directory exists
      await fs.mkdir('./screenshots', { recursive: true });
      
      await this.page.screenshot({ path: filepath, fullPage: true });
      
      this.log(`Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      this.log('Failed to take screenshot', { error: error instanceof Error ? error.message : 'Unknown error' });
      return '';
    }
  }

  /**
   * Log execution details
   */
  private log(message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      ...data,
    };
    
    this.executionLogs.push(logEntry);
    console.log(`[AgentExecutor] ${message}`, data || '');
  }

  /**
   * Cleanup browser resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.log('Browser cleanup completed');
    } catch (error) {
      this.log('Error during cleanup', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

/**
 * Execute an agent run
 */
export async function executeAgentRun(agentId: string, runId: string): Promise<ExecutionResult> {
  // Fetch agent with logins
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: {
      agentLogins: {
        include: {
          login: true,
        },
      },
    },
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Decrypt login credentials
  const decryptedLogins = agent.agentLogins.map(al => ({
    id: al.login.id,
    name: al.login.name,
    loginUrl: al.login.loginUrl,
    ...decryptLoginCredentials({
      username: al.login.username,
      password: al.login.password,
      oauthToken: al.login.oauthToken,
    }),
  }));

  // Create execution context
  const context: ExecutionContext = {
    agentId,
    runId,
    agentConfig: JSON.parse(agent.agentConfig) as AgentAction[],
    agentIntents: agent.agentIntents ? JSON.parse(agent.agentIntents) as AgentIntent[] : [],
    logins: decryptedLogins,
  };

  // Execute the agent
  const executor = new AgentExecutor(context);
  return await executor.execute();
}
