import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema for task creation
const createTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  parameters: z.object({
    jobName: z.string().optional(),
    customerName: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    userEmail: z.string().email().optional(),
    customParams: z.record(z.string(), z.string()).optional(),
  }).optional(),
  schedule: z.string().optional(), // Cron expression
  priority: z.enum(['low', 'normal', 'high']).optional(),
  description: z.string().optional(),
});


/**
 * GET /api/tasks - List all tasks for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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

    // Get tasks with agent information
    const tasks = await db.task.findMany({
      where: {
        userId: user.id,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            purposePrompt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        agentId: task.agentId,
        agentName: task.agent?.name || 'Unknown Agent',
        status: task.status,
        createdAt: task.createdAt.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        finishedAt: task.finishedAt?.toISOString(),
        parameters: task.parameters,
        schedule: task.schedule,
        priority: task.priority,
        description: task.description,
      })),
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks - Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Verify agent exists and belongs to user
    const agent = await db.agent.findFirst({
      where: {
        id: validatedData.agentId,
        ownerId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }

    // Create the task
    const task = await db.task.create({
      data: {
        name: validatedData.name,
        agentId: validatedData.agentId,
        userId: user.id,
        parameters: validatedData.parameters ? JSON.stringify(validatedData.parameters) : null,
        schedule: validatedData.schedule,
        priority: validatedData.priority || 'normal',
        description: validatedData.description,
        status: 'PENDING',
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            purposePrompt: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: task.id,
      name: task.name,
      agentId: task.agentId,
      agentName: task.agent?.name || 'Unknown Agent',
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      parameters: task.parameters ? JSON.parse(task.parameters) : null,
      schedule: task.schedule,
      priority: task.priority,
      description: task.description,
      message: 'Task created successfully',
    });

  } catch (error) {
    console.error('Error creating task:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
