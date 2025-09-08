import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserWithMemberships, canAccessEntity } from '@/lib/permissions';

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
              tasks: {
              }
            },
          }
        }
      });
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

        // If no months exist at all, create the current month
        if (!targetMonth) {
          const startDate = new Date();
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setDate(0);
          endDate.setHours(23, 59, 59, 999);

          targetMonth = await db.monthClose.create({
            data: {
              entityId,
              label: currentMonth,
              startDate,
              endDate
            },
            include: {
              checklistItems: {
                include: {
                  tasks: {
                  }
                },
              }
            }
          });
        }
      }
    }

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
