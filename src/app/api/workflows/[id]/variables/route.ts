import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const WorkflowVariableSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'boolean', 'list']),
  isDynamic: z.boolean(),
  isLoop: z.boolean(),
  loopVariable: z.string().optional(),
  actionId: z.string().optional()
})

// POST /api/workflows/[id]/variables - Create workflow variable
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()
    
    // Validate input
    const variableData = WorkflowVariableSchema.parse(body)
    
    // Check if workflow exists and user has access
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId },
      select: { id: true }
    })
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    
    // Create workflow variable
    const workflowVariable = await prisma.workflowVariable.create({
      data: {
        workflowId,
        variable: variableData
      }
    })
    
    return NextResponse.json(workflowVariable)
  } catch (error) {
    console.error('Failed to create workflow variable:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid variable data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create workflow variable' },
      { status: 500 }
    )
  }
}

// GET /api/workflows/[id]/variables - Get workflow variables
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    
    // Check if workflow exists
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId },
      select: { id: true }
    })
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    
    // Get workflow variables
    const variables = await prisma.workflowVariable.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'asc' }
    })
    
    return NextResponse.json(variables)
  } catch (error) {
    console.error('Failed to get workflow variables:', error)
    return NextResponse.json(
      { error: 'Failed to get workflow variables' },
      { status: 500 }
    )
  }
}
