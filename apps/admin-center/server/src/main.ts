import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { requestLogger, logger } from './middleware/logger.js';
import { apiRateLimit } from './middleware/rate-limit.js';
import { securityHeaders, sanitizeBody } from './middleware/security.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

// Route imports
import auth from './routes/auth.js';
import dashboard from './routes/dashboard.js';
import players from './routes/players.js';
import characters from './routes/characters.js';
import servers from './routes/servers.js';
import config from './routes/config.js';
import logs from './routes/logs.js';
import tools from './routes/tools.js';
import events from './routes/events.js';

const app = new Hono();

// --- Global Middleware ---

app.use('*', securityHeaders);

app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  }),
);

app.use('*', requestLogger);
app.use('/api/*', apiRateLimit);
app.use('/api/*', sanitizeBody);

// --- Health Check ---

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'tenos-admin-center',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Deep health check — verifies database connectivity
app.get('/health/deep', async (c) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart, error: err.message };
  }

  const allOk = Object.values(checks).every((ch) => ch.status === 'ok');

  return c.json(
    {
      status: allOk ? 'ok' : 'degraded',
      service: 'tenos-admin-center',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks,
    },
    allOk ? 200 : 503,
  );
});

// --- API Routes ---

app.route('/api/auth', auth);
app.route('/api/dashboard', dashboard);
app.route('/api/players', players);
app.route('/api/characters', characters);
app.route('/api/servers', servers);
app.route('/api/config', config);
app.route('/api/logs', logs);
app.route('/api/tools', tools);
app.route('/api/events', events);

// --- Error Handling ---

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: err.message,
        code: `HTTP_${err.status}`,
      },
      err.status,
    );
  }

  logger.error({ err }, 'Unhandled error');

  return c.json(
    {
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL_ERROR',
    },
    500,
  );
});

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not found',
      code: 'NOT_FOUND',
    },
    404,
  );
});

// --- Start Server ---

const port = parseInt(process.env.PORT ?? '3100');

logger.info(`Tenos Admin Center API starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
