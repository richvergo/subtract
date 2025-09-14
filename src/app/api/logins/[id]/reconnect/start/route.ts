import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { decryptLoginCredentials } from '@/lib/encryption';
import { getLoginTemplate } from '@/lib/login-templates';
import puppeteer from 'puppeteer';

/**
 * POST /api/logins/:id/reconnect/start - Start interactive reconnection process
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const loginId = params.id;
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

    // Update status to indicate reconnection is in progress
    await db.login.update({
      where: { id: loginId },
      data: {
        status: 'NEEDS_RECONNECT',
        lastCheckedAt: new Date(),
        errorMessage: 'Reconnection in progress'
      }
    });

    // Launch browser for interactive session
    const browser = await puppeteer.launch({
      headless: false, // Show browser for user interaction
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--start-maximized'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Decrypt credentials
    const credentials = decryptLoginCredentials({
      username: login.username,
      password: login.password,
      oauthToken: login.oauthToken,
    });

    // Get login template
    const template = login.templateId ? getLoginTemplate(login.templateId) : null;
    
    // Navigate to login page
    await page.goto(login.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Pre-fill username and password if possible
    try {
      if (template && template.steps) {
        // Use template to pre-fill
        for (const step of template.steps) {
          if (step.type === 'fill' && step.selector) {
            let value = step.value || '';
            if (value.includes('{{username}}')) {
              value = value.replace('{{username}}', credentials.username);
            }
            if (value.includes('{{password}}')) {
              value = value.replace('{{password}}', credentials.password || '');
            }

            try {
              await page.waitForSelector(step.selector, { timeout: 5000 });
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
            } catch (error) {
              // Ignore if selector not found, user can fill manually
              console.log(`Could not pre-fill ${step.selector}:`, error);
            }
          }
        }
      } else {
        // Try to auto-detect and pre-fill common fields
        try {
          const usernameSelectors = [
            'input[type="email"]',
            'input[name="username"]',
            'input[name="email"]',
            'input[name="identifier"]',
            '#identifierId'
          ];

          for (const selector of usernameSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 });
              await page.evaluate((sel, username) => {
                const element = document.querySelector(sel);
                if (element) {
                  element.focus();
                  element.value = '';
                  element.value = username;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }, selector, credentials.username);
              break;
            } catch (error) {
              // Continue to next selector
            }
          }

          // Try to pre-fill password
          const passwordSelectors = [
            'input[type="password"]',
            'input[name="password"]',
            '#password'
          ];

          for (const selector of passwordSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 });
              await page.evaluate((sel, password) => {
                const element = document.querySelector(sel);
                if (element) {
                  element.focus();
                  element.value = '';
                  element.value = password;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }, selector, credentials.password || '');
              break;
            } catch (error) {
              // Continue to next selector
            }
          }
        } catch (error) {
          console.log('Could not auto-fill credentials:', error);
        }
      }
    } catch (error) {
      console.log('Pre-fill failed, user will need to enter credentials manually:', error);
    }

    // Store browser instance info (in a real app, you'd use a proper session store)
    const reconnectSessionId = `reconnect_${loginId}_${Date.now()}`;
    
    // Return instructions for the user
    return NextResponse.json({
      success: true,
      reconnectSessionId,
      instructions: {
        title: 'Complete Login Process',
        message: 'Please complete the login process in the browser window that just opened. This may include entering 2FA codes or other authentication steps.',
        steps: [
          'Complete any required authentication steps',
          'Navigate to the main application page (not the login page)',
          'Click "Complete Reconnection" when finished'
        ]
      },
      browserWindow: {
        url: page.url(),
        title: await page.title()
      }
    });

  } catch (error) {
    console.error('Error starting reconnection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
