import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/workflows/[id] - Get workflow with actions and screenshots
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params

    // Get workflow with actions, variables, and runs
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
      },
      include: {
        actions: {
          orderBy: { order: 'asc' }
        },
        variables: {
          orderBy: { createdAt: 'asc' }
        },
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10 // Limit recent runs
        }
      }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Transform actions to include screenshot data
    const transformedActions = workflow.actions.map(action => {
      const actionData = action.action as any
      
      return {
        id: action.id,
        type: actionData.type || 'unknown',
        selector: actionData.selector || 'body',
        value: actionData.value,
        url: actionData.url,
        coordinates: actionData.coordinates,
        screenshotUrl: action.screenshotUrl,
        selectorBox: action.selectorBox as any,
        annotations: action.annotations as any,
        order: action.order,
        metadata: {
          ...actionData.metadata,
          screenshotTimestamp: actionData.metadata?.screenshotTimestamp,
          screenshotPath: actionData.metadata?.screenshotPath,
          elementBoundingBox: actionData.metadata?.elementBoundingBox
        },
        createdAt: action.createdAt,
        updatedAt: action.updatedAt
      }
    })

    // Transform variables
    const transformedVariables = workflow.variables.map(variable => ({
      id: variable.id,
      ...(variable.variable as any)
    }))

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      version: workflow.version,
      requiresLogin: workflow.requiresLogin,
      loginConfig: workflow.loginConfig,
      isTaskTemplate: workflow.isTaskTemplate,
      logicSpec: workflow.logicSpec,
      metadata: workflow.metadata,
      actions: transformedActions,
      variables: transformedVariables,
      recentRuns: workflow.runs,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    })

  } catch (error) {
    console.error('Failed to get workflow:', error)
    return NextResponse.json(
      { error: 'Failed to get workflow' },
      { status: 500 }
    )
  }
}

// PUT /api/workflows/[id] - Update workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()

    // Validate that workflow exists and user has access
    const existingWorkflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
      }
    })

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Update workflow
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: body.name || existingWorkflow.name,
        description: body.description || existingWorkflow.description,
        status: body.status || existingWorkflow.status,
        version: body.version || existingWorkflow.version,
        requiresLogin: body.requiresLogin ?? existingWorkflow.requiresLogin,
        loginConfig: body.loginConfig || existingWorkflow.loginConfig,
        isTaskTemplate: body.isTaskTemplate ?? existingWorkflow.isTaskTemplate,
        logicSpec: body.logicSpec || existingWorkflow.logicSpec,
        metadata: body.metadata || existingWorkflow.metadata
      }
    })

    return NextResponse.json(updatedWorkflow)

  } catch (error) {
    console.error('Failed to update workflow:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    )
  }
}

// DELETE /api/workflows/[id] - Delete workflow
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params

    // Validate that workflow exists and user has access
    const existingWorkflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
      }
    })

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Delete workflow (cascade will handle related records)
    await prisma.workflow.delete({
      where: { id: workflowId }
    })

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete workflow:', error)
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    )
  }
}
