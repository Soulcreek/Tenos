import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  text,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

export const toolStatusEnum = pgEnum('tool_status', [
  'idle',
  'running',
  'success',
  'failed',
  'cancelled',
]);

export const gameConfig = pgTable(
  'game_config',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    category: varchar('category', { length: 64 }).notNull(),
    key: varchar('key', { length: 128 }).notNull(),
    value: text('value').notNull(),
    valueType: varchar('value_type', { length: 20 }).notNull().default('string'),
    description: varchar('description', { length: 500 }).notNull().default(''),
    isEditable: boolean('is_editable').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by').references(() => accounts.id),
  },
  (table) => [
    index('idx_config_category').on(table.category),
    index('idx_config_key').on(table.key),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => accounts.id),
    actorUsername: varchar('actor_username', { length: 32 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    targetType: varchar('target_type', { length: 32 }),
    targetId: uuid('target_id'),
    details: jsonb('details').notNull().default({}),
    ipAddress: varchar('ip_address', { length: 45 }).notNull().default('unknown'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_actor').on(table.actorId),
    index('idx_audit_action').on(table.action),
    index('idx_audit_target').on(table.targetType, table.targetId),
    index('idx_audit_created').on(table.createdAt),
  ],
);

export const toolExecutions = pgTable(
  'tool_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    toolId: varchar('tool_id', { length: 64 }).notNull(),
    toolName: varchar('tool_name', { length: 128 }).notNull(),
    executedBy: uuid('executed_by')
      .notNull()
      .references(() => accounts.id),
    executedByUsername: varchar('executed_by_username', { length: 32 }).notNull(),
    parameters: jsonb('parameters').notNull().default({}),
    status: toolStatusEnum('status').notNull().default('idle'),
    result: jsonb('result'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_tool_exec_tool').on(table.toolId),
    index('idx_tool_exec_status').on(table.status),
    index('idx_tool_exec_started').on(table.startedAt),
  ],
);

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    type: varchar('type', { length: 20 }).notNull().default('info'),
    target: varchar('target', { length: 20 }).notNull().default('all'),
    targetValue: varchar('target_value', { length: 128 }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => accounts.id),
    createdByUsername: varchar('created_by_username', { length: 32 }).notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isSent: boolean('is_sent').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_announcements_type').on(table.type),
    index('idx_announcements_sent').on(table.isSent),
  ],
);

export const playerActivityLog = pgTable(
  'player_activity_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    onlineCount: integer('online_count').notNull().default(0),
    peakCount: integer('peak_count').notNull().default(0),
  },
  (table) => [
    index('idx_activity_timestamp').on(table.timestamp),
  ],
);
