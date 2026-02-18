import {
  pgTable,
  uuid,
  varchar,
  integer,
  real,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

export const serverStatusEnum = pgEnum('server_status', [
  'online',
  'offline',
  'maintenance',
  'starting',
  'stopping',
]);

export const gameServers = pgTable(
  'game_servers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    host: varchar('host', { length: 255 }).notNull(),
    port: integer('port').notNull(),
    status: serverStatusEnum('status').notNull().default('offline'),
    currentPlayers: integer('current_players').notNull().default(0),
    maxPlayers: integer('max_players').notNull().default(1000),
    cpuUsage: real('cpu_usage').notNull().default(0),
    memoryUsage: real('memory_usage').notNull().default(0),
    uptime: integer('uptime').notNull().default(0),
    version: varchar('version', { length: 32 }).notNull().default('0.0.0'),
    lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_servers_status').on(table.status),
  ],
);

export const serverZones = pgTable(
  'server_zones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id')
      .notNull()
      .references(() => gameServers.id, { onDelete: 'cascade' }),
    zoneId: varchar('zone_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    playerCount: integer('player_count').notNull().default(0),
    monsterCount: integer('monster_count').notNull().default(0),
    maxPlayers: integer('max_players').notNull().default(200),
  },
  (table) => [
    index('idx_zones_server').on(table.serverId),
  ],
);
