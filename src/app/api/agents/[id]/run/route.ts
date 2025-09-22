import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { RunStatus } from '@prisma/client';
import { enqueueAgentRun } from '@/lib/queue';

/**
 * POST /api/agents/[id]/run - Enqueue manual run (async)
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
      include: {
        agentLogins: {
          include: {
            login: true,
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

    // Get request body for prompt (for live agents)
    const body = await request.json().catch(() => ({}));
    const { prompt } = body;

    // Create a new agent run record
    const agentRun = await db.agentRun.create({
      data: {
        agentId: agent.id,
        status: RunStatus.PENDING,
        prompt: prompt || null,
      },
    });

    // Enqueue the job to Redis queue
    try {
      const job = await enqueueAgentRun(agent.id);

      console.log(`[API] Enqueued agent run: ${agentRun.id} for agent: ${agent.id}`);

      return NextResponse.json({
        message: 'Agent run enqueued successfully',
        runId: agentRun.id,
        status: 'enqueued',
        jobId: job.id,
      }, { status: 202 });
    } catch (error) {
      console.error('Failed to enqueue agent run:', error);
      
      // Update the run status to failed if we can't enqueue
      await db.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: RunStatus.FAILED,
          finishedAt: new Date(),
          logs: JSON.stringify({
            error: 'Failed to enqueue job',
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json(
        { error: 'Failed to enqueue agent run' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error enqueuing agent run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
