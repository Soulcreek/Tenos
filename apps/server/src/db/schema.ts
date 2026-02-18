import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
	id: serial("id").primaryKey(),
	username: text("username").notNull().unique(),
	displayName: text("display_name"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	lastLoginAt: timestamp("last_login_at"),
});
