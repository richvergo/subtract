/**
 * API Route: /api/agents/[id]/run
 * Execute workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AgentRunner } from '@/lib/agents/exec/AgentRunner'
import { LoginAgentAdapter } from '@/lib/agents/login/LoginAgentAdapter'
import puppeteer from 'puppeteer'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser: any = null
  let page: any = null

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

    // Parse request body
    const body = await request.json()
    const { variables = {}, settings = {} } = body

    console.log('🚀 Executing workflow:', id)

    // Create workflow run record
    const workflowRun = await prisma.workflowRun.create({
      data: {
        id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId: id,
        status: 'running',
        startedAt: new Date(),
        variables: variables,
        metadata: {
          executedBy: session.user.id,
          executedAt: new Date().toISOString(),
          settings: settings
        }
      }
    })

    // Initialize browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })

    // Initialize services
    const agentRunner = new AgentRunner()
    const loginAdapter = new LoginAgentAdapter()
    
    await agentRunner.initialize(browser, page)
    await loginAdapter.initialize(browser, page)

    // Prepare run configuration with LogicSpec
    const runConfig = {
      requiresLogin: workflow.requiresLogin || false,
      loginConfig: workflow.loginConfig,
      variables: variables,
      logicSpec: workflow.logicSpec,
      options: {
        headless: settings.headless !== false,
        timeout: settings.timeout || workflow.logicSpec?.settings?.timeout || 30000,
        retryAttempts: settings.retryAttempts || workflow.logicSpec?.settings?.retryAttempts || 3,
        screenshotOnError: settings.screenshotOnError !== false
      }
    }

    // Execute workflow with enhanced AgentRunner
    const result = await agentRunner.run(id, runConfig)

    // Update workflow run with results
    await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: result.status.toUpperCase(),
        finishedAt: new Date(),
        result: {
          success: result.status === 'success',
          summary: result.summary,
          duration: result.duration,
          steps: result.steps,
          metadata: result.metadata
        },
        error: result.error,
        logs: result.steps.map(step => ({
          id: step.stepId,
          timestamp: step.startTime,
          level: step.status === 'success' ? 'info' : 'error',
          message: `${step.actionId}: ${step.status}`,
          metadata: step.metadata
        }))
      }
    })

    console.log('✅ Workflow execution completed:', {
      workflowId: id,
      runId: workflowRun.id,
      status: result.status,
      duration: result.duration,
      summary: result.summary
    })

    return NextResponse.json({
      success: true,
      data: {
        runId: workflowRun.id,
        workflowId: id,
        status: result.status,
        duration: result.duration,
        summary: result.summary,
        steps: result.steps,
        metadata: result.metadata,
        evaluatedRules: result.metadata?.evaluatedRules || [],
        loopContexts: result.metadata?.loopContexts || []
      }
    })

  } catch (error) {
    console.error('❌ Workflow execution failed:', error)
    
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    )
  } finally {
    // Clean up browser
    if (browser) {
      await browser.close()
    }
  }
}

