import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getUserWithMemberships, canAccessEntity } from '@/lib/permissions';
import { z } from 'zod';

const switchEntitySchema = z.object({
  entityId: z.string().min(1, 'Entity ID is required'),
});

/**
 * POST /api/auth/switch-entity - Switch active entity for current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserWithMemberships();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entityId } = switchEntitySchema.parse(body);

    // Check if user has access to this entity
    if (!canAccessEntity(user, entityId)) {
      return NextResponse.json(
        { error: 'Access denied to this entity' },
        { status: 403 }
      );
    }

    // Find the entity details
    const membership = user.memberships.find(m => m.entity.id === entityId);
    if (!membership) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Return the entity information
    // Note: In a real implementation, you might want to store this in a separate
    // user preferences table or use a more sophisticated session management
    return NextResponse.json({
      activeEntity: {
        id: membership.entity.id,
        name: membership.entity.name,
        role: membership.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error switching entity:', error);
    return NextResponse.json(
      { error: 'Failed to switch entity' },
      { status: 500 }
    );
  }
}
