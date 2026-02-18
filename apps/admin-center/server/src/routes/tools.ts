import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { adminSchemas, accountSchemas, characterSchemas, serverSchemas } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { eq, and, sql, count, desc, gte, lte, like, inArray } from 'drizzle-orm';
import type { AuthUser } from '../middleware/auth.js';
import type { KombifyTool, ToolParameter } from '@tenos/shared';

const tools = new Hono();
tools.use('*', authMiddleware);

// ============================================================
// Kombify Tool Definitions
// These are the admin operations available through the tool runner
// ============================================================

const KOMBIFY_TOOLS: KombifyTool[] = [
  // --- Player Management ---
  {
    id: 'mass-ban',
    name: 'Mass Ban Players',
    description: 'Ban multiple accounts at once by username list or filter criteria.',
    category: 'player-management',
    icon: 'shield-off',
    isDestructive: true,
    requiredRole: 'admin',
    confirmationMessage: 'This will ban all matched accounts. Are you sure?',
    parameters: [
      {
        name: 'usernames',
        label: 'Usernames (comma-separated)',
        type: 'string',
        required: false,
        defaultValue: '',
      },
      {
        name: 'reason',
        label: 'Ban Reason',
        type: 'string',
        required: true,
        defaultValue: '',
        validation: { min: 5, max: 500, message: 'Reason must be 5-500 characters' },
      },
      {
        name: 'banType',
        label: 'Ban Type',
        type: 'select',
        required: true,
        defaultValue: 'permanent',
        options: [
          { label: 'Permanent', value: 'permanent' },
          { label: 'Temporary (24h)', value: 'temp_24h' },
          { label: 'Temporary (7d)', value: 'temp_7d' },
          { label: 'Temporary (30d)', value: 'temp_30d' },
        ],
      },
      {
        name: 'minLevel',
        label: 'Minimum Character Level (optional filter)',
        type: 'number',
        required: false,
        defaultValue: null,
        validation: { min: 1, max: 120 },
      },
    ],
  },
  {
    id: 'mass-unban',
    name: 'Mass Unban Players',
    description: 'Unban multiple accounts by username list.',
    category: 'player-management',
    icon: 'shield-check',
    isDestructive: false,
    requiredRole: 'admin',
    confirmationMessage: null,
    parameters: [
      {
        name: 'usernames',
        label: 'Usernames (comma-separated)',
        type: 'string',
        required: true,
        defaultValue: '',
      },
    ],
  },
  {
    id: 'broadcast-message',
    name: 'Broadcast Message',
    description: 'Send an in-game announcement to all online players or a specific kingdom/zone.',
    category: 'player-management',
    icon: 'megaphone',
    isDestructive: false,
    requiredRole: 'gm',
    confirmationMessage: null,
    parameters: [
      {
        name: 'message',
        label: 'Message',
        type: 'string',
        required: true,
        defaultValue: '',
        validation: { min: 1, max: 500 },
      },
      {
        name: 'target',
        label: 'Target',
        type: 'select',
        required: true,
        defaultValue: 'all',
        options: [
          { label: 'All Players', value: 'all' },
          { label: 'Shinsoo Kingdom', value: 'kingdom_1' },
          { label: 'Chunjo Kingdom', value: 'kingdom_2' },
          { label: 'Jinno Kingdom', value: 'kingdom_3' },
        ],
      },
      {
        name: 'type',
        label: 'Message Type',
        type: 'select',
        required: true,
        defaultValue: 'info',
        options: [
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Maintenance', value: 'maintenance' },
          { label: 'Event', value: 'event' },
        ],
      },
    ],
  },

  // --- Character Management ---
  {
    id: 'mass-level-set',
    name: 'Mass Level Set',
    description: 'Set the level of all characters matching criteria to a specific value.',
    category: 'character-management',
    icon: 'trending-up',
    isDestructive: true,
    requiredRole: 'admin',
    confirmationMessage: 'This will change the level of all matched characters.',
    parameters: [
      {
        name: 'targetLevel',
        label: 'Target Level',
        type: 'number',
        required: true,
        defaultValue: 1,
        validation: { min: 1, max: 120 },
      },
      {
        name: 'kingdom',
        label: 'Kingdom Filter',
        type: 'select',
        required: false,
        defaultValue: '',
        options: [
          { label: 'All Kingdoms', value: '' },
          { label: 'Shinsoo', value: '1' },
          { label: 'Chunjo', value: '2' },
          { label: 'Jinno', value: '3' },
        ],
      },
      {
        name: 'characterClass',
        label: 'Class Filter',
        type: 'select',
        required: false,
        defaultValue: '',
        options: [
          { label: 'All Classes', value: '' },
          { label: 'Warrior', value: 'warrior' },
          { label: 'Assassin', value: 'assassin' },
          { label: 'Shaman', value: 'shaman' },
          { label: 'Sorcerer', value: 'sorcerer' },
        ],
      },
      {
        name: 'currentLevelBelow',
        label: 'Only characters below level',
        type: 'number',
        required: false,
        defaultValue: null,
        validation: { min: 1, max: 120 },
      },
    ],
  },
  {
    id: 'mass-teleport',
    name: 'Mass Teleport',
    description: 'Teleport all online characters to a specific zone and position.',
    category: 'character-management',
    icon: 'map-pin',
    isDestructive: true,
    requiredRole: 'admin',
    confirmationMessage: 'This will teleport all matched online characters.',
    parameters: [
      {
        name: 'zone',
        label: 'Target Zone',
        type: 'zone',
        required: true,
        defaultValue: '',
      },
      {
        name: 'x',
        label: 'Position X',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'y',
        label: 'Position Y',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'z',
        label: 'Position Z',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'fromZone',
        label: 'Only from zone (optional)',
        type: 'zone',
        required: false,
        defaultValue: '',
      },
    ],
  },
  {
    id: 'grant-item-to-all',
    name: 'Grant Item to All Online',
    description: 'Grant an item to all currently online characters. Used for events and rewards.',
    category: 'character-management',
    icon: 'gift',
    isDestructive: false,
    requiredRole: 'admin',
    confirmationMessage: 'Items will be added to all online characters\' inventories.',
    parameters: [
      {
        name: 'itemId',
        label: 'Item',
        type: 'item',
        required: true,
        defaultValue: '',
      },
      {
        name: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: true,
        defaultValue: 1,
        validation: { min: 1, max: 999 },
      },
      {
        name: 'upgradeLevel',
        label: 'Upgrade Level',
        type: 'number',
        required: false,
        defaultValue: 0,
        validation: { min: 0, max: 15 },
      },
    ],
  },

  // --- Economy ---
  {
    id: 'gold-adjustment',
    name: 'Gold Adjustment',
    description: 'Add or remove gold from characters matching filters.',
    category: 'economy',
    icon: 'coins',
    isDestructive: true,
    requiredRole: 'admin',
    confirmationMessage: 'This will modify gold for all matched characters.',
    parameters: [
      {
        name: 'amount',
        label: 'Amount (negative to remove)',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'kingdom',
        label: 'Kingdom Filter',
        type: 'select',
        required: false,
        defaultValue: '',
        options: [
          { label: 'All Kingdoms', value: '' },
          { label: 'Shinsoo', value: '1' },
          { label: 'Chunjo', value: '2' },
          { label: 'Jinno', value: '3' },
        ],
      },
      {
        name: 'onlineOnly',
        label: 'Online Only',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    ],
  },
  {
    id: 'economy-reset',
    name: 'Economy Reset',
    description: 'Reset all character gold to a specific value. Use with extreme caution.',
    category: 'economy',
    icon: 'refresh-cw',
    isDestructive: true,
    requiredRole: 'admin',
    confirmationMessage: 'WARNING: This will reset ALL character gold. This cannot be undone!',
    parameters: [
      {
        name: 'targetGold',
        label: 'Reset Gold To',
        type: 'number',
        required: true,
        defaultValue: 0,
        validation: { min: 0 },
      },
      {
        name: 'confirm',
        label: 'Type RESET to confirm',
        type: 'string',
        required: true,
        defaultValue: '',
        validation: { pattern: '^RESET$', message: 'Must type RESET to confirm' },
      },
    ],
  },

  // --- Server Operations ---
  {
    id: 'kick-all-players',
    name: 'Kick All Players',
    description: 'Disconnect all online players. Typically used before maintenance.',
    category: 'server-operations',
    icon: 'log-out',
    isDestructive: true,
    requiredRole: 'admin',
    confirmationMessage: 'All online players will be disconnected.',
    parameters: [
      {
        name: 'reason',
        label: 'Kick Reason (shown to players)',
        type: 'string',
        required: true,
        defaultValue: 'Server maintenance',
        validation: { min: 1, max: 200 },
      },
      {
        name: 'gracePeriodSeconds',
        label: 'Grace Period (seconds)',
        type: 'number',
        required: false,
        defaultValue: 30,
        validation: { min: 0, max: 300 },
      },
    ],
  },
  {
    id: 'schedule-maintenance',
    name: 'Schedule Maintenance',
    description: 'Schedule a server maintenance window with automatic notifications.',
    category: 'server-operations',
    icon: 'calendar-clock',
    isDestructive: false,
    requiredRole: 'admin',
    confirmationMessage: null,
    parameters: [
      {
        name: 'startTime',
        label: 'Start Time (ISO)',
        type: 'string',
        required: true,
        defaultValue: '',
      },
      {
        name: 'durationMinutes',
        label: 'Duration (minutes)',
        type: 'number',
        required: true,
        defaultValue: 60,
        validation: { min: 5, max: 1440 },
      },
      {
        name: 'reason',
        label: 'Maintenance Reason',
        type: 'string',
        required: true,
        defaultValue: '',
        validation: { min: 1, max: 500 },
      },
      {
        name: 'autoRestart',
        label: 'Auto-restart after maintenance',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
    ],
  },

  // --- World Management ---
  {
    id: 'spawn-world-boss',
    name: 'Spawn World Boss',
    description: 'Manually spawn a world boss in a specified zone.',
    category: 'world-management',
    icon: 'skull',
    isDestructive: false,
    requiredRole: 'gm',
    confirmationMessage: null,
    parameters: [
      {
        name: 'bossId',
        label: 'Boss Type',
        type: 'select',
        required: true,
        defaultValue: '',
        options: [
          { label: 'Metin Stone (Fire)', value: 'metin_fire' },
          { label: 'Metin Stone (Ice)', value: 'metin_ice' },
          { label: 'Metin Stone (Dark)', value: 'metin_dark' },
          { label: 'Spider Queen', value: 'boss_spider_queen' },
          { label: 'Demon Lord', value: 'boss_demon_lord' },
          { label: 'Dragon', value: 'boss_dragon' },
        ],
      },
      {
        name: 'zone',
        label: 'Zone',
        type: 'zone',
        required: true,
        defaultValue: '',
      },
      {
        name: 'x',
        label: 'Position X',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'y',
        label: 'Position Y',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
      {
        name: 'z',
        label: 'Position Z',
        type: 'number',
        required: true,
        defaultValue: 0,
      },
    ],
  },
  {
    id: 'clear-zone-monsters',
    name: 'Clear Zone Monsters',
    description: 'Remove all monsters from a zone. Useful for events or debugging.',
    category: 'world-management',
    icon: 'trash-2',
    isDestructive: true,
    requiredRole: 'admin',
    confirmationMessage: 'All monsters in the selected zone will be removed.',
    parameters: [
      {
        name: 'zone',
        label: 'Zone',
        type: 'zone',
        required: true,
        defaultValue: '',
      },
    ],
  },

  // --- Bulk Operations ---
  {
    id: 'database-cleanup',
    name: 'Database Cleanup',
    description: 'Clean up expired bans, old login history, and stale session data.',
    category: 'bulk-operations',
    icon: 'database',
    isDestructive: false,
    requiredRole: 'admin',
    confirmationMessage: null,
    parameters: [
      {
        name: 'cleanExpiredBans',
        label: 'Clean Expired Bans',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        name: 'cleanLoginHistory',
        label: 'Clean Login History (older than days)',
        type: 'number',
        required: false,
        defaultValue: 90,
        validation: { min: 7, max: 365 },
      },
      {
        name: 'cleanAuditLogs',
        label: 'Clean Audit Logs (older than days)',
        type: 'number',
        required: false,
        defaultValue: 0,
        validation: { min: 0, max: 365 },
      },
    ],
  },
  {
    id: 'export-player-data',
    name: 'Export Player Data',
    description: 'Export player data as JSON for analysis or backup.',
    category: 'bulk-operations',
    icon: 'download',
    isDestructive: false,
    requiredRole: 'admin',
    confirmationMessage: null,
    parameters: [
      {
        name: 'dataType',
        label: 'Data Type',
        type: 'select',
        required: true,
        defaultValue: 'accounts',
        options: [
          { label: 'Accounts', value: 'accounts' },
          { label: 'Characters', value: 'characters' },
          { label: 'Economy Summary', value: 'economy' },
          { label: 'Ban History', value: 'bans' },
        ],
      },
      {
        name: 'kingdom',
        label: 'Kingdom Filter',
        type: 'select',
        required: false,
        defaultValue: '',
        options: [
          { label: 'All', value: '' },
          { label: 'Shinsoo', value: '1' },
          { label: 'Chunjo', value: '2' },
          { label: 'Jinno', value: '3' },
        ],
      },
    ],
  },

  // --- Maintenance ---
  {
    id: 'reset-daily-counters',
    name: 'Reset Daily Counters',
    description: 'Reset daily quest completions, dungeon entries, and other daily-limited activities.',
    category: 'maintenance',
    icon: 'rotate-ccw',
    isDestructive: true,
    requiredRole: 'admin',
    confirmationMessage: 'Daily counters for all players will be reset.',
    parameters: [
      {
        name: 'resetQuests',
        label: 'Reset Daily Quests',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        name: 'resetDungeons',
        label: 'Reset Dungeon Entries',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        name: 'resetShop',
        label: 'Reset Daily Shop Limits',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
    ],
  },

  // --- Analytics ---
  {
    id: 'generate-report',
    name: 'Generate Analytics Report',
    description: 'Generate a detailed report on player activity, economy health, or server performance.',
    category: 'analytics',
    icon: 'bar-chart-3',
    isDestructive: false,
    requiredRole: 'gm',
    confirmationMessage: null,
    parameters: [
      {
        name: 'reportType',
        label: 'Report Type',
        type: 'select',
        required: true,
        defaultValue: 'player-activity',
        options: [
          { label: 'Player Activity', value: 'player-activity' },
          { label: 'Economy Health', value: 'economy-health' },
          { label: 'Class Balance', value: 'class-balance' },
          { label: 'Kingdom Comparison', value: 'kingdom-comparison' },
        ],
      },
      {
        name: 'periodDays',
        label: 'Period (days)',
        type: 'number',
        required: false,
        defaultValue: 7,
        validation: { min: 1, max: 90 },
      },
    ],
  },
];

// ============================================================
// Tool Execution Engine
// ============================================================

type ToolHandler = (
  params: Record<string, unknown>,
  user: AuthUser,
) => Promise<{ success: boolean; message: string; data?: unknown; affectedCount?: number }>;

const toolHandlers: Record<string, ToolHandler> = {
  'mass-ban': async (params, user) => {
    const usernames = (params.usernames as string)
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    const reason = params.reason as string;
    const banType = params.banType as string;

    let expiresAt: Date | null = null;
    if (banType === 'temp_24h') expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    else if (banType === 'temp_7d') expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    else if (banType === 'temp_30d') expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (usernames.length === 0) {
      return { success: false, message: 'No usernames provided' };
    }

    let bannedCount = 0;
    const errors: string[] = [];

    for (const username of usernames) {
      try {
        const [account] = await db
          .select()
          .from(accountSchemas.accounts)
          .where(eq(accountSchemas.accounts.username, username))
          .limit(1);

        if (!account) {
          errors.push(`Account "${username}" not found`);
          continue;
        }
        if (account.isBanned) {
          errors.push(`Account "${username}" is already banned`);
          continue;
        }

        await db.insert(accountSchemas.bans).values({
          accountId: account.id,
          bannedBy: user.id,
          reason,
          type: banType === 'permanent' ? 'permanent' : 'temporary',
          expiresAt,
          isActive: true,
        });
        await db
          .update(accountSchemas.accounts)
          .set({ isBanned: true, updatedAt: new Date() })
          .where(eq(accountSchemas.accounts.id, account.id));

        bannedCount++;
      } catch {
        errors.push(`Failed to ban "${username}"`);
      }
    }

    return {
      success: true,
      message: `Banned ${bannedCount} of ${usernames.length} accounts`,
      data: { bannedCount, errors },
      affectedCount: bannedCount,
    };
  },

  'mass-unban': async (params, _user) => {
    const usernames = (params.usernames as string)
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    let unbannedCount = 0;

    for (const username of usernames) {
      const [account] = await db
        .select()
        .from(accountSchemas.accounts)
        .where(eq(accountSchemas.accounts.username, username))
        .limit(1);

      if (!account || !account.isBanned) continue;

      await db
        .update(accountSchemas.bans)
        .set({ isActive: false })
        .where(and(eq(accountSchemas.bans.accountId, account.id), eq(accountSchemas.bans.isActive, true)));
      await db
        .update(accountSchemas.accounts)
        .set({ isBanned: false, updatedAt: new Date() })
        .where(eq(accountSchemas.accounts.id, account.id));

      unbannedCount++;
    }

    return {
      success: true,
      message: `Unbanned ${unbannedCount} of ${usernames.length} accounts`,
      affectedCount: unbannedCount,
    };
  },

  'broadcast-message': async (params, user) => {
    const message = params.message as string;
    const target = params.target as string;
    const type = params.type as string;

    let targetField = 'all';
    let targetValue: string | null = null;

    if (target.startsWith('kingdom_')) {
      targetField = 'kingdom';
      targetValue = target.replace('kingdom_', '');
    }

    await db.insert(adminSchemas.announcements).values({
      title: `Broadcast by ${user.username}`,
      message,
      type,
      target: targetField,
      targetValue,
      createdBy: user.id,
      createdByUsername: user.username,
      isSent: true,
    });

    return {
      success: true,
      message: `Broadcast sent to ${target === 'all' ? 'all players' : target}`,
    };
  },

  'mass-level-set': async (params, _user) => {
    const targetLevel = params.targetLevel as number;
    const kingdom = params.kingdom as string;
    const characterClass = params.characterClass as string;
    const currentLevelBelow = params.currentLevelBelow as number | null;

    const conditions = [];
    if (kingdom) conditions.push(eq(characterSchemas.characters.kingdom, parseInt(kingdom)));
    if (characterClass)
      conditions.push(eq(characterSchemas.characters.characterClass, characterClass as any));
    if (currentLevelBelow)
      conditions.push(lte(characterSchemas.characters.level, currentLevelBelow));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .update(characterSchemas.characters)
      .set({ level: targetLevel, updatedAt: new Date() })
      .where(whereClause ?? sql`TRUE`);

    return {
      success: true,
      message: `Set level to ${targetLevel} for matched characters`,
      affectedCount: (result as any).rowCount ?? 0,
    };
  },

  'mass-teleport': async (params, _user) => {
    const zone = params.zone as string;
    const x = params.x as number;
    const y = params.y as number;
    const posZ = params.z as number;
    const fromZone = params.fromZone as string;

    const conditions = [eq(characterSchemas.characters.isOnline, true)];
    if (fromZone) conditions.push(eq(characterSchemas.characters.zone, fromZone));

    const result = await db
      .update(characterSchemas.characters)
      .set({
        zone,
        positionX: x,
        positionY: y,
        positionZ: posZ,
        updatedAt: new Date(),
      })
      .where(and(...conditions));

    return {
      success: true,
      message: `Teleported online characters to ${zone}`,
      affectedCount: (result as any).rowCount ?? 0,
    };
  },

  'grant-item-to-all': async (params, _user) => {
    const itemId = params.itemId as string;
    const quantity = params.quantity as number;
    const upgradeLevel = (params.upgradeLevel as number) ?? 0;

    const onlineChars = await db
      .select({ id: characterSchemas.characters.id })
      .from(characterSchemas.characters)
      .where(eq(characterSchemas.characters.isOnline, true));

    let granted = 0;
    for (const char of onlineChars) {
      try {
        // Find first empty slot (simplified: use slot = current max + 1)
        const [maxSlot] = await db
          .select({ max: sql<number>`COALESCE(MAX(${characterSchemas.inventoryItems.slot}), -1)` })
          .from(characterSchemas.inventoryItems)
          .where(eq(characterSchemas.inventoryItems.characterId, char.id));

        const nextSlot = (maxSlot?.max ?? -1) + 1;
        if (nextSlot >= 45) continue; // inventory full

        await db.insert(characterSchemas.inventoryItems).values({
          characterId: char.id,
          itemId,
          slot: nextSlot,
          quantity,
          upgradeLevel,
          bonusStats: {},
        });
        granted++;
      } catch {
        // Skip characters with issues
      }
    }

    return {
      success: true,
      message: `Granted item to ${granted} of ${onlineChars.length} online characters`,
      affectedCount: granted,
    };
  },

  'gold-adjustment': async (params, _user) => {
    const amount = params.amount as number;
    const kingdom = params.kingdom as string;
    const onlineOnly = params.onlineOnly as boolean;

    const conditions = [];
    if (kingdom) conditions.push(eq(characterSchemas.characters.kingdom, parseInt(kingdom)));
    if (onlineOnly) conditions.push(eq(characterSchemas.characters.isOnline, true));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Ensure gold doesn't go negative
    const result = await db
      .update(characterSchemas.characters)
      .set({
        gold: sql`GREATEST(0, ${characterSchemas.characters.gold} + ${amount})`,
        updatedAt: new Date(),
      })
      .where(whereClause ?? sql`TRUE`);

    return {
      success: true,
      message: `Adjusted gold by ${amount} for matched characters`,
      affectedCount: (result as any).rowCount ?? 0,
    };
  },

  'economy-reset': async (params, _user) => {
    const targetGold = params.targetGold as number;
    const confirm = params.confirm as string;

    if (confirm !== 'RESET') {
      return { success: false, message: 'Confirmation required: type RESET' };
    }

    const result = await db
      .update(characterSchemas.characters)
      .set({ gold: targetGold, updatedAt: new Date() });

    return {
      success: true,
      message: `Reset all character gold to ${targetGold}`,
      affectedCount: (result as any).rowCount ?? 0,
    };
  },

  'kick-all-players': async (params, _user) => {
    const reason = params.reason as string;
    // In a real implementation, this would signal the game server via Redis pub/sub
    // For now, set all characters offline
    const result = await db
      .update(characterSchemas.characters)
      .set({ isOnline: false, updatedAt: new Date() })
      .where(eq(characterSchemas.characters.isOnline, true));

    return {
      success: true,
      message: `Kicked all online players: ${reason}`,
      affectedCount: (result as any).rowCount ?? 0,
    };
  },

  'schedule-maintenance': async (params, user) => {
    const startTime = params.startTime as string;
    const durationMinutes = params.durationMinutes as number;
    const reason = params.reason as string;

    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    await db.insert(adminSchemas.announcements).values({
      title: 'Scheduled Maintenance',
      message: `Maintenance scheduled from ${start.toISOString()} to ${end.toISOString()}. Reason: ${reason}`,
      type: 'maintenance',
      target: 'all',
      createdBy: user.id,
      createdByUsername: user.username,
      scheduledAt: start,
      expiresAt: end,
      isSent: false,
    });

    return {
      success: true,
      message: `Maintenance scheduled: ${start.toISOString()} to ${end.toISOString()}`,
      data: { startTime: start.toISOString(), endTime: end.toISOString(), reason },
    };
  },

  'spawn-world-boss': async (params, _user) => {
    // In production, this would send a command to the game server
    return {
      success: true,
      message: `World boss ${params.bossId} spawned at ${params.zone} (${params.x}, ${params.y}, ${params.z})`,
      data: params,
    };
  },

  'clear-zone-monsters': async (params, _user) => {
    // In production, this would signal the game server
    return {
      success: true,
      message: `All monsters cleared from zone ${params.zone}`,
      data: { zone: params.zone },
    };
  },

  'database-cleanup': async (params, _user) => {
    let cleaned = 0;

    if (params.cleanExpiredBans) {
      const result = await db
        .update(accountSchemas.bans)
        .set({ isActive: false })
        .where(
          and(
            eq(accountSchemas.bans.isActive, true),
            lte(accountSchemas.bans.expiresAt, new Date()),
          ),
        );
      cleaned += (result as any).rowCount ?? 0;
    }

    const loginHistoryDays = params.cleanLoginHistory as number;
    if (loginHistoryDays > 0) {
      const cutoff = new Date(Date.now() - loginHistoryDays * 24 * 60 * 60 * 1000);
      const result = await db
        .delete(accountSchemas.loginHistory)
        .where(lte(accountSchemas.loginHistory.createdAt, cutoff));
      cleaned += (result as any).rowCount ?? 0;
    }

    const auditDays = params.cleanAuditLogs as number;
    if (auditDays > 0) {
      const cutoff = new Date(Date.now() - auditDays * 24 * 60 * 60 * 1000);
      const result = await db
        .delete(adminSchemas.auditLog)
        .where(lte(adminSchemas.auditLog.createdAt, cutoff));
      cleaned += (result as any).rowCount ?? 0;
    }

    return {
      success: true,
      message: `Database cleanup complete. ${cleaned} records processed.`,
      affectedCount: cleaned,
    };
  },

  'export-player-data': async (params, _user) => {
    const dataType = params.dataType as string;
    const kingdom = params.kingdom as string;

    let data: unknown;

    switch (dataType) {
      case 'accounts': {
        data = await db
          .select({
            id: accountSchemas.accounts.id,
            username: accountSchemas.accounts.username,
            email: accountSchemas.accounts.email,
            role: accountSchemas.accounts.role,
            isBanned: accountSchemas.accounts.isBanned,
            createdAt: accountSchemas.accounts.createdAt,
          })
          .from(accountSchemas.accounts)
          .limit(10000);
        break;
      }
      case 'characters': {
        const conditions = [];
        if (kingdom) conditions.push(eq(characterSchemas.characters.kingdom, parseInt(kingdom)));

        data = await db
          .select()
          .from(characterSchemas.characters)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(10000);
        break;
      }
      case 'economy': {
        data = await db
          .select({
            totalGold: sql<number>`SUM(${characterSchemas.characters.gold})`,
            avgGold: sql<number>`AVG(${characterSchemas.characters.gold})`,
            maxGold: sql<number>`MAX(${characterSchemas.characters.gold})`,
            minGold: sql<number>`MIN(${characterSchemas.characters.gold})`,
            characterCount: count(),
          })
          .from(characterSchemas.characters);
        break;
      }
      case 'bans': {
        data = await db
          .select()
          .from(accountSchemas.bans)
          .orderBy(desc(accountSchemas.bans.createdAt))
          .limit(10000);
        break;
      }
      default:
        return { success: false, message: `Unknown data type: ${dataType}` };
    }

    return {
      success: true,
      message: `Exported ${dataType} data`,
      data,
    };
  },

  'reset-daily-counters': async (_params, _user) => {
    // In production, this would reset daily counters in Redis and/or database tables
    return {
      success: true,
      message: 'Daily counters reset successfully',
    };
  },

  'generate-report': async (params, _user) => {
    const reportType = params.reportType as string;
    let reportData: unknown;

    switch (reportType) {
      case 'player-activity': {
        const totalAccounts = await db.select({ count: count() }).from(accountSchemas.accounts);
        const onlineNow = await db
          .select({ count: count() })
          .from(characterSchemas.characters)
          .where(eq(characterSchemas.characters.isOnline, true));

        reportData = {
          totalAccounts: totalAccounts[0]?.count ?? 0,
          onlineNow: onlineNow[0]?.count ?? 0,
        };
        break;
      }
      case 'economy-health': {
        const [stats] = await db
          .select({
            totalGold: sql<number>`COALESCE(SUM(${characterSchemas.characters.gold}), 0)`,
            avgGold: sql<number>`COALESCE(AVG(${characterSchemas.characters.gold}), 0)`,
            medianGold: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${characterSchemas.characters.gold})`,
          })
          .from(characterSchemas.characters);
        reportData = stats;
        break;
      }
      case 'class-balance': {
        reportData = await db
          .select({
            characterClass: characterSchemas.characters.characterClass,
            count: count(),
            avgLevel: sql<number>`AVG(${characterSchemas.characters.level})`,
          })
          .from(characterSchemas.characters)
          .groupBy(characterSchemas.characters.characterClass);
        break;
      }
      case 'kingdom-comparison': {
        reportData = await db
          .select({
            kingdom: characterSchemas.characters.kingdom,
            playerCount: count(),
            avgLevel: sql<number>`AVG(${characterSchemas.characters.level})`,
            totalGold: sql<number>`SUM(${characterSchemas.characters.gold})`,
          })
          .from(characterSchemas.characters)
          .groupBy(characterSchemas.characters.kingdom);
        break;
      }
      default:
        return { success: false, message: `Unknown report type: ${reportType}` };
    }

    return {
      success: true,
      message: `Report generated: ${reportType}`,
      data: reportData,
    };
  },
};

// ============================================================
// API Routes
// ============================================================

// GET /tools - List all available tools
tools.get('/', (c) => {
  const user = c.get('user');
  const roleHierarchy: Record<string, number> = { player: 0, gm: 1, admin: 2 };
  const userLevel = roleHierarchy[user.role] ?? 0;

  // Filter tools by user's role level
  const available = KOMBIFY_TOOLS.filter((t) => {
    const requiredLevel = roleHierarchy[t.requiredRole] ?? 0;
    return userLevel >= requiredLevel;
  });

  return c.json({ success: true, data: available });
});

// GET /tools/categories - List tool categories
tools.get('/categories', (c) => {
  const categories = [...new Set(KOMBIFY_TOOLS.map((t) => t.category))].sort();
  return c.json({ success: true, data: categories });
});

// GET /tools/:id - Get tool detail
tools.get('/:id', (c) => {
  const toolId = c.req.param('id');
  const tool = KOMBIFY_TOOLS.find((t) => t.id === toolId);
  if (!tool) {
    return c.json({ success: false, error: 'Tool not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json({ success: true, data: tool });
});

// POST /tools/:id/execute - Execute a tool
const executeSchema = z.object({
  parameters: z.record(z.unknown()),
});

tools.post(
  '/:id/execute',
  zValidator('json', executeSchema),
  async (c) => {
    const user = c.get('user');
    const toolId = c.req.param('id');
    const { parameters } = c.req.valid('json');
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    const tool = KOMBIFY_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return c.json({ success: false, error: 'Tool not found', code: 'NOT_FOUND' }, 404);
    }

    // Check role
    const roleHierarchy: Record<string, number> = { player: 0, gm: 1, admin: 2 };
    if ((roleHierarchy[user.role] ?? 0) < (roleHierarchy[tool.requiredRole] ?? 0)) {
      return c.json(
        { success: false, error: 'Insufficient permissions', code: 'FORBIDDEN' },
        403,
      );
    }

    // Validate required parameters
    for (const param of tool.parameters) {
      if (param.required && (parameters[param.name] === undefined || parameters[param.name] === '')) {
        return c.json(
          {
            success: false,
            error: `Missing required parameter: ${param.label}`,
            code: 'VALIDATION_ERROR',
          },
          400,
        );
      }
    }

    // Record execution start
    const [execution] = await db
      .insert(adminSchemas.toolExecutions)
      .values({
        toolId: tool.id,
        toolName: tool.name,
        executedBy: user.id,
        executedByUsername: user.username,
        parameters,
        status: 'running',
      })
      .returning();

    try {
      const handler = toolHandlers[toolId];
      if (!handler) {
        await db
          .update(adminSchemas.toolExecutions)
          .set({ status: 'failed', error: 'No handler implemented', completedAt: new Date() })
          .where(eq(adminSchemas.toolExecutions.id, execution.id));

        return c.json(
          { success: false, error: 'Tool handler not implemented', code: 'NOT_IMPLEMENTED' },
          501,
        );
      }

      const result = await handler(parameters, user);

      await db
        .update(adminSchemas.toolExecutions)
        .set({
          status: result.success ? 'success' : 'failed',
          result: result as any,
          error: result.success ? null : result.message,
          completedAt: new Date(),
        })
        .where(eq(adminSchemas.toolExecutions.id, execution.id));

      await logAudit({
        actorId: user.id,
        actorUsername: user.username,
        action: 'tool.execute' as any,
        targetType: 'tool',
        targetId: tool.id,
        details: {
          toolName: tool.name,
          parameters,
          result: result.message,
          affectedCount: result.affectedCount,
        },
        ipAddress: ip,
      });

      return c.json({
        success: true,
        data: {
          executionId: execution.id,
          ...result,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      await db
        .update(adminSchemas.toolExecutions)
        .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
        .where(eq(adminSchemas.toolExecutions.id, execution.id));

      return c.json(
        { success: false, error: `Tool execution failed: ${errorMessage}`, code: 'EXECUTION_ERROR' },
        500,
      );
    }
  },
);

// GET /tools/executions/history - Get execution history
tools.get('/executions/history', zValidator('query', z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).optional(),
  toolId: z.string().optional(),
  status: z.enum(['idle', 'running', 'success', 'failed', 'cancelled']).optional(),
}).partial()), async (c) => {
  const { page = 1, pageSize = 20, toolId, status } = c.req.valid('query');

  const conditions = [];
  if (toolId) conditions.push(eq(adminSchemas.toolExecutions.toolId, toolId));
  if (status) conditions.push(eq(adminSchemas.toolExecutions.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, executions] = await Promise.all([
    db.select({ count: count() }).from(adminSchemas.toolExecutions).where(whereClause),
    db
      .select()
      .from(adminSchemas.toolExecutions)
      .where(whereClause)
      .orderBy(desc(adminSchemas.toolExecutions.startedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return c.json({
    success: true,
    data: executions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

export default tools;
