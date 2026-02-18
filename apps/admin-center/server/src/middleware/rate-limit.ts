/**
 * In-memory rate limiter middleware for Hono.
 *
 * Uses a sliding window counter per IP address. In production this should
 * be backed by Redis (INCR + EXPIRE) so it works across multiple processes,
 * but the in-memory version is fine for a single-server deployment.
 */

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Maximum number of requests per window */
  max: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Optional key extractor – defaults to IP address */
  keyExtractor?: (c: any) => string;
  /** Optional message */
  message?: string;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup stale entries every 60 s
setInterval(() => {
  const now = Date.now();
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }
}, 60_000);

export function rateLimiter(opts: RateLimitOptions) {
  const storeId = `${opts.max}:${opts.windowSeconds}:${Math.random()}`;
  const store = new Map<string, RateLimitEntry>();
  stores.set(storeId, store);

  return createMiddleware(async (c, next) => {
    const key = opts.keyExtractor
      ? opts.keyExtractor(c)
      : c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + opts.windowSeconds * 1000 };
      store.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, opts.max - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    c.header('X-RateLimit-Limit', String(opts.max));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    if (entry.count > opts.max) {
      c.header('Retry-After', String(resetSeconds));
      throw new HTTPException(429, {
        message: opts.message ?? 'Too many requests. Please try again later.',
      });
    }

    await next();
  });
}

/** Pre-built rate limiters for common use cases */
export const loginRateLimit = rateLimiter({
  max: 5,
  windowSeconds: 60,
  message: 'Too many login attempts. Please wait 60 seconds.',
});

export const apiRateLimit = rateLimiter({
  max: 200,
  windowSeconds: 60,
});

export const toolExecutionRateLimit = rateLimiter({
  max: 10,
  windowSeconds: 60,
  message: 'Tool execution rate limit exceeded. Max 10 per minute.',
});
