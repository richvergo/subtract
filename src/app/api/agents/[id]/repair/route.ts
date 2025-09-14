import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { llmService } from '@/lib/llm-service';
import { repairSelectorSchema, type RepairSelectorInput } from '@/lib/schemas/agents';

/**
 * POST /api/agents/[id]/repair - Repair a failed selector using LLM
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
    const validatedData = repairSelectorSchema.parse(body);

    // Parse agent config and intents
    const agentConfig = JSON.parse(agent.agentConfig);
    const agentIntents = agent.agentIntents ? JSON.parse(agent.agentIntents) : [];

    // Get the step that failed
    const failedStep = agentConfig[validatedData.stepIndex];
    if (!failedStep) {
      return NextResponse.json(
        { error: 'Invalid step index' },
        { status: 400 }
      );
    }

    // Get the intent for this step
    const stepIntent = agentIntents.find((intent: any) => intent.stepIndex === validatedData.stepIndex);
    if (!stepIntent) {
      return NextResponse.json(
        { error: 'No intent found for this step' },
        { status: 400 }
      );
    }

    // Use LLM to repair the selector
    let repairResult;
    try {
      repairResult = await llmService.repairSelector(
        validatedData.failedSelector,
        validatedData.intent,
        validatedData.domSnapshot,
        failedStep.action
      );
    } catch (error) {
      console.error('LLM repair failed:', error);
      return NextResponse.json(
        { error: 'Failed to repair selector' },
        { status: 500 }
      );
    }

    // Update the agent config with the new selector
    const updatedConfig = [...agentConfig];
    if ('selector' in updatedConfig[validatedData.stepIndex]) {
      updatedConfig[validatedData.stepIndex] = {
        ...updatedConfig[validatedData.stepIndex],
        selector: repairResult.selector,
      };
    }

    // Update the agent with the repaired config
    await db.agent.update({
      where: { id: agentId },
      data: {
        agentConfig: JSON.stringify(updatedConfig),
      },
    });

    // Log the repair attempt
    console.log(`Selector repaired for agent ${agentId}, step ${validatedData.stepIndex}:`, {
      oldSelector: validatedData.failedSelector,
      newSelector: repairResult.selector,
      confidence: repairResult.confidence,
      reasoning: repairResult.reasoning,
    });

    return NextResponse.json({
      success: true,
      repairedSelector: repairResult.selector,
      confidence: repairResult.confidence,
      reasoning: repairResult.reasoning,
      message: 'Selector repaired successfully'
    });

  } catch (error) {
    console.error('Error repairing selector:', error);
    
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
