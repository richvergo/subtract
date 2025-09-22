import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { SessionManager } from '@/lib/session-manager';
import puppeteer from 'puppeteer';

/**
 * POST /api/logins/:id/check - Check if login session is still valid
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

    // Check if session is expired
    if (login.sessionExpiry && SessionManager.isSessionExpired(login.sessionExpiry)) {
      await db.login.update({
        where: { id: loginId },
        data: {
          status: 'DISCONNECTED',
          lastCheckedAt: new Date(),
          errorMessage: 'Session expired'
        }
      });

      return NextResponse.json({
        status: 'DISCONNECTED',
        needsReconnect: true,
        errorMessage: 'Session expired'
      });
    }

    // If no session data, mark as needs reconnect
    if (!login.sessionData) {
      await db.login.update({
        where: { id: loginId },
        data: {
          status: 'NEEDS_RECONNECT',
          lastCheckedAt: new Date(),
          errorMessage: 'No session data available'
        }
      });

      return NextResponse.json({
        status: 'NEEDS_RECONNECT',
        needsReconnect: true,
        errorMessage: 'No session data available'
      });
    }

    // Validate session using browser
    let browser = null;
    let page = null;

    try {
      browser = await puppeteer.launch({
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

      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Apply stored session data
      const sessionData = SessionManager.decryptSessionData(login.sessionData);
      await SessionManager.applySessionToPage(page, sessionData);

      // Validate session
      const validationResult = await SessionManager.validateSession(page, login.loginUrl);

      // Update login status based on validation result
      const newStatus = validationResult.isValid ? 'ACTIVE' : 
                       validationResult.needsReconnect ? 'NEEDS_RECONNECT' : 'DISCONNECTED';

      await db.login.update({
        where: { id: loginId },
        data: {
          status: newStatus,
          lastCheckedAt: new Date(),
          errorMessage: validationResult.errorMessage || null,
          lastSuccessAt: validationResult.isValid ? new Date() : login.lastSuccessAt,
          lastFailureAt: !validationResult.isValid ? new Date() : login.lastFailureAt,
          failureCount: validationResult.isValid ? 0 : login.failureCount + 1
        }
      });

      return NextResponse.json({
        status: newStatus,
        needsReconnect: validationResult.needsReconnect,
        errorMessage: validationResult.errorMessage,
        lastChecked: new Date().toISOString()
      });

    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }

  } catch (error) {
    console.error('Error checking login session:', error);
    
    // Update login with error status
    try {
      await db.login.update({
        where: { id: loginId },
        data: {
          status: 'DISCONNECTED',
          lastCheckedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Check failed'
        }
      });
    } catch (updateError) {
      console.error('Failed to update login status:', updateError);
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        status: 'DISCONNECTED',
        needsReconnect: true,
        errorMessage: error instanceof Error ? error.message : 'Check failed'
      },
      { status: 500 }
    );
  }
}
