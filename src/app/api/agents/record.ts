/**
 * API Route: /api/agents/record
 * Enterprise-grade workflow recording endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

// Request validation schema
const RecordRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  actions: z.array(z.object({
    id: z.string(),
    type: z.string(),
    selector: z.string(),
    value: z.string().optional(),
    url: z.string().optional(),
    coordinates: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    metadata: z.record(z.string(), z.any()).optional()
  })),
  variables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    defaultValue: z.any().optional(),
    required: z.boolean().default(false)
  })).optional(),
  settings: z.object({
    timeout: z.number().positive().optional(),
    retryAttempts: z.number().nonnegative().optional(),
    screenshotOnError: z.boolean().optional(),
    debugMode: z.boolean().optional()
  }).optional(),
  requiresLogin: z.boolean().optional(),
  loginConfig: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    url: z.string().url(),
    tenant: z.string().optional(),
    options: z.record(z.string(), z.any()).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = RecordRequestSchema.parse(body)

    console.log('🎬 Recording workflow:', {
      name: validatedData.name,
      actionCount: validatedData.actions.length,
      variableCount: validatedData.variables?.length || 0
    })

    // Encrypt login configuration if provided
    let encryptedLoginConfig = null
    if (validatedData.requiresLogin && validatedData.loginConfig) {
      try {
        const { SessionManager } = await import('@/lib/session-manager')
        encryptedLoginConfig = SessionManager.encryptSessionData(validatedData.loginConfig)
      } catch (error) {
        console.error('Failed to encrypt login config:', error)
        return NextResponse.json(
          { error: 'Failed to encrypt login configuration' },
          { status: 500 }
        )
      }
    }

    // Create workflow in database
    const workflow = await prisma.workflow.create({
      data: {
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: validatedData.name,
        description: validatedData.description,
        status: 'DRAFT',
        version: '1.0.0',
        requiresLogin: validatedData.requiresLogin || false,
        loginConfig: encryptedLoginConfig,
        ownerId: session.user.id,
        logicSpec: {
          id: `logic_${Date.now()}`,
          name: validatedData.name,
          description: validatedData.description,
          version: '1.0.0',
          actions: validatedData.actions,
          variables: validatedData.variables || [],
          settings: {
            timeout: validatedData.settings?.timeout || 30000,
            retryAttempts: validatedData.settings?.retryAttempts || 3,
            screenshotOnError: validatedData.settings?.screenshotOnError || true,
            debugMode: validatedData.settings?.debugMode || false,
            parallelExecution: false
          }
        },
        metadata: {
          recordedAt: new Date().toISOString(),
          actionCount: validatedData.actions.length,
          variableCount: validatedData.variables?.length || 0
        }
      }
    })

    // Create workflow actions
    for (let i = 0; i < validatedData.actions.length; i++) {
      const action = validatedData.actions[i]
      await prisma.workflowAction.create({
        data: {
          id: `action_${Date.now()}_${i}`,
          workflowId: workflow.id,
          action: action,
          order: i,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    // Create workflow variables
    if (validatedData.variables) {
      for (let i = 0; i < validatedData.variables.length; i++) {
        const variable = validatedData.variables[i]
        await prisma.workflowVariable.create({
          data: {
            id: `variable_${Date.now()}_${i}`,
            workflowId: workflow.id,
            variable: variable,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }
    }

    console.log('✅ Workflow recorded successfully:', workflow.id)

    return NextResponse.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        actionCount: validatedData.actions.length,
        variableCount: validatedData.variables?.length || 0,
        createdAt: workflow.createdAt
      }
    })

  } catch (error) {
    console.error('❌ Workflow recording failed:', error)
    
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
      { error: 'Failed to record workflow' },
      { status: 500 }
    )
  }
}
