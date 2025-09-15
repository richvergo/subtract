// 🚫 BACKEND LOCKED
// Do not edit unless on a backend-scoped branch with explicit approval.
// This file is part of the stable backend API and should not be modified
// during frontend development tasks.

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Test if db.task exists
    // const tasks = await db.task.findMany({
    //   take: 1
    // });
    
    return NextResponse.json({ 
      success: true, 
      taskCount: 0,
      hasTaskMethod: false // 'task' in db
    });
  } catch (error: unknown) {
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message,
      hasTaskMethod: false // 'task' in db
    });
  }
}
