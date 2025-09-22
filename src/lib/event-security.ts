// import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';

/**
 * Security middleware for event-related operations
 */
export class EventSecurity {
  /**
   * Validates that the user is authenticated and owns the agent
   */
  static async validateAgentOwnership(agentId: string): Promise<{
    authorized: boolean;
    user?: { id: string; email: string };
    error?: string;
  }> {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          authorized: false,
          error: 'Unauthorized - No valid session'
        };
      }

      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true },
      });

      if (!user) {
        return {
          authorized: false,
          error: 'User not found'
        };
      }

      // Check if agent exists and user owns it
      const agent = await db.agent.findFirst({
        where: {
          id: agentId,
          ownerId: user.id,
        },
        select: { id: true },
      });

      if (!agent) {
        return {
          authorized: false,
          error: 'Agent not found or access denied'
        };
      }

      return {
        authorized: true,
        user
      };
    } catch (error) {
      console.error('Event security validation error:', error);
      return {
        authorized: false,
        error: 'Security validation failed'
      };
    }
  }

  /**
   * Validates that the user is authenticated for general event operations
   */
  static async validateUserAuthentication(): Promise<{
    authorized: boolean;
    user?: { id: string; email: string };
    error?: string;
  }> {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          authorized: false,
          error: 'Unauthorized - No valid session'
        };
      }

      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true },
      });

      if (!user) {
        return {
          authorized: false,
          error: 'User not found'
        };
      }

      return {
        authorized: true,
        user
      };
    } catch (error) {
      console.error('User authentication validation error:', error);
      return {
        authorized: false,
        error: 'Authentication validation failed'
      };
    }
  }

  /**
   * Sanitizes event data to remove sensitive information
   */
  static sanitizeEventData(eventData: unknown): unknown {
    const sanitized = eventData && typeof eventData === 'object' ? { ...eventData } : {};

    // Remove password-related values
    const sanitizedObj = sanitized as Record<string, unknown>;
    if (sanitizedObj.value && (
      (sanitizedObj.target as string)?.toLowerCase().includes('password') ||
      (sanitizedObj.elementType as string)?.toLowerCase().includes('password') ||
      (sanitizedObj.target as string)?.toLowerCase().includes('pass') ||
      (sanitizedObj.value as string).includes('***') // Common password masking
    )) {
      sanitizedObj.value = '[REDACTED]';
    }

    // Remove sensitive URLs (login pages, etc.)
    if (sanitizedObj.url && (
      (sanitizedObj.url as string).includes('/login') ||
      (sanitizedObj.url as string).includes('/signin') ||
      (sanitizedObj.url as string).includes('/auth')
    )) {
      sanitizedObj.url = (sanitizedObj.url as string).replace(/\/[^\/]*$/, '/[REDACTED]');
    }

    return sanitizedObj;
  }

  /**
   * Validates file upload security
   */
  static validateFileSecurity(filename: string, size: number, mimeType: string): {
    valid: boolean;
    error?: string;
  } {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return {
        valid: false,
        error: 'Invalid filename - path traversal detected'
      };
    }

    // Check file size (200KB limit for screenshots)
    if (size > 200 * 1024) {
      return {
        valid: false,
        error: 'File too large - maximum 200KB allowed'
      };
    }

    // Check MIME type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type - only ${allowedTypes.join(', ')} allowed`
      };
    }

    return { valid: true };
  }
}
