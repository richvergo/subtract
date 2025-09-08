import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find current user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const months = await db.monthClose.findMany({
      where: { userId: user.id },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            assignee: true,
            dueDate: true,
            status: true,
            notes: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    
    return NextResponse.json(months);
  } catch (error) {
    console.error('Error fetching months:', error);
    return NextResponse.json(
      { error: 'Failed to fetch months' },
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

    // Find current user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { label, startDate, endDate } = body;

    if (!label || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'label, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    const month = await db.monthClose.create({
      data: {
        userId: user.id,
        label,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        tasks: true,
      },
    });

    return NextResponse.json(month, { status: 201 });
  } catch (error) {
    console.error('Error creating month:', error);
    return NextResponse.json(
      { error: 'Failed to create month' },
      { status: 500 }
    );
  }
}
