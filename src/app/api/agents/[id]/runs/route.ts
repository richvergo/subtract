/**
 * API Route: /api/agents/[id]/runs
 * Get workflow run history
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

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

    // Get workflow runs
    const runs = await prisma.workflowRun.findMany({
      where: {
        workflowId: id
      },
      orderBy: {
        startedAt: 'desc'
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        variables: true,
        result: true,
        error: true,
        metadata: true
      }
    })

    console.log(`📊 Retrieved ${runs.length} runs for workflow: ${id}`)

    return NextResponse.json({
      success: true,
      data: {
        workflowId: id,
        runs: runs.map(run => ({
          id: run.id,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          duration: run.finishedAt 
            ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
            : null,
          variables: run.variables,
          result: run.result,
          error: run.error,
          metadata: run.metadata
        }))
      }
    })

  } catch (error) {
    console.error('❌ Failed to get workflow runs:', error)
    
    return NextResponse.json(
      { error: 'Failed to get workflow runs' },
      { status: 500 }
    )
  }
}