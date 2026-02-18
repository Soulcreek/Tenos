import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { characterSchemas, accountSchemas } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { eq, and, or, like, desc, asc, sql, count, gte, lte } from 'drizzle-orm';
import { BASE_STATS, STAT_POINTS_PER_LEVEL, MAX_LEVEL } from '@tenos/shared';
import type { AuthUser } from '../middleware/auth.js';

const {
  characters,
  inventoryItems,
  equippedItems,
  characterSkills,
  itemDefinitions,
} = characterSchemas;

const { accounts } = accountSchemas;

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  characterClass: z.enum(['warrior', 'assassin', 'shaman', 'sorcerer']).optional(),
  kingdom: z.coerce.number().int().min(1).max(3).optional(),
  minLevel: z.coerce.number().int().min(1).max(MAX_LEVEL).optional(),
  maxLevel: z.coerce.number().int().min(1).max(MAX_LEVEL).optional(),
  zone: z.string().optional(),
  isOnline: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sortBy: z
    .enum(['name', 'level', 'gold', 'createdAt', 'updatedAt', 'playTimeMinutes'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateCharacterSchema = z
  .object({
    level: z.number().int().min(1).max(MAX_LEVEL).optional(),
    gold: z.number().int().min(0).optional(),
    hp: z.number().int().min(0).optional(),
    maxHp: z.number().int().min(1).optional(),
    mp: z.number().int().min(0).optional(),
    maxMp: z.number().int().min(1).optional(),
    str: z.number().int().min(1).optional(),
    dex: z.number().int().min(1).optional(),
    int: z.number().int().min(1).optional(),
    vit: z.number().int().min(1).optional(),
    statPoints: z.number().int().min(0).optional(),
    skillPoints: z.number().int().min(0).optional(),
    positionX: z.number().optional(),
    positionY: z.number().optional(),
    positionZ: z.number().optional(),
    zone: z.string().min(1).max(64).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

const teleportSchema = z.object({
  zone: z.string().min(1).max(64),
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const grantItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  upgradeLevel: z.number().int().min(0).max(15).default(0),
  slot: z.number().int().min(0),
});

const removeItemSchema = z.object({
  inventoryItemId: z.string().uuid(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SORT_COLUMN_MAP = {
  name: characters.name,
  level: characters.level,
  gold: characters.gold,
  createdAt: characters.createdAt,
  updatedAt: characters.updatedAt,
  playTimeMinutes: characters.playTimeMinutes,
} as const;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const app = new Hono();

// All routes require authentication
app.use('*', authMiddleware);

// ---------------------------------------------------------------------------
// GET / - List characters (paginated, filterable, sortable)
// ---------------------------------------------------------------------------
app.get('/', zValidator('query', listQuerySchema), async (c) => {
  const query = c.req.valid('query');

  const conditions = [];

  if (query.search) {
    conditions.push(like(characters.name, `%${query.search}%`));
  }

  if (query.characterClass) {
    conditions.push(eq(characters.characterClass, query.characterClass));
  }

  if (query.kingdom !== undefined) {
    conditions.push(eq(characters.kingdom, query.kingdom));
  }

  if (query.minLevel !== undefined) {
    conditions.push(gte(characters.level, query.minLevel));
  }

  if (query.maxLevel !== undefined) {
    conditions.push(lte(characters.level, query.maxLevel));
  }

  if (query.zone) {
    conditions.push(eq(characters.zone, query.zone));
  }

  if (query.isOnline !== undefined) {
    conditions.push(eq(characters.isOnline, query.isOnline));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = SORT_COLUMN_MAP[query.sortBy];
  const orderFn = query.sortOrder === 'asc' ? asc : desc;

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(characters)
      .where(whereClause),
    db
      .select({
        id: characters.id,
        accountId: characters.accountId,
        name: characters.name,
        characterClass: characters.characterClass,
        level: characters.level,
        kingdom: characters.kingdom,
        experience: characters.experience,
        gold: characters.gold,
        hp: characters.hp,
        maxHp: characters.maxHp,
        mp: characters.mp,
        maxMp: characters.maxMp,
        str: characters.str,
        dex: characters.dex,
        int: characters.int,
        vit: characters.vit,
        statPoints: characters.statPoints,
        skillPoints: characters.skillPoints,
        positionX: characters.positionX,
        positionY: characters.positionY,
        positionZ: characters.positionZ,
        zone: characters.zone,
        isOnline: characters.isOnline,
        playTimeMinutes: characters.playTimeMinutes,
        createdAt: characters.createdAt,
        updatedAt: characters.updatedAt,
        accountUsername: accounts.username,
      })
      .from(characters)
      .leftJoin(accounts, eq(characters.accountId, accounts.id))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return c.json({
    success: true,
    data: rows,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  });
});

// ---------------------------------------------------------------------------
// GET /:id - Character detail (with account, inventory, equipment, skills)
// ---------------------------------------------------------------------------
app.get('/:id', zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const [characterRow] = await db
    .select()
    .from(characters)
    .where(eq(characters.id, id))
    .limit(1);

  if (!characterRow) {
    return c.json({ success: false, error: 'Character not found', code: 'NOT_FOUND' }, 404);
  }

  const [accountRow, inventoryRows, equipmentRows, skillRows] = await Promise.all([
    db
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
      .where(eq(accounts.id, characterRow.accountId))
      .limit(1),
    db
      .select({
        id: inventoryItems.id,
        characterId: inventoryItems.characterId,
        itemId: inventoryItems.itemId,
        slot: inventoryItems.slot,
        quantity: inventoryItems.quantity,
        upgradeLevel: inventoryItems.upgradeLevel,
        bonusStats: inventoryItems.bonusStats,
        createdAt: inventoryItems.createdAt,
        item: {
          id: itemDefinitions.id,
          name: itemDefinitions.name,
          description: itemDefinitions.description,
          type: itemDefinitions.type,
          subtype: itemDefinitions.subtype,
          rarity: itemDefinitions.rarity,
          levelRequirement: itemDefinitions.levelRequirement,
          classRequirement: itemDefinitions.classRequirement,
          baseStats: itemDefinitions.baseStats,
          maxStack: itemDefinitions.maxStack,
          isTradeable: itemDefinitions.isTradeable,
          iconUrl: itemDefinitions.iconUrl,
        },
      })
      .from(inventoryItems)
      .innerJoin(itemDefinitions, eq(inventoryItems.itemId, itemDefinitions.id))
      .where(eq(inventoryItems.characterId, id)),
    db
      .select({
        id: equippedItems.id,
        characterId: equippedItems.characterId,
        slot: equippedItems.slot,
        itemId: equippedItems.itemId,
        upgradeLevel: equippedItems.upgradeLevel,
        bonusStats: equippedItems.bonusStats,
        item: {
          id: itemDefinitions.id,
          name: itemDefinitions.name,
          description: itemDefinitions.description,
          type: itemDefinitions.type,
          subtype: itemDefinitions.subtype,
          rarity: itemDefinitions.rarity,
          levelRequirement: itemDefinitions.levelRequirement,
          classRequirement: itemDefinitions.classRequirement,
          baseStats: itemDefinitions.baseStats,
          maxStack: itemDefinitions.maxStack,
          isTradeable: itemDefinitions.isTradeable,
          iconUrl: itemDefinitions.iconUrl,
        },
      })
      .from(equippedItems)
      .innerJoin(itemDefinitions, eq(equippedItems.itemId, itemDefinitions.id))
      .where(eq(equippedItems.characterId, id)),
    db
      .select()
      .from(characterSkills)
      .where(eq(characterSkills.characterId, id)),
  ]);

  return c.json({
    success: true,
    data: {
      ...characterRow,
      account: accountRow[0] ?? null,
      inventory: inventoryRows,
      equipment: equipmentRows,
      skills: skillRows,
    },
  });
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update character fields
// ---------------------------------------------------------------------------
app.patch(
  '/:id',
  requireRole('gm', 'admin'),
  zValidator('param', idParamSchema),
  zValidator('json', updateCharacterSchema),
  async (c) => {
    const user = c.get('user') as AuthUser;
    const { id } = c.req.valid('param');
    const updates = c.req.valid('json');

    const [existing] = await db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: 'Character not found', code: 'NOT_FOUND' }, 404);
    }

    const [updated] = await db
      .update(characters)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning();

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'character.edit',
      targetType: 'character',
      targetId: id,
      details: { characterName: existing.name, fields: Object.keys(updates), updates },
    });

    return c.json({ success: true, data: updated });
  },
);

// ---------------------------------------------------------------------------
// POST /:id/teleport - Teleport character to zone + position
// ---------------------------------------------------------------------------
app.post(
  '/:id/teleport',
  requireRole('gm', 'admin'),
  zValidator('param', idParamSchema),
  zValidator('json', teleportSchema),
  async (c) => {
    const user = c.get('user') as AuthUser;
    const { id } = c.req.valid('param');
    const { zone, x, y, z: posZ } = c.req.valid('json');

    const [existing] = await db
      .select({ id: characters.id, name: characters.name, zone: characters.zone })
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: 'Character not found', code: 'NOT_FOUND' }, 404);
    }

    const [updated] = await db
      .update(characters)
      .set({
        zone,
        positionX: x,
        positionY: y,
        positionZ: posZ,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'character.teleport',
      targetType: 'character',
      targetId: id,
      details: {
        characterName: existing.name,
        fromZone: existing.zone,
        toZone: zone,
        position: { x, y, z: posZ },
      },
    });

    return c.json({ success: true, data: updated });
  },
);

// ---------------------------------------------------------------------------
// POST /:id/grant-item - Add item to character inventory
// ---------------------------------------------------------------------------
app.post(
  '/:id/grant-item',
  requireRole('gm', 'admin'),
  zValidator('param', idParamSchema),
  zValidator('json', grantItemSchema),
  async (c) => {
    const user = c.get('user') as AuthUser;
    const { id } = c.req.valid('param');
    const { itemId, quantity, upgradeLevel, slot } = c.req.valid('json');

    const [character] = await db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    if (!character) {
      return c.json({ success: false, error: 'Character not found', code: 'NOT_FOUND' }, 404);
    }

    const [item] = await db
      .select({ id: itemDefinitions.id, name: itemDefinitions.name })
      .from(itemDefinitions)
      .where(eq(itemDefinitions.id, itemId))
      .limit(1);

    if (!item) {
      return c.json(
        { success: false, error: 'Item definition not found', code: 'ITEM_NOT_FOUND' },
        404,
      );
    }

    const [existingSlot] = await db
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.characterId, id), eq(inventoryItems.slot, slot)))
      .limit(1);

    if (existingSlot) {
      return c.json(
        { success: false, error: 'Inventory slot is already occupied', code: 'SLOT_OCCUPIED' },
        409,
      );
    }

    const [inserted] = await db
      .insert(inventoryItems)
      .values({
        characterId: id,
        itemId,
        quantity,
        upgradeLevel,
        slot,
      })
      .returning();

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'character.item_grant',
      targetType: 'character',
      targetId: id,
      details: {
        characterName: character.name,
        itemName: item.name,
        itemId,
        quantity,
        upgradeLevel,
        slot,
      },
    });

    return c.json({ success: true, data: inserted }, 201);
  },
);

