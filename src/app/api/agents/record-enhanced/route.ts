import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { enhancedLLMService } from '@/lib/enhanced-llm-service';
import { RecordedAction } from '@/lib/enhanced-recorder';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'agents');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = ['video/webm', 'video/mp4'];

/**
 * POST /api/agents/record-enhanced - Create agent with enhanced recording data
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

    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const purposePrompt = formData.get('purposePrompt') as string;
    const file = formData.get('file') as File;
    const loginId = formData.get('loginId') as string;
    const actionsData = formData.get('actions') as string; // JSON string of actions

    console.log('🎬 Enhanced recording data received:', {
      name,
      hasFile: !!file,
      fileSize: file?.size,
      hasActions: !!actionsData,
      loginId
    });

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Agent name is required' },
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

    // Parse actions data
    let recordedActions: RecordedAction[] = [];
    let sessionData: any = null;
    
    if (actionsData) {
      try {
        const parsedData = JSON.parse(actionsData);
        recordedActions = parsedData.actions || [];
        sessionData = parsedData.session || null;
        console.log(`📊 Parsed ${recordedActions.length} recorded actions`);
      } catch (error) {
        console.error('Failed to parse actions data:', error);
        return NextResponse.json(
          { error: 'Invalid actions data format' },
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
        console.log(`💾 Recording saved: ${filePath}`);
      } catch (error) {
        console.error('Failed to save file:', error);
        return NextResponse.json(
          { error: 'Failed to save uploaded file' },
          { status: 500 }
        );
      }
    }

    // Perform enhanced AI analysis on the recorded actions
    let workflowAnalysis = null;
    if (recordedActions.length > 0 && sessionData) {
      try {
        console.log('🧠 Starting enhanced AI analysis...');
        workflowAnalysis = await enhancedLLMService.analyzeRecordingSession({
          id: sessionData.id,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          url: sessionData.url,
          actions: recordedActions,
          metadata: sessionData.metadata
        });
        
        console.log('✅ Enhanced analysis complete:', {
          summary: workflowAnalysis.summary.substring(0, 100) + '...',
          parameterizableActions: workflowAnalysis.parameterizableActions.length,
          patterns: workflowAnalysis.workflowPatterns.length
        });
      } catch (error) {
        console.error('Enhanced analysis failed:', error);
        // Continue without analysis rather than failing the entire request
        workflowAnalysis = null;
      }
    }

    // Create agent with enhanced data
    const result = await db.$transaction(async (tx) => {
      const agent = await tx.agent.create({
        data: {
          name: name.trim(),
          description: file
            ? `Agent created with enhanced recording (${Math.round(file.size / 1024)}KB video, ${recordedActions.length} actions)`
            : `Agent created with recorded steps (${recordedActions.length} steps)`,
          purposePrompt: purposePrompt?.trim() || "Workflow will be defined after enhanced analysis",
          
          // Store enhanced data
          agentConfig: JSON.stringify(recordedActions), // Store raw actions
          agentIntents: JSON.stringify(workflowAnalysis?.actionAnalyses || []), // Store AI analysis
          
          // Store additional metadata
          recordingUrl: filePath ? `/uploads/agents/${filePath.split('/').pop()}` : null,
          transcript: workflowAnalysis ? JSON.stringify({
            summary: workflowAnalysis.summary,
            patterns: workflowAnalysis.workflowPatterns,
            parameterizableActions: workflowAnalysis.parameterizableActions,
            recommendations: workflowAnalysis.recommendations
          }) : null,
          
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
      agentIntents: agent.agentIntents ? JSON.parse(agent.agentIntents) : [],
      purposePrompt: agent.purposePrompt,
      recordingUrl: agent.recordingUrl,
      transcript: agent.transcript,
      logins: agent.agentLogins.map(al => ({
        id: al.login.id,
        name: al.login.name,
        loginUrl: al.login.loginUrl,
      })),
    };

    console.log(`✅ Enhanced agent created: ${agent.name} (${agent.id})`);

    return NextResponse.json({
      success: true,
      agent: transformedAgent,
      analysis: workflowAnalysis ? {
        summary: workflowAnalysis.summary,
        parameterizableActions: workflowAnalysis.parameterizableActions.length,
        patterns: workflowAnalysis.workflowPatterns.length,
        recommendations: workflowAnalysis.recommendations
      } : null,
      message: `Agent "${agent.name}" created successfully with enhanced recording analysis`
    });

  } catch (error) {
    console.error('Enhanced agent creation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create enhanced agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
