/**
 * Input sanitization utilities.
 *
 * Strips potentially dangerous content from user-supplied strings before
 * they reach the database or are returned to other clients.
 */

import { createMiddleware } from 'hono/factory';

/** Strip HTML tags and common XSS vectors from a string */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/javascript:/gi, '') // strip JS protocol
    .replace(/on\w+\s*=/gi, '') // strip event handlers
    .replace(/data:/gi, '') // strip data URIs
    .trim();
}

/** Recursively sanitize all string values in an object */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') return sanitizeString(obj) as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as T;
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }
  return obj;
}

/**
 * Middleware that sanitizes JSON request bodies.
 * Applied globally to strip XSS vectors from all incoming data.
 */
export const sanitizeBody = createMiddleware(async (c, next) => {
  if (
    c.req.method !== 'GET' &&
    c.req.method !== 'HEAD' &&
    c.req.header('content-type')?.includes('application/json')
  ) {
    try {
      const body = await c.req.json();
      const sanitized = sanitizeObject(body);
      // Replace the body on the request context
      // Hono caches parsed JSON, so we use a custom variable
      c.set('sanitizedBody' as any, sanitized);
    } catch {
      // Not valid JSON — let the route handler deal with it
    }
  }
  await next();
});

/**
 * Security headers middleware.
 * Sets common security headers on every response.
 */
export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
});
