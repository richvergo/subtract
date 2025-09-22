import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { SessionManager } from '@/lib/session-manager';

/**
 * GET /api/logins/:id/status - Get login status information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: loginId } = await params;
    const login = await db.login.findFirst({
      where: { 
        id: loginId,
        ownerId: user.id 
      },
      select: {
        id: true,
        name: true,
        status: true,
        sessionExpiry: true,
        lastCheckedAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        failureCount: true,
        errorMessage: true,
        analysisStatus: true,
        analysisResult: true,
        recordingUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!login) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    // Check if session is expired
    const isExpired = SessionManager.isSessionExpired(login.sessionExpiry);
    const effectiveStatus = isExpired && login.status === 'ACTIVE' ? 'DISCONNECTED' : login.status;

    return NextResponse.json({
      id: login.id,
      name: login.name,
      status: effectiveStatus,
      sessionExpiry: login.sessionExpiry?.toISOString(),
      lastCheckedAt: login.lastCheckedAt?.toISOString(),
      lastSuccessAt: login.lastSuccessAt?.toISOString(),
      lastFailureAt: login.lastFailureAt?.toISOString(),
      failureCount: login.failureCount,
      errorMessage: login.errorMessage,
      analysisStatus: login.analysisStatus,
      analysisResult: login.analysisResult,
      recordingUrl: login.recordingUrl,
      createdAt: login.createdAt.toISOString(),
      updatedAt: login.updatedAt.toISOString(),
      isExpired,
      needsReconnect: effectiveStatus === 'NEEDS_RECONNECT' || effectiveStatus === 'DISCONNECTED'
    });

  } catch (error) {
    console.error('Error getting login status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
