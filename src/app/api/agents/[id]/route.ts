import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { updateAgentSchema, type UpdateAgentInput } from '@/lib/schemas/agents';

/**
 * GET /api/agents/[id] - Fetch agent details + latest runs
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

    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id, // Ensure user owns this agent
      },
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
        agentRuns: {
          orderBy: { startedAt: 'desc' },
          take: 10, // Latest 10 runs
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Transform the response
    const transformedAgent = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      purposePrompt: agent.purposePrompt,
      status: agent.status,
      processingStatus: agent.processingStatus,
      processingProgress: agent.processingProgress,
      agentConfig: agent.agentConfig ? JSON.parse(agent.agentConfig) : null,
      agentIntents: agent.agentIntents ? JSON.parse(agent.agentIntents) : null,
      recordingPath: agent.recordingPath,
      ownerId: agent.ownerId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      logins: agent.agentLogins.map(al => ({
        id: al.login.id,
        name: al.login.name,
        loginUrl: al.login.loginUrl,
      })),
      latestRuns: agent.agentRuns,
    };

    return NextResponse.json({ agent: transformedAgent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id] - Update agent
 */
export async function PUT(
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
    const existingAgent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateAgentSchema.parse(body);

    // If loginIds are being updated, verify they belong to the user
    if (validatedData.loginIds) {
      const userLogins = await db.login.findMany({
        where: {
          id: { in: validatedData.loginIds },
          ownerId: user.id,
        },
        select: { id: true },
      });

      if (userLogins.length !== validatedData.loginIds.length) {
        return NextResponse.json(
          { error: 'One or more logins not found or not owned by user' },
          { status: 400 }
        );
      }
    }

    // Update agent and login associations in a transaction
    const result = await db.$transaction(async (tx) => {
      // Prepare update data (exclude loginIds and handle agentConfig)
      const { loginIds, agentConfig, ...updateData } = validatedData;
      
      // Convert agentConfig to agentConfig if provided
      if (agentConfig) {
        updateData.agentConfig = JSON.stringify(agentConfig);
      }
      
      // Convert agentIntents to agentIntents if provided
      if (validatedData.agentIntents) {
        updateData.agentIntents = JSON.stringify(validatedData.agentIntents);
      }
      
      // Handle purposePrompt if provided
      if (validatedData.purposePrompt !== undefined) {
        updateData.purposePrompt = validatedData.purposePrompt;
      }

      // Update the agent
      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: updateData,
      });

      // Update login associations if provided
      if (loginIds) {
        // Remove existing associations
        await tx.agentLogin.deleteMany({
          where: { agentId: agentId },
        });

        // Create new associations
        await tx.agentLogin.createMany({
          data: loginIds.map(loginId => ({
            agentId: agentId,
            loginId,
          })),
        });
      }

      return updatedAgent;
    });

    // Fetch the updated agent with relations
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
        agentRuns: {
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
    });

    if (!agent) {
      throw new Error('Failed to fetch updated agent');
    }

    // Transform the response
    const transformedAgent = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      purposePrompt: agent.purposePrompt,
      status: agent.status,
      processingStatus: agent.processingStatus,
      processingProgress: agent.processingProgress,
      agentConfig: agent.agentConfig ? JSON.parse(agent.agentConfig) : null,
      agentIntents: agent.agentIntents ? JSON.parse(agent.agentIntents) : null,
      recordingPath: agent.recordingPath,
      ownerId: agent.ownerId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      logins: agent.agentLogins.map(al => ({
        id: al.login.id,
        name: al.login.name,
        loginUrl: al.login.loginUrl,
      })),
      latestRuns: agent.agentRuns,
    };

    return NextResponse.json({ agent: transformedAgent });
  } catch (error) {
    console.error('Error updating agent:', error);
    
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
 * DELETE /api/agents/[id] - Delete agent
 */
export async function DELETE(
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
    const existingAgent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Delete agent (cascade will handle related records)
    await db.agent.delete({
      where: { id: agentId },
    });

    return NextResponse.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}