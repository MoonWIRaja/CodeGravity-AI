import { Context, Next } from 'hono';
import { Redis } from 'ioredis';

// Redis client (lazy initialization)
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redis;
}

// Rate limit configuration per endpoint type
const RATE_LIMITS = {
  default: { requests: 100, window: 60 }, // 100 req/min
  ai: { requests: 20, window: 60 },       // 20 req/min for AI
  auth: { requests: 10, window: 60 },     // 10 req/min for auth
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

function getRateLimitType(path: string): RateLimitType {
  if (path.startsWith('/api/ai')) return 'ai';
  if (path.startsWith('/api/auth')) return 'auth';
  return 'default';
}

export async function rateLimiter(c: Context, next: Next) {
  try {
    const redis = getRedis();
    const user = c.get('user');
    const path = c.req.path;
    const limitType = getRateLimitType(path);
    const { requests, window } = RATE_LIMITS[limitType];

    // Create rate limit key
    const key = `ratelimit:${user?.id || c.req.header('x-forwarded-for') || 'anonymous'}:${limitType}`;

    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= requests) {
      return c.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please wait ${window} seconds.`,
          retryAfter: window,
        },
      }, 429);
    }

    // Increment counter
    if (count === 0) {
      await redis.setex(key, window, '1');
    } else {
      await redis.incr(key);
    }

    // Add rate limit headers
    c.header('X-RateLimit-Limit', requests.toString());
    c.header('X-RateLimit-Remaining', (requests - count - 1).toString());

    await next();
  } catch (error) {
    // If Redis fails, allow request but log error
    console.error('Rate limiter error:', error);
    await next();
  }
}
