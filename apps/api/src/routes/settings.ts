import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, aiSettings, aiProviderKeys } from '../db';
import { eq } from 'drizzle-orm';

export const settingsRoutes = new Hono();

// ═══════════════════════════════════════════════════════════
// GET /settings/ai - Get AI provider settings
// ═══════════════════════════════════════════════════════════

settingsRoutes.get('/ai', async (c) => {
  const user = c.get('user');

  try {
    const [settings] = await db
      .select({
        provider: aiSettings.provider,
        model: aiSettings.model,
        enableStreaming: aiSettings.enableStreaming,
        maxContextTokens: aiSettings.maxContextTokens,
        hasApiKey: aiSettings.apiKeyEncrypted,
      })
      .from(aiSettings)
      .where(eq(aiSettings.userId, user.id))
      .limit(1);

    // Get all provider keys
    const providerKeys = await db
      .select({
        provider: aiProviderKeys.provider,
        isActive: aiProviderKeys.isActive,
        lastUsedAt: aiProviderKeys.lastUsedAt,
      })
      .from(aiProviderKeys)
      .where(eq(aiProviderKeys.userId, user.id));

    return c.json({
      success: true,
      data: {
        ...settings,
        hasApiKey: !!settings?.hasApiKey,
        providerKeys: providerKeys.map(pk => ({
          ...pk,
          hasKey: true,
        })),
      },
    });
  } catch (error) {
    console.error('Get AI settings error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get settings' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /settings/ai - Update AI provider settings
// ═══════════════════════════════════════════════════════════

const updateAISettingsSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'groq', 'ollama']).optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  enableStreaming: z.boolean().optional(),
  maxContextTokens: z.number().optional(),
});

settingsRoutes.put('/ai', zValidator('json', updateAISettingsSchema), async (c) => {
  const user = c.get('user');
  const updates = c.req.valid('json');

  try {
    // Check if settings exist
    const [existing] = await db
      .select({ id: aiSettings.id })
      .from(aiSettings)
      .where(eq(aiSettings.userId, user.id))
      .limit(1);

    const settingsData: any = {};
    
    if (updates.provider) settingsData.provider = updates.provider;
    if (updates.model) settingsData.model = updates.model;
    if (updates.enableStreaming !== undefined) settingsData.enableStreaming = updates.enableStreaming;
    if (updates.maxContextTokens) settingsData.maxContextTokens = updates.maxContextTokens;
    if (updates.apiKey) {
      // TODO: Encrypt API key
      settingsData.apiKeyEncrypted = updates.apiKey;
    }

    if (existing) {
      await db
        .update(aiSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(aiSettings.id, existing.id));
    } else {
      await db
        .insert(aiSettings)
        .values({
          userId: user.id,
          ...settingsData,
        });
    }

    // If provider API key is provided, also add to provider keys
    if (updates.apiKey && updates.provider) {
      await db
        .insert(aiProviderKeys)
        .values({
          userId: user.id,
          provider: updates.provider,
          apiKeyEncrypted: updates.apiKey,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [aiProviderKeys.userId, aiProviderKeys.provider],
          set: {
            apiKeyEncrypted: updates.apiKey,
            isActive: true,
          },
        });
    }

    return c.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Update AI settings error:', error);
    return c.json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Failed to update settings' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /settings/ai/test - Test API key
// ═══════════════════════════════════════════════════════════

const testKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'groq', 'ollama']),
  apiKey: z.string(),
});

settingsRoutes.post('/ai/test', zValidator('json', testKeySchema), async (c) => {
  const { provider, apiKey } = c.req.valid('json');

  try {
    let testUrl: string;
    let testBody: any;
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    switch (provider) {
      case 'openai':
        testUrl = 'https://api.openai.com/v1/models';
        break;
      case 'anthropic':
        testUrl = 'https://api.anthropic.com/v1/messages';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        };
        testBody = {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        };
        break;
      case 'gemini':
        testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        headers = { 'Content-Type': 'application/json' };
        break;
      case 'deepseek':
        testUrl = 'https://api.deepseek.com/v1/models';
        break;
      case 'groq':
        testUrl = 'https://api.groq.com/openai/v1/models';
        break;
      case 'ollama':
        testUrl = 'http://localhost:11434/api/tags';
        headers = { 'Content-Type': 'application/json' };
        break;
      default:
        return c.json({
          success: false,
          error: { code: 'INVALID_PROVIDER', message: 'Invalid provider' },
        }, 400);
    }

    const response = await fetch(testUrl, {
      method: testBody ? 'POST' : 'GET',
      headers,
      body: testBody ? JSON.stringify(testBody) : undefined,
    });

    if (response.ok) {
      return c.json({
        success: true,
        message: 'API key is valid',
      });
    } else {
      const error = await response.text();
      return c.json({
        success: false,
        error: { code: 'INVALID_KEY', message: `API key validation failed: ${error}` },
      }, 400);
    }
  } catch (error) {
    console.error('Test API key error:', error);
    return c.json({
      success: false,
      error: { code: 'TEST_FAILED', message: 'Failed to test API key' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /settings/ai/provider/:provider - Remove provider key
// ═══════════════════════════════════════════════════════════

settingsRoutes.delete('/ai/provider/:provider', async (c) => {
  const user = c.get('user');
  const provider = c.req.param('provider');

  try {
    await db
      .delete(aiProviderKeys)
      .where(eq(aiProviderKeys.userId, user.id));

    return c.json({
      success: true,
      message: 'Provider key removed',
    });
  } catch (error) {
    console.error('Delete provider key error:', error);
    return c.json({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to remove provider key' },
    }, 500);
  }
});
