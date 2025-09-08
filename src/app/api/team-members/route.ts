import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // Get all team members for the active entity
    const teamMembers = await db.membership.findMany({
      where: { entityId: activeEntityId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // ADMIN first, then MANAGER, then EMPLOYEE
        { user: { name: 'asc' } }
      ]
    });

    // Format the response
    const formattedMembers = teamMembers.map(membership => ({
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role
    }));

    return NextResponse.json({
      teamMembers: formattedMembers,
      activeEntity: {
        id: activeEntityId,
        name: user.memberships.find(m => m.entityId === activeEntityId)?.entity.name
      }
    });

  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
