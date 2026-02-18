import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { accountSchemas, characterSchemas } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { eq, and, or, like, desc, asc, sql, count } from 'drizzle-orm';
import type { AuthUser } from '../middleware/auth.js';

const { accounts, bans, loginHistory } = accountSchemas;
const { characters } = characterSchemas;

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['player', 'gm', 'admin']).optional(),
  banned: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sortBy: z
    .enum(['username', 'email', 'role', 'createdAt', 'lastLogin'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateBodySchema = z
  .object({
    role: z.enum(['player', 'gm', 'admin']).optional(),
    email: z.string().email().max(255).optional(),
  })
  .refine((data) => data.role !== undefined || data.email !== undefined, {
    message: 'At least one field (role or email) must be provided',
  });

const banBodySchema = z
  .object({
    reason: z.string().min(1).max(1000),
    type: z.enum(['temporary', 'permanent']).default('permanent'),
    expiresAt: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'temporary' && !data.expiresAt) {
        return false;
      }
      return true;
    },
    { message: 'expiresAt is required for temporary bans' },
  )
  .refine(
    (data) => {
      if (data.expiresAt && data.expiresAt <= new Date()) {
        return false;
      }
      return true;
    },
    { message: 'expiresAt must be in the future' },
  );

const idParamSchema = z.object({
  id: z.string().uuid('Invalid account ID'),
});

// ---------------------------------------------------------------------------
// Column mapping for dynamic sort
// ---------------------------------------------------------------------------

const sortColumnMap = {
  username: accounts.username,
  email: accounts.email,
  role: accounts.role,
  createdAt: accounts.createdAt,
  lastLogin: accounts.lastLogin,
} as const;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const players = new Hono();

// All routes require authentication
players.use('*', authMiddleware);

// ---------------------------------------------------------------------------
// GET / - List accounts (paginated, searchable, filterable, sortable)
// ---------------------------------------------------------------------------
players.get('/', zValidator('query', listQuerySchema), async (c) => {
  const { page, pageSize, search, role, banned, sortBy, sortOrder } =
    c.req.valid('query');

  // Build WHERE conditions
  const conditions: ReturnType<typeof eq>[] = [];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(like(accounts.username, pattern), like(accounts.email, pattern))!,
    );
  }

  if (role) {
    conditions.push(eq(accounts.role, role));
  }

  if (banned !== undefined) {
    conditions.push(eq(accounts.isBanned, banned));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total matching rows
  const [totalResult] = await db
    .select({ total: count() })
    .from(accounts)
    .where(whereClause);

  const total = totalResult?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Fetch page of results
  const sortColumn = sortColumnMap[sortBy];
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const rows = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      email: accounts.email,
      role: accounts.role,
      isBanned: accounts.isBanned,
      lastLogin: accounts.lastLogin,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
    })
    .from(accounts)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return c.json({
    success: true,
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /:id - Get account detail (characters, bans, login history)
// ---------------------------------------------------------------------------
players.get('/:id', zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const [account] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      email: accounts.email,
      role: accounts.role,
      isBanned: accounts.isBanned,
      lastLogin: accounts.lastLogin,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
    })
    .from(accounts)
    .where(eq(accounts.id, id));

  if (!account) {
    return c.json({ success: false, error: 'Account not found', code: 'NOT_FOUND' }, 404);
  }

  // Fetch related data in parallel
  const [accountCharacters, accountBans, accountLoginHistory] =
    await Promise.all([
      db
        .select()
        .from(characters)
        .where(eq(characters.accountId, id))
        .orderBy(desc(characters.level)),
      db
        .select()
        .from(bans)
        .where(eq(bans.accountId, id))
        .orderBy(desc(bans.createdAt)),
      db
        .select()
        .from(loginHistory)
        .where(eq(loginHistory.accountId, id))
        .orderBy(desc(loginHistory.createdAt))
        .limit(50),
    ]);

  return c.json({
    success: true,
    data: {
      ...account,
      characters: accountCharacters,
      bans: accountBans,
      loginHistory: accountLoginHistory,
    },
  });
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update account fields (admin only)
// ---------------------------------------------------------------------------
players.patch(
  '/:id',
  requireRole('admin'),
  zValidator('param', idParamSchema),
  zValidator('json', updateBodySchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const user: AuthUser = c.get('user');
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    // Verify target account exists
    const [target] = await db
      .select({ id: accounts.id, username: accounts.username, role: accounts.role, email: accounts.email })
      .from(accounts)
      .where(eq(accounts.id, id));

    if (!target) {
      return c.json({ success: false, error: 'Account not found', code: 'NOT_FOUND' }, 404);
    }

    // Prevent self-demotion
    if (id === user.id && body.role && body.role !== user.role) {
      return c.json(
        { success: false, error: 'Cannot change your own role', code: 'SELF_ROLE_CHANGE' },
        400,
      );
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.role !== undefined) {
      updateData.role = body.role;
    }
    if (body.email !== undefined) {
      updateData.email = body.email;
    }

    const [updated] = await db
      .update(accounts)
      .set(updateData)
      .where(eq(accounts.id, id))
      .returning({
        id: accounts.id,
        username: accounts.username,
        email: accounts.email,
        role: accounts.role,
        isBanned: accounts.isBanned,
        lastLogin: accounts.lastLogin,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
      });

    // Determine audit action
    const auditAction = body.role !== undefined ? 'player.role_change' : 'player.edit';

    const details: Record<string, unknown> = {};
    if (body.role !== undefined) {
      details.previousRole = target.role;
      details.newRole = body.role;
    }
    if (body.email !== undefined) {
      details.previousEmail = target.email;
      details.newEmail = body.email;
    }

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: auditAction,
      targetType: 'account',
      targetId: id,
      details,
      ipAddress: ip,
    });

    return c.json({ success: true, data: updated });
  },
);