// ---------------------------------------------------------------------------
// POST /:id/remove-item - Remove item from inventory
// ---------------------------------------------------------------------------
app.post(
  '/:id/remove-item',
  requireRole('gm', 'admin'),
  zValidator('param', idParamSchema),
  zValidator('json', removeItemSchema),
  async (c) => {
    const user = c.get('user') as AuthUser;
    const { id } = c.req.valid('param');
    const { inventoryItemId } = c.req.valid('json');

    const [character] = await db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    if (!character) {
      return c.json({ success: false, error: 'Character not found', code: 'NOT_FOUND' }, 404);
    }

    const [inventoryItem] = await db
      .select({
        id: inventoryItems.id,
        itemId: inventoryItems.itemId,
        slot: inventoryItems.slot,
        quantity: inventoryItems.quantity,
      })
      .from(inventoryItems)
      .where(
        and(eq(inventoryItems.id, inventoryItemId), eq(inventoryItems.characterId, id)),
      )
      .limit(1);

    if (!inventoryItem) {
      return c.json(
        {
          success: false,
          error: 'Inventory item not found or does not belong to this character',
          code: 'INVENTORY_ITEM_NOT_FOUND',
        },
        404,
      );
    }

    // Look up item name for audit details
    const [itemDef] = await db
      .select({ name: itemDefinitions.name })
      .from(itemDefinitions)
      .where(eq(itemDefinitions.id, inventoryItem.itemId))
      .limit(1);

    await db.delete(inventoryItems).where(eq(inventoryItems.id, inventoryItemId));

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'character.item_remove',
      targetType: 'character',
      targetId: id,
      details: {
        characterName: character.name,
        itemName: itemDef?.name ?? 'Unknown',
        itemId: inventoryItem.itemId,
        slot: inventoryItem.slot,
        quantity: inventoryItem.quantity,
        inventoryItemId,
      },
    });

    return c.json({ success: true, data: { removed: inventoryItemId } });
  },
);

