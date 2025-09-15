// 🚫 BACKEND LOCKED
// Do not edit unless on a backend-scoped branch with explicit approval.
// This file is part of the stable backend API and should not be modified
// during frontend development tasks.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { createAgentSchema, type CreateAgentInput } from '@/lib/schemas/agents';

/**
 * GET /api/agents - List agents for current user
 */
export async function GET() {
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

    const agents = await db.agent.findMany({
      where: { ownerId: user.id },
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
          take: 5, // Latest 5 runs
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform the response to match the expected format
    const transformedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      status: agent.status,
      processingStatus: agent.processingStatus,
      processingProgress: agent.processingProgress,
      agentConfig: agent.agentConfig ? JSON.parse(agent.agentConfig) : null,
      purposePrompt: agent.purposePrompt,
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
    }));

    return NextResponse.json({ agents: transformedAgents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents - Create new agent
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

    const body = await request.json();
    const validatedData = createAgentSchema.parse(body);

    // Verify that all login IDs belong to the user
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

    // Create agent with associated logins in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the agent
      const agent = await tx.agent.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          agentConfig: JSON.stringify(validatedData.agentConfig),
          purposePrompt: validatedData.purposePrompt,
          agentIntents: validatedData.agentIntents ? JSON.stringify(validatedData.agentIntents) : null,
          ownerId: user.id,
        },
      });

      // Create agent-login associations
      await tx.agentLogin.createMany({
        data: validatedData.loginIds.map(loginId => ({
          agentId: agent.id,
          loginId,
        })),
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
      status: agent.status,
      processingStatus: agent.processingStatus,
      processingProgress: agent.processingProgress,
      agentConfig: agent.agentConfig ? JSON.parse(agent.agentConfig) : null,
      purposePrompt: agent.purposePrompt,
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
    };

    return NextResponse.json({ agent: transformedAgent }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    
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
