import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { llmService } from '@/lib/llm-service';
import { recordWorkflowSchema, recordWorkflowWithEventsSchema, type RecordWorkflowInput, type RecordWorkflowWithEventsInput, type AgentIntent } from '@/lib/schemas/agents';
import { getUserEmailForQuery } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { processInlineScreenshots } from '@/lib/screenshot-storage';

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

    // Parse multipart form data
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const purposePrompt = formData.get('purposePrompt') as string;
    const file = formData.get('file') as File;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name is required' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file
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

    // Ensure uploads directory exists
    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.type === 'video/webm' ? 'webm' : 'mp4';
    const filename = `agent_${timestamp}.${fileExtension}`;
    const filePath = join(UPLOADS_DIR, filename);

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

    // Create agent with recording URL
    const result = await db.$transaction(async (tx) => {
      // Create the agent
      const agent = await tx.agent.create({
        data: {
          name: name.trim(),
          description: `Agent created with screen recording (${Math.round(file.size / 1024)}KB)`,
          purposePrompt: purposePrompt?.trim() || "Workflow will be defined after recording analysis",
          agentConfig: JSON.stringify([]), // Empty config for now
          agentIntents: JSON.stringify([]), // Empty intents for now
          recordingUrl: `/uploads/agents/${filename}`,
          ownerId: user.id,
        },
      });

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

  } catch (error: any) {
    console.error('[agents/record] Error', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
