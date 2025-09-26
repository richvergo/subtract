import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// DELETE /api/workflows/[id]/variables/[variableId] - Delete workflow variable
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; variableId: string }> }
) {
  try {
    const { id: workflowId, variableId } = await params
    
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
    
    // Check if variable exists and belongs to workflow
    const variable = await prisma.workflowVariable.findFirst({
      where: { 
        id: variableId,
        workflowId 
      }
    })
    
    if (!variable) {
      return NextResponse.json(
        { error: 'Variable not found' },
        { status: 404 }
      )
    }
    
    // Delete the variable
    await prisma.workflowVariable.delete({
      where: { id: variableId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete workflow variable:', error)
    return NextResponse.json(
      { error: 'Failed to delete workflow variable' },
      { status: 500 }
    )
  }
}
