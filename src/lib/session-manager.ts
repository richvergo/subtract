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
   * Extract session data from Puppeteer page
   */
  static async extractSessionFromPage(page: any): Promise<SessionData> {
    try {
      const sessionData = await page.evaluate(() => {
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
      const userAgent = await page.evaluate(() => navigator.userAgent);

      return {
        ...sessionData,
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
  static async applySessionToPage(page: any, sessionData: SessionData): Promise<void> {
    try {
      // Set user agent
      if (sessionData.userAgent) {
        await page.setUserAgent(sessionData.userAgent);
      }

      // Set cookies
      if (sessionData.cookies && sessionData.cookies.length > 0) {
        await page.setCookie(...sessionData.cookies);
      }

      // Set localStorage
      if (sessionData.localStorage) {
        await page.evaluate((localStorage) => {
          for (const [key, value] of Object.entries(localStorage)) {
            window.localStorage.setItem(key, value);
          }
        }, sessionData.localStorage);
      }

      // Set sessionStorage
      if (sessionData.sessionStorage) {
        await page.evaluate((sessionStorage) => {
          for (const [key, value] of Object.entries(sessionStorage)) {
            window.sessionStorage.setItem(key, value);
          }
        }, sessionData.sessionStorage);
      }
    } catch (error) {
      console.error('Failed to apply session to page:', error);
      throw new Error('Session application failed');
    }
  }

  /**
   * Validate if session is still active by making a lightweight request
   */
  static async validateSession(page: any, loginUrl: string): Promise<SessionValidationResult> {
    try {
      // Navigate to the login URL
      await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 10000 });
      
      const currentUrl = page.url();
      const pageTitle = await page.title();

      // Check if we're still on a login page (indicating session expired)
      const isOnLoginPage = currentUrl.includes('login') || 
                           currentUrl.includes('signin') || 
                           currentUrl.includes('auth') ||
                           pageTitle.toLowerCase().includes('sign in') ||
                           pageTitle.toLowerCase().includes('log in');

      if (isOnLoginPage) {
        // Check if it's specifically a 2FA page
        const has2FA = await page.$('input[type="tel"], #totpPin, [data-primary-action="verify"], input[name="totp"], input[name="code"]');
        
        if (has2FA) {
          return {
            isValid: false,
            needsReconnect: true,
            errorMessage: '2FA required - user interaction needed'
          };
        }

        return {
          isValid: false,
          needsReconnect: true,
          errorMessage: 'Session expired - re-authentication required'
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
        return null;
      }

      // Find the cookie with the longest expiry
      let maxExpiry = 0;
      
      for (const cookie of sessionData.cookies) {
        if (cookie.expires && cookie.expires > maxExpiry) {
          maxExpiry = cookie.expires;
        }
      }

      if (maxExpiry > 0) {
        return new Date(maxExpiry * 1000); // Convert from seconds to milliseconds
      }

      // If no explicit expiry, assume 24 hours from now
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Failed to calculate session expiry:', error);
      return null;
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
