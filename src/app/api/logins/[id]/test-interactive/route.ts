import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { SessionManager } from '@/lib/session-manager';
import { decryptLoginCredentials } from '@/lib/encryption';
import puppeteer from 'puppeteer';

/**
 * POST /api/logins/:id/test-interactive - Perform automated browser login test
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: loginId } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const login = await db.login.findFirst({
      where: { 
        id: loginId,
        ownerId: user.id 
      },
    });

    if (!login) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    if (!login.username || !login.password) {
      return NextResponse.json(
        { error: 'Login credentials not available' },
        { status: 400 }
      );
    }

    // Decrypt the credentials
    const decryptedCredentials = decryptLoginCredentials({
      username: login.username,
      password: login.password,
      oauthToken: login.oauthToken
    });

    console.log(`🧪 Starting automated login test for: ${login.name}`);
    console.log(`🌐 URL: ${login.loginUrl}`);
    console.log(`👤 Username: ${decryptedCredentials.username}`);

    let browser = null;
    let page = null;

    try {
      // Launch browser in non-headless mode so user can see it
      browser = await puppeteer.launch({
        headless: false, // Show browser window
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

      // Navigate to login page
      console.log(`🔗 Navigating to: ${login.loginUrl}`);
      await page.goto(login.loginUrl, { waitUntil: 'networkidle2' });

      // Wait a moment for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to find and fill login form
      console.log('🔍 Looking for login form...');
      
      // Common selectors for email/username fields
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="username"]',
        'input[name="user"]',
        'input[id="email"]',
        'input[id="username"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="username" i]'
      ];

      // Common selectors for password fields
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[id="password"]',
        'input[placeholder*="password" i]'
      ];

      // Common selectors for submit buttons
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Login")',
        'button:contains("Sign in")',
        'button:contains("Log in")',
        '.login-button',
        '.signin-button'
      ];

      let emailField = null;
      let passwordField = null;
      let submitButton = null;

      // Find email field
      for (const selector of emailSelectors) {
        try {
          emailField = await page.$(selector);
          if (emailField) {
            console.log(`✅ Found email field: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Find password field
      for (const selector of passwordSelectors) {
        try {
          passwordField = await page.$(selector);
          if (passwordField) {
            console.log(`✅ Found password field: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Find submit button
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.$(selector);
          if (submitButton) {
            console.log(`✅ Found submit button: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!emailField || !passwordField || !submitButton) {
        throw new Error(`Could not find login form elements. Email: ${!!emailField}, Password: ${!!passwordField}, Submit: ${!!submitButton}`);
      }

      // Fill in credentials
      console.log('📝 Filling in credentials...');
      await emailField.click();
      await emailField.type(decryptedCredentials.username, { delay: 100 });
      
      await passwordField.click();
      await passwordField.type(decryptedCredentials.password!, { delay: 100 });

      // Submit form
      console.log('🚀 Submitting login form...');
      await submitButton.click();

      // Wait for navigation or success indicators
      console.log('⏳ Waiting for login to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if login was successful
      const currentUrl = page.url();
      console.log(`📍 Current URL after login: ${currentUrl}`);

      // Check for multiple success indicators
      let isSuccess = false;
      let successReason = '';

      // 1. Check if URL changed (but not to an error page)
      if (currentUrl !== login.loginUrl && !currentUrl.includes('error') && !currentUrl.includes('login')) {
        isSuccess = true;
        successReason = 'URL changed to: ' + currentUrl;
      }

      // 2. Check for success indicators in URL
      const urlSuccessIndicators = [
        'dashboard', 'home', 'profile', 'account', 'welcome', 
        'logout', 'sign out', 'admin', 'panel', 'main'
      ];
      
      if (!isSuccess && urlSuccessIndicators.some(indicator => 
        currentUrl.toLowerCase().includes(indicator)
      )) {
        isSuccess = true;
        successReason = 'URL contains success indicator';
      }

      // 3. Check for error messages first (invalid credentials, etc.)
      if (!isSuccess) {
        try {
          // First check page content for common error messages (more reliable)
          const pageContent = await page.content();
          const pageText = await page.evaluate(() => document.body.innerText || document.body.textContent || '');
          const pageTitle = await page.title();
          const currentUrl = page.url();
          
          const errorMessages = [
            'invalid password',
            'incorrect password', 
            'wrong password',
            'login failed',
            'authentication failed',
            'invalid credentials',
            'incorrect credentials',
            'wrong credentials',
            'access denied',
            'unauthorized',
            'bad password',
            'password incorrect',
            'invalid username',
            'username not found',
            'account not found',
            'user not found',
            'sign in failed',
            'authentication error',
            'login error',
            'invalid login',
            'failed to sign in',
            'unable to sign in'
          ];
          
          const foundError = errorMessages.find(msg => 
            pageText.toLowerCase().includes(msg.toLowerCase()) || 
            pageContent.toLowerCase().includes(msg.toLowerCase()) ||
            pageTitle.toLowerCase().includes(msg.toLowerCase()) ||
            currentUrl.toLowerCase().includes(msg.toLowerCase())
          );
          
          if (foundError) {
            console.log(`❌ Login failed - found error message in page: ${foundError}`);
            isSuccess = false;
            successReason = `Login failed: ${foundError}`;
          } else {
            // Check for error elements as fallback
            const errorElements = await Promise.all([
              page.$('.error'),
              page.$('.alert-danger'),
              page.$('[class*="error"]'),
              page.$('[class*="invalid"]'),
              page.$('[class*="failed"]'),
              page.$('[data-testid*="error"]'),
              page.$('[aria-label*="error"]'),
              page.$('[role="alert"]')
            ]);

            const hasErrorElements = errorElements.some(element => element !== null);
            
            if (hasErrorElements) {
              // Get error text for better feedback
              let errorText = 'Login failed';
              try {
                const errorElement = errorElements.find(el => el !== null);
                if (errorElement) {
                  const errorTextContent = await errorElement.evaluate(el => el.textContent || el.innerText || '');
                  if (errorTextContent && errorTextContent.trim()) {
                    errorText = errorTextContent.trim();
                  }
                }
              } catch (e) {
                console.log('Error getting error text:', e);
              }
              
              console.log(`❌ Login failed - found error elements: ${errorText}`);
              isSuccess = false;
              successReason = `Login failed: ${errorText}`;
            }
          }
          
          // Final fallback: if we're still on the login page, it's likely a failure
          if (!isSuccess && !successReason.includes('Login failed')) {
            const hasPasswordField = await page.$('input[type="password"]');
            const hasLoginForm = await page.$('form[action*="login"], form[action*="signin"]');
            const isOnLoginPage = currentUrl.includes('login') || currentUrl.includes('signin') || hasPasswordField || hasLoginForm;
            
            if (isOnLoginPage) {
              console.log(`❌ Login failed - still on login page`);
              isSuccess = false;
              successReason = `Login failed: Still on login page - credentials may be incorrect`;
            }
          }
        } catch (e) {
          console.log('Error checking for error elements:', e);
        }
      }

      // 4. Check for success elements on the page (only if no errors found)
      if (!isSuccess && !successReason.includes('Login failed')) {
        try {
          const successElements = await Promise.all([
            page.$('a[href*="logout"]'),
            page.$('a[href*="signout"]'),
            page.$('[data-testid*="logout"]'),
            page.$('[class*="logout"]'),
            page.$('[class*="signout"]'),
            page.$('[data-testid*="welcome"]'),
            page.$('[data-testid*="dashboard"]'),
            page.$('[data-testid*="profile"]')
          ]);

          const hasSuccessElements = successElements.some(element => element !== null);
          
          if (hasSuccessElements) {
            isSuccess = true;
            successReason = 'Found success elements on page';
          }
        } catch (e) {
          console.log('Error checking for success elements:', e);
        }
      }

      // 5. Check if we're no longer on a login page (no password fields)
      if (!isSuccess) {
        try {
          const hasPasswordField = await page.$('input[type="password"]');
          const hasLoginForm = await page.$('form[action*="login"], form[action*="signin"]');
          
          if (!hasPasswordField && !hasLoginForm) {
            isSuccess = true;
            successReason = 'No longer on login page (no password fields)';
          }
        } catch (e) {
          console.log('Error checking for login form:', e);
        }
      }

      console.log(`🔍 Success check: ${isSuccess ? '✅' : '❌'} (${successReason})`);

      if (isSuccess) {
        console.log('✅ Login successful!');
        
        // Capture session data
        const sessionData = await SessionManager.captureSessionData(page);
        const encryptedSessionData = SessionManager.encryptSessionData(sessionData);

        // Update login with success
        await db.login.update({
          where: { id: loginId },
          data: {
            status: 'READY_FOR_AGENTS',
            sessionData: encryptedSessionData,
            sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            lastCheckedAt: new Date(),
            lastSuccessAt: new Date(),
            failureCount: 0,
            errorMessage: null
          }
        });

        // Close browser after a short delay
        setTimeout(async () => {
          try {
            await page.close();
            await browser.close();
            console.log('🔒 Browser closed after successful login');
          } catch (e) {
            console.error('Error closing browser:', e);
          }
        }, 2000);

        return NextResponse.json({
          success: true,
          status: 'READY_FOR_AGENTS',
          message: 'Login test successful! Browser will close automatically.',
          url: currentUrl
        });

      } else {
        console.log('❌ Login failed - could not verify success');
        
        // Use the detailed error reason from our success detection logic
        let errorDetails = successReason || 'Could not verify successful login';
        
        // If we detected specific error messages, use those
        if (successReason.includes('Login failed:')) {
          errorDetails = successReason;
        } else {
          // Try to get more details about why it failed
          try {
            const pageTitle = await page.title();
            const hasErrorMessages = await page.$('.error, .alert-danger, [class*="error"], [class*="invalid"]');
            const hasLoginForm = await page.$('input[type="password"]');
            
            if (hasErrorMessages) {
              errorDetails = 'Login form shows error messages - credentials may be incorrect';
            } else if (hasLoginForm) {
              errorDetails = 'Still on login page with password field - credentials may be incorrect';
            } else {
              errorDetails = `Could not verify login success. Page title: "${pageTitle}", URL: "${currentUrl}"`;
            }
          } catch (e) {
            console.log('Error getting failure details:', e);
          }
        }
        
        // Determine appropriate status based on error type
        let newStatus = 'NEEDS_RECONNECT';
        if (errorDetails.toLowerCase().includes('password') || 
            errorDetails.toLowerCase().includes('credentials') ||
            errorDetails.toLowerCase().includes('invalid') ||
            errorDetails.toLowerCase().includes('incorrect')) {
          newStatus = 'BROKEN'; // Bad credentials
        }

        // Update login with failure
        await db.login.update({
          where: { id: loginId },
          data: {
            status: newStatus,
            lastCheckedAt: new Date(),
            lastFailureAt: new Date(),
            failureCount: (login.failureCount || 0) + 1,
            errorMessage: `Automated login failed: ${errorDetails}`
          }
        });

        // Close browser
        await page.close();
        await browser.close();

        return NextResponse.json({
          success: false,
          status: newStatus,
          message: `Login test failed: ${errorDetails}`,
          url: currentUrl
        }, { status: 400 });
      }

    } catch (error) {
      console.error('Error during automated login test:', error);
      
      // Determine status based on error type
      let errorStatus = 'DISCONNECTED';
      const errorMessage = error instanceof Error ? error.message : 'Login test failed';
      
      if (errorMessage.toLowerCase().includes('password') || 
          errorMessage.toLowerCase().includes('credentials') ||
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('incorrect')) {
        errorStatus = 'BROKEN'; // Bad credentials
      }

      // Update login with error
      await db.login.update({
        where: { id: loginId },
        data: {
          status: errorStatus,
          lastCheckedAt: new Date(),
          lastFailureAt: new Date(),
          failureCount: (login.failureCount || 0) + 1,
          errorMessage: errorMessage
        }
      });

      // Clean up browser
      if (page) await page.close();
      if (browser) await browser.close();

      return NextResponse.json(
        { 
          error: 'Login test failed',
          status: errorStatus,
          message: errorMessage
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in automated login test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
