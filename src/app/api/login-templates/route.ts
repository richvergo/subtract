import { NextResponse } from 'next/server';
import { getAllLoginTemplates } from '@/lib/login-templates';

/**
 * GET /api/login-templates - Get all available login templates
 */
export async function GET() {
  try {
    const templates = getAllLoginTemplates();
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching login templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
