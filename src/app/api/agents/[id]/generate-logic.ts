/**
 * API Route: /api/agents/[id]/generate-logic
 * Generate logic from natural language rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { LogicCompiler } from '@/lib/agents/logic/LogicCompiler'
import { z } from 'zod'

// Request validation schema
const GenerateLogicRequestSchema = z.object({
  nlRules: z.string().min(1, 'Natural language rules are required'),
  variables: z.array(z.object({
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
  })).optional().default([])
})

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

    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = GenerateLogicRequestSchema.parse(body)
    const { nlRules, variables } = validatedRequest

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

    console.log('🔧 Generating logic from natural language rules for workflow:', id)

    // Initialize logic compiler
    const compiler = new LogicCompiler()

    // Compile natural language rules into structured spec
    const result = await compiler.compile(nlRules, variables)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Logic compilation failed',
          details: result.errors,
          warnings: result.warnings
        },
        { status: 400 }
      )
    }

    // Update workflow with compiled logic spec
    await prisma.workflow.update({
      where: { id },
      data: {
        logicSpec: result.spec,
        metadata: {
          ...workflow.metadata,
          nlRules,
          compilationTime: result.metadata.compilationTime,
          rulesCount: result.metadata.rulesCount,
          loopsCount: result.metadata.loopsCount,
          variablesCount: result.metadata.variablesCount
        }
      }
    })

    console.log('✅ Logic generated successfully:', {
      workflowId: id,
      compilationTime: result.metadata.compilationTime,
      rulesCount: result.metadata.rulesCount,
      loopsCount: result.metadata.loopsCount
    })

    return NextResponse.json({
      success: true,
      data: {
        workflowId: id,
        nlRules,
        spec: result.spec,
        metadata: result.metadata,
        warnings: result.warnings
      }
    })

  } catch (error) {
    console.error('❌ Logic generation failed:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate logic' },
      { status: 500 }
    )
  }
}
