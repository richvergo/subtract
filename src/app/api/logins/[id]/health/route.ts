import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { LoginHealthChecker } from '@/lib/login-health-checker';

/**
 * POST /api/logins/[id]/health - Check health of a specific login
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

    // Verify the login belongs to the user
    const login = await db.login.findFirst({
      where: { 
        id: params.id,
        ownerId: user.id 
      }
    });

    if (!login) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    // Perform health check
    const healthChecker = new LoginHealthChecker();
    const result = await healthChecker.checkLoginHealth(params.id);
    await healthChecker.close();

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error checking login health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/logins/[id]/health - Get current health status of a login
 */
export async function GET(
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

    // Get login with health status
    const login = await db.login.findFirst({
      where: { 
        id: params.id,
        ownerId: user.id 
      },
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
      }
    });

    if (!login) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ login });
  } catch (error) {
    console.error('Error getting login health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
