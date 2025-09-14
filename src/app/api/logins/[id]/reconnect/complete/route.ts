import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { SessionManager } from '@/lib/session-manager';

/**
 * POST /api/logins/:id/reconnect/complete - Complete reconnection and capture session
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

    const body = await request.json();
    const { sessionData, currentUrl, pageTitle } = body;

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session data is required' },
        { status: 400 }
      );
    }

    // Validate that we're not on a login page
    const isOnLoginPage = currentUrl.includes('login') || 
                         currentUrl.includes('signin') || 
                         currentUrl.includes('auth') ||
                         pageTitle.toLowerCase().includes('sign in') ||
                         pageTitle.toLowerCase().includes('log in');

    if (isOnLoginPage) {
      return NextResponse.json(
        { 
          error: 'Still on login page',
          message: 'Please complete the login process and navigate to the main application before completing reconnection.'
        },
        { status: 400 }
      );
    }

    // Encrypt and store session data
    const encryptedSessionData = SessionManager.encryptSessionData(sessionData);
    const sessionExpiry = SessionManager.calculateSessionExpiry(sessionData);

    // Update login with new session data
    await db.login.update({
      where: { id: loginId },
      data: {
        sessionData: encryptedSessionData,
        sessionExpiry: sessionExpiry,
        status: 'ACTIVE',
        lastCheckedAt: new Date(),
        lastSuccessAt: new Date(),
        lastFailureAt: null,
        failureCount: 0,
        errorMessage: null
      }
    });

    return NextResponse.json({
      success: true,
      status: 'ACTIVE',
      sessionExpiry: sessionExpiry?.toISOString(),
      message: 'Reconnection completed successfully'
    });

  } catch (error) {
    console.error('Error completing reconnection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
