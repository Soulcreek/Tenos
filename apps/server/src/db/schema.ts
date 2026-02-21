import { index, integer, pgTable, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
	id: serial("id").primaryKey(),
	username: text("username").notNull().unique(),
	displayName: text("display_name"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	lastLoginAt: timestamp("last_login_at"),
});

export const characters = pgTable(
	"characters",
	{
		id: serial("id").primaryKey(),
		playerId: integer("player_id")
			.notNull()
			.references(() => players.id),
		name: text("name").notNull(),
		characterClass: text("character_class").notNull().default("warrior"),

		// Location
		zone: text("zone").notNull().default("village-shinsoo"),
		posX: real("pos_x").notNull().default(0),
		posY: real("pos_y").notNull().default(0),
		posZ: real("pos_z").notNull().default(0),

		// Base stats (derived stats are recomputed via recalculateDerivedStats)
		level: integer("level").notNull().default(1),
		xp: integer("xp").notNull().default(0),
		statPoints: integer("stat_points").notNull().default(0),
		str: integer("str").notNull().default(12),
		dex: integer("dex").notNull().default(8),
		intStat: integer("int_stat").notNull().default(5),
		vit: integer("vit").notNull().default(10),

		// Current HP/MP so players reconnect at same health
		hpCurrent: real("hp_current").notNull().default(0),
		mpCurrent: real("mp_current").notNull().default(0),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("characters_player_id_idx").on(table.playerId),
		uniqueIndex("characters_name_idx").on(table.name),
	],
);
