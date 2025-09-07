import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateMembershipSchema = z.object({
  role: z.nativeEnum(Role),
});

/**
 * PATCH /api/memberships/[id] - Update membership role (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const membershipId = params.id;

    // Get the membership to find the entity
    const membership = await db.membership.findUnique({
      where: { id: membershipId },
      include: {
        entity: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Require admin permission for the entity
    const context = await requirePermission(membership.entityId, Role.ADMIN);

    const body = await request.json();
    const { role } = updateMembershipSchema.parse(body);

    // Update the membership
    const updatedMembership = await db.membership.update({
      where: { id: membershipId },
      data: { role },
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
        id: updatedMembership.id,
        role: updatedMembership.role,
        user: updatedMembership.user,
        entity: updatedMembership.entity,
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

    console.error('Error updating membership:', error);
    return NextResponse.json(
      { error: 'Failed to update membership' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memberships/[id] - Remove user from entity (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const membershipId = params.id;

    // Get the membership to find the entity
    const membership = await db.membership.findUnique({
      where: { id: membershipId },
      include: {
        entity: true,
        user: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Require admin permission for the entity
    const context = await requirePermission(membership.entityId, Role.ADMIN);

    // Prevent removing the last admin
    if (membership.role === Role.ADMIN) {
      const adminCount = await db.membership.count({
        where: {
          entityId: membership.entityId,
          role: Role.ADMIN,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin from an entity' },
          { status: 400 }
        );
      }
    }

    // Delete the membership
    await db.membership.delete({
      where: { id: membershipId },
    });

    return NextResponse.json({
      message: 'User removed from entity successfully',
      removedUser: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Error removing membership:', error);
    return NextResponse.json(
      { error: 'Failed to remove membership' },
      { status: 500 }
    );
  }
}
