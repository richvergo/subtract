import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const months = await prisma.monthClose.findMany({
      where: { userId },
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
    const body = await request.json();
    const { userId, label, startDate, endDate } = body;

    if (!userId || !label || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'userId, label, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    const month = await prisma.monthClose.create({
      data: {
        userId,
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
