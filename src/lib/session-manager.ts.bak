/**
 * Session Management Utilities
 * Handles encryption/decryption of session data (cookies, tokens, etc.)
 */

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || 'default-session-key-change-in-production';

export interface SessionData {
  cookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    url?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  tokens?: Record<string, string>;
  userAgent?: string;
  timestamp: number;
}

export interface SessionValidationResult {
  isValid: boolean;
  needsReconnect: boolean;
  errorMessage?: string;
  sessionExpiry?: Date;
}

export class SessionManager {
  /**
   * Encrypt session data for storage
   */
  static encryptSessionData(sessionData: SessionData): string {
    try {
      const jsonString = JSON.stringify(sessionData);
      const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      console.error('Failed to encrypt session data:', error);
      throw new Error('Session encryption failed');
    }
  }

  /**
   * Decrypt session data from storage
   */
  static decryptSessionData(encryptedData: string): SessionData {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!jsonString) {
        throw new Error('Invalid encrypted data');
      }
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to decrypt session data:', error);
      throw new Error('Session decryption failed');
    }
  }

  /**
   * Capture session data from Puppeteer page (alias for extractSessionFromPage)
   */
  static async captureSessionData(page: unknown): Promise<SessionData> {
    return this.extractSessionFromPage(page);
  }

  /**
   * Extract session data from Puppeteer page
   */
  static async extractSessionFromPage(page: unknown): Promise<SessionData> {
    try {
      const pageObj = page as { evaluate: (fn: () => unknown) => Promise<unknown> };
      const sessionData = await pageObj.evaluate(() => {
        // Extract cookies
        const cookies = document.cookie.split(';').map(cookie => {
          const [name, value] = cookie.trim().split('=');
          return { name, value };
        }).filter(cookie => cookie.name && cookie.value);

        // Extract localStorage
        const localStorage: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            localStorage[key] = window.localStorage.getItem(key) || '';
          }
        }

        // Extract sessionStorage
        const sessionStorage: Record<string, string> = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            sessionStorage[key] = window.sessionStorage.getItem(key) || '';
          }
        }

        return {
          cookies,
          localStorage,
          sessionStorage,
          timestamp: Date.now()
        };
      });

      // Get user agent from page
      const pageForUserAgent = page as { evaluate: (fn: () => string) => Promise<string> };
      const userAgent = await pageForUserAgent.evaluate(() => navigator.userAgent);

      return {
        ...(sessionData as SessionData),
        userAgent
      };
    } catch (error) {
      console.error('Failed to extract session from page:', error);
      throw new Error('Session extraction failed');
    }
  }

  /**
   * Apply session data to Puppeteer page
   */
  static async applySessionToPage(page: unknown, sessionData: SessionData): Promise<void> {
    try {
      const pageObj = page as {
        setUserAgent: (userAgent: string) => Promise<void>;
        setCookie: (...cookies: Array<{ name: string; value: string; domain?: string; path?: string; url?: string }>) => Promise<void>;
        evaluate: (fn: (localStorage?: Record<string, string>) => void, data?: Record<string, string>) => Promise<void>;
      };
      // Set user agent
      if (sessionData.userAgent) {
        await pageObj.setUserAgent(sessionData.userAgent);
      }

      // Set cookies
      if (sessionData.cookies && sessionData.cookies.length > 0) {
        // Ensure cookies have required url or domain property
        const validCookies = sessionData.cookies.map(cookie => {
          if (!cookie.domain && !cookie.url) {
            // If no domain or url specified, use a default domain
            return { ...cookie, domain: '.localhost' };
          }
          return cookie;
        });
        await pageObj.setCookie(...validCookies);
      }

      // Set localStorage (with error handling for security restrictions)
      if (sessionData.localStorage) {
        try {
          await pageObj.evaluate((localStorage) => {
            for (const [key, value] of Object.entries(localStorage || {})) {
              window.localStorage.setItem(key, value);
            }
          }, sessionData.localStorage);
        } catch (error) {
          console.warn('Failed to set localStorage (security restriction):', error);
          // Continue without localStorage - this is often blocked in headless browsers
        }
      }

      // Set sessionStorage (with error handling for security restrictions)
      if (sessionData.sessionStorage) {
        try {
          await pageObj.evaluate((sessionStorage) => {
            for (const [key, value] of Object.entries(sessionStorage || {})) {
              window.sessionStorage.setItem(key, value);
            }
          }, sessionData.sessionStorage);
        } catch (error) {
          console.warn('Failed to set sessionStorage (security restriction):', error);
          // Continue without sessionStorage - this is often blocked in headless browsers
        }
      }
    } catch (error) {
      console.error('Failed to apply session to page:', error);
      // Don't throw error - session application is optional for login testing
      // Many sites work fine without session data
      console.warn('Continuing without session data - this may affect some functionality');
    }
  }

  /**
   * Validate if session is still active by making a lightweight request
   */
  static async validateSession(page: unknown, loginUrl: string): Promise<SessionValidationResult> {
    try {
      const pageObj = page as {
        goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<void>;
        url: () => string;
        waitForTimeout: (ms: number) => Promise<void>;
        $: (selector: string) => Promise<unknown>;
      };
      // Navigate to the login URL
      await pageObj.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const currentUrl = pageObj.url();
      // const pageTitle = await pageObj.title();

      // Wait a bit for any redirects to complete
      await pageObj.waitForTimeout(2000);

      // Check for explicit login form elements (more reliable than URL/title)
      const hasLoginForm = await pageObj.$('form[action*="login"], form[action*="signin"], input[type="password"], button[type="submit"]');
      const hasLoginInputs = await pageObj.$('input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"]');
      
      // Check if we're on a login page with form elements
      const isOnLoginPage = (currentUrl.includes('login') || 
                           currentUrl.includes('signin') || 
                           currentUrl.includes('auth')) && 
                           (hasLoginForm || hasLoginInputs);

      if (isOnLoginPage) {
        // Check if it's specifically a 2FA page
        const has2FA = await pageObj.$('input[type="tel"], #totpPin, [data-primary-action="verify"], input[name="totp"], input[name="code"]');
        
        if (has2FA) {
          return {
            isValid: false,
            needsReconnect: true,
            errorMessage: '2FA required - user interaction needed'
          };
        }

        // Check if there are any error messages indicating invalid credentials
        const hasError = await pageObj.$('.error, .alert-danger, [class*="error"], [class*="invalid"]');
        if (hasError) {
          return {
            isValid: false,
            needsReconnect: true,
            errorMessage: 'Invalid credentials - re-authentication required'
          };
        }

        return {
          isValid: false,
          needsReconnect: true,
          errorMessage: 'Session expired - re-authentication required'
        };
      }

      // Additional checks for common success indicators
      const hasUserMenu = await pageObj.$('[data-testid*="user"], .user-menu, [class*="user"], [class*="profile"]');
      const hasLogoutButton = await pageObj.$('a[href*="logout"], button[onclick*="logout"], [data-testid*="logout"]');
      
      if (hasUserMenu || hasLogoutButton) {
        return {
          isValid: true,
          needsReconnect: false
        };
      }

      // If we're not on a login page and no explicit success indicators, 
      // but also no login form, consider it valid
      if (!hasLoginForm && !hasLoginInputs) {
        return {
          isValid: true,
          needsReconnect: false
        };
      }

      // Session appears to be valid
      return {
        isValid: true,
        needsReconnect: false
      };

    } catch (error) {
      console.error('Session validation failed:', error);
      return {
        isValid: false,
        needsReconnect: true,
        errorMessage: error instanceof Error ? error.message : 'Session validation failed'
      };
    }
  }

  /**
   * Calculate session expiry based on cookies and current time
   */
  static calculateSessionExpiry(sessionData: SessionData): Date | null {
    try {
      if (!sessionData.cookies || sessionData.cookies.length === 0) {
        // If no cookies, assume session is valid for 1 hour
        return new Date(Date.now() + 60 * 60 * 1000);
      }

      // Find the cookie with the longest expiry
      let maxExpiry = 0;
      let hasSessionCookie = false;
      
      for (const cookie of sessionData.cookies) {
        // Check for session-related cookies
        if (cookie.name.toLowerCase().includes('session') || 
            cookie.name.toLowerCase().includes('auth') ||
            cookie.name.toLowerCase().includes('token')) {
          hasSessionCookie = true;
        }
        
        if (cookie.expires && cookie.expires > maxExpiry) {
          maxExpiry = cookie.expires;
        }
      }

      if (maxExpiry > 0) {
        const expiryDate = new Date(maxExpiry * 1000); // Convert from seconds to milliseconds
        
        // If the expiry is more than 30 days in the future, cap it at 7 days
        // This prevents extremely long sessions that might be invalid
        const maxSessionDays = 7;
        const maxExpiryDate = new Date(Date.now() + maxSessionDays * 24 * 60 * 60 * 1000);
        
        if (expiryDate > maxExpiryDate) {
          return maxExpiryDate;
        }
        
        return expiryDate;
      }

      // If we have session cookies but no explicit expiry, assume 4 hours
      if (hasSessionCookie) {
        return new Date(Date.now() + 4 * 60 * 60 * 1000);
      }

      // If no session cookies, assume 1 hour
      return new Date(Date.now() + 60 * 60 * 1000);
    } catch (error) {
      console.error('Failed to calculate session expiry:', error);
      // Default to 1 hour if calculation fails
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(sessionExpiry: Date | null): boolean {
    if (!sessionExpiry) {
      return false; // No expiry set, assume valid
    }
    
    return new Date() > sessionExpiry;
  }
}
