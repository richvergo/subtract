import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

/**
 * Security middleware for event-related operations
 */
export class EventSecurity {
  /**
   * Validates that the user is authenticated and owns the agent
   */
  static async validateAgentOwnership(agentId: string, request: NextRequest): Promise<{
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
  static async validateUserAuthentication(request: NextRequest): Promise<{
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
  static sanitizeEventData(eventData: any): any {
    const sanitized = { ...eventData };

    // Remove password-related values
    if (sanitized.value && (
      sanitized.target?.toLowerCase().includes('password') ||
      sanitized.elementType?.toLowerCase().includes('password') ||
      sanitized.target?.toLowerCase().includes('pass') ||
      sanitized.value.includes('***') // Common password masking
    )) {
      sanitized.value = '[REDACTED]';
    }

    // Remove sensitive URLs (login pages, etc.)
    if (sanitized.url && (
      sanitized.url.includes('/login') ||
      sanitized.url.includes('/signin') ||
      sanitized.url.includes('/auth')
    )) {
      sanitized.url = sanitized.url.replace(/\/[^\/]*$/, '/[REDACTED]');
    }

    return sanitized;
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
