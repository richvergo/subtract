import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import EnhancedDashboardContent from '@/app/components/EnhancedDashboardContent';
import { redirect } from 'next/navigation';

async function getDashboardData(monthLabel?: string) {
  const session = await getSession();
  
  // Log warning if no session
  if (!session) {
    console.warn('No session found, redirecting to register');
    redirect('/register');
  }
  
  if (!session.user?.email) {
    console.warn('Session exists but no user email found, redirecting to register');
    redirect('/register');
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
    console.warn(`User not found for email: ${session.user.email}, redirecting to register`);
    redirect('/register');
  }

  // Get the active entity from session or use the first one
  const activeEntityId = session.user.activeEntityId || user.memberships[0]?.entityId;
  
  if (!activeEntityId) {
    console.warn(`No active entity found for user: ${session.user.email}, redirecting to register`);
    redirect('/register');
  }

  // Determine which month to load
  let targetMonth;
  if (monthLabel) {
    // Load specific month
    targetMonth = await db.monthClose.findUnique({
      where: { entityId_label: { entityId: activeEntityId, label: monthLabel } },
      include: {
        checklistItems: {
          include: {
            tasks: true
          },
        },
      }
    });
  } else {
    // Load current month or most recent
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    targetMonth = await db.monthClose.findUnique({
      where: { entityId_label: { entityId: activeEntityId, label: currentMonth } },
      include: {
        checklistItems: {
          include: {
            tasks: true
          },
        },
      }
    });

    // If current month doesn't exist, get the most recent or create current month
    if (!targetMonth) {
      targetMonth = await db.monthClose.findFirst({
        where: { entityId: activeEntityId },
        include: {
          checklistItems: {
            include: {
              tasks: {
              }
            },
          },
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
            entityId: activeEntityId,
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
            },
          }
        });
      }
    }
  }

  // Get all available months for the selector
  const availableMonths = await db.monthClose.findMany({
    where: { entityId: activeEntityId },
    select: { label: true },
    orderBy: { label: 'desc' }
  });

  if (!targetMonth) {
    return {
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
    };
  }

  // Calculate summary statistics
  const allTasks = targetMonth.checklistItems.flatMap((item: any) => item.tasks);
  
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((task: any) => task.status === 'DONE').length;
  const remainingTasks = totalTasks - completedTasks;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overdueTasks = allTasks.filter((task: any) => 
    task.dueDate && 
    task.dueDate < today && 
    task.status !== 'DONE'
  ).length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Process checklist items
  const checklistItems = targetMonth.checklistItems.map((item: any) => {
    // A checklist item is complete only if ALL its tasks are DONE
    const isComplete = item.tasks.length > 0 ? item.tasks.every((task: any) => task.status === 'DONE') : item.status === 'DONE';
    
    return {
      id: item.id,
      title: item.title,
      assignee: item.assignee,
      dueDate: item.dueDate?.toISOString() || null,
      status: item.status,
      tasks: item.tasks.map((task: any) => ({
        ...task,
        dueDate: task.dueDate?.toISOString() || null
      })),
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

  return {
    month: {
      id: targetMonth.id,
      label: targetMonth.label,
      startDate: targetMonth.startDate.toISOString(),
      endDate: targetMonth.endDate.toISOString()
    },
    checklistItems: allChecklistItems,
    summary,
    availableMonths: availableMonths.map(m => m.label)
  };
}

export default async function Dashboard() {
  const data = await getDashboardData();

  return (
    <div className="p-6">
      <Suspense fallback={<div className="text-center py-8">Loading dashboard...</div>}>
        <EnhancedDashboardContent initialData={data} />
      </Suspense>
    </div>
  );
}