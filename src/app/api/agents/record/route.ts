import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { llmService } from '@/lib/llm-service';
import { recordWorkflowSchema, type RecordWorkflowInput, type AgentIntent } from '@/lib/schemas/agents';
import { getUserEmailForQuery } from '@/lib/auth';

/**
 * POST /api/agents/record - Record and annotate a workflow
 * Updated to use camelCase field names
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

    const body = await request.json();
    const validatedData = recordWorkflowSchema.parse(body);

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

    // Generate LLM annotations for the recorded steps
    let agentIntents: AgentIntent[] = [];
    try {
      agentIntents = await llmService.annotateWorkflow(
        validatedData.recordedSteps,
        validatedData.purposePrompt,
        validatedData.description
      );
    } catch (error) {
      console.error('LLM annotation failed:', error);
      // Continue without annotations if LLM fails
      agentIntents = [];
    }

    // Create agent with both config and intents
    const result = await db.$transaction(async (tx) => {
      // Create the agent
      const agent = await tx.agent.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          agentConfig: JSON.stringify(validatedData.recordedSteps),
          purposePrompt: validatedData.purposePrompt,
          agentIntents: JSON.stringify(agentIntents),
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
      ownerId: agent.ownerId,
      agentConfig: agent.agentConfig ? JSON.parse(agent.agentConfig) : [],
      purposePrompt: agent.purposePrompt,
      agentIntents: agent.agentIntents ? JSON.parse(agent.agentIntents) : [],
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
      message: 'Workflow recorded and annotated successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('[agents/record] DB error', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
    });
    
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
