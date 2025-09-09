import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserWithMemberships, canAccessEntity } from '@/lib/permissions';

async function generateAllMonthsForYear(entityId: string, year: number) {
  for (let month = 1; month <= 12; month++) {
    const monthLabel = `${year}-${month.toString().padStart(2, '0')}`;
    
    // Check if month already exists
    const existingMonth = await db.monthClose.findUnique({
      where: { entityId_label: { entityId, label: monthLabel } }
    });

    if (!existingMonth) {
      // Create the month
      const startDate = new Date(year, month - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);

      await db.monthClose.create({
        data: {
          entityId,
          label: monthLabel,
          startDate,
          endDate
        }
      });
    }
  }
}

async function copyFromPreviousMonth(entityId: string, targetMonthLabel: string) {
  // Get the previous month
  const [year, month] = targetMonthLabel.split('-').map(Number);
  let prevYear = year;
  let prevMonth = month - 1;
  
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  
  const prevMonthLabel = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
  
  // Find previous month with checklist items
  const previousMonth = await db.monthClose.findUnique({
    where: { entityId_label: { entityId, label: prevMonthLabel } },
    include: {
      checklistItems: {
        include: {
          tasks: true
        }
      }
    }
  });

  if (!previousMonth || previousMonth.checklistItems.length === 0) {
    return; // Nothing to copy
  }

  // Find target month
  const targetMonth = await db.monthClose.findUnique({
    where: { entityId_label: { entityId, label: targetMonthLabel } }
  });

  if (!targetMonth) {
    return; // Target month doesn't exist
  }

  // Check if target month already has items
  const existingItems = await db.checklistItem.findMany({
    where: { monthId: targetMonth.id }
  });

  if (existingItems.length > 0) {
    return; // Already has items, don't copy
  }

  // Copy checklist items and tasks
  for (const item of previousMonth.checklistItems) {
    const newItem = await db.checklistItem.create({
      data: {
        title: item.title,
        assignee: item.assignee,
        dueDate: item.dueDate,
        status: 'NOT_STARTED', // Reset status for new month
        monthId: targetMonth.id
      }
    });

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
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthLabel = searchParams.get('month');
    const entityId = searchParams.get('entityId') || session.user.activeEntityId;

    if (!entityId) {
      return NextResponse.json({ error: 'No active entity' }, { status: 400 });
    }

    // Get user with memberships
    const user = await getUserWithMemberships();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has access to this entity
    if (!canAccessEntity(user, entityId)) {
      return NextResponse.json({ error: 'Access denied to entity' }, { status: 403 });
    }

    // Determine which month to load
    let targetMonth;
    if (monthLabel) {
      // Load specific month
      targetMonth = await db.monthClose.findUnique({
        where: { entityId_label: { entityId, label: monthLabel } },
        include: {
          checklistItems: {
            include: {
              tasks: true
            }
          }
        }
      });

      // If month exists but has no items, try to copy from previous month
      if (targetMonth && targetMonth.checklistItems.length === 0) {
        await copyFromPreviousMonth(entityId, monthLabel);
        
        // Reload the month with copied items
        targetMonth = await db.monthClose.findUnique({
          where: { entityId_label: { entityId, label: monthLabel } },
          include: {
            checklistItems: {
              include: {
                tasks: true
              }
            }
          }
        });
      }
    } else {
      // Load current month or most recent
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      targetMonth = await db.monthClose.findUnique({
        where: { entityId_label: { entityId, label: currentMonth } },
        include: {
          checklistItems: {
            include: {
              tasks: {
              }
            },
          }
        }
      });

      // If current month doesn't exist, get the most recent or create current month
      if (!targetMonth) {
        targetMonth = await db.monthClose.findFirst({
          where: { entityId },
          include: {
            checklistItems: {
              include: {
                tasks: {
                }
              },
            }
          },
          orderBy: { label: 'desc' }
        });

        // If no months exist at all, generate all months for the year
        if (!targetMonth) {
          await generateAllMonthsForYear(entityId, currentYear);
          
          // Now try to find the current month again
          targetMonth = await db.monthClose.findUnique({
            where: { entityId_label: { entityId, label: currentMonth } },
            include: {
              checklistItems: {
                include: {
                  tasks: true
                }
              }
            }
          });
        }
      }
    }

    // Ensure all months for the current year exist
    const currentYear = new Date().getFullYear();
    await generateAllMonthsForYear(entityId, currentYear);

    // Get all available months for the selector
    const availableMonths = await db.monthClose.findMany({
      where: { entityId },
      select: { label: true },
      orderBy: { label: 'desc' }
    });

    if (!targetMonth) {
      return NextResponse.json({ 
        month: null, 
        checklistItems: [], 
        summary: { 
          totalTasks: 0, 
          completedTasks: 0, 
          remainingTasks: 0, 
          overdueTasks: 0, 
          completionPercentage: 0
        },
        availableMonths: availableMonths.map(m => m.label)
      });
    }

    // Calculate summary statistics
    const allTasks = targetMonth.checklistItems.flatMap(item => item.tasks);
    
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.status === 'DONE').length;
    const remainingTasks = totalTasks - completedTasks;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueTasks = allTasks.filter(task => 
      task.dueDate && 
      task.dueDate < today && 
      task.status !== 'DONE'
    ).length;

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Process checklist items
    const checklistItems = targetMonth.checklistItems.map(item => {
      // A checklist item is complete only if ALL its tasks are DONE
      const isComplete = item.tasks.length > 0 ? item.tasks.every(task => task.status === 'DONE') : item.status === 'DONE';
      
      return {
        id: item.id,
        title: item.title,
        assignee: item.assignee,
        dueDate: item.dueDate,
        status: item.status,
        tasks: item.tasks,
        isComplete
      };
    });

    const allChecklistItems = checklistItems;

    const summary = {
      totalTasks,
      completedTasks,
      remainingTasks,
      overdueTasks,
      completionPercentage
    };

    return NextResponse.json({
      month: {
        id: targetMonth.id,
        label: targetMonth.label,
        startDate: targetMonth.startDate,
        endDate: targetMonth.endDate
      },
      checklistItems: allChecklistItems,
      summary,
      availableMonths: availableMonths.map(m => m.label)
    });

  } catch (error: unknown) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
