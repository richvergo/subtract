import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthId = searchParams.get('monthId');

    if (!monthId) {
      return NextResponse.json(
        { error: 'monthId is required' },
        { status: 400 }
      );
    }

    // Verify the month belongs to the current user
    const month = await db.monthClose.findFirst({
      where: {
        id: monthId,
        user: { email: session.user.email }
      }
    });

    if (!month) {
      return NextResponse.json({ error: 'Month not found' }, { status: 404 });
    }

    const tasks = await db.task.findMany({
      where: { monthId },
      orderBy: { createdAt: 'desc' },
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
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { monthId, title, assignee, dueDate, notes } = body;

    if (!monthId || !title) {
      return NextResponse.json(
        { error: 'monthId and title are required' },
        { status: 400 }
      );
    }

    // Verify the month belongs to the current user
    const month = await db.monthClose.findFirst({
      where: {
        id: monthId,
        user: { email: session.user.email }
      }
    });

    if (!month) {
      return NextResponse.json({ error: 'Month not found' }, { status: 404 });
    }

    const task = await db.task.create({
      data: {
        monthId,
        title,
        assignee,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
