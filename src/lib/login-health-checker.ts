/**
 * Generic Login Health Checker
 * Tests login credentials using configurable templates and updates status in database
 */

import { db } from './db';
import { decryptLoginCredentials } from './encryption';
import { getLoginTemplate, LOGIN_TEMPLATES } from './login-templates';
import { LoginStep, LoginTemplate } from './schemas/agents';
import { SessionManager } from './session-manager';
import puppeteer from 'puppeteer';

export interface LoginHealthResult {
  success: boolean;
  status: 'ACTIVE' | 'BROKEN' | 'EXPIRED' | 'SUSPENDED' | 'NEEDS_RECONNECT' | 'DISCONNECTED';
  errorMessage?: string;
  responseTime?: number;
  lastChecked: Date;
  needsReconnect?: boolean;
}

export class LoginHealthChecker {
  private browser: any = null;

  async checkLoginHealth(loginId: string): Promise<LoginHealthResult> {
    const startTime = Date.now();
    
    try {
      // Get login from database
      const login = await db.login.findUnique({
        where: { id: loginId },
        include: { owner: true }
      });

      if (!login) {
        throw new Error('Login not found');
      }

      console.log(`🔍 Checking health for login: ${login.name}`);

      // Check if session is expired
      if (login.sessionExpiry && SessionManager.isSessionExpired(login.sessionExpiry)) {
        const result = {
          success: false,
          status: 'DISCONNECTED' as const,
          errorMessage: 'Session expired',
          needsReconnect: true
        };

        await this.updateLoginStatus(loginId, result, Date.now() - startTime);
        return {
          ...result,
          responseTime: Date.now() - startTime,
          lastChecked: new Date()
        };
      }

      // If we have session data, try session-based validation first
      if (login.sessionData) {
        const sessionResult = await this.testSessionBasedLogin(login);
        if (sessionResult) {
          const responseTime = Date.now() - startTime;
          await this.updateLoginStatus(loginId, sessionResult, responseTime);
          return {
            ...sessionResult,
            responseTime,
            lastChecked: new Date()
          };
        }
      }

      // Fall back to credential-based testing
      const result = await this.testLogin(login);
      const responseTime = Date.now() - startTime;

      // Update database with results
      await this.updateLoginStatus(loginId, result, responseTime);

      return {
        ...result,
        responseTime,
        lastChecked: new Date()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Login health check failed for ${loginId}:`, errorMessage);

      // Update database with failure
      await this.updateLoginStatus(loginId, {
        success: false,
        status: 'BROKEN',
        errorMessage
      }, responseTime);

      return {
        success: false,
        status: 'BROKEN',
        errorMessage,
        responseTime,
        lastChecked: new Date()
      };
    }
  }

  private async testSessionBasedLogin(login: any): Promise<Omit<LoginHealthResult, 'responseTime' | 'lastChecked'> | null> {
    let page = null;

    try {
      // Launch browser if not already running
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
      const sessionData = SessionManager.decryptSessionData(login.sessionData);
      await SessionManager.applySessionToPage(page, sessionData);

      // Validate session
      const validationResult = await SessionManager.validateSession(page, login.loginUrl);

      if (validationResult.isValid) {
        return {
          success: true,
          status: 'ACTIVE'
        };
      } else if (validationResult.needsReconnect) {
        return {
          success: false,
          status: 'NEEDS_RECONNECT',
          errorMessage: validationResult.errorMessage,
          needsReconnect: true
        };
      } else {
        return {
          success: false,
          status: 'DISCONNECTED',
          errorMessage: validationResult.errorMessage,
          needsReconnect: true
        };
      }

    } catch (error) {
      console.error('Session-based login test failed:', error);
      return {
        success: false,
        status: 'DISCONNECTED',
        errorMessage: error instanceof Error ? error.message : 'Session test failed',
        needsReconnect: true
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async testLogin(login: any): Promise<Omit<LoginHealthResult, 'responseTime' | 'lastChecked'>> {
    let page = null;

    try {
      // Launch browser if not already running
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
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Decrypt credentials
      const credentials = decryptLoginCredentials({
        username: login.username,
        password: login.password,
        oauthToken: login.oauthToken,
      });

      // Get login template or use custom config
      const template = this.getLoginTemplate(login);
      
      // Test login process using template
      const loginResult = await this.performGenericLoginTest(page, credentials, template, login.loginUrl);
      
      return loginResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Determine status based on error type
      let status: 'BROKEN' | 'EXPIRED' | 'SUSPENDED' = 'BROKEN';
      
      if (errorMessage.includes('expired') || errorMessage.includes('invalid credentials')) {
        status = 'EXPIRED';
      } else if (errorMessage.includes('suspended') || errorMessage.includes('blocked')) {
        status = 'SUSPENDED';
      }

      return {
        success: false,
        status,
        errorMessage
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private getLoginTemplate(login: any): LoginTemplate {
    // If templateId is provided, use predefined template
    if (login.templateId && login.templateId !== 'custom') {
      const template = getLoginTemplate(login.templateId);
      if (template) {
        return { ...template, loginUrl: login.loginUrl };
      }
    }

    // If custom config is provided, use it
    if (login.customConfig) {
      try {
        const customConfig = JSON.parse(login.customConfig);
        return {
          id: 'custom',
          name: 'Custom',
          description: 'Custom login configuration',
          loginUrl: login.loginUrl,
          steps: customConfig.steps || [],
          fields: customConfig.fields || [],
          successUrlPattern: customConfig.successUrlPattern,
          errorUrlPattern: customConfig.errorUrlPattern
        };
      } catch (error) {
        console.error('Failed to parse custom config:', error);
      }
    }

    // Fallback to custom template with basic form detection
    return {
      id: 'custom',
      name: 'Custom',
      description: 'Auto-detected form login',
      loginUrl: login.loginUrl,
      steps: LOGIN_TEMPLATES.custom.steps,
      fields: LOGIN_TEMPLATES.custom.fields,
      successUrlPattern: '',
      errorUrlPattern: ''
    };
  }

  private async performGenericLoginTest(page: any, credentials: any, template: LoginTemplate, loginUrl: string): Promise<Omit<LoginHealthResult, 'responseTime' | 'lastChecked'>> {
    try {
      console.log(`🔍 Testing login with template: ${template.name}`);

      // Execute each step in the template
      for (const step of template.steps) {
        const result = await this.executeStep(page, step, credentials, loginUrl);
        if (!result.success) {
          return {
            success: false,
            status: 'BROKEN',
            errorMessage: result.errorMessage || `Failed at step: ${step.name}`
          };
        }
      }

      // Check final result
      const currentUrl = page.url();
      const pageTitle = await page.title();
      
      // Check for success indicators
      if (template.successUrlPattern) {
        const successRegex = new RegExp(template.successUrlPattern, 'i');
        if (successRegex.test(currentUrl)) {
          return {
            success: true,
            status: 'ACTIVE'
          };
        }
      }

      // Check for error indicators
      if (template.errorUrlPattern) {
        const errorRegex = new RegExp(template.errorUrlPattern, 'i');
        if (errorRegex.test(currentUrl)) {
          return {
            success: false,
            status: 'BROKEN',
            errorMessage: 'Login failed - error page detected'
          };
        }
      }

      // Check for 2FA or other success indicators
      const has2FA = await page.$('input[type="tel"], #totpPin, [data-primary-action="verify"], input[name="totp"]');
      if (has2FA) {
        return {
          success: true,
          status: 'ACTIVE' // 2FA is expected for some accounts
        };
      }

      // If we're not on the login page anymore, consider it a success
      if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
        return {
          success: true,
          status: 'ACTIVE'
        };
      }

      return {
        success: false,
        status: 'BROKEN',
        errorMessage: 'Login failed - still on login page'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login test failed';
      return {
        success: false,
        status: 'BROKEN',
        errorMessage
      };
    }
  }

  private async executeStep(page: any, step: LoginStep, credentials: any, loginUrl: string): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      switch (step.type) {
        case 'navigate':
          await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: step.timeout });
          break;

        case 'fill':
          if (!step.selector) {
            throw new Error('Selector required for fill step');
          }
          
          await page.waitForSelector(step.selector, { timeout: step.timeout });
          
          // Replace placeholders with actual values
          let value = step.value || '';
          if (value.includes('{{username}}')) {
            value = value.replace('{{username}}', credentials.username);
          }
          if (value.includes('{{password}}')) {
            value = value.replace('{{password}}', credentials.password || '');
          }
          if (value.includes('{{oauthToken}}')) {
            value = value.replace('{{oauthToken}}', credentials.oauthToken || '');
          }

          await page.evaluate((selector, val) => {
            const element = document.querySelector(selector);
            if (element) {
              element.focus();
              element.value = '';
              element.value = val;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, step.selector, value);
          break;

        case 'click':
          if (!step.selector) {
            throw new Error('Selector required for click step');
          }
          
          await page.waitForSelector(step.selector, { timeout: step.timeout });
          await page.click(step.selector);
          break;

        case 'wait':
          if (step.waitFor === 'navigation') {
            await Promise.race([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: step.timeout }),
              new Promise(resolve => setTimeout(resolve, step.timeout))
            ]);
          } else if (step.waitFor === 'selector' && step.selector) {
            await page.waitForSelector(step.selector, { timeout: step.timeout });
          } else {
            await new Promise(resolve => setTimeout(resolve, step.timeout));
          }
          break;

        case 'verify':
          if (step.selector) {
            await page.waitForSelector(step.selector, { timeout: step.timeout });
          }
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Step execution failed';
      return { success: false, errorMessage };
    }
  }

  private async updateLoginStatus(loginId: string, result: Omit<LoginHealthResult, 'responseTime' | 'lastChecked'>, responseTime: number) {
    const now = new Date();
    
    const updateData: any = {
      lastCheckedAt: now,
      status: result.status,
      errorMessage: result.errorMessage || null,
    };

    if (result.success) {
      updateData.lastSuccessAt = now;
      updateData.failureCount = 0;
    } else {
      updateData.lastFailureAt = now;
      updateData.failureCount = { increment: 1 };
    }

    await db.login.update({
      where: { id: loginId },
      data: updateData
    });

    console.log(`✅ Updated login status: ${result.status} (${responseTime}ms)`);
  }

  async checkAllLogins(): Promise<LoginHealthResult[]> {
    console.log('🔍 Starting health check for all logins...');
    
    const logins = await db.login.findMany({
      select: { id: true, name: true }
    });

    const results: LoginHealthResult[] = [];
    
    for (const login of logins) {
      try {
        const result = await this.checkLoginHealth(login.id);
        results.push(result);
        
        // Small delay between checks to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to check login ${login.name}:`, error);
        results.push({
          success: false,
          status: 'BROKEN',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date()
        });
      }
    }

    console.log(`✅ Completed health check for ${logins.length} logins`);
    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
