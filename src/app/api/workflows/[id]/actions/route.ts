import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/workflows/[id]/actions - Get workflow actions with screenshots
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id: workflowId } = await params

    // Get workflow to verify ownership
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
      },
      select: { id: true }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Get actions with screenshot data
    const actions = await prisma.workflowAction.findMany({
      where: { workflowId },
      orderBy: { order: 'asc' }
    })

    // Transform actions to include all screenshot metadata
    const transformedActions = actions.map(action => {
      const actionData = action.action as any
      
      return {
        id: action.id,
        type: actionData.type || 'unknown',
        selector: actionData.selector || 'body',
        value: actionData.value,
        url: actionData.url,
        coordinates: actionData.coordinates,
        waitFor: actionData.waitFor,
        timeout: actionData.timeout,
        retryCount: actionData.retryCount,
        dependencies: actionData.dependencies,
        screenshotUrl: action.screenshotUrl,
        selectorBox: action.selectorBox as any,
        annotations: action.annotations as any,
        order: action.order,
        metadata: {
          ...actionData.metadata,
          screenshotTimestamp: actionData.metadata?.screenshotTimestamp,
          screenshotPath: actionData.metadata?.screenshotPath,
          elementBoundingBox: actionData.metadata?.elementBoundingBox,
          screenshotError: actionData.metadata?.screenshotError
        },
        createdAt: action.createdAt,
        updatedAt: action.updatedAt
      }
    })

    return NextResponse.json({
      workflowId,
      actions: transformedActions,
      totalActions: actions.length,
      actionsWithScreenshots: actions.filter(a => a.screenshotUrl).length,
      actionsWithSelectorBox: actions.filter(a => a.selectorBox).length
    })

  } catch (error) {
    console.error('Failed to get workflow actions:', error)
    return NextResponse.json(
      { error: 'Failed to get workflow actions' },
      { status: 500 }
    )
  }
}

// POST /api/workflows/[id]/actions - Create or update workflow actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id: workflowId } = await params
    const body = await request.json()

    // Validate that workflow exists and user has access
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
      },
      select: { id: true }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Validate actions array
    if (!Array.isArray(body.actions)) {
      return NextResponse.json(
        { error: 'Actions must be an array' },
        { status: 400 }
      )
    }

    // Delete existing actions
    await prisma.workflowAction.deleteMany({
      where: { workflowId }
    })

    // Create new actions
    const createdActions = await Promise.all(
      body.actions.map((actionData: any, index: number) => 
        prisma.workflowAction.create({
          data: {
            workflowId,
            action: actionData,
            order: index,
            screenshotUrl: actionData.screenshotUrl || null,
            selectorBox: actionData.selectorBox || null,
            annotations: actionData.annotations || null
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      actions: createdActions,
      message: `Created ${createdActions.length} actions for workflow ${workflowId}`
    })

  } catch (error) {
    console.error('Failed to create workflow actions:', error)
    return NextResponse.json(
      { error: 'Failed to create workflow actions' },
      { status: 500 }
    )
  }
}
