/**
 * Universal Login Detector
 * Handles all types of modern web application login patterns
 */

export interface LoginForm {
  emailField: any;
  passwordField: any;
  submitButton?: any;
  formType: 'traditional' | 'google-multi-step' | 'microsoft-multi-step' | 'oauth' | 'sso' | 'passwordless' | 'spa';
  submissionMethod: 'click' | 'enter' | 'auto-submit' | 'oauth-popup';
  requiresMultiStep?: boolean;
}

export interface LoginAttemptResult {
  success: boolean;
  error?: string;
  needsAdditionalSteps?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export class UniversalLoginDetector {
  
  /**
   * Comprehensive selector patterns for different login types
   */
  private static readonly EMAIL_SELECTORS = [
    // Standard HTML inputs
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[name="user"]',
    'input[name="login"]',
    'input[name="account"]',
    'input[id="email"]',
    'input[id="username"]',
    'input[id="user"]',
    'input[id="login"]',
    'input[id="account"]',
    
    // Placeholder-based detection
    'input[placeholder*="email" i]',
    'input[placeholder*="username" i]',
    'input[placeholder*="user" i]',
    'input[placeholder*="login" i]',
    'input[placeholder*="account" i]',
    'input[placeholder*="phone" i]',
    
    // Class-based detection
    'input.email',
    'input.username',
    'input.user',
    'input.login',
    '.email-input input',
    '.username-input input',
    '.login-input input',
    
    // Google-specific
    'input[type="email"][autocomplete="username"]',
    'input[data-testid*="email"]',
    'input[data-testid*="username"]',
    
    // Microsoft-specific
    'input[name="loginfmt"]',
    'input[id="i0116"]',
    
    // Generic fallbacks
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    
    // Modern SPA selectors
    '[data-testid*="email"]',
    '[data-testid*="username"]',
    '[data-cy*="email"]',
    '[data-cy*="username"]',
  ];

  private static readonly PASSWORD_SELECTORS = [
    'input[type="password"]',
    'input[name="password"]',
    'input[name="pass"]',
    'input[name="pwd"]',
    'input[id="password"]',
    'input[id="pass"]',
    'input[id="pwd"]',
    'input[placeholder*="password" i]',
    'input[placeholder*="pass" i]',
    'input[placeholder*="pwd" i]',
    'input.password',
    '.password-input input',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
    
    // Google-specific
    'input[type="password"][autocomplete="current-password"]',
    'input[data-testid*="password"]',
    
    // Microsoft-specific
    'input[name="passwd"]',
    'input[id="i0118"]',
    
    // Modern SPA selectors
    '[data-testid*="password"]',
    '[data-cy*="password"]',
  ];

  private static readonly SUBMIT_SELECTORS = [
    // Standard buttons
    'button[type="submit"]',
    'input[type="submit"]',
    'button[type="button"]',
    
    // Class-based buttons
    '.login-button',
    '.signin-button',
    '.submit-button',
    '.continue-button',
    '.next-button',
    '.btn-login',
    '.btn-signin',
    '.btn-submit',
    '.btn-primary',
    '.btn-secondary',
    
    // ID-based buttons
    '#login-button',
    '#signin-button',
    '#submit-button',
    '#continue-button',
    '#next-button',
    
    // Data attribute buttons
    'button[data-testid*="login"]',
    'button[data-testid*="signin"]',
    'button[data-testid*="submit"]',
    'button[data-testid*="continue"]',
    
    // Form submission
    'form button',
    'form input[type="submit"]',
    'form input[type="button"]',
  ];

  /**
   * Detect login form type and elements
   */
  static async detectLoginForm(page: any): Promise<LoginForm | null> {
    try {
      // Wait for page to stabilize
      await this.waitForPageStabilization(page);
      
      const emailField = await this.findElement(page, this.EMAIL_SELECTORS);
      const passwordField = await this.findElement(page, this.PASSWORD_SELECTORS);
      const submitButton = await this.findElement(page, this.SUBMIT_SELECTORS);
      
      if (!emailField || !passwordField) {
        return null;
      }
      
      // Determine form type based on page characteristics
      const formType = await this.determineFormType(page, emailField, passwordField, submitButton);
      const submissionMethod = await this.determineSubmissionMethod(page, formType, submitButton);
      
      return {
        emailField,
        passwordField,
        submitButton,
        formType,
        submissionMethod,
        requiresMultiStep: ['google-multi-step', 'microsoft-multi-step', 'oauth'].includes(formType)
      };
      
    } catch (error) {
      console.error('Error detecting login form:', error);
      return null;
    }
  }

  /**
   * Find element using multiple selectors with intelligent retry
   */
  private static async findElement(page: any, selectors: string[]): Promise<any> {
    // Try immediate selectors first
    for (const selector of selectors) {
      try {
        let element = null;
        
        if (selector.startsWith('//')) {
          // XPath selector
          const elements = await page.$x(selector);
          element = elements.length > 0 ? elements[0] : null;
        } else {
          // CSS selector
          element = await page.$(selector);
        }
        
        if (element) {
          console.log(`✅ Found element: ${selector}`);
          return element;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no immediate match, wait and retry for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (const selector of selectors) {
      try {
        let element = null;
        
        if (selector.startsWith('//')) {
          const elements = await page.$x(selector);
          element = elements.length > 0 ? elements[0] : null;
        } else {
          element = await page.$(selector);
        }
        
        if (element) {
          console.log(`✅ Found element (retry): ${selector}`);
          return element;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Final retry with longer wait for slow-loading pages
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    for (const selector of selectors) {
      try {
        let element = null;
        
        if (selector.startsWith('//')) {
          const elements = await page.$x(selector);
          element = elements.length > 0 ? elements[0] : null;
        } else {
          element = await page.$(selector);
        }
        
        if (element) {
          console.log(`✅ Found element (final retry): ${selector}`);
          return element;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    return null;
  }

  /**
   * Determine the type of login form based on page characteristics
   */
  private static async determineFormType(page: any, emailField: any, passwordField: any, submitButton: any): Promise<LoginForm['formType']> {
    const url = page.url();
    const pageContent = await page.content();
    
    // Google services
    if (url.includes('google.com') || url.includes('accounts.google.com')) {
      return 'google-multi-step';
    }
    
    // Microsoft services
    if (url.includes('microsoft.com') || url.includes('login.microsoftonline.com')) {
      return 'microsoft-multi-step';
    }
    
    // OAuth/Social login indicators - only if there are actual OAuth buttons or specific patterns
    const oauthButtons = await page.$$('button[class*="oauth"], button[class*="social"], a[class*="oauth"], a[class*="social"], button[class*="google"], button[class*="microsoft"], button[class*="facebook"], button[class*="twitter"]');
    const oauthText = pageContent.includes('Sign in with Google') || pageContent.includes('Sign in with Microsoft') || 
                     pageContent.includes('Continue with Google') || pageContent.includes('Continue with Microsoft') ||
                     pageContent.includes('Login with Google') || pageContent.includes('Login with Microsoft') ||
                     pageContent.includes('Sign in with Facebook') || pageContent.includes('Sign in with Twitter');
    
    if (oauthButtons.length > 0 || oauthText) {
      return 'oauth';
    }
    
    // SSO indicators
    if (pageContent.includes('sso') || pageContent.includes('single sign-on') ||
        pageContent.includes('enterprise') || pageContent.includes('organization') ||
        pageContent.includes('Active Directory') || pageContent.includes('SAML')) {
      return 'sso';
    }
    
    // Passwordless indicators
    if (pageContent.includes('magic link') || pageContent.includes('passwordless') ||
        pageContent.includes('email link') || pageContent.includes('SMS code') ||
        !passwordField) {
      return 'passwordless';
    }
    
    // SPA indicators
    if (pageContent.includes('react') || pageContent.includes('vue') || 
        pageContent.includes('angular') || pageContent.includes('spa') ||
        pageContent.includes('_app') || pageContent.includes('__NEXT_DATA__')) {
      return 'spa';
    }
    
    // Traditional form
    return 'traditional';
  }

  /**
   * Determine submission method based on form type
   */
  private static async determineSubmissionMethod(page: any, formType: string, submitButton: any): Promise<LoginForm['submissionMethod']> {
    switch (formType) {
      case 'google-multi-step':
      case 'microsoft-multi-step':
        return 'enter';
      case 'oauth':
        return 'oauth-popup';
      case 'passwordless':
        return 'auto-submit';
      case 'spa':
        return submitButton ? 'click' : 'enter';
      case 'traditional':
      default:
        return submitButton ? 'click' : 'enter';
    }
  }

  /**
   * Wait for page to stabilize (handle dynamic content)
   */
  private static async waitForPageStabilization(page: any): Promise<void> {
    try {
      // Wait for network to be idle
      await page.waitForLoadState?.('networkidle') || await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // Fallback to fixed wait time
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  /**
   * Perform login with adaptive strategy
   */
  static async performLogin(page: any, loginForm: LoginForm, credentials: { username: string; password: string }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 Performing ${loginForm.formType} login with ${loginForm.submissionMethod} method`);
      
      switch (loginForm.formType) {
        case 'google-multi-step':
          return await this.performGoogleMultiStepLogin(page, loginForm, credentials);
        case 'microsoft-multi-step':
          return await this.performMicrosoftMultiStepLogin(page, loginForm, credentials);
        case 'oauth':
          return await this.performOAuthLogin(page, loginForm, credentials);
        case 'passwordless':
          return await this.performPasswordlessLogin(page, loginForm, credentials);
        case 'spa':
          return await this.performSPALogin(page, loginForm, credentials);
        case 'traditional':
        default:
          return await this.performTraditionalLogin(page, loginForm, credentials);
      }
    } catch (error) {
      console.error('Login attempt failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Google-style multi-step login
   */
  private static async performGoogleMultiStepLogin(page: any, loginForm: LoginForm, credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Enter email
      console.log('📧 Step 1: Entering email...');
      await loginForm.emailField.click();
      await loginForm.emailField.type(credentials.username, { delay: 100 });
      await loginForm.emailField.press('Enter');
      
      // Wait for next step and page to potentially reload/navigate
      console.log('⏳ Waiting for page transition...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Re-find password field after page transition (elements become detached)
      console.log('🔍 Re-finding password field after page transition...');
      let passwordField = await this.findElement(page, this.PASSWORD_SELECTORS);
      if (!passwordField) {
        return { success: false, error: 'Password field not found after email step' };
      }
      
      // Step 2: Enter password
      console.log('🔐 Step 2: Entering password...');
      await passwordField.click();
      await passwordField.type(credentials.password, { delay: 100 });
      await passwordField.press('Enter');
      
      // Wait for login to complete
      console.log('⏳ Waiting for login to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Microsoft-style multi-step login
   */
  private static async performMicrosoftMultiStepLogin(page: any, loginForm: LoginForm, credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Enter email
      console.log('📧 Step 1: Entering email...');
      await loginForm.emailField.click();
      await loginForm.emailField.type(credentials.username, { delay: 100 });
      await loginForm.emailField.press('Enter');
      
      // Wait for next step and page to potentially reload/navigate
      console.log('⏳ Waiting for page transition...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Re-find password field after page transition (elements become detached)
      console.log('🔍 Re-finding password field after page transition...');
      let passwordField = await this.findElement(page, this.PASSWORD_SELECTORS);
      if (!passwordField) {
        return { success: false, error: 'Password field not found after email step' };
      }
      
      // Step 2: Enter password
      console.log('🔐 Step 2: Entering password...');
      await passwordField.click();
      await passwordField.type(credentials.password, { delay: 100 });
      await passwordField.press('Enter');
      
      // Wait for login to complete
      console.log('⏳ Waiting for login to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Traditional form login
   */
  private static async performTraditionalLogin(page: any, loginForm: LoginForm, credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📝 Filling traditional form...');
      
      // Fill email
      await loginForm.emailField.click();
      await loginForm.emailField.type(credentials.username, { delay: 100 });
      
      // Fill password
      await loginForm.passwordField.click();
      await loginForm.passwordField.type(credentials.password, { delay: 100 });
      
      // Submit
      if (loginForm.submissionMethod === 'click' && loginForm.submitButton) {
        await loginForm.submitButton.click();
      } else {
        await loginForm.passwordField.press('Enter');
      }
      
      // Wait for login to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * SPA login handling
   */
  private static async performSPALogin(page: any, loginForm: LoginForm, credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('⚛️ Filling SPA form...');
      
      // SPA forms often need more careful handling
      await loginForm.emailField.click();
      await loginForm.emailField.clear?.() || await loginForm.emailField.evaluate((el: any) => el.value = '');
      await loginForm.emailField.type(credentials.username, { delay: 150 });
      
      await loginForm.passwordField.click();
      await loginForm.passwordField.clear?.() || await loginForm.passwordField.evaluate((el: any) => el.value = '');
      await loginForm.passwordField.type(credentials.password, { delay: 150 });
      
      // Submit
      if (loginForm.submitButton) {
        await loginForm.submitButton.click();
      } else {
        await loginForm.passwordField.press('Enter');
      }
      
      // Wait for SPA to process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * OAuth login handling
   */
  private static async performOAuthLogin(page: any, loginForm: LoginForm, credentials: any): Promise<{ success: boolean; error?: string }> {
    console.log('🔑 OAuth login detected - may require manual intervention');
    return { success: false, error: 'OAuth login requires manual handling' };
  }

  /**
   * Passwordless login handling
   */
  private static async performPasswordlessLogin(page: any, loginForm: LoginForm, credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Passwordless login - entering email...');
      await loginForm.emailField.click();
      await loginForm.emailField.type(credentials.username, { delay: 100 });
      
      if (loginForm.submitButton) {
        await loginForm.submitButton.click();
      } else {
        await loginForm.emailField.press('Enter');
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Check if login was successful with multiple verification methods
   */
  static async verifyLoginSuccess(page: any, originalUrl: string): Promise<boolean> {
    try {
      const currentUrl = page.url();
      
      // URL changed (common success indicator)
      if (currentUrl !== originalUrl && 
          !currentUrl.includes('login') && 
          !currentUrl.includes('signin') &&
          !currentUrl.includes('auth') &&
          !currentUrl.includes('error')) {
        console.log(`✅ Login successful - URL changed to: ${currentUrl}`);
        return true;
      }
      
      // Check for success indicators
      const successIndicators = [
        'Welcome',
        'Dashboard',
        'Home',
        'Profile',
        'Account',
        'Settings',
        'Logout',
        'Sign out',
        'My Account',
        'User Menu',
        'Admin Panel'
      ];
      
      const pageContent = await page.content();
      // DISABLED - This was causing false positives with "Welcome" text
      // Google shows "Welcome" even during failed logins, so this check is unreliable
      // for (const indicator of successIndicators) {
      //   if (pageContent.toLowerCase().includes(indicator.toLowerCase())) {
      //     console.log(`✅ Login successful - found success indicator: ${indicator}`);
      //     return true;
      //   }
      // }
      
      // Check for error indicators (ENHANCED - Error-first approach)
      const errorIndicators = [
        // Password-specific errors
        'password is incorrect',
        'password incorrect',
        'incorrect password',
        'wrong password',
        'invalid password',
        'password does not match',
        'password is wrong',
        'that password isn\'t right',
        
        // Credential errors
        'invalid credentials',
        'incorrect credentials',
        'wrong credentials',
        'bad credentials',
        'credentials are incorrect',
        
        // Username/email errors
        'username not found',
        'email not found',
        'user not found',
        'account not found',
        'invalid username',
        'invalid email',
        
        // Google-specific errors
        'couldn\'t sign you in',
        'couldn\'t sign in',
        'sign in failed',
        'wrong password. try again',
        'enter a valid password',
        'that password isn\'t right',
        
        // Generic errors
        'Invalid',
        'Incorrect', 
        'Wrong',
        'Error',
        'Failed',
        'Try again',
        'Login failed',
        'Authentication failed',
        'Access denied',
        'something went wrong',
        'please try again'
      ];
      
      for (const indicator of errorIndicators) {
        if (pageContent.toLowerCase().includes(indicator.toLowerCase())) {
          console.log(`❌ Login failed - found error indicator: ${indicator}`);
          return false;
        }
      }
      
      // Check for login form still present (indicates failure)
      const loginFormStillPresent = await page.$('input[type="password"]');
      if (loginFormStillPresent) {
        console.log('❌ Login form still present - likely failed');
        return false;
      }
      
      // Only assume success if URL changed away from login page
      const finalUrl = page.url();
      const urlChanged = finalUrl !== originalUrl;
      const stillOnLoginPage = finalUrl.includes('login') || 
        finalUrl.includes('signin') || 
        finalUrl.includes('auth') ||
        finalUrl.includes('accounts.google.com');
        
      if (urlChanged && !stillOnLoginPage) {
        console.log(`✅ Login successful - URL changed away from login page: ${finalUrl}`);
        return true;
      }
      
      // Default to failure for safety (error-first approach)
      console.log('⚠️ Unable to determine login status - ASSUMING FAILURE for safety');
      console.log(`   URL changed: ${urlChanged}`);
      console.log(`   Still on login page: ${stillOnLoginPage}`);
      return false;
      
    } catch (error) {
      console.error('Error verifying login success:', error);
      return false;
    }
  }
}