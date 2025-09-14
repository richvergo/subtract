import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { updateLoginSchema, type UpdateLoginInput } from '@/lib/schemas/agents';
import { encryptLoginCredentials, maskLoginCredentials } from '@/lib/encryption';

/**
 * GET /api/logins/[id] - Get specific login (with masked credentials)
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

    const login = await db.login.findFirst({
      where: {
        id: params.id,
        ownerId: user.id, // Ensure user owns this login
      },
    });

    if (!login) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    // Return masked credentials
    const maskedLogin = {
      ...login,
      ...maskLoginCredentials({
        username: login.username,
        password: login.password,
        oauthToken: login.oauthToken,
      }),
    };

    return NextResponse.json({ login: maskedLogin });
  } catch (error) {
    console.error('Error fetching login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/logins/[id] - Update login credentials
 */
export async function PUT(
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

    // Check if login exists and user owns it
    const existingLogin = await db.login.findFirst({
      where: {
        id: params.id,
        ownerId: user.id,
      },
    });

    if (!existingLogin) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateLoginSchema.parse(body);

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    
    if (validatedData.loginUrl !== undefined) {
      updateData.loginUrl = validatedData.loginUrl;
    }
    
    if (validatedData.username !== undefined) {
      updateData.username = encryptLoginCredentials({ username: validatedData.username }).username;
    }
    
    if (validatedData.password !== undefined) {
      updateData.password = validatedData.password 
        ? encryptLoginCredentials({ password: validatedData.password }).password
        : null;
    }
    
    if (validatedData.oauthToken !== undefined) {
      updateData.oauthToken = validatedData.oauthToken
        ? encryptLoginCredentials({ oauthToken: validatedData.oauthToken }).oauthToken
        : null;
    }

    const updatedLogin = await db.login.update({
      where: { id: params.id },
      data: updateData,
    });

    // Return masked credentials
    const maskedLogin = {
      ...updatedLogin,
      ...maskLoginCredentials({
        username: updatedLogin.username,
        password: updatedLogin.password,
        oauthToken: updatedLogin.oauthToken,
      }),
    };

    return NextResponse.json({ login: maskedLogin });
  } catch (error) {
    console.error('Error updating login:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/logins/[id] - Remove login
 */
export async function DELETE(
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

    // Check if login exists and user owns it
    const existingLogin = await db.login.findFirst({
      where: {
        id: params.id,
        ownerId: user.id,
      },
    });

    if (!existingLogin) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    // Check if login is being used by any agents
    const agentCount = await db.agentLogin.count({
      where: { loginId: params.id },
    });

    if (agentCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete login that is being used by agents' },
        { status: 400 }
      );
    }

    await db.login.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Login deleted successfully' });
  } catch (error) {
    console.error('Error deleting login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
