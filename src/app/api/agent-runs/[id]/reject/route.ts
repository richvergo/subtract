/**
 * POST /api/agent-runs/[id]/reject
 * Rejects an agent run and stores user feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rejectAgentRunSchema } from '@/lib/schemas/agents';
import { RunStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const runId = params.id;
    const body = await request.json();
    const { feedback } = rejectAgentRunSchema.parse(body);

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

    // Check RBAC - only the agent owner can reject runs
    if (agentRun.agent.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the agent run to rejected with feedback
    const updatedRun = await db.agentRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.REJECTED,
        userConfirmed: false,
        userFeedback: feedback,
        confirmedAt: new Date(),
        confirmedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Agent run rejected successfully',
      data: {
        run: updatedRun,
      },
    });

  } catch (error) {
    console.error('Error rejecting agent run:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
