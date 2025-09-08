import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const CreateChecklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  monthId: z.string().min(1, 'Month ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, assignee, dueDate, monthId } = CreateChecklistItemSchema.parse(body);

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

    // Verify the month belongs to the current entity
    const month = await db.monthClose.findFirst({
      where: {
        id: monthId,
        entityId: activeEntityId
      }
    });

    if (!month) {
      return NextResponse.json({ error: 'Month not found' }, { status: 404 });
    }

    // Create the checklist item
    const checklistItem = await db.checklistItem.create({
      data: {
        title,
        assignee,
        dueDate: dueDate ? new Date(dueDate) : null,
        monthId,
      },
    });

    return NextResponse.json(checklistItem);
  } catch (error: unknown) {
    console.error('Error creating checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to create checklist item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
