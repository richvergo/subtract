import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { getUserEmailForQuery } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Configuration constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = ['video/webm', 'video/mp4'];
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'agents');

/**
 * POST /api/agents/record - Record and annotate a workflow with file upload
 * Accepts multipart FormData with fields: name, purposePrompt, and file (video blob)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const userEmail = getUserEmailForQuery(session);
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Handle both JSON and FormData requests
    let name: string;
    let purposePrompt: string;
    let loginId: string;
    let file: File | null = null;
    let recordedSteps: unknown[] = [];
    let capturedActions: unknown[] = [];
    let captureSession: unknown = null;
    
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with recording file)
      const formData = await request.formData();
      name = formData.get('name') as string;
      purposePrompt = formData.get('purposePrompt') as string;
      loginId = formData.get('loginId') as string;
      file = formData.get('file') as File;
      
      // Parse captured actions if provided
      const capturedActionsStr = formData.get('capturedActions') as string;
      if (capturedActionsStr) {
        try {
          capturedActions = JSON.parse(capturedActionsStr);
        } catch (error) {
          console.warn('Failed to parse captured actions:', error);
        }
      }
      
      // Parse capture session if provided
      const captureSessionStr = formData.get('captureSession') as string;
      if (captureSessionStr) {
        try {
          captureSession = JSON.parse(captureSessionStr);
        } catch (error) {
          console.warn('Failed to parse capture session:', error);
        }
      }
    } else {
      // Handle JSON (for tests)
      const body = await request.json();
      name = body.name;
      purposePrompt = body.purposePrompt;
      loginId = body.loginIds?.[0] || body.loginId;
      recordedSteps = body.recordedSteps || [];
      capturedActions = body.capturedActions || [];
      captureSession = body.captureSession || null;
    }

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name is required' },
        { status: 400 }
      );
    }

    // Only require file in multipart mode
    if (contentType?.includes('multipart/form-data') && !file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file (only if provided)
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Ensure uploads directory exists
    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }

    // Handle file saving (only if file provided)
    let filePath: string | null = null;
    if (file) {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.type === 'video/webm' ? 'webm' : 'mp4';
      const filename = `agent_${timestamp}.${fileExtension}`;
      filePath = join(UPLOADS_DIR, filename);

      // Save file to disk
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);
      } catch (error) {
        console.error('Failed to save file:', error);
        return NextResponse.json(
          { error: 'Failed to save uploaded file' },
          { status: 500 }
        );
      }
    }

    // Create agent with recording URL and login association
    const result = await db.$transaction(async (tx) => {
      // Create the agent
      const agent = await tx.agent.create({
        data: {
          name: name.trim(),
          description: file 
            ? `Agent created with screen recording (${Math.round(file.size / 1024)}KB) and ${capturedActions.length} captured actions`
            : `Agent created with recorded steps (${recordedSteps.length} steps)`,
          purposePrompt: purposePrompt?.trim() || "Workflow will be defined after recording analysis",
          agentConfig: JSON.stringify({
            recordedSteps: recordedSteps.length > 0 ? recordedSteps : [],
            capturedActions: capturedActions,
            captureSession: captureSession,
            hasVideoRecording: !!file,
            hasActionCapture: capturedActions.length > 0
          }),
          agentIntents: JSON.stringify([]), // Empty intents for now
          recordingUrl: filePath ? `/uploads/agents/${filePath.split('/').pop()}` : null,
          ownerId: user.id,
        },
      });

      // Associate with login if provided
      if (loginId) {
        await tx.agentLogin.create({
          data: {
            agentId: agent.id,
            loginId: loginId,
          },
        });
      }

      return agent;
    });

    // Fetch the created agent with relations
    const agent = await db.agent.findUnique({
      where: { id: result.id },
      include: {
        agentLogins: {
          include: {
            login: {
              select: {
                id: true,
                name: true,
                loginUrl: true,
              },
            },
          },
        },
      },
    });

    if (!agent) {
      throw new Error('Failed to fetch created agent');
    }

    // Transform the response
    const transformedAgent = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      ownerId: agent.ownerId,
      agentConfig: agent.agentConfig ? JSON.parse(agent.agentConfig) : [],
      purposePrompt: agent.purposePrompt,
      agentIntents: agent.agentIntents ? JSON.parse(agent.agentIntents) : [],
      recordingUrl: agent.recordingUrl,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      logins: agent.agentLogins.map((al) => ({
        id: al.login.id,
        name: al.login.name,
        loginUrl: al.login.loginUrl,
      })),
    };

    return NextResponse.json({ 
      agent: transformedAgent,
      message: 'Agent created with recording successfully'
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('[agents/record] Error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
