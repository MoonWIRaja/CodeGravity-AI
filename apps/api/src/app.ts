import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

// Import routes
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { fileRoutes } from './routes/files';
import { aiRoutes } from './routes/ai';
import { settingsRoutes } from './routes/settings';
import { templateRoutes } from './routes/templates';
import { gitRoutes } from './routes/git';

// Import middleware
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimit';

const app = new Hono();

// ═══════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════

app.use('*', logger());
app.use('*', secureHeaders());

// CORS Configuration
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK (Public)
// ═══════════════════════════════════════════════════════════

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

app.get('/api/version', (c) => {
  return c.json({
    name: 'CodeGravity AI API',
    version: '0.1.0',
    runtime: 'Bun',
  });
});

// ═══════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════

// Auth routes (public)
app.route('/api/auth', authRoutes);

// Protected routes (require auth)
const protectedApi = new Hono();
protectedApi.use('*', authMiddleware);
protectedApi.use('*', rateLimiter);

protectedApi.route('/projects', projectRoutes);
protectedApi.route('/files', fileRoutes);
protectedApi.route('/ai', aiRoutes);
protectedApi.route('/settings', settingsRoutes);
protectedApi.route('/templates', templateRoutes);
protectedApi.route('/git', gitRoutes);

app.route('/api', protectedApi);

// ═══════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════

app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  }, 404);
});

app.onError((err, c) => {
  console.error('Server Error:', err);
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'An internal error occurred',
    },
  }, 500);
});

export default app;
