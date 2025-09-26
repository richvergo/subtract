import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema for workflow recording request
const RecordRequestSchema = z.object({
  workflowId: z.string(),
  workflowName: z.string(),
  url: z.string().url(),
  actions: z.array(z.any()),
  variables: z.array(z.any()),
  requiresLogin: z.boolean(),
  settings: z.object({
    headless: z.boolean(),
    viewport: z.object({
      width: z.number(),
      height: z.number()
    }),
    timeout: z.number()
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = RecordRequestSchema.parse(body)

    // Create or update workflow in database
    const workflow = await prisma.workflow.upsert({
      where: { id: validatedData.workflowId },
      update: {
        name: validatedData.workflowName,
        description: `Workflow for ${validatedData.url}`,
        metadata: {
          targetUrl: validatedData.url,
          updatedAt: new Date().toISOString(),
          requiresLogin: validatedData.requiresLogin,
          settings: validatedData.settings
        }
      },
      create: {
        id: validatedData.workflowId,
        name: validatedData.workflowName,
        description: `Workflow for ${validatedData.url}`,
        logicSpec: {},
        metadata: {
          targetUrl: validatedData.url,
          createdAt: new Date().toISOString(),
          requiresLogin: validatedData.requiresLogin,
          settings: validatedData.settings
        },
      }
    })

    // Create workflow actions
    const actions = validatedData.actions.map((action: any, index: number) => ({
      id: action.id || `action_${Date.now()}_${index}`,
      workflowId: validatedData.workflowId,
      action: action,
      order: index,
      screenshotUrl: action.screenshotUrl,
      selectorBox: action.selectorBox,
      annotations: action.annotations
    }))

    if (actions.length > 0) {
      await prisma.workflowAction.createMany({
        data: actions
      })
    }

    // Create workflow variables
    const variables = validatedData.variables.map((variable: any, index: number) => ({
      id: variable.id || `variable_${Date.now()}_${index}`,
      workflowId: validatedData.workflowId,
      variable: {
        name: variable.name,
        type: variable.type,
        value: variable.value,
        isLoop: variable.isLoop || false
      }
    }))

    if (variables.length > 0) {
      await prisma.workflowVariable.createMany({
        data: variables
      })
    }

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        actionCount: actions.length,
        variableCount: variables.length
      }
    })

  } catch (error) {
    console.error('Error creating workflow:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
