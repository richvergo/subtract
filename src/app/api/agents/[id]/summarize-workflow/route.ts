import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { llmService } from '@/lib/llm-service';
import { getUserEmailForQuery } from '@/lib/auth';

/**
 * POST /api/agents/[id]/summarize-workflow - Generate clean workflow summary
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
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (!agent.agentConfig) {
      return NextResponse.json(
        { error: 'No recorded workflow available' },
        { status: 400 }
      );
    }

    console.log(`🧠 Summarizing workflow for agent: ${agent.name}`);

    try {
      // Parse the recorded steps
      const recordedSteps = JSON.parse(agent.agentConfig);
      
      // Generate clean summary using LLM
      const summary = await llmService.summarizeWorkflow(
        recordedSteps,
        agent.transcript ? [agent.transcript] : []
      );

      // Update agent with summary
      await db.agent.update({
        where: { id: agent.id },
        data: {
          llmSummary: summary,
          processingStatus: 'ready',
        },
      });

      console.log(`✅ Workflow summary complete for: ${agent.name}`);

      return NextResponse.json({
        success: true,
        summary: summary,
        message: 'Workflow summarized successfully'
      });

    } catch (summaryError) {
      console.error('Workflow summary failed:', summaryError);
      
      return NextResponse.json(
        { 
          error: 'Failed to summarize workflow',
          details: summaryError instanceof Error ? summaryError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in workflow summarization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
