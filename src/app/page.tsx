import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import EnhancedDashboardContent from '@/app/components/EnhancedDashboardContent';
import { redirect } from 'next/navigation';

async function getDashboardData(monthLabel?: string) {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect('/register');
  }

  // Find current user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/register');
  }

  // Determine which month to load
  let targetMonth;
  if (monthLabel) {
    // Load specific month
    targetMonth = await prisma.monthClose.findUnique({
      where: { userId_label: { userId: user.id, label: monthLabel } },
      include: {
        checklistItems: {
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        tasks: {
          where: { checklistItemId: null }, // Tasks not associated with checklist items
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  } else {
    // Load current month or most recent
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    targetMonth = await prisma.monthClose.findUnique({
      where: { userId_label: { userId: user.id, label: currentMonth } },
      include: {
        checklistItems: {
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        tasks: {
          where: { checklistItemId: null }, // Tasks not associated with checklist items
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // If current month doesn't exist, get the most recent or create current month
    if (!targetMonth) {
      targetMonth = await prisma.monthClose.findFirst({
        where: { userId: user.id },
        include: {
          checklistItems: {
            include: {
              tasks: {
                orderBy: { createdAt: 'asc' }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          tasks: {
            where: { checklistItemId: null }, // Tasks not associated with checklist items
            orderBy: { createdAt: 'asc' }
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

        targetMonth = await prisma.monthClose.create({
          data: {
            userId: user.id,
            label: currentMonth,
            startDate,
            endDate
          },
          include: {
            checklistItems: {
              include: {
                tasks: {
                  orderBy: { createdAt: 'asc' }
                }
              },
              orderBy: { createdAt: 'asc' }
            },
            tasks: {
              where: { checklistItemId: null },
              orderBy: { createdAt: 'asc' }
            }
          }
        });
      }
    }
  }

  // Get all available months for the selector
  const availableMonths = await prisma.monthClose.findMany({
    where: { userId: user.id },
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
  const allTasks = [
    ...targetMonth.tasks,
    ...targetMonth.checklistItems.flatMap(item => item.tasks)
  ];
  
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

  // Add standalone tasks as checklist items
  const standaloneTasks = targetMonth.tasks.map(task => ({
    id: task.id,
    title: task.title,
    assignee: task.assignee,
    dueDate: task.dueDate,
    status: task.status,
    tasks: [task],
    isComplete: task.status === 'DONE'
  }));

  const allChecklistItems = [...checklistItems, ...standaloneTasks];

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
      startDate: targetMonth.startDate,
      endDate: targetMonth.endDate
    },
    checklistItems: allChecklistItems,
    summary,
    availableMonths: availableMonths.map(m => m.label)
  };
}

export default async function Dashboard() {
  const data = await getDashboardData();

  return (
    <Suspense fallback={<div className="text-center py-8">Loading dashboard...</div>}>
      <DashboardWithSidebar initialData={data} />
    </Suspense>
  );
}