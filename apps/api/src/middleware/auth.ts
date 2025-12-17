import { Context, Next } from 'hono';
import { db, sessions, users } from '../db';
import { eq, and, gt } from 'drizzle-orm';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  githubUsername: string | null;
};

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    sessionId: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  // Get token from Authorization header or cookie
  const authHeader = c.req.header('Authorization');
  const cookieToken = c.req.header('Cookie')?.match(/session_token=([^;]+)/)?.[1];
  
  const token = authHeader?.replace('Bearer ', '') || cookieToken;

  if (!token) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }, 401);
  }

  try {
    // Find valid session
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session) {
      return c.json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session expired or invalid',
        },
      }, 401);
    }

    // Get user data
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        githubUsername: users.githubUsername,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      }, 401);
    }

    // Set user in context
    c.set('user', user);
    c.set('sessionId', session.id);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    }, 500);
  }
}
