import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, sshKeys, projects, users } from '../db';
import { eq, and } from 'drizzle-orm';

export const gitRoutes = new Hono();

// ═══════════════════════════════════════════════════════════
// GET /git/ssh-keys - List user's SSH keys
// ═══════════════════════════════════════════════════════════

gitRoutes.get('/ssh-keys', async (c) => {
  const user = c.get('user');

  try {
    const keys = await db
      .select({
        id: sshKeys.id,
        name: sshKeys.name,
        fingerprint: sshKeys.fingerprint,
        lastUsedAt: sshKeys.lastUsedAt,
        createdAt: sshKeys.createdAt,
      })
      .from(sshKeys)
      .where(eq(sshKeys.userId, user.id));

    return c.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    console.error('Get SSH keys error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get SSH keys' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /git/ssh-keys - Generate new SSH key
// ═══════════════════════════════════════════════════════════

const createSSHKeySchema = z.object({
  name: z.string().min(1).max(100),
});

gitRoutes.post('/ssh-keys', zValidator('json', createSSHKeySchema), async (c) => {
  const user = c.get('user');
  const { name } = c.req.valid('json');

  try {
    // TODO: Generate Ed25519 keypair
    // For now, return placeholder
    return c.json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'SSH key generation not yet implemented' },
    }, 501);
  } catch (error) {
    console.error('Create SSH key error:', error);
    return c.json({
      success: false,
      error: { code: 'CREATE_FAILED', message: 'Failed to create SSH key' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /git/ssh-keys/:id - Delete SSH key
// ═══════════════════════════════════════════════════════════

gitRoutes.delete('/ssh-keys/:id', async (c) => {
  const user = c.get('user');
  const keyId = c.req.param('id');

  try {
    const result = await db
      .delete(sshKeys)
      .where(and(eq(sshKeys.id, keyId), eq(sshKeys.userId, user.id)))
      .returning({ id: sshKeys.id });

    if (result.length === 0) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'SSH key not found' },
      }, 404);
    }

    return c.json({
      success: true,
      message: 'SSH key deleted',
    });
  } catch (error) {
    console.error('Delete SSH key error:', error);
    return c.json({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to delete SSH key' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// GET /git/repos - List user's GitHub repos
// ═══════════════════════════════════════════════════════════

gitRoutes.get('/repos', async (c) => {
  const user = c.get('user');

  try {
    // Get user's GitHub access token
    const [userData] = await db
      .select({ githubAccessToken: users.githubAccessToken })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userData?.githubAccessToken) {
      return c.json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'GitHub not connected' },
      }, 400);
    }

    // Fetch repos from GitHub
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Authorization': `Bearer ${userData.githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repos from GitHub');
    }

    const repos = await response.json();

    return c.json({
      success: true,
      data: repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        language: repo.language,
        updatedAt: repo.updated_at,
      })),
    });
  } catch (error) {
    console.error('Get repos error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get repositories' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /git/clone - Clone repository
// ═══════════════════════════════════════════════════════════

const cloneSchema = z.object({
  repoUrl: z.string().url(),
  projectName: z.string().optional(),
});

gitRoutes.post('/clone', zValidator('json', cloneSchema), async (c) => {
  const user = c.get('user');
  const { repoUrl, projectName } = c.req.valid('json');

  try {
    // TODO: Implement git clone
    // For now, return placeholder
    return c.json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Git clone not yet implemented' },
    }, 501);
  } catch (error) {
    console.error('Clone repo error:', error);
    return c.json({
      success: false,
      error: { code: 'CLONE_FAILED', message: 'Failed to clone repository' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /git/push - Push to remote
// ═══════════════════════════════════════════════════════════

const pushSchema = z.object({
  projectId: z.string(),
  message: z.string(),
  branch: z.string().default('main'),
});

gitRoutes.post('/push', zValidator('json', pushSchema), async (c) => {
  const user = c.get('user');
  const { projectId, message, branch } = c.req.valid('json');

  try {
    // TODO: Implement git push
    return c.json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Git push not yet implemented' },
    }, 501);
  } catch (error) {
    console.error('Push error:', error);
    return c.json({
      success: false,
      error: { code: 'PUSH_FAILED', message: 'Failed to push changes' },
    }, 500);
  }
});