// ---------------------------------------------------------------------------
// POST /:id/ban - Ban an account (admin only)
// ---------------------------------------------------------------------------
players.post(
  '/:id/ban',
  requireRole('admin'),
  zValidator('param', idParamSchema),
  zValidator('json', banBodySchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const user: AuthUser = c.get('user');
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    // Verify target account exists
    const [target] = await db
      .select({ id: accounts.id, username: accounts.username, isBanned: accounts.isBanned })
      .from(accounts)
      .where(eq(accounts.id, id));

    if (!target) {
      return c.json({ success: false, error: 'Account not found', code: 'NOT_FOUND' }, 404);
    }

    // Prevent banning yourself
    if (id === user.id) {
      return c.json(
        { success: false, error: 'Cannot ban your own account', code: 'SELF_BAN' },
        400,
      );
    }

    // Already banned check
    if (target.isBanned) {
      return c.json(
        { success: false, error: 'Account is already banned', code: 'ALREADY_BANNED' },
        409,
      );
    }

    // Perform ban in a transaction
    const result = await db.transaction(async (tx) => {
      // Create ban record
      const [banRecord] = await tx
        .insert(bans)
        .values({
          accountId: id,
          bannedBy: user.id,
          reason: body.reason,
          type: body.type,
          expiresAt: body.expiresAt ?? null,
          isActive: true,
        })
        .returning();

      // Flag account as banned
      await tx
        .update(accounts)
        .set({ isBanned: true, updatedAt: new Date() })
        .where(eq(accounts.id, id));

      return banRecord;
    });

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'player.ban',
      targetType: 'account',
      targetId: id,
      details: {
        targetUsername: target.username,
        reason: body.reason,
        type: body.type,
        expiresAt: body.expiresAt?.toISOString() ?? null,
        banId: result.id,
      },
      ipAddress: ip,
    });

    return c.json({ success: true, data: result }, 201);
  },
);

// ---------------------------------------------------------------------------
// POST /:id/unban - Unban an account (admin only)
// ---------------------------------------------------------------------------
players.post(
  '/:id/unban',
  requireRole('admin'),
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const user: AuthUser = c.get('user');
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    // Verify target account exists
    const [target] = await db
      .select({ id: accounts.id, username: accounts.username, isBanned: accounts.isBanned })
      .from(accounts)
      .where(eq(accounts.id, id));

    if (!target) {
      return c.json({ success: false, error: 'Account not found', code: 'NOT_FOUND' }, 404);
    }

    if (!target.isBanned) {
      return c.json(
        { success: false, error: 'Account is not banned', code: 'NOT_BANNED' },
        409,
      );
    }

    // Deactivate all active bans and clear the flag in a transaction
    await db.transaction(async (tx) => {
      await tx
        .update(bans)
        .set({ isActive: false })
        .where(and(eq(bans.accountId, id), eq(bans.isActive, true)));

      await tx
        .update(accounts)
        .set({ isBanned: false, updatedAt: new Date() })
        .where(eq(accounts.id, id));
    });

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'player.unban',
      targetType: 'account',
      targetId: id,
      details: {
        targetUsername: target.username,
      },
      ipAddress: ip,
    });

    return c.json({ success: true, data: { message: 'Account unbanned successfully' } });
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id - Soft-delete: permanently ban the account (admin only)
// ---------------------------------------------------------------------------
players.delete(
  '/:id',
  requireRole('admin'),
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const user: AuthUser = c.get('user');
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    // Verify target account exists
    const [target] = await db
      .select({ id: accounts.id, username: accounts.username })
      .from(accounts)
      .where(eq(accounts.id, id));

    if (!target) {
      return c.json({ success: false, error: 'Account not found', code: 'NOT_FOUND' }, 404);
    }

    // Prevent self-deletion
    if (id === user.id) {
      return c.json(
        { success: false, error: 'Cannot delete your own account', code: 'SELF_DELETE' },
        400,
      );
    }

    // Soft-delete: create permanent ban and flag account
    await db.transaction(async (tx) => {
      // Deactivate any existing active bans first
      await tx
        .update(bans)
        .set({ isActive: false })
        .where(and(eq(bans.accountId, id), eq(bans.isActive, true)));

      // Create a new permanent ban representing the deletion
      await tx.insert(bans).values({
        accountId: id,
        bannedBy: user.id,
        reason: 'Account deleted by administrator',
        type: 'permanent',
        expiresAt: null,
        isActive: true,
      });

      await tx
        .update(accounts)
        .set({ isBanned: true, updatedAt: new Date() })
        .where(eq(accounts.id, id));
    });

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'player.ban',
      targetType: 'account',
      targetId: id,
      details: {
        targetUsername: target.username,
        reason: 'Account deleted by administrator',
        type: 'permanent',
        softDelete: true,
      },
      ipAddress: ip,
    });

    return c.json({ success: true, data: { message: 'Account has been permanently banned' } });
  },
);

export default players;
