import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { getTaskExecutionStatus } from '@/lib/task-executor';

/**
 * GET /api/tasks/[id]/status - Get task execution status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: taskId } = await params;

    // Verify task exists and belongs to user
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        name: true,
        logs: true,
        error: true,
        result: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    // Get execution status
    const executionStatus = await getTaskExecutionStatus(taskId);

    return NextResponse.json({
      id: task.id,
      name: task.name,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      startedAt: task.startedAt?.toISOString(),
      finishedAt: task.finishedAt?.toISOString(),
      logs: executionStatus.logs || [],
      error: executionStatus.error || task.error,
      result: task.result ? JSON.parse(task.result) : null,
    });

  } catch (error) {
    console.error('Error getting task status:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
