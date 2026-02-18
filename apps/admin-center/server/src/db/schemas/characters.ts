import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  real,
  pgEnum,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

export const characterClassEnum = pgEnum('character_class', [
  'warrior',
  'assassin',
  'shaman',
  'sorcerer',
]);

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 32 }).notNull().unique(),
    characterClass: characterClassEnum('character_class').notNull(),
    level: integer('level').notNull().default(1),
    kingdom: integer('kingdom').notNull(),
    experience: integer('experience').notNull().default(0),
    gold: integer('gold').notNull().default(0),
    hp: integer('hp').notNull().default(100),
    maxHp: integer('max_hp').notNull().default(100),
    mp: integer('mp').notNull().default(100),
    maxMp: integer('max_mp').notNull().default(100),
    str: integer('str').notNull().default(5),
    dex: integer('dex').notNull().default(5),
    int: integer('int').notNull().default(5),
    vit: integer('vit').notNull().default(5),
    statPoints: integer('stat_points').notNull().default(0),
    skillPoints: integer('skill_points').notNull().default(0),
    positionX: real('position_x').notNull().default(0),
    positionY: real('position_y').notNull().default(0),
    positionZ: real('position_z').notNull().default(0),
    zone: varchar('zone', { length: 64 }).notNull().default('village-shinsoo'),
    isOnline: boolean('is_online').notNull().default(false),
    playTimeMinutes: integer('play_time_minutes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_characters_account').on(table.accountId),
    index('idx_characters_name').on(table.name),
    index('idx_characters_kingdom').on(table.kingdom),
    index('idx_characters_class').on(table.characterClass),
    index('idx_characters_level').on(table.level),
    index('idx_characters_zone').on(table.zone),
    index('idx_characters_online').on(table.isOnline),
  ],
);

export const itemDefinitions = pgTable(
  'item_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    description: varchar('description', { length: 1000 }).notNull().default(''),
    type: varchar('type', { length: 32 }).notNull(),
    subtype: varchar('subtype', { length: 32 }).notNull().default(''),
    rarity: varchar('rarity', { length: 20 }).notNull().default('common'),
    levelRequirement: integer('level_requirement').notNull().default(0),
    classRequirement: characterClassEnum('class_requirement'),
    baseStats: jsonb('base_stats').notNull().default({}),
    maxStack: integer('max_stack').notNull().default(1),
    isTradeable: boolean('is_tradeable').notNull().default(true),
    iconUrl: varchar('icon_url', { length: 512 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_items_type').on(table.type),
    index('idx_items_rarity').on(table.rarity),
  ],
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => itemDefinitions.id),
    slot: integer('slot').notNull(),
    quantity: integer('quantity').notNull().default(1),
    upgradeLevel: integer('upgrade_level').notNull().default(0),
    bonusStats: jsonb('bonus_stats').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_inventory_character').on(table.characterId),
  ],
);

export const equippedItems = pgTable(
  'equipped_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    slot: varchar('slot', { length: 32 }).notNull(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => itemDefinitions.id),
    upgradeLevel: integer('upgrade_level').notNull().default(0),
    bonusStats: jsonb('bonus_stats').notNull().default({}),
  },
  (table) => [
    index('idx_equipped_character').on(table.characterId),
  ],
);

export const characterSkills = pgTable(
  'character_skills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    skillId: varchar('skill_id', { length: 64 }).notNull(),
    level: integer('level').notNull().default(1),
    slotPosition: integer('slot_position'),
  },
  (table) => [
    index('idx_skills_character').on(table.characterId),
  ],
);
