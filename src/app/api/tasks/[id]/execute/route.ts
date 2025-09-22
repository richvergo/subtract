import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { executeTask } from '@/lib/task-executor';
// Removed enhanced task executor - using simple version

/**
 * POST /api/tasks/[id]/execute - Execute a task
 */
export async function POST(
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
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    if (task.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Task is not in PENDING status (current: ${task.status})` },
        { status: 400 }
      );
    }

    // Try enhanced execution first, fallback to legacy if needed
  const result = await executeTask(taskId);

  return NextResponse.json({
    success: result.success,
    taskId: result.taskId,
    executionId: result.executionId,
    status: result.success ? 'COMPLETED' : 'FAILED',
    duration: result.duration,
    message: result.success ? 'Task executed successfully' : 'Task execution failed',
    error: result.error,
    result: result.result
  });

  } catch (error) {
    console.error('Error executing task:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
