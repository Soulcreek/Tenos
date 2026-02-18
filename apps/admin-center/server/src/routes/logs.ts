import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { adminSchemas } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { eq, and, desc, sql, count, gte, lte, like } from 'drizzle-orm';

const logs = new Hono();

// All routes require authentication
logs.use('*', authMiddleware);

// ---------------------------------------------------------------------------
// GET /audit/actions - Get distinct audit action types
// (Defined before /audit to avoid route collision with pagination params)
// ---------------------------------------------------------------------------
logs.get('/audit/actions', async (c) => {
  const rows = await db
    .selectDistinct({ action: adminSchemas.auditLog.action })
    .from(adminSchemas.auditLog)
    .orderBy(adminSchemas.auditLog.action);

  const actions = rows.map((r) => r.action);

  return c.json({
    success: true,
    data: actions,
  });
});

// ---------------------------------------------------------------------------
// GET /audit - List audit logs with pagination and filters
// ---------------------------------------------------------------------------
logs.get('/audit', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize') ?? '50')));
  const action = c.req.query('action');
  const actor = c.req.query('actor');
  const targetType = c.req.query('targetType');
  const targetId = c.req.query('targetId');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');

  // Build dynamic filter conditions
  const conditions: Array<ReturnType<typeof eq>> = [];

  if (action) {
    conditions.push(eq(adminSchemas.auditLog.action, action));
  }

  if (actor) {
    conditions.push(like(adminSchemas.auditLog.actorUsername, `%${actor}%`));
  }

  if (targetType) {
    conditions.push(eq(adminSchemas.auditLog.targetType, targetType));
  }

  if (targetId) {
    conditions.push(eq(adminSchemas.auditLog.targetId, targetId));
  }

  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!isNaN(from.getTime())) {
      conditions.push(gte(adminSchemas.auditLog.createdAt, from));
    }
  }

  if (dateTo) {
    const to = new Date(dateTo);
    if (!isNaN(to.getTime())) {
      conditions.push(lte(adminSchemas.auditLog.createdAt, to));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(adminSchemas.auditLog)
    .where(whereClause);

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const entries = await db
    .select()
    .from(adminSchemas.auditLog)
    .where(whereClause)
    .orderBy(desc(adminSchemas.auditLog.createdAt))
    .limit(pageSize)
    .offset(offset);

  return c.json({
    success: true,
    data: entries,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ---------------------------------------------------------------------------
// GET /announcements - List announcements
// ---------------------------------------------------------------------------
logs.get('/announcements', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize') ?? '25')));
  const type = c.req.query('type');

  const conditions: Array<ReturnType<typeof eq>> = [];

  if (type) {
    conditions.push(eq(adminSchemas.announcements.type, type));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(adminSchemas.announcements)
    .where(whereClause);

  const offset = (page - 1) * pageSize;
  const entries = await db
    .select()
    .from(adminSchemas.announcements)
    .where(whereClause)
    .orderBy(desc(adminSchemas.announcements.createdAt))
    .limit(pageSize)
    .offset(offset);

  return c.json({
    success: true,
    data: entries,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1).max(5000),
  type: z.enum(['info', 'warning', 'maintenance', 'event']).default('info'),
  target: z.enum(['all', 'kingdom', 'zone', 'server']).default('all'),
  targetValue: z.string().max(128).nullish(),
  scheduledAt: z.string().datetime({ offset: true }).nullish(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
});

// ---------------------------------------------------------------------------
// POST /announcements - Create announcement
// ---------------------------------------------------------------------------
logs.post(
  '/announcements',
  requireRole('admin'),
  zValidator('json', createAnnouncementSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    // Validate targetValue is provided when target is not 'all'
    if (body.target !== 'all' && !body.targetValue) {
      return c.json(
        {
          success: false,
          error: `targetValue is required when target is '${body.target}'`,
          code: 'VALIDATION_ERROR',
        },
        400,
      );
    }

    const [announcement] = await db
      .insert(adminSchemas.announcements)
      .values({
        title: body.title,
        message: body.message,
        type: body.type,
        target: body.target,
        targetValue: body.targetValue ?? null,
        createdBy: user.id,
        createdByUsername: user.username,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      })
      .returning();

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'announcement.send',
      targetType: 'announcement',
      targetId: announcement.id,
      details: {
        title: body.title,
        type: body.type,
        target: body.target,
        targetValue: body.targetValue ?? null,
      },
      ipAddress: ip,
    });

    return c.json(
      {
        success: true,
        data: announcement,
        message: 'Announcement created',
      },
      201,
    );
  },
);

// ---------------------------------------------------------------------------
// DELETE /announcements/:id - Delete announcement
// ---------------------------------------------------------------------------
logs.delete('/announcements/:id', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';

  const [announcement] = await db
    .select()
    .from(adminSchemas.announcements)
    .where(eq(adminSchemas.announcements.id, id))
    .limit(1);

  if (!announcement) {
    return c.json(
      { success: false, error: 'Announcement not found', code: 'NOT_FOUND' },
      404,
    );
  }

  await db
    .delete(adminSchemas.announcements)
    .where(eq(adminSchemas.announcements.id, id));

  await logAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: 'announcement.send',
    targetType: 'announcement',
    targetId: id,
    details: {
      title: announcement.title,
      action: 'deleted',
    },
    ipAddress: ip,
  });

  return c.json({
    success: true,
    message: 'Announcement deleted',
  });
});

export default logs;
