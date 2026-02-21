// ============================================================
// Shared Constants for Tenos
// ============================================================

export const MAX_CHARACTERS_PER_ACCOUNT = 4;
export const MAX_LEVEL = 120;
export const MAX_INVENTORY_SLOTS = 45;
export const MAX_SKILL_SLOTS = 10;
export const MAX_UPGRADE_LEVEL = 15;

export const BASE_STATS = {
	warrior: { str: 12, dex: 8, int: 5, vit: 10 },
	assassin: { str: 8, dex: 12, int: 5, vit: 7 },
	shaman: { str: 5, dex: 7, int: 12, vit: 8 },
	sorcerer: { str: 5, dex: 5, int: 14, vit: 8 },
} as const;

export const STAT_POINTS_PER_LEVEL = 3;
export const SKILL_POINTS_PER_LEVEL = 1;

export const XP_TABLE: Record<number, number> = {};
for (let i = 1; i <= 120; i++) {
	XP_TABLE[i] = Math.floor(100 * i ** 2.2);
}

export const EQUIPMENT_SLOTS = [
	"weapon",
	"helmet",
	"armor",
	"boots",
	"shield",
	"earring",
	"bracelet",
	"necklace",
] as const;

export const ITEM_RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export const ITEM_TYPES = [
	"weapon",
	"armor",
	"accessory",
	"consumable",
	"material",
	"quest",
	"misc",
] as const;

export const ZONES = [
	{ id: "village-shinsoo", name: "Shinsoo Village", maxPlayers: 200 },
	{ id: "village-chunjo", name: "Chunjo Village", maxPlayers: 200 },
	{ id: "village-jinno", name: "Jinno Village", maxPlayers: 200 },
	{ id: "plains-1", name: "Mystic Plains", maxPlayers: 150 },
	{ id: "forest-1", name: "Dark Forest", maxPlayers: 150 },
	{ id: "desert-1", name: "Scorching Desert", maxPlayers: 100 },
	{ id: "mountains-1", name: "Frozen Peaks", maxPlayers: 100 },
	{ id: "dungeon-spider", name: "Spider Dungeon", maxPlayers: 30 },
	{ id: "dungeon-demon", name: "Demon Tower", maxPlayers: 30 },
	{ id: "pvp-arena", name: "PvP Arena", maxPlayers: 50 },
] as const;

export const SERVER_TICK_RATE = 20;
export const CLIENT_RENDER_RATE = 60;

export const JWT_ACCESS_EXPIRY = "15m";
export const JWT_REFRESH_EXPIRY = "7d";

export const RATE_LIMITS = {
	login: { window: 60, max: 5 },
	api: { window: 60, max: 100 },
	admin: { window: 60, max: 200 },
} as const;

export const PASSWORD_MIN_LENGTH = 8;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 16;
export const CHARACTER_NAME_MIN_LENGTH = 3;
export const CHARACTER_NAME_MAX_LENGTH = 16;

export const KOMBIFY_TOOL_CATEGORIES = [
	"player-management",
	"character-management",
	"economy",
	"server-operations",
	"world-management",
	"bulk-operations",
	"maintenance",
	"analytics",
] as const;
