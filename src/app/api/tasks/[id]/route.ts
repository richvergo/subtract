import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const UpdateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE']).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updateData = UpdateTaskSchema.parse(body);

    // Verify the task belongs to the current user
    const existingTask = await db.task.findFirst({
      where: {
        id,
        month: {
          user: { email: session.user.email }
        }
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Prepare update data
    const dataToUpdate: any = { ...updateData };
    if (updateData.dueDate) {
      dataToUpdate.dueDate = new Date(updateData.dueDate);
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedTask);
  } catch (error: unknown) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the task belongs to the current user
    const existingTask = await db.task.findFirst({
      where: {
        id,
        month: {
          user: { email: session.user.email }
        }
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await db.task.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}