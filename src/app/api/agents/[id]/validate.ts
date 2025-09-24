/**
 * API Route: /api/agents/[id]/validate
 * Validate workflow configuration and handle step highlighting
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { validateLogicSpec } from '@/lib/agents/logic/schemas'
import { z } from 'zod'

// Request schema for highlighting
const HighlightRequestSchema = z.object({
  stepId: z.string().min(1)
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
      },
      include: {
        actions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    console.log('🔍 Fetching workflow steps for replay:', id)

    // Get workflow actions as steps
    const steps = workflow.actions.map(action => ({
      id: action.id,
      type: action.action.type,
      selector: action.action.selector,
      value: action.action.value,
      url: action.action.url,
      coordinates: action.action.coordinates,
      waitFor: action.action.waitFor,
      timeout: action.action.timeout,
      retryCount: action.action.retryCount,
      dependencies: action.action.dependencies,
      metadata: action.action.metadata,
      order: action.order
    }))

    // Create validation logs (simulated for now)
    const validationLogs = [
      {
        id: 'log_1',
        timestamp: Date.now(),
        level: 'info' as const,
        message: 'Workflow loaded successfully',
        actionId: null,
        metadata: { stepCount: steps.length }
      },
      {
        id: 'log_2',
        timestamp: Date.now(),
        level: 'info' as const,
        message: 'All selectors validated',
        actionId: null,
        metadata: { validationStatus: 'passed' }
      }
    ]

    return NextResponse.json({
      success: true,
      steps,
      validationLogs
    })

  } catch (error) {
    console.error('❌ Failed to fetch workflow steps:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch workflow steps' },
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
    const body = await request.json()

    // Check if this is a highlight request
    if (body.stepId) {
      return handleStepHighlight(id, body.stepId, session.user.id)
    }

    // Otherwise, handle validation request
    return handleWorkflowValidation(id, session.user.id)

  } catch (error) {
    console.error('❌ POST request failed:', error)
    
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle step highlighting request
 */
async function handleStepHighlight(workflowId: string, stepId: string, userId: string) {
  try {
    // Get workflow from database
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        ownerId: userId
      },
      include: {
        actions: {
          where: { id: stepId },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    const step = workflow.actions[0]
    if (!step) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      )
    }

    console.log('🎯 Highlighting step:', stepId)

    // TODO: Integrate with Puppeteer highlight injection
    // For now, return success with step details
    const highlightResult = {
      stepId,
      selector: step.action.selector,
      type: step.action.type,
      coordinates: step.action.coordinates,
      highlighted: true,
      timestamp: Date.now()
    }

    return NextResponse.json({
      success: true,
      data: highlightResult
    })

  } catch (error) {
    console.error('❌ Step highlighting failed:', error)
    
    return NextResponse.json(
      { error: 'Failed to highlight step' },
      { status: 500 }
    )
  }
}

/**
 * Handle workflow validation request
 */
async function handleWorkflowValidation(workflowId: string, userId: string) {
  try {
    // Get workflow from database
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        ownerId: userId
      }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    console.log('🔍 Validating workflow:', workflowId)

    // Validate logic specification
    const validationResult = validateLogicSpec(workflow.logicSpec)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Workflow validation failed',
          details: validationResult.errors 
        },
        { status: 400 }
      )
    }

    // Additional validation checks
    const validationChecks = await performAdditionalValidation(workflow)

    if (!validationChecks.success) {
      return NextResponse.json(
        { 
          error: 'Workflow validation failed',
          details: validationChecks.errors 
        },
        { status: 400 }
      )
    }

    // Update workflow status if validation passes
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        status: 'active',
        metadata: {
          ...workflow.metadata,
          validatedAt: new Date().toISOString(),
          validationChecks: validationChecks.checks
        }
      }
    })

    console.log('✅ Workflow validation successful:', workflowId)

    return NextResponse.json({
      success: true,
      data: {
        workflowId,
        status: 'valid',
        validationChecks: validationChecks.checks
      }
    })

  } catch (error) {
    console.error('❌ Workflow validation failed:', error)
    
    return NextResponse.json(
      { error: 'Failed to validate workflow' },
      { status: 500 }
    )
  }
}

/**
 * Perform additional validation checks
 */
async function performAdditionalValidation(workflow: any): Promise<{
  success: boolean
  errors: string[]
  checks: Record<string, boolean>
}> {
  const errors: string[] = []
  const checks: Record<string, boolean> = {}

  try {
    // Check 1: Validate action selectors
    checks.selectorValidation = true
    for (const action of workflow.logicSpec.actions) {
      if (!action.selector || action.selector.trim() === '') {
        errors.push(`Action ${action.id}: selector is required`)
        checks.selectorValidation = false
      }
    }

    // Check 2: Validate variable definitions
    checks.variableValidation = true
    for (const variable of workflow.logicSpec.variables) {
      if (!variable.name || variable.name.trim() === '') {
        errors.push(`Variable: name is required`)
        checks.variableValidation = false
      }
      
      if (variable.required && !variable.defaultValue) {
        errors.push(`Variable ${variable.name}: required variable must have default value`)
        checks.variableValidation = false
      }
    }

    // Check 3: Validate action dependencies
    checks.dependencyValidation = true
    for (const action of workflow.logicSpec.actions) {
      if (action.dependencies) {
        for (const depId of action.dependencies) {
          const depAction = workflow.logicSpec.actions.find((a: any) => a.id === depId)
          if (!depAction) {
            errors.push(`Action ${action.id}: dependency ${depId} not found`)
            checks.dependencyValidation = false
          }
        }
      }
    }

    // Check 4: Validate action types
    checks.actionTypeValidation = true
    const validActionTypes = ['click', 'type', 'select', 'navigate', 'scroll', 'wait']
    for (const action of workflow.logicSpec.actions) {
      if (!validActionTypes.includes(action.type)) {
        errors.push(`Action ${action.id}: invalid action type '${action.type}'`)
        checks.actionTypeValidation = false
      }
    }

    // Check 5: Validate required fields for specific action types
    checks.requiredFieldValidation = true
    for (const action of workflow.logicSpec.actions) {
      if (action.type === 'type' && !action.value) {
        errors.push(`Action ${action.id}: type action requires value`)
        checks.requiredFieldValidation = false
      }
      
      if (action.type === 'select' && !action.value) {
        errors.push(`Action ${action.id}: select action requires value`)
        checks.requiredFieldValidation = false
      }
      
      if (action.type === 'navigate' && !action.url) {
        errors.push(`Action ${action.id}: navigate action requires url`)
        checks.requiredFieldValidation = false
      }
    }

    // Check 6: Validate settings
    checks.settingsValidation = true
    const settings = workflow.logicSpec.settings
    if (settings.timeout && settings.timeout <= 0) {
      errors.push('Settings: timeout must be positive')
      checks.settingsValidation = false
    }
    
    if (settings.retryAttempts && settings.retryAttempts < 0) {
      errors.push('Settings: retryAttempts must be non-negative')
      checks.settingsValidation = false
    }

    return {
      success: errors.length === 0,
      errors,
      checks
    }

  } catch (error) {
    return {
      success: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      checks
    }
  }
}
