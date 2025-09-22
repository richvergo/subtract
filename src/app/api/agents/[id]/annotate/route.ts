import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { llmService } from '@/lib/llm-service';
import { annotateWorkflowSchema } from '@/lib/schemas/agents';

/**
 * POST /api/agents/[id]/annotate - Annotate an existing agent workflow
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

    // Verify agent ownership
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = annotateWorkflowSchema.parse({
      ...body,
      agentId, // Add agentId from URL params
    });

    // Generate LLM annotations for the workflow steps
    let agentIntents;
    try {
      agentIntents = await llmService.annotateWorkflow(
        validatedData.recordedSteps
      );
    } catch (error) {
      console.error('LLM annotation failed:', error);
      return NextResponse.json(
        { error: 'Failed to generate annotations' },
        { status: 500 }
      );
    }

    // Update the agent with annotations
    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        agentIntents: JSON.stringify(agentIntents),
        purposePrompt: validatedData.purposePrompt,
      },
    });

    return NextResponse.json({
      agentId: updatedAgent.id,
      agentIntents,
      message: 'Workflow annotated successfully'
    });

  } catch (error) {
    console.error('Error annotating workflow:', error);
    
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
