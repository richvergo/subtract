import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  checklistItemId: z.string().min(1, 'Checklist item ID is required'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checklistItemId = searchParams.get('checklistItemId');

    if (!checklistItemId) {
      return NextResponse.json(
        { error: 'checklistItemId is required' },
        { status: 400 }
      );
    }

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

    // Verify the checklist item belongs to the current entity
    const checklistItem = await db.checklistItem.findFirst({
      where: {
        id: checklistItemId,
        month: {
          entityId: activeEntityId
        }
      }
    });

    if (!checklistItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    const tasks = await db.task.findMany({
      where: { checklistItemId },
    });
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/tasks - Starting request processing');
    const session = await getSession();
    console.log('🔐 Session:', session ? 'Found' : 'Not found');
    if (!session?.user?.email) {
      console.log('❌ No session or email, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Task creation request body:', body);
    
    console.log('📝 Parsing request body with schema...');
    const { title, assignee, dueDate, notes, checklistItemId } = CreateTaskSchema.parse(body);
    console.log('✅ Parsed task data:', { title, assignee, dueDate, notes, checklistItemId });

    // Find current user with memberships
    console.log('👤 Looking up user:', session.user.email);
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
      console.log('❌ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('✅ User found:', user.email, 'with', user.memberships.length, 'memberships');

    // Get the active entity from session or use the first one
    const activeEntityId = session.user.activeEntityId || user.memberships[0]?.entityId;
    console.log('🏢 Active entity ID:', activeEntityId);
    
    if (!activeEntityId) {
      console.log('❌ No active entity found');
      return NextResponse.json({ error: 'No active entity' }, { status: 400 });
    }

    // Verify the checklist item belongs to the current entity
    console.log('🔍 Verifying checklist item:', checklistItemId);
    const checklistItem = await db.checklistItem.findFirst({
      where: {
        id: checklistItemId,
        month: {
          entityId: activeEntityId
        }
      }
    });

    if (!checklistItem) {
      console.log('❌ Checklist item not found or not accessible');
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }
    console.log('✅ Checklist item verified:', checklistItem.title);

    console.log('Creating task in database...');
    const task = await db.task.create({
      data: {
        checklistItemId,
        title,
        assignee,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
      },
    });

    console.log('Task created successfully:', task);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to create task', details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
