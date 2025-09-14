import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { createLoginSchema, type CreateLoginInput } from '@/lib/schemas/agents';
import { encryptLoginCredentials, maskLoginCredentials } from '@/lib/encryption';
import { LoginHealthChecker } from '@/lib/login-health-checker';

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

    const body = await request.json();
    const validatedData = createLoginSchema.parse(body);

    // Encrypt credentials before saving
    const encryptedCredentials = encryptLoginCredentials({
      username: validatedData.username,
      password: validatedData.password,
      oauthToken: validatedData.oauthToken,
    });

    const login = await db.login.create({
      data: {
        name: validatedData.name,
        loginUrl: validatedData.loginUrl,
        username: encryptedCredentials.username,
        password: encryptedCredentials.password,
        oauthToken: encryptedCredentials.oauthToken,
        templateId: validatedData.templateId,
        customConfig: validatedData.customConfig ? JSON.stringify(validatedData.customConfig) : null,
        ownerId: user.id,
      },
    });

    // Test login immediately if requested
    let testResult = null;
    if (validatedData.testOnCreate) {
      try {
        console.log(`🧪 Testing login immediately for: ${login.name}`);
        const healthChecker = new LoginHealthChecker();
        testResult = await healthChecker.checkLoginHealth(login.id);
        await healthChecker.close();
        
        // Update login with test results
        await db.login.update({
          where: { id: login.id },
          data: {
            status: testResult.status,
            lastCheckedAt: testResult.lastChecked,
            lastSuccessAt: testResult.success ? testResult.lastChecked : null,
            lastFailureAt: testResult.success ? null : testResult.lastChecked,
            failureCount: testResult.success ? 0 : 1,
            errorMessage: testResult.errorMessage,
          },
        });
      } catch (error) {
        console.error('Failed to test login immediately:', error);
        testResult = {
          success: false,
          status: 'BROKEN' as const,
          errorMessage: error instanceof Error ? error.message : 'Test failed',
          responseTime: 0,
          lastChecked: new Date(),
        };
      }
    }

    // Return masked credentials with test result
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
      testResult: testResult ? {
        success: testResult.success,
        status: testResult.status,
        errorMessage: testResult.errorMessage,
        responseTime: testResult.responseTime,
        lastChecked: testResult.lastChecked,
      } : null
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
