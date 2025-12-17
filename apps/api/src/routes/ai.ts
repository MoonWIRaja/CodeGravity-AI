import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, aiSettings, aiProviderKeys, aiHistory, projects } from '../db';
import { eq, and, desc } from 'drizzle-orm';

export const aiRoutes = new Hono();

// ═══════════════════════════════════════════════════════════
// AI Provider Configurations
// ═══════════════════════════════════════════════════════════

const AI_PROVIDERS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-pro', 'gemini-1.5-pro'],
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-coder', 'deepseek-chat'],
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  },
  ollama: {
    baseUrl: 'http://localhost:11434/api',
    models: ['codellama', 'llama3', 'mistral'],
  },
};

// ═══════════════════════════════════════════════════════════
// POST /ai/chat - General AI chat
// ═══════════════════════════════════════════════════════════

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  projectId: z.string().optional(),
  stream: z.boolean().default(true),
});

aiRoutes.post('/chat', zValidator('json', chatSchema), async (c) => {
  const user = c.get('user');
  const { messages, projectId, stream } = c.req.valid('json');

  try {
    // Get user's AI settings
    const settings = await getUserAISettings(user.id);
    if (!settings) {
      return c.json({
        success: false,
        error: {
          code: 'NO_API_KEY',
          message: 'Please configure your AI provider API key in Settings',
        },
      }, 400);
    }

    const systemPrompt = `You are a helpful AI coding assistant in CodeGravity AI, an AI-powered IDE. 
Help the user with their coding questions and tasks. Be concise and precise.
Always provide code examples when relevant.`;

    const fullMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
    ];

    if (stream) {
      return streamSSE(c, async (sseStream) => {
        try {
          await streamAIResponse(settings, fullMessages, async (chunk) => {
            await sseStream.writeSSE({ data: JSON.stringify({ type: 'delta', content: chunk }) });
          });
          await sseStream.writeSSE({ data: JSON.stringify({ type: 'complete' }) });
        } catch (error) {
          await sseStream.writeSSE({ data: JSON.stringify({ type: 'error', message: String(error) }) });
        }
      });
    } else {
      const response = await callAIProvider(settings, fullMessages);
      
      // Log to history
      await db.insert(aiHistory).values({
        userId: user.id,
        projectId,
        actionType: 'chat',
        prompt: messages[messages.length - 1]?.content || '',
        response,
        modelUsed: settings.model,
      });

      return c.json({
        success: true,
        data: { content: response },
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    return c.json({
      success: false,
      error: { code: 'AI_ERROR', message: 'Failed to get AI response' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /ai/edit - Inline code edit (Cmd+K)
// ═══════════════════════════════════════════════════════════

const editSchema = z.object({
  code: z.string(),
  instruction: z.string(),
  language: z.string(),
  context: z.object({
    filePath: z.string(),
    projectId: z.string(),
    surroundingCode: z.string().optional(),
  }),
});

aiRoutes.post('/edit', zValidator('json', editSchema), async (c) => {
  const user = c.get('user');
  const { code, instruction, language, context } = c.req.valid('json');

  try {
    const settings = await getUserAISettings(user.id);
    if (!settings) {
      return c.json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'Please configure your AI provider API key' },
      }, 400);
    }

    const prompt = `You are an expert ${language} developer. 
Edit the following code according to the instruction.
Return ONLY the modified code, no explanations.

File: ${context.filePath}

Instruction: ${instruction}

Current code:
\`\`\`${language}
${code}
\`\`\`

${context.surroundingCode ? `Surrounding context:\n${context.surroundingCode}` : ''}

Modified code:`;

    return streamSSE(c, async (sseStream) => {
      try {
        await sseStream.writeSSE({ data: JSON.stringify({ type: 'start' }) });
        
        let fullResponse = '';
        await streamAIResponse(settings, [{ role: 'user', content: prompt }], async (chunk) => {
          fullResponse += chunk;
          await sseStream.writeSSE({ data: JSON.stringify({ type: 'delta', content: chunk }) });
        });

        // Log to history
        await db.insert(aiHistory).values({
          userId: user.id,
          projectId: context.projectId,
          actionType: 'inline_edit',
          prompt: instruction,
          response: fullResponse,
          modelUsed: settings.model,
        });

        await sseStream.writeSSE({ data: JSON.stringify({ type: 'complete', fullCode: fullResponse }) });
      } catch (error) {
        await sseStream.writeSSE({ data: JSON.stringify({ type: 'error', message: String(error) }) });
      }
    });
  } catch (error) {
    console.error('AI edit error:', error);
    return c.json({
      success: false,
      error: { code: 'AI_ERROR', message: 'Failed to edit code' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /ai/explain - Explain code
// ═══════════════════════════════════════════════════════════

const explainSchema = z.object({
  code: z.string(),
  language: z.string(),
  projectId: z.string().optional(),
});

aiRoutes.post('/explain', zValidator('json', explainSchema), async (c) => {
  const user = c.get('user');
  const { code, language, projectId } = c.req.valid('json');

  try {
    const settings = await getUserAISettings(user.id);
    if (!settings) {
      return c.json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'Please configure your AI provider API key' },
      }, 400);
    }

    const prompt = `Explain the following ${language} code in a clear, concise way:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. What this code does
2. Key concepts used
3. Any potential issues or improvements`;

    return streamSSE(c, async (sseStream) => {
      try {
        await streamAIResponse(settings, [{ role: 'user', content: prompt }], async (chunk) => {
          await sseStream.writeSSE({ data: JSON.stringify({ type: 'delta', content: chunk }) });
        });
        await sseStream.writeSSE({ data: JSON.stringify({ type: 'complete' }) });
      } catch (error) {
        await sseStream.writeSSE({ data: JSON.stringify({ type: 'error', message: String(error) }) });
      }
    });
  } catch (error) {
    console.error('AI explain error:', error);
    return c.json({
      success: false,
      error: { code: 'AI_ERROR', message: 'Failed to explain code' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /ai/fix-error - Fix terminal/lint error
// ═══════════════════════════════════════════════════════════

const fixErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  filePath: z.string().optional(),
  projectId: z.string().optional(),
});

aiRoutes.post('/fix-error', zValidator('json', fixErrorSchema), async (c) => {
  const user = c.get('user');
  const { error: errorMessage, code, filePath, projectId } = c.req.valid('json');

  try {
    const settings = await getUserAISettings(user.id);
    if (!settings) {
      return c.json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'Please configure your AI provider API key' },
      }, 400);
    }

    const prompt = `Fix the following error:

Error:
${errorMessage}

${code ? `Related code${filePath ? ` (${filePath})` : ''}:\n\`\`\`\n${code}\n\`\`\`` : ''}

Provide:
1. What caused this error
2. How to fix it
3. The corrected code if applicable`;

    return streamSSE(c, async (sseStream) => {
      try {
        await streamAIResponse(settings, [{ role: 'user', content: prompt }], async (chunk) => {
          await sseStream.writeSSE({ data: JSON.stringify({ type: 'delta', content: chunk }) });
        });
        await sseStream.writeSSE({ data: JSON.stringify({ type: 'complete' }) });
      } catch (error) {
        await sseStream.writeSSE({ data: JSON.stringify({ type: 'error', message: String(error) }) });
      }
    });
  } catch (error) {
    console.error('AI fix error:', error);
    return c.json({
      success: false,
      error: { code: 'AI_ERROR', message: 'Failed to fix error' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// GET /ai/history - Get AI history
// ═══════════════════════════════════════════════════════════

aiRoutes.get('/history', async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '50');

  try {
    const history = await db
      .select()
      .from(aiHistory)
      .where(eq(aiHistory.userId, user.id))
      .orderBy(desc(aiHistory.createdAt))
      .limit(limit);

    return c.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Get AI history error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get history' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

interface AISettings {
  provider: string;
  apiKey: string;
  model: string;
}

async function getUserAISettings(userId: string): Promise<AISettings | null> {
  const [settings] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.userId, userId))
    .limit(1);

  if (!settings?.apiKeyEncrypted) {
    return null;
  }

  // TODO: Decrypt API key properly
  return {
    provider: settings.provider,
    apiKey: settings.apiKeyEncrypted, // Should be decrypted
    model: settings.model || 'gpt-4-turbo',
  };
}

async function callAIProvider(settings: AISettings, messages: any[]): Promise<string> {
  // OpenAI compatible API call
  const response = await fetch(`${AI_PROVIDERS[settings.provider as keyof typeof AI_PROVIDERS]?.baseUrl || AI_PROVIDERS.openai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
    }),
  });

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || '';
}

async function streamAIResponse(settings: AISettings, messages: any[], onChunk: (chunk: string) => Promise<void>): Promise<void> {
  const baseUrl = AI_PROVIDERS[settings.provider as keyof typeof AI_PROVIDERS]?.baseUrl || AI_PROVIDERS.openai.baseUrl;
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: true,
    }),
  });

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          await onChunk(content);
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }
}
