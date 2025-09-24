/**
 * API Route: /api/agents/[id]/schedule
 * Schedule workflow execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { CreateWorkflowScheduleSchema, UpdateWorkflowScheduleSchema, WorkflowScheduleSchema } from '@/lib/schemas/agents'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: agentId } = await params

    // Verify agent ownership
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = CreateWorkflowScheduleSchema.parse({
      ...body,
      workflowId: agentId
    })

    console.log('📅 Creating schedule for agent:', {
      agentId,
      cronExpression: validatedData.cronExpression,
      name: validatedData.name
    })

    // For now, we'll store schedule information in the agent's metadata
    // In a production system, you'd want a dedicated WorkflowSchedule table
    const scheduleData = {
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: agentId,
      name: validatedData.name,
      cronExpression: validatedData.cronExpression,
      timezone: validatedData.timezone,
      isActive: validatedData.isActive,
      runConfig: validatedData.runConfig,
      variables: validatedData.variables,
      metadata: validatedData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Update agent with schedule information
    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        // Store schedule in a JSON field or metadata
        // For now, we'll use a simple approach and store in description or metadata
        description: agent.description ? 
          `${agent.description}\n\nSchedules: ${JSON.stringify([scheduleData])}` : 
          `Schedules: ${JSON.stringify([scheduleData])}`
      }
    })

    console.log('✅ Schedule created successfully:', scheduleData.id)

    return NextResponse.json({
      success: true,
      data: scheduleData
    })

  } catch (error) {
    console.error('❌ Schedule creation failed:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.message 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: agentId } = await params

    // Get agent with schedules
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
      select: {
        id: true,
        description: true,
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Parse schedules from agent description
    // This is a temporary solution - in production you'd have a dedicated table
    let schedules = []
    try {
      if (agent.description && agent.description.includes('Schedules:')) {
        const schedulesMatch = agent.description.match(/Schedules: (\[.*\])/);
        if (schedulesMatch) {
          schedules = JSON.parse(schedulesMatch[1]);
        }
      }
    } catch (error) {
      console.error('Failed to parse schedules:', error);
      schedules = [];
    }

    console.log('📅 Retrieved schedules for agent:', {
      agentId,
      count: schedules.length
    })

    return NextResponse.json({
      success: true,
      data: schedules
    })

  } catch (error) {
    console.error('❌ Failed to retrieve schedules:', error)
    
    return NextResponse.json(
      { error: 'Failed to retrieve schedules' },
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
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: agentId } = await params
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('scheduleId')

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      )
    }

    // Verify agent ownership
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateWorkflowScheduleSchema.parse(body)

    // Parse existing schedules
    let schedules = []
    try {
      if (agent.description && agent.description.includes('Schedules:')) {
        const schedulesMatch = agent.description.match(/Schedules: (\[.*\])/);
        if (schedulesMatch) {
          schedules = JSON.parse(schedulesMatch[1]);
        }
      }
    } catch (error) {
      console.error('Failed to parse schedules:', error);
    }

    // Find and update the schedule
    const scheduleIndex = schedules.findIndex((s: any) => s.id === scheduleId)
    if (scheduleIndex === -1) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Update the schedule
    schedules[scheduleIndex] = {
      ...schedules[scheduleIndex],
      ...validatedData,
      updatedAt: new Date()
    }

    // Update agent with modified schedules
    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        description: agent.description ? 
          agent.description.replace(/Schedules: \[.*\]/, `Schedules: ${JSON.stringify(schedules)}`) :
          `Schedules: ${JSON.stringify(schedules)}`
      }
    })

    console.log('✅ Schedule updated successfully:', scheduleId)

    return NextResponse.json({
      success: true,
      data: schedules[scheduleIndex]
    })

  } catch (error) {
    console.error('❌ Failed to update schedule:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.message 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update schedule' },
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
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: agentId } = await params
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('scheduleId')

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      )
    }

    // Verify agent ownership
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Parse existing schedules
    let schedules = []
    try {
      if (agent.description && agent.description.includes('Schedules:')) {
        const schedulesMatch = agent.description.match(/Schedules: (\[.*\])/);
        if (schedulesMatch) {
          schedules = JSON.parse(schedulesMatch[1]);
        }
      }
    } catch (error) {
      console.error('Failed to parse schedules:', error);
    }

    // Find and remove the schedule
    const scheduleIndex = schedules.findIndex((s: any) => s.id === scheduleId)
    if (scheduleIndex === -1) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    schedules.splice(scheduleIndex, 1)

    // Update agent with modified schedules
    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        description: agent.description ? 
          agent.description.replace(/Schedules: \[.*\]/, `Schedules: ${JSON.stringify(schedules)}`) :
          agent.description
      }
    })

    console.log('🗑️ Schedule deleted:', scheduleId)

    return NextResponse.json({
      success: true,
      data: {
        scheduleId,
        deleted: true
      }
    })

  } catch (error) {
    console.error('❌ Failed to delete schedule:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}
