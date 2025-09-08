import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Test if db.task exists
    const tasks = await db.task.findMany({
      take: 1
    });
    
    return NextResponse.json({ 
      success: true, 
      taskCount: tasks.length,
      hasTaskMethod: 'task' in prisma 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hasTaskMethod: 'task' in prisma 
    });
  }
}
