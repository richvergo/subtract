/**
 * POST /api/agent-runs/[id]/confirm
 * Confirms an agent run and optionally activates the agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { confirmAgentRunSchema } from '@/lib/schemas/agents';
import { AgentStatus, RunStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: runId } = await params;
    const body = await request.json();
    const { activateAgent } = confirmAgentRunSchema.parse(body);

    // Find the agent run and verify ownership
    const agentRun = await db.agentRun.findUnique({
      where: { id: runId },
      include: {
        agent: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!agentRun) {
      return NextResponse.json({ error: 'Agent run not found' }, { status: 404 });
    }

    // Check RBAC - only the agent owner can confirm runs
    if (agentRun.agent.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the agent run to confirmed
    const updatedRun = await db.agentRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.CONFIRMED,
        userConfirmed: true,
        userFeedback: null, // Clear any previous feedback
        confirmedAt: new Date(),
        confirmedBy: session.user.id,
      },
    });

    let agentUpdate = null;
    
    // Optionally activate the agent
    if (activateAgent) {
      agentUpdate = await db.agent.update({
        where: { id: agentRun.agentId },
        data: {
          status: AgentStatus.ACTIVE,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Agent run confirmed successfully',
      data: {
        run: updatedRun,
        agent: agentUpdate,
      },
    });

  } catch (error) {
    console.error('Error confirming agent run:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
