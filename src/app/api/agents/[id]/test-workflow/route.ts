import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { AgentExecutor } from '@/lib/agent-executor';
import { getUserEmailForQuery } from '@/lib/auth';

/**
 * POST /api/agents/[id]/test-workflow - Test the agent workflow by running it
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    
    // Get the agent
    const agent = await db.agent.findFirst({
      where: { 
        id: id,
        ownerId: user.id 
      },
      include: {
        agentLogins: {
          include: {
            login: true
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (!agent.agentConfig) {
      return NextResponse.json(
        { error: 'No workflow configuration available' },
        { status: 400 }
      );
    }

    if (agent.agentLogins.length === 0) {
      return NextResponse.json(
        { error: 'No login configured for this agent' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing workflow for agent: ${agent.name}`);

    try {
      // Parse the agent configuration
      const agentConfig = JSON.parse(agent.agentConfig);
      
      // Get the associated login
      const login = agent.agentLogins[0].login;
      
      // Create execution context
      const context = {
        agentId: agent.id,
        runId: 'test-run-' + Date.now(),
        agentConfig: agentConfig,
        agentIntents: [],
        logins: [{
          id: login.id,
          name: login.name,
          loginUrl: login.loginUrl,
          username: login.username,
          password: login.password || undefined
        }]
      };
      
      // Create executor instance
      const executor = new AgentExecutor(context);
      
      // Execute the workflow
      const result = await executor.execute();

      console.log(`✅ Workflow test complete for: ${agent.name}`);

      return NextResponse.json({
        success: true,
        result: result,
        message: 'Workflow test completed successfully'
      });

    } catch (testError) {
      console.error('Workflow test failed:', testError);
      
      return NextResponse.json(
        { 
          error: 'Failed to test workflow',
          details: testError instanceof Error ? testError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in workflow testing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
