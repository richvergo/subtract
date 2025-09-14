import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { LoginHealthChecker } from '@/lib/login-health-checker';

/**
 * POST /api/logins/health - Check health of all user's logins
 */
export async function POST(request: NextRequest) {
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

    // Get all user's logins
    const logins = await db.login.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true }
    });

    if (logins.length === 0) {
      return NextResponse.json({ 
        message: 'No logins found',
        results: [] 
      });
    }

    // Perform health checks
    const healthChecker = new LoginHealthChecker();
    const results = await healthChecker.checkAllLogins();
    await healthChecker.close();

    return NextResponse.json({ 
      message: `Health check completed for ${logins.length} logins`,
      results 
    });
  } catch (error) {
    console.error('Error checking all login health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/logins/health - Get health status of all user's logins
 */
export async function GET(request: NextRequest) {
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

    // Get all user's logins with health status
    const logins = await db.login.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        name: true,
        status: true,
        lastCheckedAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        failureCount: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { lastCheckedAt: 'desc' }
    });

    return NextResponse.json({ logins });
  } catch (error) {
    console.error('Error getting all login health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
