/**
 * Agent Runner with Login Status Validation
 * Checks login status before executing agents and handles session management
 */

import { db } from './db';
import { SessionManager } from './session-manager';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface AgentRunResult {
  success: boolean;
  errorMessage?: string;
  outputPath?: string;
  screenshotPath?: string;
  logs: Record<string, unknown>;
}

export interface LoginValidationResult {
  isValid: boolean;
  needsReconnect: boolean;
  errorMessage?: string;
  loginId?: string;
  loginName?: string;
}

export class AgentRunner {
  private browser: Browser | null = null;

  /**
   * Validate all logins required for an agent before execution
   */
  async validateAgentLogins(agentId: string): Promise<LoginValidationResult[]> {
    try {
      const agent = await db.agent.findUnique({
        where: { id: agentId },
        include: {
          agentLogins: {
            include: {
              login: true
            }
          }
        }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      const validationResults: LoginValidationResult[] = [];

      for (const agentLogin of agent.agentLogins) {
        const login = agentLogin.login;
        
        // Check if session is expired
        if (login.sessionExpiry && SessionManager.isSessionExpired(login.sessionExpiry)) {
          validationResults.push({
            isValid: false,
            needsReconnect: true,
            errorMessage: 'Session expired',
            loginId: login.id,
            loginName: login.name
          });
          continue;
        }

        // Check login status
        if (login.status === 'NEEDS_RECONNECT' || login.status === 'DISCONNECTED') {
          validationResults.push({
            isValid: false,
            needsReconnect: true,
            errorMessage: `Login requires reconnection: ${login.errorMessage || 'Session invalid'}`,
            loginId: login.id,
            loginName: login.name
          });
          continue;
        }

        if (login.status === 'BROKEN' || login.status === 'EXPIRED' || login.status === 'SUSPENDED') {
          validationResults.push({
            isValid: false,
            needsReconnect: false,
            errorMessage: `Login is ${login.status.toLowerCase()}: ${login.errorMessage || 'Cannot proceed'}`,
            loginId: login.id,
            loginName: login.name
          });
          continue;
        }

        // If we have session data, validate it
        if (login.sessionData && login.status === 'ACTIVE') {
          const sessionValidation = await this.validateLoginSession(login);
          if (!sessionValidation.isValid) {
            validationResults.push({
              isValid: false,
              needsReconnect: sessionValidation.needsReconnect,
              errorMessage: sessionValidation.errorMessage,
              loginId: login.id,
              loginName: login.name
            });
            continue;
          }
        }

        // Login is valid
        validationResults.push({
          isValid: true,
          needsReconnect: false,
          loginId: login.id,
          loginName: login.name
        });
      }

      return validationResults;

    } catch (error) {
      console.error('Error validating agent logins:', error);
      throw error;
    }
  }

  /**
   * Validate a specific login's session
   */
  private async validateLoginSession(login: {
    sessionData: string | null;
    loginUrl: string;
  }): Promise<{ isValid: boolean; needsReconnect: boolean; errorMessage?: string }> {
    let page: Page | null = null;

    try {
      if (!this.browser) {
        this.browser = await puppeteer.launch({
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
      }

      page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Apply stored session data
      if (!login.sessionData) {
        return {
          isValid: false,
          needsReconnect: true,
          errorMessage: 'No session data available'
        };
      }
      
      const sessionData = SessionManager.decryptSessionData(login.sessionData);
      await SessionManager.applySessionToPage(page, sessionData);

      // Validate session
      const validationResult = await SessionManager.validateSession(page, login.loginUrl);
      
      return {
        isValid: validationResult.isValid,
        needsReconnect: validationResult.needsReconnect,
        errorMessage: validationResult.errorMessage
      };

    } catch (error) {
      console.error('Session validation failed:', error);
      return {
        isValid: false,
        needsReconnect: true,
        errorMessage: error instanceof Error ? error.message : 'Session validation failed'
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Execute an agent with validated logins
   */
  async executeAgent(agentId: string): Promise<AgentRunResult> {
    try {
      // Validate logins first
      const loginValidations = await this.validateAgentLogins(agentId);
      
      // Check if any logins need reconnection
      const needsReconnect = loginValidations.filter(v => v.needsReconnect);
      if (needsReconnect.length > 0) {
        const loginNames = needsReconnect.map(v => v.loginName).join(', ');
        return {
          success: false,
          errorMessage: `Login requires reconnect (2FA needed): ${loginNames}. Please reconnect these logins before running the agent.`,
          logs: {
            error: 'LOGIN_NEEDS_RECONNECT',
            logins: needsReconnect.map(v => ({ id: v.loginId, name: v.loginName }))
          }
        };
      }

      // Check if any logins are invalid
      const invalidLogins = loginValidations.filter(v => !v.isValid);
      if (invalidLogins.length > 0) {
        const loginNames = invalidLogins.map(v => v.loginName).join(', ');
        return {
          success: false,
          errorMessage: `Invalid logins: ${loginNames}. Please fix these logins before running the agent.`,
          logs: {
            error: 'INVALID_LOGINS',
            logins: invalidLogins.map(v => ({ id: v.loginId, name: v.loginName, error: v.errorMessage }))
          }
        };
      }

      // All logins are valid, proceed with agent execution
      console.log(`✅ All logins validated for agent ${agentId}`);
      
      // Here you would implement the actual agent execution logic
      // For now, we'll return a success result
      return {
        success: true,
        logs: {
          message: 'Agent execution completed successfully',
          validatedLogins: loginValidations.map(v => ({ id: v.loginId, name: v.loginName }))
        }
      };

    } catch (error) {
      console.error('Agent execution failed:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Agent execution failed',
        logs: {
          error: 'EXECUTION_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get login status for an agent
   */
  async getAgentLoginStatus(agentId: string): Promise<{ loginId: string; loginName: string; status: string; needsReconnect: boolean; errorMessage?: string }[]> {
    try {
      const agent = await db.agent.findUnique({
        where: { id: agentId },
        include: {
          agentLogins: {
            include: {
              login: true
            }
          }
        }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      return agent.agentLogins.map(agentLogin => {
        const login = agentLogin.login;
        const isExpired = login.sessionExpiry && SessionManager.isSessionExpired(login.sessionExpiry);
        
        return {
          loginId: login.id,
          loginName: login.name,
          status: isExpired && login.status === 'ACTIVE' ? 'DISCONNECTED' : login.status,
          needsReconnect: Boolean(login.status === 'NEEDS_RECONNECT' || login.status === 'DISCONNECTED' || (isExpired && login.status === 'ACTIVE')),
          errorMessage: login.errorMessage || undefined
        };
      });

    } catch (error) {
      console.error('Error getting agent login status:', error);
      throw error;
    }
  }

  /**
   * Clean up browser resources
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
