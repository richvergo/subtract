import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Validation schema for publishing
const PublishSchema = z.object({
  isTaskTemplate: z.boolean(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
})

// POST /api/workflows/[id]/publish - Publish workflow as task template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()
    
    // Validate input
    const publishData = PublishSchema.parse(body)
    
    // Check if workflow exists
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId },
      select: { id: true, status: true, description: true, metadata: true }
    })
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    
    // Update workflow to publish as task template
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        isTaskTemplate: publishData.isTaskTemplate,
        status: publishData.isTaskTemplate ? 'ACTIVE' : 'DRAFT',
        description: publishData.description || workflow.description,
        metadata: {
          ...(typeof workflow.metadata === 'object' && workflow.metadata !== null ? workflow.metadata : {}),
          tags: publishData.tags || [],
          publishedAt: publishData.isTaskTemplate ? new Date().toISOString() : null
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      workflow: updatedWorkflow,
      message: publishData.isTaskTemplate 
        ? 'Workflow published as task template successfully'
        : 'Workflow unpublished from task templates'
    })
  } catch (error) {
    console.error('Failed to publish workflow:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid publish data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to publish workflow' },
      { status: 500 }
    )
  }
}
