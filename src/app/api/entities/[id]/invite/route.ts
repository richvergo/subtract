import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { z } from 'zod';

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(Role).default(Role.EMPLOYEE),
});

/**
 * POST /api/entities/[id]/invite - Invite user to entity (Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entityId = params.id;
    
    // Require admin permission
    const context = await requirePermission(entityId, Role.ADMIN);

    const body = await request.json();
    const { email, role } = inviteUserSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. They must register first.' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db.membership.findUnique({
      where: {
        userId_entityId: {
          userId: user.id,
          entityId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this entity' },
        { status: 400 }
      );
    }

    // Create membership
    const membership = await db.membership.create({
      data: {
        userId: user.id,
        entityId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      membership: {
        id: membership.id,
        role: membership.role,
        user: membership.user,
        entity: membership.entity,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    );
  }
}
