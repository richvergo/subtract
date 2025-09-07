import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const UpdateChecklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE']).optional(),
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
    const updateData = UpdateChecklistItemSchema.parse(body);

    // Verify the checklist item belongs to the current user
    const existingItem = await prisma.checklistItem.findFirst({
      where: {
        id,
        month: {
          user: { email: session.user.email }
        }
      }
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // Prepare update data
    const dataToUpdate: any = { ...updateData };
    if (updateData.dueDate) {
      dataToUpdate.dueDate = new Date(updateData.dueDate);
    }

    // Update the checklist item
    const updatedItem = await prisma.checklistItem.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedItem);
  } catch (error: unknown) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist item', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Verify the checklist item belongs to the current user
    const existingItem = await prisma.checklistItem.findFirst({
      where: {
        id,
        month: {
          user: { email: session.user.email }
        }
      }
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // Delete associated tasks first
    await prisma.task.deleteMany({
      where: { checklistItemId: id }
    });

    // Delete the checklist item
    await prisma.checklistItem.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Checklist item deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to delete checklist item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