// ---------------------------------------------------------------------------
// POST /:id/reset-stats - Reset all allocated stat points back to base
// ---------------------------------------------------------------------------
app.post(
  '/:id/reset-stats',
  requireRole('gm', 'admin'),
  zValidator('param', idParamSchema),
  async (c) => {
    const user = c.get('user') as AuthUser;
    const { id } = c.req.valid('param');

    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    if (!character) {
      return c.json({ success: false, error: 'Character not found', code: 'NOT_FOUND' }, 404);
    }

    const classKey = character.characterClass as keyof typeof BASE_STATS;
    const base = BASE_STATS[classKey];

    // Calculate how many stat points the character has spent beyond their base stats.
    // Total allocated = (current stats) - (base stats for class).
    const spentPoints =
      (character.str - base.str) +
      (character.dex - base.dex) +
      (character.int - base.int) +
      (character.vit - base.vit);

    // Refund all spent points back to the free stat-points pool.
    const refundedStatPoints = character.statPoints + spentPoints;

    const [updated] = await db
      .update(characters)
      .set({
        str: base.str,
        dex: base.dex,
        int: base.int,
        vit: base.vit,
        statPoints: refundedStatPoints,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();

    await logAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: 'character.stat_reset',
      targetType: 'character',
      targetId: id,
      details: {
        characterName: character.name,
        previousStats: {
          str: character.str,
          dex: character.dex,
          int: character.int,
          vit: character.vit,
          statPoints: character.statPoints,
        },
        newStats: {
          str: base.str,
          dex: base.dex,
          int: base.int,
          vit: base.vit,
          statPoints: refundedStatPoints,
        },
        pointsRefunded: spentPoints,
      },
    });

    return c.json({ success: true, data: updated });
  },
);

export default app;
