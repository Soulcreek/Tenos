import { createMiddleware } from 'hono/factory';
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  if (status >= 500) {
    logger.error({ method, path, status, duration }, 'Request error');
  } else if (status >= 400) {
    logger.warn({ method, path, status, duration }, 'Client error');
  } else {
    logger.info({ method, path, status, duration }, 'Request completed');
  }
});
