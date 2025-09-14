/**
 * POST /api/agents/[id]/activate
 * Activates an agent (changes status from DRAFT to ACTIVE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AgentStatus } from '@prisma/client';
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

    const agentId = params.id;

    // Find the agent and verify ownership
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: session.user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if agent has at least one confirmed run
    const confirmedRun = await db.agentRun.findFirst({
      where: {
        agentId: agent.id,
        status: 'CONFIRMED',
      },
    });

    if (!confirmedRun) {
      return NextResponse.json(
        { error: 'Agent must have at least one confirmed run before activation' },
        { status: 400 }
      );
    }

    // Update the agent status to ACTIVE
    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        status: AgentStatus.ACTIVE,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Agent activated successfully',
      data: {
        agent: updatedAgent,
      },
    });

  } catch (error) {
    console.error('Error activating agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
