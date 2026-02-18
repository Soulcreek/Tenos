import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { adminSchemas } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { eq, and, sql } from 'drizzle-orm';

const config = new Hono();

// All routes require authentication
config.use('*', authMiddleware);

// ---------------------------------------------------------------------------
// GET /categories - Get list of distinct config categories
// (Defined before /:id to avoid route collision)
// ---------------------------------------------------------------------------
config.get('/categories', async (c) => {
  const rows = await db
    .selectDistinct({ category: adminSchemas.gameConfig.category })
    .from(adminSchemas.gameConfig)
    .orderBy(adminSchemas.gameConfig.category);

  const categories = rows.map((r) => r.category);

  return c.json({
    success: true,
    data: categories,
  });
});

// ---------------------------------------------------------------------------
// GET / - List all config entries, optionally filtered by category
// ---------------------------------------------------------------------------
config.get('/', async (c) => {
  const category = c.req.query('category');

  const conditions = category
    ? eq(adminSchemas.gameConfig.category, category)
    : undefined;

  const entries = await db
    .select()
    .from(adminSchemas.gameConfig)
    .where(conditions)
    .orderBy(adminSchemas.gameConfig.category, adminSchemas.gameConfig.key);

  return c.json({
    success: true,
    data: entries,
  });
});

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const updateConfigSchema = z.object({
  value: z.string().min(0).max(10000),
});

const bulkUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        value: z.string().min(0).max(10000),
      }),
    )
    .min(1)
    .max(100),
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update a config value (only if isEditable is true)
// ---------------------------------------------------------------------------
config.patch(
  '/:id',
  requireRole('admin'),
  zValidator('json', updateConfigSchema),
  async (c) => {
    const { id } = c.req.param();
    const { value } = c.req.valid('json');
    const user = c.get('user');
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    const [entry] = await db
      .select()
      .from(adminSchemas.gameConfig)
      .where(eq(adminSchemas.gameConfig.id, id))
      .limit(1);

    if (!entry) {
      return c.json(
        { success: false, error: 'Config entry not found', code: 'NOT_FOUND' },
        404,
      );
    }

    if (!entry.isEditable) {
      return c.json(
        {
          success: false,
          error: `Config entry '${entry.key}' is not editable`,
          code: 'NOT_EDITABLE',
        },
        403,
      );
    }

    const [updated] = await db
      .update(adminSchemas.gameConfig)
      .set({
        value,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(adminSchemas.gameConfig.id, id))
      .returning();

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'config.update',
      targetType: 'config',
      targetId: id,
      details: {
        key: entry.key,
        category: entry.category,
        previousValue: entry.value,
        newValue: value,
      },
      ipAddress: ip,
    });

    return c.json({
      success: true,
      data: updated,
      message: `Config '${entry.category}.${entry.key}' updated`,
    });
  },
);

// ---------------------------------------------------------------------------
// POST /bulk-update - Update multiple config entries at once
// ---------------------------------------------------------------------------
config.post(
  '/bulk-update',
  requireRole('admin'),
  zValidator('json', bulkUpdateSchema),
  async (c) => {
    const { updates } = c.req.valid('json');
    const user = c.get('user');
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    // Fetch all entries we need to update in one query
    const ids = updates.map((u) => u.id);
    const existingEntries = await db
      .select()
      .from(adminSchemas.gameConfig)
      .where(sql`${adminSchemas.gameConfig.id} IN ${ids}`);

    const entryMap = new Map(existingEntries.map((e) => [e.id, e]));

    // Validate all entries exist and are editable before applying any changes
    const errors: Array<{ id: string; error: string }> = [];
    for (const update of updates) {
      const entry = entryMap.get(update.id);
      if (!entry) {
        errors.push({ id: update.id, error: 'Config entry not found' });
      } else if (!entry.isEditable) {
        errors.push({ id: update.id, error: `Config entry '${entry.key}' is not editable` });
      }
    }

    if (errors.length > 0) {
      return c.json(
        {
          success: false,
          error: 'Some config entries cannot be updated',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
        400,
      );
    }

    // Apply all updates
    const results: Array<typeof existingEntries[number]> = [];
    for (const update of updates) {
      const [updated] = await db
        .update(adminSchemas.gameConfig)
        .set({
          value: update.value,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(adminSchemas.gameConfig.id, update.id))
        .returning();

      results.push(updated);

      const entry = entryMap.get(update.id)!;
      await logAudit({
        actorId: user.id,
        actorUsername: user.username,
        action: 'config.update',
        targetType: 'config',
        targetId: update.id,
        details: {
          key: entry.key,
          category: entry.category,
          previousValue: entry.value,
          newValue: update.value,
          bulkUpdate: true,
        },
        ipAddress: ip,
      });
    }

    return c.json({
      success: true,
      data: results,
      message: `${results.length} config entries updated`,
    });
  },
);

export default config;
