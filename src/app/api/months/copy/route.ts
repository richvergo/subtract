import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const CopyMonthSchema = z.object({
  fromMonthId: z.string().min(1, 'From month ID is required'),
  toMonthId: z.string().min(1, 'To month ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fromMonthId, toMonthId } = CopyMonthSchema.parse(body);

    // Find current user with memberships
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            entity: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the active entity from session or use the first one
    const activeEntityId = session.user.activeEntityId || user.memberships[0]?.entityId;
    
    if (!activeEntityId) {
      return NextResponse.json({ error: 'No active entity' }, { status: 400 });
    }

    // Verify both months belong to the current entity
    const fromMonth = await db.monthClose.findFirst({
      where: {
        id: fromMonthId,
        entityId: activeEntityId
      },
      include: {
        checklistItems: {
          include: {
            tasks: true
          }
        }
      }
    });

    const toMonth = await db.monthClose.findFirst({
      where: {
        id: toMonthId,
        entityId: activeEntityId
      }
    });

    if (!fromMonth || !toMonth) {
      return NextResponse.json({ error: 'Month not found' }, { status: 404 });
    }

    // Copy checklist items and tasks
    let copiedItems = 0;
    let copiedTasks = 0;

    for (const item of fromMonth.checklistItems) {
      // Create the checklist item
      const newItem = await db.checklistItem.create({
        data: {
          title: item.title,
          assignee: item.assignee,
          dueDate: item.dueDate,
          status: 'NOT_STARTED', // Reset status for new month
          monthId: toMonthId
        }
      });

      copiedItems++;

      // Copy tasks
      for (const task of item.tasks) {
        await db.task.create({
          data: {
            title: task.title,
            assignee: task.assignee,
            dueDate: task.dueDate,
            status: 'NOT_STARTED', // Reset status for new month
            notes: task.notes,
            checklistItemId: newItem.id
          }
        });

        copiedTasks++;
      }
    }

    return NextResponse.json({ 
      message: 'Month copied successfully',
      copiedItems,
      copiedTasks
    });

  } catch (error) {
    console.error('Error copying month:', error);
    return NextResponse.json(
      { error: 'Failed to copy month' },
      { status: 500 }
    );
  }
}
