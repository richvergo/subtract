/**
 * API Route: /api/agents/[id]/variables
 * Manage workflow variables
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { z } from 'zod'

// Request validation schema
const VariableRequestSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'date', 'file', 'url', 'email', 'phone']),
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  required: z.boolean().default(false),
  source: z.enum(['user_input', 'api_response', 'file_upload', 'environment', 'computed', 'random', 'timestamp']).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
})

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

    // Get workflow variables
    const variables = await prisma.workflowVariable.findMany({
      where: {
        workflowId: id
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log('📊 Retrieved workflow variables:', {
      workflowId: id,
      count: variables.length
    })

    return NextResponse.json({
      success: true,
      data: variables.map(variable => ({
        id: variable.id,
        name: variable.variable.name,
        type: variable.variable.type,
        description: variable.variable.description,
        defaultValue: variable.variable.defaultValue,
        required: variable.variable.required,
        source: variable.variable.source,
        validation: variable.variable.validation,
        metadata: variable.variable.metadata,
        createdAt: variable.createdAt,
        updatedAt: variable.updatedAt
      }))
    })

  } catch (error) {
    console.error('❌ Failed to retrieve workflow variables:', error)
    
    return NextResponse.json(
      { error: 'Failed to retrieve workflow variables' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = VariableRequestSchema.parse(body)

    console.log('➕ Adding variable to workflow:', {
      workflowId: id,
      variableName: validatedData.name,
      variableType: validatedData.type
    })

    // Create workflow variable
    const variable = await prisma.workflowVariable.create({
      data: {
        id: `variable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId: id,
        variable: validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Update workflow logic spec
    const updatedLogicSpec = {
      ...workflow.logicSpec,
      variables: [...workflow.logicSpec.variables, validatedData]
    }

    await prisma.workflow.update({
      where: { id },
      data: {
        logicSpec: updatedLogicSpec
      }
    })

    console.log('✅ Variable added successfully:', variable.id)

    return NextResponse.json({
      success: true,
      data: {
        id: variable.id,
        name: validatedData.name,
        type: validatedData.type,
        description: validatedData.description,
        defaultValue: validatedData.defaultValue,
        required: validatedData.required,
        source: validatedData.source,
        validation: validatedData.validation,
        metadata: validatedData.metadata,
        createdAt: variable.createdAt,
        updatedAt: variable.updatedAt
      }
    })

  } catch (error) {
    console.error('❌ Failed to add variable:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add variable' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { searchParams } = new URL(request.url)
    const variableId = searchParams.get('variableId')

    if (!variableId) {
      return NextResponse.json(
        { error: 'Variable ID is required' },
        { status: 400 }
      )
    }

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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = VariableRequestSchema.parse(body)

    console.log('✏️ Updating variable:', {
      workflowId: id,
      variableId,
      variableName: validatedData.name
    })

    // Update workflow variable
    const variable = await prisma.workflowVariable.update({
      where: {
        id: variableId,
        workflowId: id
      },
      data: {
        variable: validatedData,
        updatedAt: new Date()
      }
    })

    // Update workflow logic spec
    const updatedLogicSpec = {
      ...workflow.logicSpec,
      variables: workflow.logicSpec.variables.map((v: any) => 
        v.id === variableId ? validatedData : v
      )
    }

    await prisma.workflow.update({
      where: { id },
      data: {
        logicSpec: updatedLogicSpec
      }
    })

    console.log('✅ Variable updated successfully:', variable.id)

    return NextResponse.json({
      success: true,
      data: {
        id: variable.id,
        name: validatedData.name,
        type: validatedData.type,
        description: validatedData.description,
        defaultValue: validatedData.defaultValue,
        required: validatedData.required,
        source: validatedData.source,
        validation: validatedData.validation,
        metadata: validatedData.metadata,
        createdAt: variable.createdAt,
        updatedAt: variable.updatedAt
      }
    })

  } catch (error) {
    console.error('❌ Failed to update variable:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update variable' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const variableId = searchParams.get('variableId')

    if (!variableId) {
      return NextResponse.json(
        { error: 'Variable ID is required' },
        { status: 400 }
      )
    }

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

    console.log('🗑️ Deleting variable:', {
      workflowId: id,
      variableId
    })

    // Delete workflow variable
    await prisma.workflowVariable.delete({
      where: {
        id: variableId,
        workflowId: id
      }
    })

    // Update workflow logic spec
    const updatedLogicSpec = {
      ...workflow.logicSpec,
      variables: workflow.logicSpec.variables.filter((v: any) => v.id !== variableId)
    }

    await prisma.workflow.update({
      where: { id },
      data: {
        logicSpec: updatedLogicSpec
      }
    })

    console.log('✅ Variable deleted successfully:', variableId)

    return NextResponse.json({
      success: true,
      data: {
        variableId,
        deleted: true
      }
    })

  } catch (error) {
    console.error('❌ Failed to delete variable:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete variable' },
      { status: 500 }
    )
  }
}
