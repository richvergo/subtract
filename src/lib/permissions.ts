import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { getUserEmailForQuery } from '@/lib/auth';

export interface UserWithMemberships {
  id: string;
  email: string;
  name: string | null;
  memberships: Array<{
    id: string;
    role: Role;
    entity: {
      id: string;
      name: string;
    };
  }>;
}

export interface PermissionContext {
  user: UserWithMemberships;
  activeEntityId: string;
  userRole: Role;
}

/**
 * Get the current user with their memberships
 */
export async function getUserWithMemberships(): Promise<UserWithMemberships | null> {
  const session = await getServerSession(authOptions);
  const userEmail = getUserEmailForQuery(session);
  if (!userEmail) return null;

  const user = await db.user.findUnique({
    where: { email: userEmail },
    include: {
      memberships: {
        include: {
          entity: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return user;
}

/**
 * Get permission context for a specific entity
 */
export async function getPermissionContext(entityId: string): Promise<PermissionContext | null> {
  const user = await getUserWithMemberships();
  if (!user) return null;

  const membership = user.memberships.find(m => m.entity.id === entityId);
  if (!membership) return null;

  return {
    user,
    activeEntityId: entityId,
    userRole: membership.role,
  };
}

/**
 * Check if user has admin role in any entity
 */
export function isAdmin(user: UserWithMemberships): boolean {
  return user.memberships.some(m => m.role === Role.ADMIN);
}

/**
 * Check if user has admin role in specific entity
 */
export function isAdminInEntity(user: UserWithMemberships, entityId: string): boolean {
  const membership = user.memberships.find(m => m.entity.id === entityId);
  return membership?.role === Role.ADMIN || false;
}

/**
 * Check if user has manager or admin role in specific entity
 */
export function isManagerOrAdminInEntity(user: UserWithMemberships, entityId: string): boolean {
  const membership = user.memberships.find(m => m.entity.id === entityId);
  return membership?.role === Role.ADMIN || membership?.role === Role.MANAGER || false;
}

/**
 * Check if user can access entity
 */
export function canAccessEntity(user: UserWithMemberships, entityId: string): boolean {
  return user.memberships.some(m => m.entity.id === entityId);
}

/**
 * Get all entities user has access to
 */
export function getUserEntities(user: UserWithMemberships) {
  return user.memberships.map(m => ({
    id: m.entity.id,
    name: m.entity.name,
    role: m.role,
  }));
}

/**
 * Check if user can manage users in entity (admin only)
 */
export function canManageUsers(user: UserWithMemberships, entityId: string): boolean {
  return isAdminInEntity(user, entityId);
}

/**
 * Check if user can see all data in entity (manager or admin)
 */
export function canSeeAllData(user: UserWithMemberships, entityId: string): boolean {
  return isManagerOrAdminInEntity(user, entityId);
}

/**
 * Check if user can only see assigned items (employee)
 */
export function isEmployeeOnly(user: UserWithMemberships, entityId: string): boolean {
  const membership = user.memberships.find(m => m.entity.id === entityId);
  return membership?.role === Role.EMPLOYEE || false;
}

/**
 * Middleware helper for API routes
 */
export async function requirePermission(
  entityId: string,
  requiredRole: Role = Role.EMPLOYEE
): Promise<PermissionContext> {
  const context = await getPermissionContext(entityId);
  if (!context) {
    throw new Error('Unauthorized: No access to entity');
  }

  const roleHierarchy = {
    [Role.EMPLOYEE]: 0,
    [Role.MANAGER]: 1,
    [Role.ADMIN]: 2,
  };

  if (roleHierarchy[context.userRole] < roleHierarchy[requiredRole]) {
    throw new Error(`Unauthorized: Requires ${requiredRole} role or higher`);
  }

  return context;
}
