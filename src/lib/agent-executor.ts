import puppeteer, { Browser } from 'puppeteer';
import { db } from '@/lib/db';
import { decryptLoginCredentials } from '@/lib/encryption';
import { AgentAction } from '@/lib/schemas/agents';

export interface ExecutionResult {
  success: boolean;
  logs: string[];
  screenshots: string[];
  downloadedFiles: string[];
  error?: string;
  result?: unknown;
}

/**
 * Simple Agent Executor - MVP version
 * Just runs a basic Puppeteer script based on agent configuration
 */
export async function executeAgentRun(agentId: string, runId: string): Promise<ExecutionResult> {
  let browser: Browser | null = null;
  const logs: string[] = [];
  const screenshots: string[] = [];
  const downloadedFiles: string[] = [];

  try {
    // Fetch agent
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
      throw new Error(`Agent ${agentId} not found`);
    }

    const agentConfig = JSON.parse(agent.agentConfig || '[]') as AgentAction[];
    
    // Start browser
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    logs.push(`🚀 Starting agent execution for ${agent.name}`);

    // Execute each step
    for (let i = 0; i < agentConfig.length; i++) {
      const step = agentConfig[i];
      logs.push(`📝 Executing step ${i + 1}: ${step.action}`);

      try {
        switch (step.action) {
          case 'goto':
            await page.goto(step.url || '');
            logs.push(`✅ Navigated to ${step.url}`);
            break;

          case 'click':
            await page.click(step.selector || '');
            logs.push(`✅ Clicked ${step.selector}`);
            break;

          case 'type':
            await page.type(step.selector || '', step.value || '');
            logs.push(`✅ Typed into ${step.selector}`);
            break;

          case 'waitForSelector':
            await page.waitForSelector(step.selector || '', { timeout: step.timeout || 10000 });
            logs.push(`✅ Waited for selector ${step.selector}`);
            break;

          default:
            logs.push(`⚠️ Unknown action: ${step.action}`);
        }

        // Take screenshot after each step
        const screenshotPath = `/tmp/screenshot_${Date.now()}.png` as `${string}.png`;
        await page.screenshot({ path: screenshotPath });
        screenshots.push(screenshotPath);

      } catch (stepError) {
        logs.push(`❌ Step ${i + 1} failed: ${stepError}`);
        throw stepError;
      }
    }

    logs.push(`✅ Agent execution completed successfully`);
    
    return {
      success: true,
      logs,
      screenshots,
      downloadedFiles,
      result: { message: 'Execution completed' }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`❌ Agent execution failed: ${errorMessage}`);
    
    return {
      success: false,
      logs,
      screenshots,
      downloadedFiles,
      error: errorMessage
    };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}