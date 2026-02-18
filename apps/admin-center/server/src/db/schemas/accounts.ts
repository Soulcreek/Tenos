import { pgTable, uuid, varchar, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const playerRoleEnum = pgEnum('player_role', ['player', 'gm', 'admin']);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 32 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: playerRoleEnum('role').notNull().default('player'),
    isBanned: boolean('is_banned').notNull().default(false),
    lastLogin: timestamp('last_login', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_accounts_username').on(table.username),
    index('idx_accounts_email').on(table.email),
    index('idx_accounts_role').on(table.role),
    index('idx_accounts_is_banned').on(table.isBanned),
  ],
);

export const loginHistory = pgTable(
  'login_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: varchar('user_agent', { length: 512 }).notNull().default(''),
    success: boolean('success').notNull(),
    failureReason: varchar('failure_reason', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_login_history_account').on(table.accountId),
    index('idx_login_history_created').on(table.createdAt),
  ],
);

export const bans = pgTable(
  'bans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    bannedBy: uuid('banned_by')
      .notNull()
      .references(() => accounts.id),
    reason: varchar('reason', { length: 1000 }).notNull(),
    type: varchar('type', { length: 20 }).notNull().default('permanent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_bans_account').on(table.accountId),
    index('idx_bans_active').on(table.isActive),
  ],
);
