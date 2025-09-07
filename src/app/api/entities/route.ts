import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserWithMemberships, requirePermission, isAdmin } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { z } from 'zod';

const createEntitySchema = z.object({
  name: z.string().min(1, 'Entity name is required'),
});

/**
 * GET /api/entities - Get all entities user has access to
 */
export async function GET() {
  try {
    const user = await getUserWithMemberships();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entities = user.memberships.map(membership => ({
      id: membership.entity.id,
      name: membership.entity.name,
      role: membership.role,
    }));

    return NextResponse.json({ entities });
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/entities - Create a new entity (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserWithMemberships();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create entities
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Only admins can create entities' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = createEntitySchema.parse(body);

    // Create entity and automatically add creator as admin
    const entity = await db.entity.create({
      data: {
        name,
        memberships: {
          create: {
            userId: user.id,
            role: Role.ADMIN,
          },
        },
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      entity: {
        id: entity.id,
        name: entity.name,
        createdAt: entity.createdAt,
        memberships: entity.memberships.map(m => ({
          id: m.id,
          role: m.role,
          user: m.user,
        })),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating entity:', error);
    return NextResponse.json(
      { error: 'Failed to create entity' },
      { status: 500 }
    );
  }
}
