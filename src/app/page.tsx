import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import DashboardContent from '@/app/components/DashboardContent';
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
        tasks: {
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
        tasks: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // If current month doesn't exist, get the most recent
    if (!targetMonth) {
      targetMonth = await prisma.monthClose.findFirst({
        where: { userId: user.id },
        include: {
          tasks: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { label: 'desc' }
      });
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
  const totalTasks = targetMonth.tasks.length;
  const completedTasks = targetMonth.tasks.filter(task => task.status === 'DONE').length;
  const remainingTasks = totalTasks - completedTasks;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overdueTasks = targetMonth.tasks.filter(task => 
    task.dueDate && 
    task.dueDate < today && 
    task.status === 'OPEN'
  ).length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Group tasks by title to create checklist items
  const checklistItems = targetMonth.tasks.reduce((acc, task) => {
    const key = task.title;
    if (!acc[key]) {
      acc[key] = {
        title: task.title,
        tasks: [],
        isComplete: true // Will be updated based on task statuses
      };
    }
    acc[key].tasks.push(task);
    // A checklist item is complete only if ALL its tasks are DONE
    if (task.status !== 'DONE') {
      acc[key].isComplete = false;
    }
    return acc;
  }, {} as Record<string, { title: string; tasks: any[]; isComplete: boolean }>);

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
    checklistItems: Object.values(checklistItems),
    summary,
    availableMonths: availableMonths.map(m => m.label)
  };
}

export default async function Dashboard() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="text-center py-8">Loading dashboard...</div>}>
          <DashboardContent initialData={data} />
        </Suspense>
      </div>
    </div>
  );
}