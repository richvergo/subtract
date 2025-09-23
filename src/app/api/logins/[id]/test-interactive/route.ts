import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { SessionManager } from '@/lib/session-manager';
import { decryptLoginCredentials } from '@/lib/encryption';
import { UniversalLoginDetector } from '@/lib/universal-login-detector';
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
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // Use normal Chrome
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-data-dir=/tmp/chrome-test-profile'
        ]
      });

      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to login page
      console.log(`🔗 Navigating to: ${login.loginUrl}`);
      await page.goto(login.loginUrl, { waitUntil: 'networkidle2' });

      // Wait a moment for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Use Universal Login Detector
      console.log('🔍 Looking for login form...');
      
      const loginForm = await UniversalLoginDetector.detectLoginForm(page);
      if (!loginForm) {
        throw new Error('Could not detect login form on this page');
      }

      console.log(`📋 Detected ${loginForm.formType} form with ${loginForm.submissionMethod} submission`);

      // Check if this is an OAuth login that can't be automated
      if (loginForm.formType === 'oauth') {
        console.log('🔑 OAuth login detected - skipping automated test');
        return NextResponse.json({
          success: false,
          error: 'OAuth login requires manual testing',
          message: 'This login uses OAuth authentication which requires manual testing. Please test the login manually by clicking the "Test Login" button.',
          requiresManualTesting: true
        });
      }

      // Perform login with adaptive strategy
      const loginResult = await UniversalLoginDetector.performLogin(page, loginForm, {
        username: decryptedCredentials.username,
        password: decryptedCredentials.password || ''
      });
      if (!loginResult.success) {
        throw new Error(loginResult.error || 'Login attempt failed');
      }

      // Verify login success
      console.log('⏳ Waiting for login to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      const isSuccess = await UniversalLoginDetector.verifyLoginSuccess(page, login.loginUrl);
      if (!isSuccess) {
        throw new Error('Login verification failed');
      }

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

      console.log('🔒 Browser closed after successful login');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Login test successful',
        status: 'READY_FOR_AGENTS'
      });

    } catch (error) {
      console.error('Error during automated login test:', error);
      
      // Determine if this is a credential issue or technical issue
      let newStatus: 'BROKEN' | 'NEEDS_RECONNECT' = 'BROKEN';
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for common credential-related errors
      const credentialErrors = [
        'invalid password',
        'incorrect password', 
        'wrong password',
        'bad password',
        'password incorrect',
        'invalid username',
        'username not found',
        'account not found',
        'user not found',
        'invalid credentials',
        'incorrect credentials',
        'wrong credentials',
        'access denied',
        'unauthorized'
      ];
      
      const isCredentialError = credentialErrors.some(err => 
        errorMessage.toLowerCase().includes(err)
      );
      
      if (isCredentialError) {
        newStatus = 'NEEDS_RECONNECT';
        errorMessage = 'Invalid credentials - please update login details';
      }
      
      // Update login with failure
      await db.login.update({
        where: { id: loginId },
        data: {
          status: newStatus,
          lastCheckedAt: new Date(),
          lastFailureAt: new Date(),
          failureCount: login.failureCount + 1,
          errorMessage: errorMessage
        }
      });

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          status: newStatus,
          needsReconnect: newStatus === 'NEEDS_RECONNECT'
        },
        { status: 400 }
      );

    } finally {
      if (browser) {
        await browser.close();
      }
    }

  } catch (error) {
    console.error('Error in login test API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
