import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Validation schema for logic generation
const LogicGenerationSchema = z.object({
  variables: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    isDynamic: z.boolean(),
    isLoop: z.boolean(),
    loopVariable: z.string().optional(),
    actionId: z.string().optional()
  })),
  rules: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional()
})

// POST /api/workflows/[id]/generate-logic - Generate workflow logic from variables
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()
    
    // Validate input
    const logicData = LogicGenerationSchema.parse(body)
    
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
    
    // Generate logic specification from variables
    const logicSpec = {
      variables: logicData.variables,
      rules: logicData.rules || [],
      conditions: logicData.conditions || [],
      loops: logicData.variables.filter(v => v.isLoop).map(v => ({
        variable: v.name,
        loopVariable: v.loopVariable,
        actionId: v.actionId
      })),
      dynamicFields: logicData.variables.filter(v => v.isDynamic).map(v => ({
        variable: v.name,
        type: v.type,
        actionId: v.actionId
      })),
      generatedAt: new Date().toISOString()
    }
    
    // Update workflow with generated logic
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        logicSpec: logicSpec
      }
    })
    
    return NextResponse.json({
      success: true,
      logicSpec
    })
  } catch (error) {
    console.error('Failed to generate workflow logic:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid logic data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate workflow logic' },
      { status: 500 }
    )
  }
}
