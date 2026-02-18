/**
 * Database seed script for Tenos Admin Center
 *
 * Seeds the database with sample data for development and testing.
 * Run with: bun run db:seed
 */

import { db } from './index.js';
import { accounts, loginHistory, bans } from './schemas/accounts.js';
import { characters, itemDefinitions, inventoryItems, equippedItems } from './schemas/characters.js';
import { gameServers, serverZones } from './schemas/servers.js';
import { gameConfig, auditLog, announcements, playerActivityLog } from './schemas/admin.js';
import { ZONES } from '@tenos/shared';

async function seed() {
  console.log('Seeding database...');

  // --- Admin & GM accounts ---
  const hashedPassword = await Bun.password.hash('admin123', {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
  });

  const gmPassword = await Bun.password.hash('gm123', {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
  });

  const playerPassword = await Bun.password.hash('player123', {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
  });

  const [adminAccount] = await db
    .insert(accounts)
    .values({
      username: 'admin',
      email: 'admin@tenos.dev',
      passwordHash: hashedPassword,
      role: 'admin',
    })
    .onConflictDoNothing()
    .returning();

  const [gmAccount] = await db
    .insert(accounts)
    .values({
      username: 'gamemaster',
      email: 'gm@tenos.dev',
      passwordHash: gmPassword,
      role: 'gm',
    })
    .onConflictDoNothing()
    .returning();

  // Seed player accounts
  const playerAccounts = [];
  const playerNames = [
    'DragonSlayer', 'ShadowBlade', 'MysticHealer', 'IronFist', 'FrostMage',
    'NightAssassin', 'StormCaller', 'BloodKnight', 'SilverArrow', 'DarkPriest',
    'CrimsonWolf', 'GhostHunter', 'ThunderBolt', 'SoulReaper', 'FlameWitch',
    'IceQueen', 'WarHammer', 'VenomStrike', 'SkyWalker', 'EarthShaker',
    'MoonBlade', 'SunFire', 'StarDust', 'DeathWhisper', 'LightBringer',
    'ShadowDancer', 'WildHeart', 'SteelNerve', 'QuickSilver', 'BoneBreaker',
  ];

  for (const name of playerNames) {
    const [acc] = await db
      .insert(accounts)
      .values({
        username: name,
        email: `${name.toLowerCase()}@test.com`,
        passwordHash: playerPassword,
        role: 'player',
      })
      .onConflictDoNothing()
      .returning();
    if (acc) playerAccounts.push(acc);
  }

  console.log(`  Created ${playerAccounts.length + 2} accounts`);

  // --- Characters ---
  const classes = ['warrior', 'assassin', 'shaman', 'sorcerer'] as const;
  const kingdoms = [1, 2, 3];
  const zones = ZONES.map((z) => z.id);

  const allCharacters = [];

  // Admin character
  if (adminAccount) {
    const [char] = await db
      .insert(characters)
      .values({
        accountId: adminAccount.id,
        name: 'AdminChar',
        characterClass: 'warrior',
        level: 120,
        kingdom: 1,
        experience: 99999999,
        gold: 9999999,
        hp: 50000,
        maxHp: 50000,
        mp: 30000,
        maxMp: 30000,
        str: 200,
        dex: 100,
        int: 50,
        vit: 150,
        zone: 'village-shinsoo',
        isOnline: false,
        playTimeMinutes: 99999,
      })
      .onConflictDoNothing()
      .returning();
    if (char) allCharacters.push(char);
  }

  // GM character
  if (gmAccount) {
    const [char] = await db
      .insert(characters)
      .values({
        accountId: gmAccount.id,
        name: 'GMWatcher',
        characterClass: 'shaman',
        level: 120,
        kingdom: 2,
        experience: 99999999,
        gold: 5000000,
        hp: 40000,
        maxHp: 40000,
        mp: 50000,
        maxMp: 50000,
        str: 50,
        dex: 50,
        int: 200,
        vit: 100,
        zone: 'village-chunjo',
        isOnline: true,
        playTimeMinutes: 50000,
      })
      .onConflictDoNothing()
      .returning();
    if (char) allCharacters.push(char);
  }

  // Player characters (1-3 per account)
  for (const acc of playerAccounts) {
    const numChars = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numChars; i++) {
      const cls = classes[Math.floor(Math.random() * classes.length)];
      const kingdom = kingdoms[Math.floor(Math.random() * kingdoms.length)];
      const level = Math.floor(Math.random() * 100) + 1;
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const isOnline = Math.random() > 0.7;

      const [char] = await db
        .insert(characters)
        .values({
          accountId: acc.id,
          name: `${acc.username}_${cls.slice(0, 3)}${i}`,
          characterClass: cls,
          level,
          kingdom,
          experience: Math.floor(Math.random() * 1000000),
          gold: Math.floor(Math.random() * 500000),
          hp: 100 + level * 50,
          maxHp: 100 + level * 50,
          mp: 100 + level * 30,
          maxMp: 100 + level * 30,
          str: 5 + Math.floor(Math.random() * level * 2),
          dex: 5 + Math.floor(Math.random() * level * 2),
          int: 5 + Math.floor(Math.random() * level * 2),
          vit: 5 + Math.floor(Math.random() * level * 2),
          statPoints: Math.floor(Math.random() * 20),
          skillPoints: Math.floor(Math.random() * 10),
          positionX: Math.random() * 1000,
          positionY: Math.random() * 100,
          positionZ: Math.random() * 1000,
          zone,
          isOnline,
          playTimeMinutes: Math.floor(Math.random() * 10000),
        })
        .onConflictDoNothing()
        .returning();
      if (char) allCharacters.push(char);
    }
  }

  console.log(`  Created ${allCharacters.length} characters`);

  // --- Item Definitions ---
  const items = [
    { name: 'Iron Sword', type: 'weapon', subtype: 'sword', rarity: 'common', levelRequirement: 1, baseStats: { attack: 10 }, maxStack: 1 },
    { name: 'Steel Blade', type: 'weapon', subtype: 'sword', rarity: 'uncommon', levelRequirement: 15, baseStats: { attack: 25 }, maxStack: 1 },
    { name: 'Dragon Slayer', type: 'weapon', subtype: 'sword', rarity: 'epic', levelRequirement: 60, baseStats: { attack: 120, critChance: 5 }, maxStack: 1 },
    { name: 'Shadow Dagger', type: 'weapon', subtype: 'dagger', rarity: 'rare', levelRequirement: 30, baseStats: { attack: 45, attackSpeed: 10 }, maxStack: 1 },
    { name: 'Arcane Staff', type: 'weapon', subtype: 'staff', rarity: 'rare', levelRequirement: 25, baseStats: { magicAttack: 55 }, maxStack: 1 },
    { name: 'Leather Armor', type: 'armor', subtype: 'body', rarity: 'common', levelRequirement: 1, baseStats: { defense: 8 }, maxStack: 1 },
    { name: 'Plate Armor', type: 'armor', subtype: 'body', rarity: 'uncommon', levelRequirement: 20, baseStats: { defense: 35 }, maxStack: 1 },
    { name: 'Dragon Scale Armor', type: 'armor', subtype: 'body', rarity: 'legendary', levelRequirement: 80, baseStats: { defense: 200, hp: 500 }, maxStack: 1 },
    { name: 'Iron Helmet', type: 'armor', subtype: 'head', rarity: 'common', levelRequirement: 5, baseStats: { defense: 5 }, maxStack: 1 },
    { name: 'Boots of Speed', type: 'armor', subtype: 'feet', rarity: 'rare', levelRequirement: 25, baseStats: { defense: 15, moveSpeed: 10 }, maxStack: 1 },
    { name: 'Ring of Power', type: 'accessory', subtype: 'ring', rarity: 'epic', levelRequirement: 50, baseStats: { attack: 30, magicAttack: 30 }, maxStack: 1 },
    { name: 'Amulet of Protection', type: 'accessory', subtype: 'necklace', rarity: 'rare', levelRequirement: 35, baseStats: { defense: 20, hp: 200 }, maxStack: 1 },
    { name: 'Health Potion (S)', type: 'consumable', subtype: 'potion', rarity: 'common', levelRequirement: 1, baseStats: { hpRestore: 100 }, maxStack: 99 },
    { name: 'Health Potion (M)', type: 'consumable', subtype: 'potion', rarity: 'common', levelRequirement: 20, baseStats: { hpRestore: 500 }, maxStack: 99 },
    { name: 'Health Potion (L)', type: 'consumable', subtype: 'potion', rarity: 'uncommon', levelRequirement: 50, baseStats: { hpRestore: 2000 }, maxStack: 99 },
    { name: 'Mana Potion (S)', type: 'consumable', subtype: 'potion', rarity: 'common', levelRequirement: 1, baseStats: { mpRestore: 100 }, maxStack: 99 },
    { name: 'Upgrade Stone', type: 'material', subtype: 'upgrade', rarity: 'uncommon', levelRequirement: 1, baseStats: {}, maxStack: 50 },
    { name: 'Dragon Essence', type: 'material', subtype: 'rare_material', rarity: 'epic', levelRequirement: 1, baseStats: {}, maxStack: 10 },
    { name: 'Teleport Scroll', type: 'consumable', subtype: 'scroll', rarity: 'common', levelRequirement: 1, baseStats: {}, maxStack: 20 },
    { name: 'Experience Potion', type: 'consumable', subtype: 'potion', rarity: 'rare', levelRequirement: 1, baseStats: { xpBoost: 50 }, maxStack: 10 },
  ];

  const insertedItems = [];
  for (const item of items) {
    const [inserted] = await db
      .insert(itemDefinitions)
      .values({
        name: item.name,
        description: `A ${item.rarity} ${item.subtype}`,
        type: item.type,
        subtype: item.subtype,
        rarity: item.rarity,
        levelRequirement: item.levelRequirement,
        baseStats: item.baseStats,
        maxStack: item.maxStack,
        isTradeable: true,
      })
      .returning();
    insertedItems.push(inserted);
  }

  console.log(`  Created ${insertedItems.length} item definitions`);

  // --- Game Servers ---
  const [server1] = await db
    .insert(gameServers)
    .values({
      name: 'Tenos EU-1',
      host: '10.0.1.10',
      port: 2567,
      status: 'online',
      currentPlayers: allCharacters.filter((c) => c.isOnline).length,
      maxPlayers: 1000,
      cpuUsage: 35.2,
      memoryUsage: 62.8,
      uptime: 86400 * 3,
      version: '0.1.0-alpha',
      lastHeartbeat: new Date(),
    })
    .returning();

  const [server2] = await db
    .insert(gameServers)
    .values({
      name: 'Tenos EU-2',
      host: '10.0.1.11',
      port: 2567,
      status: 'online',
      currentPlayers: 0,
      maxPlayers: 1000,
      cpuUsage: 12.1,
      memoryUsage: 41.3,
      uptime: 86400,
      version: '0.1.0-alpha',
      lastHeartbeat: new Date(),
    })
    .returning();

  const [server3] = await db
    .insert(gameServers)
    .values({
      name: 'Tenos US-1',
      host: '10.0.2.10',
      port: 2567,
      status: 'maintenance',
      currentPlayers: 0,
      maxPlayers: 1000,
      cpuUsage: 0,
      memoryUsage: 0,
      uptime: 0,
      version: '0.1.0-alpha',
    })
    .returning();

  // Server zones
  for (const zone of ZONES) {
    await db.insert(serverZones).values({
      serverId: server1.id,
      zoneId: zone.id,
      name: zone.name,
      playerCount: Math.floor(Math.random() * 20),
      monsterCount: Math.floor(Math.random() * 100) + 20,
      maxPlayers: zone.maxPlayers,
    });
  }

  console.log('  Created 3 game servers with zones');

  // --- Game Config ---
  const configEntries = [
    { category: 'gameplay', key: 'max_level', value: '120', valueType: 'number', description: 'Maximum character level' },
    { category: 'gameplay', key: 'exp_rate', value: '1.0', valueType: 'number', description: 'Experience gain multiplier' },
    { category: 'gameplay', key: 'gold_rate', value: '1.0', valueType: 'number', description: 'Gold drop multiplier' },
    { category: 'gameplay', key: 'drop_rate', value: '1.0', valueType: 'number', description: 'Item drop rate multiplier' },
    { category: 'gameplay', key: 'pvp_enabled', value: 'true', valueType: 'boolean', description: 'Enable PvP combat' },
    { category: 'gameplay', key: 'max_characters_per_account', value: '4', valueType: 'number', description: 'Max characters per account' },
    { category: 'combat', key: 'base_attack_speed', value: '1.5', valueType: 'number', description: 'Base attack speed in seconds' },
    { category: 'combat', key: 'critical_damage_multiplier', value: '2.0', valueType: 'number', description: 'Critical hit damage multiplier' },
    { category: 'combat', key: 'monster_respawn_time', value: '30', valueType: 'number', description: 'Monster respawn time in seconds' },
    { category: 'combat', key: 'death_penalty_exp_loss', value: '5', valueType: 'number', description: 'XP loss on death (percentage)' },
    { category: 'economy', key: 'trade_tax_rate', value: '5', valueType: 'number', description: 'Trade tax percentage' },
    { category: 'economy', key: 'marketplace_fee', value: '3', valueType: 'number', description: 'Marketplace listing fee percentage' },
    { category: 'economy', key: 'max_gold_per_character', value: '999999999', valueType: 'number', description: 'Maximum gold a character can hold' },
    { category: 'economy', key: 'npc_buy_price_multiplier', value: '0.5', valueType: 'number', description: 'NPC buy price vs sell price ratio' },
    { category: 'server', key: 'tick_rate', value: '20', valueType: 'number', description: 'Server tick rate (Hz)', isEditable: false },
    { category: 'server', key: 'max_players_per_zone', value: '200', valueType: 'number', description: 'Max players per zone' },
    { category: 'server', key: 'afk_kick_minutes', value: '30', valueType: 'number', description: 'AFK kick timer in minutes' },
    { category: 'server', key: 'maintenance_mode', value: 'false', valueType: 'boolean', description: 'Enable maintenance mode' },
    { category: 'upgrade', key: 'upgrade_base_success_rate', value: '90', valueType: 'number', description: 'Base upgrade success rate (percentage)' },
    { category: 'upgrade', key: 'upgrade_rate_decrease_per_level', value: '8', valueType: 'number', description: 'Success rate decrease per upgrade level' },
    { category: 'upgrade', key: 'upgrade_destroy_on_fail', value: 'true', valueType: 'boolean', description: 'Destroy item on upgrade failure above +9' },
    { category: 'event', key: 'double_exp_active', value: 'false', valueType: 'boolean', description: 'Double EXP event active' },
    { category: 'event', key: 'double_drop_active', value: 'false', valueType: 'boolean', description: 'Double drop rate event active' },
    { category: 'event', key: 'event_exp_multiplier', value: '2.0', valueType: 'number', description: 'Event EXP multiplier when active' },
  ];

  for (const cfg of configEntries) {
    await db.insert(gameConfig).values({
      category: cfg.category,
      key: cfg.key,
      value: cfg.value,
      valueType: cfg.valueType,
      description: cfg.description,
      isEditable: cfg.isEditable ?? true,
    });
  }

  console.log(`  Created ${configEntries.length} config entries`);

  // --- Sample Audit Log ---
  if (adminAccount) {
    const auditEntries = [
      { action: 'auth.login', details: { ip: '192.168.1.1' } },
      { action: 'config.update', targetType: 'config', details: { key: 'exp_rate', oldValue: '1.0', newValue: '1.5' } },
      { action: 'player.ban', targetType: 'account', details: { username: 'TestCheater', reason: 'Speed hack' } },
      { action: 'server.restart', targetType: 'server', details: { serverName: 'Tenos EU-1' } },
      { action: 'tool.execute', targetType: 'tool', details: { toolName: 'Database Cleanup', result: 'Cleaned 150 records' } },
    ];

    for (const entry of auditEntries) {
      await db.insert(auditLog).values({
        actorId: adminAccount.id,
        actorUsername: 'admin',
        action: entry.action,
        targetType: entry.targetType ?? null,
        details: entry.details,
        ipAddress: '127.0.0.1',
      });
    }

    console.log('  Created sample audit log entries');
  }

  // --- Player Activity Log (last 24 hours) ---
  const now = Date.now();
  for (let i = 0; i < 48; i++) {
    const timestamp = new Date(now - i * 30 * 60 * 1000); // every 30 min
    const baseCount = 15;
    const variation = Math.floor(Math.random() * 20) - 5;
    const hourOfDay = timestamp.getHours();
    // Simulate daily pattern
    const timeMultiplier = hourOfDay >= 18 && hourOfDay <= 23 ? 2.5 : hourOfDay >= 12 ? 1.5 : 0.7;
    const count = Math.max(0, Math.floor((baseCount + variation) * timeMultiplier));

    await db.insert(playerActivityLog).values({
      timestamp,
      onlineCount: count,
      peakCount: count + Math.floor(Math.random() * 5),
    });
  }

  console.log('  Created player activity log data');

  // --- Announcements ---
  if (adminAccount) {
    await db.insert(announcements).values([
      {
        title: 'Server Launch',
        message: 'Welcome to Tenos! The servers are now live. Enjoy your adventure!',
        type: 'info',
        target: 'all',
        createdBy: adminAccount.id,
        createdByUsername: 'admin',
        isSent: true,
      },
      {
        title: 'Scheduled Maintenance',
        message: 'Server maintenance scheduled. Please save your progress.',
        type: 'maintenance',
        target: 'all',
        createdBy: adminAccount.id,
        createdByUsername: 'admin',
        scheduledAt: new Date(now + 24 * 60 * 60 * 1000),
        isSent: false,
      },
      {
        title: 'Double EXP Weekend',
        message: 'Double EXP is active this weekend! Level up your characters!',
        type: 'event',
        target: 'all',
        createdBy: adminAccount.id,
        createdByUsername: 'admin',
        isSent: true,
      },
    ]);

    console.log('  Created sample announcements');
  }

  // Ban a few players for realism
  if (adminAccount && playerAccounts.length >= 3) {
    for (let i = 0; i < 3; i++) {
      const target = playerAccounts[playerAccounts.length - 1 - i];
      await db.insert(bans).values({
        accountId: target.id,
        bannedBy: adminAccount.id,
        reason: ['Speed hacking', 'Gold duplication exploit', 'Harassment'][i],
        type: i === 0 ? 'permanent' : 'temporary',
        expiresAt: i === 0 ? null : new Date(now + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      });
      await db.update(accounts).set({ isBanned: true }).where(
        // @ts-ignore - drizzle quirk
        accounts.id.equals ? undefined : undefined,
      );
      // Update via raw eq
      const { eq: eqFn } = await import('drizzle-orm');
      await db.update(accounts).set({ isBanned: true }).where(eqFn(accounts.id, target.id));
    }

    console.log('  Created sample bans');
  }

  console.log('\nSeed complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin: admin / admin123');
  console.log('  GM:    gamemaster / gm123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
