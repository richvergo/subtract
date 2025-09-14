import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Get actor ID for audit purposes with test environment guard
 */
export function getActorIdForAudit(session?: { user?: { id?: string } } | null): string | null {
  if (process.env.DISABLE_DB_AUDIT === '1') return null;
  return session?.user?.id ?? null;
}

/**
 * Get user email safely for database queries
 */
export function getUserEmailForQuery(session?: { user?: { email?: string } } | null): string | null {
  if (!session || !session.user || !session.user.email) return null;
  return session.user.email;
}
