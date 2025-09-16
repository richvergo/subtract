import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema for review request
const reviewAgentSchema = z.object({
  userContext: z.string().min(1, 'User context is required').max(1000, 'User context too long'),
  decision: z.enum(['ACCEPT', 'REJECT']),
});

/**
 * POST /api/agents/[id]/review - Review agent and set status
 */
export async function POST(
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

    // Await params
    const { id: agentId } = await params;

    // Check if agent exists and user owns it
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        llmSummary: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent is in DRAFT status
    if (agent.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Agent must be in DRAFT status to review' },
        { status: 400 }
      );
    }

    // Check if agent has LLM summary
    if (!agent.llmSummary) {
      return NextResponse.json(
        { error: 'Agent must have LLM summary before review' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = reviewAgentSchema.parse(body);

    // Validate that userContext is provided when decision is ACCEPT
    if (validatedData.decision === 'ACCEPT' && !validatedData.userContext.trim()) {
      return NextResponse.json(
        { error: 'User context is required when accepting agent' },
        { status: 400 }
      );
    }

    // Determine new status based on decision
    const newStatus = validatedData.decision === 'ACCEPT' ? 'ACTIVE' : 'REJECTED';

    // Update agent with user context and status
    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        userContext: validatedData.userContext,
        status: newStatus,
        processingStatus: 'ready',
        processingProgress: 100,
      },
    });

    return NextResponse.json({
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        status: updatedAgent.status,
        userContext: updatedAgent.userContext,
        processingStatus: updatedAgent.processingStatus,
        processingProgress: updatedAgent.processingProgress,
      },
      message: `Agent ${validatedData.decision === 'ACCEPT' ? 'accepted' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error reviewing agent:', error);
    
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
 * GET /api/agents/[id]/review - Get agent review data
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

    // Await params
    const { id: agentId } = await params;

    // Check if agent exists and user owns it
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
      select: {
        id: true,
        name: true,
        recordingUrl: true,
        audioUrl: true,
        llmSummary: true,
        userContext: true,
        status: true,
        processingStatus: true,
        processingProgress: true,
        eventLog: true,
        transcript: true,
        events: {
          orderBy: { step: 'asc' },
          select: {
            id: true,
            step: true,
            action: true,
            target: true,
            value: true,
            url: true,
            elementType: true,
            elementText: true,
            screenshotUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        recordingUrl: agent.recordingUrl,
        audioUrl: agent.audioUrl,
        llmSummary: agent.llmSummary,
        userContext: agent.userContext,
        status: agent.status,
        processingStatus: agent.processingStatus,
        processingProgress: agent.processingProgress,
        eventLog: agent.eventLog,
        transcript: agent.transcript,
        events: agent.events,
      },
    });
  } catch (error) {
    console.error('Error fetching agent review data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
