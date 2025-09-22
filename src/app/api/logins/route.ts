// 🚫 BACKEND LOCKED
// Do not edit unless on a backend-scoped branch with explicit approval.
// This file is part of the stable backend API and should not be modified
// during frontend development tasks.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { createLoginSchema } from '@/lib/schemas/agents';
import { encryptLoginCredentials, maskLoginCredentials } from '@/lib/encryption';
// LoginHealthChecker removed - using screen recording approach instead
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/logins - List user's logins (with masked credentials)
 */
export async function GET() {
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

    const logins = await db.login.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Mask sensitive credentials for response
    const maskedLogins = logins.map(login => ({
      ...login,
      ...maskLoginCredentials({
        username: login.username,
        password: login.password,
        oauthToken: login.oauthToken,
      }),
    }));

    return NextResponse.json({ logins: maskedLogins });
  } catch (error) {
    console.error('Error fetching logins:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/logins - Create new login (with encryption)
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

    // Handle both JSON and FormData requests
    let validatedData;
    
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData();
      const name = formData.get('name') as string;
      const loginUrl = formData.get('loginUrl') as string;
      const username = formData.get('username') as string;
      const password = formData.get('password') as string;
      const testOnCreate = formData.get('testOnCreate') === 'true';
      
      console.log('FormData received:', { name, loginUrl, username, testOnCreate });
      
      // Validate required fields
      if (!name || !loginUrl || !username || !password) {
        return NextResponse.json(
          { error: 'Missing required fields: name, loginUrl, username, and password are required' },
          { status: 400 }
        );
      }
      
      validatedData = {
        name,
        loginUrl,
        username,
        password,
        testOnCreate,
        customConfig: null,
        oauthToken: null
      };
    } else {
      // Handle JSON (existing behavior)
      const body = await request.json();
      validatedData = createLoginSchema.parse(body);
    }

    // Encrypt credentials before saving
    const encryptedCredentials = encryptLoginCredentials({
      username: validatedData.username,
      password: validatedData.password || undefined,
      oauthToken: validatedData.oauthToken || undefined,
    });

    console.log('Creating login with data:', { 
      name: validatedData.name, 
      loginUrl: validatedData.loginUrl
    });
    
    const login = await db.login.create({
      data: {
        name: validatedData.name,
        loginUrl: validatedData.loginUrl,
        username: encryptedCredentials.username,
        password: encryptedCredentials.password,
        oauthToken: encryptedCredentials.oauthToken,
        recordingUrl: null,
        ownerId: user.id,
        status: 'NEEDS_TESTING' // Set status to needs testing
      },
    });
    
    console.log('Login created successfully:', login.id);

    // Return masked credentials
    const maskedLogin = {
      ...login,
      ...maskLoginCredentials({
        username: login.username,
        password: login.password,
        oauthToken: login.oauthToken,
      }),
    };

    return NextResponse.json({ 
      login: maskedLogin,
      message: 'Login created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating login:', error);
    
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
