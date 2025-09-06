import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthId = searchParams.get('monthId');

    if (!monthId) {
      return NextResponse.json(
        { error: 'monthId is required' },
        { status: 400 }
      );
    }

    const tasks = await prisma.task.findMany({
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
    const body = await request.json();
    const { monthId, title, assignee, dueDate, notes } = body;

    if (!monthId || !title) {
      return NextResponse.json(
        { error: 'monthId and title are required' },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
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
