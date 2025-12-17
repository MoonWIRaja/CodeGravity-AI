import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, users, sessions } from '../db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const authRoutes = new Hono();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

// ═══════════════════════════════════════════════════════════
// GET /auth/github - Redirect to GitHub OAuth
// ═══════════════════════════════════════════════════════════

authRoutes.get('/github', (c) => {
  const redirectUri = `${c.req.url.split('/api')[0]}/api/auth/github/callback`;
  const scope = 'user:email read:user repo';
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', scope);
  githubAuthUrl.searchParams.set('state', nanoid());

  return c.redirect(githubAuthUrl.toString());
});

// ═══════════════════════════════════════════════════════════
// GET /auth/github/callback - GitHub OAuth Callback
// ═══════════════════════════════════════════════════════════

authRoutes.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error || !code) {
    return c.redirect(`${process.env.CORS_ORIGIN}/login?error=oauth_failed`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    const githubUser = await userResponse.json() as {
      id: number;
      login: string;
      email: string | null;
      name: string | null;
      avatar_url: string;
    };

    // Get primary email if not public
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });
      const emails = await emailsResponse.json() as { email: string; primary: boolean }[];
      email = emails.find(e => e.primary)?.email || emails[0]?.email;
    }

    if (!email) {
      throw new Error('Could not get email from GitHub');
    }

    // Upsert user in database
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.githubId, String(githubUser.id)))
      .limit(1);

    let userId: string;

    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({
          email,
          name: githubUser.name,
          avatarUrl: githubUser.avatar_url,
          githubUsername: githubUser.login,
          githubAccessToken: tokenData.access_token,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));
      userId = existingUser.id;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: githubUser.name,
          avatarUrl: githubUser.avatar_url,
          githubId: String(githubUser.id),
          githubUsername: githubUser.login,
          githubAccessToken: tokenData.access_token,
        })
        .returning({ id: users.id });
      userId = newUser.id;
    }

    // Create session
    const sessionToken = nanoid(64);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(sessions).values({
      userId,
      token: sessionToken,
      expiresAt,
      ipAddress: c.req.header('x-forwarded-for') || 'unknown',
      userAgent: c.req.header('user-agent') || 'unknown',
    });

    // Redirect to frontend with token
    const redirectUrl = new URL(`${process.env.CORS_ORIGIN}/auth/callback`);
    redirectUrl.searchParams.set('token', sessionToken);

    // Set cookie as well
    c.header('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);

    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return c.redirect(`${process.env.CORS_ORIGIN}/login?error=oauth_failed`);
  }
});

// ═══════════════════════════════════════════════════════════
// GET /auth/session - Get current session
// ═══════════════════════════════════════════════════════════

authRoutes.get('/session', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.header('Cookie')?.match(/session_token=([^;]+)/)?.[1];

  if (!token) {
    return c.json({ success: true, data: { user: null } });
  }

  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      return c.json({ success: true, data: { user: null } });
    }

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

    return c.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Session check error:', error);
    return c.json({ success: true, data: { user: null } });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /auth/logout - Logout
// ═══════════════════════════════════════════════════════════

authRoutes.post('/logout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.header('Cookie')?.match(/session_token=([^;]+)/)?.[1];

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  c.header('Set-Cookie', 'session_token=; Path=/; HttpOnly; Max-Age=0');

  return c.json({ success: true, message: 'Logged out successfully' });
});
