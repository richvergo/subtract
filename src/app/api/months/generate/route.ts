import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const currentYear = new Date().getFullYear();
    const months = [];

    // Generate all 12 months for the current year
    for (let month = 1; month <= 12; month++) {
      const monthLabel = `${currentYear}-${month.toString().padStart(2, '0')}`;
      
      // Check if month already exists
      const existingMonth = await db.monthClose.findUnique({
        where: { entityId_label: { entityId: activeEntityId, label: monthLabel } }
      });

      if (!existingMonth) {
        // Create the month
        const startDate = new Date(currentYear, month - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(currentYear, month, 0);
        endDate.setHours(23, 59, 59, 999);

        const newMonth = await db.monthClose.create({
          data: {
            entityId: activeEntityId,
            label: monthLabel,
            startDate,
            endDate
          }
        });

        months.push(newMonth);
      } else {
        months.push(existingMonth);
      }
    }

    return NextResponse.json({ 
      message: 'Months generated successfully',
      months: months.length
    });

  } catch (error) {
    console.error('Error generating months:', error);
    return NextResponse.json(
      { error: 'Failed to generate months' },
      { status: 500 }
    );
  }
}
