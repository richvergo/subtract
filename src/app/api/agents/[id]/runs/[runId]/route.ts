/**
 * API Route: /api/agents/[id]/runs/[runId]
 * Get detailed workflow run information
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id, runId } = await params

    // Get workflow from database
    const workflow = await prisma.workflow.findFirst({
      where: {
        id,
        ownerId: session.user.id
      }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Get workflow run with steps
    const run = await prisma.workflowRun.findFirst({
      where: {
        id: runId,
        workflowId: id
      },
      include: {
        steps: {
          orderBy: {
            startedAt: 'asc'
          }
        }
      }
    })

    if (!run) {
      return NextResponse.json(
        { error: 'Workflow run not found' },
        { status: 404 }
      )
    }

    // Process steps to include structured logs
    const processedSteps = run.steps.map(step => ({
      stepId: step.id,
      actionId: step.actionId,
      status: step.status.toLowerCase(),
      startedAt: step.startedAt,
      finishedAt: step.finishedAt,
      duration: step.finishedAt 
        ? new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()
        : null,
      result: step.result,
      error: step.error,
      logs: step.logs || [],
      metadata: step.metadata || {}
    }))

    // Calculate summary statistics
    const summary = {
      totalSteps: processedSteps.length,
      successCount: processedSteps.filter(s => s.status === 'completed').length,
      failureCount: processedSteps.filter(s => s.status === 'failed').length,
      skippedCount: processedSteps.filter(s => s.status === 'skipped').length,
      successRate: processedSteps.length > 0 
        ? processedSteps.filter(s => s.status === 'completed').length / processedSteps.length 
        : 0
    }

    console.log(`📊 Retrieved run details for ${runId}: ${summary.totalSteps} steps, ${summary.successRate * 100}% success rate`)

    return NextResponse.json({
      success: true,
      data: {
        run: {
          id: run.id,
          workflowId: run.workflowId,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          duration: run.finishedAt 
            ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
            : null,
          variables: run.variables,
          result: run.result,
          error: run.error,
          metadata: run.metadata,
          summary,
          steps: processedSteps
        }
      }
    })

  } catch (error) {
    console.error('❌ Failed to get workflow run details:', error)
    
    return NextResponse.json(
      { error: 'Failed to get workflow run details' },
      { status: 500 }
    )
  }
}
