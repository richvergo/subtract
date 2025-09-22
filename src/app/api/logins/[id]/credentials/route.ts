import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { decryptLoginCredentials } from '@/lib/encryption';

/**
 * GET /api/logins/:id/credentials - Get unmasked credentials for editing
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
    });

    if (!login) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    // Decrypt the username for editing (but not password for security)
    const decryptedCredentials = decryptLoginCredentials({
      username: login.username,
      password: login.password,
      oauthToken: login.oauthToken
    });

    // Return only the username for editing (password should be empty for security)
    return NextResponse.json({
      username: decryptedCredentials.username,
      // Don't return password for security reasons
    });

  } catch (error) {
    console.error('Error getting login credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
