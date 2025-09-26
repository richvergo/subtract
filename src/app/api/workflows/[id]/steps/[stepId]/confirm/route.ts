import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Validation schema for step confirmation
const ConfirmStepSchema = z.object({
  confirmed: z.boolean()
})

// POST /api/workflows/[id]/steps/[stepId]/confirm - Confirm a workflow step
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {

    const { id: workflowId, stepId } = await params

    // Parse and validate request body
    const body = await request.json()
    const validatedData = ConfirmStepSchema.parse(body)

    // Get workflow from database
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
      },
      include: {
        actions: true
      }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Find the specific action/step
    const action = workflow.actions.find(a => a.id === stepId)
    if (!action) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      )
    }

    // Update the action with confirmation status
    const updatedAction = await prisma.workflowAction.update({
      where: { id: stepId },
      data: {
        annotations: {
          ...(action.annotations as any || {}),
          confirmed: validatedData.confirmed,
          confirmedAt: new Date().toISOString()
        }
      }
    })

    console.log('✅ Step confirmed successfully:', {
      workflowId,
      stepId,
      confirmed: validatedData.confirmed
    })

    return NextResponse.json({
      success: true,
      action: updatedAction
    })
  } catch (error) {
    console.error('❌ Failed to confirm step:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to confirm step' },
      { status: 500 }
    )
  }
}
