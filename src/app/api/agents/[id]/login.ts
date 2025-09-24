/**
 * POST /api/agents/[id]/login - Configure login settings for a workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'
import { validateLoginConfig } from '@/lib/agents/logic/schemas'
import { SessionManager } from '@/lib/session-manager'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if workflow exists and belongs to user
    const workflow = await db.workflow.findFirst({
      where: { 
        id: workflowId,
        ownerId: user.id 
      }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { requiresLogin, loginConfig } = body

    // Validate login configuration if provided
    if (requiresLogin && loginConfig) {
      try {
        validateLoginConfig(loginConfig)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid login configuration', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 }
        )
      }
    }

    // Encrypt login configuration if provided
    let encryptedLoginConfig = null
    if (requiresLogin && loginConfig) {
      try {
        encryptedLoginConfig = SessionManager.encryptSessionData(loginConfig)
      } catch (error) {
        console.error('Failed to encrypt login config:', error)
        return NextResponse.json(
          { error: 'Failed to encrypt login configuration' },
          { status: 500 }
        )
      }
    }

    // Update workflow with login settings
    const updatedWorkflow = await db.workflow.update({
      where: { id: workflowId },
      data: {
        requiresLogin: requiresLogin || false,
        loginConfig: encryptedLoginConfig,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Login configuration updated for workflow ${workflowId}`)

    return NextResponse.json({
      success: true,
      data: {
        id: updatedWorkflow.id,
        requiresLogin: updatedWorkflow.requiresLogin,
        hasLoginConfig: !!updatedWorkflow.loginConfig
      }
    })

  } catch (error) {
    console.error('Error updating login configuration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get workflow login configuration
    const workflow = await db.workflow.findFirst({
      where: { 
        id: workflowId,
        ownerId: user.id 
      },
      select: {
        id: true,
        requiresLogin: true,
        loginConfig: true
      }
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Decrypt login configuration if present
    let decryptedLoginConfig = null
    if (workflow.loginConfig) {
      try {
        decryptedLoginConfig = SessionManager.decryptSessionData(workflow.loginConfig as string)
      } catch (error) {
        console.error('Failed to decrypt login config:', error)
        // Return without sensitive data
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: workflow.id,
        requiresLogin: workflow.requiresLogin,
        loginConfig: decryptedLoginConfig
      }
    })

  } catch (error) {
    console.error('Error fetching login configuration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
