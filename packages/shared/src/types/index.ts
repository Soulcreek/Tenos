// ============================================================
// Core Domain Types for Tenos Admin Center
// ============================================================

// --- Enums ---

export const PlayerRole = {
  PLAYER: 'player',
  GM: 'gm',
  ADMIN: 'admin',
} as const;
export type PlayerRole = (typeof PlayerRole)[keyof typeof PlayerRole];

export const Kingdom = {
  SHINSOO: 1,
  CHUNJO: 2,
  JINNO: 3,
} as const;
export type Kingdom = (typeof Kingdom)[keyof typeof Kingdom];

export const KingdomName: Record<number, string> = {
  1: 'Shinsoo',
  2: 'Chunjo',
  3: 'Jinno',
};

export const CharacterClass = {
  WARRIOR: 'warrior',
  ASSASSIN: 'assassin',
  SHAMAN: 'shaman',
  SORCERER: 'sorcerer',
} as const;
export type CharacterClass = (typeof CharacterClass)[keyof typeof CharacterClass];

export const BanType = {
  TEMPORARY: 'temporary',
  PERMANENT: 'permanent',
} as const;
export type BanType = (typeof BanType)[keyof typeof BanType];

export const ServerStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
  STARTING: 'starting',
  STOPPING: 'stopping',
} as const;
export type ServerStatus = (typeof ServerStatus)[keyof typeof ServerStatus];

export const ToolStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
export type ToolStatus = (typeof ToolStatus)[keyof typeof ToolStatus];

export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export const AuditAction = {
  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  // Player management
  PLAYER_BAN: 'player.ban',
  PLAYER_UNBAN: 'player.unban',
  PLAYER_ROLE_CHANGE: 'player.role_change',
  PLAYER_EDIT: 'player.edit',
  // Character management
  CHARACTER_EDIT: 'character.edit',
  CHARACTER_ITEM_GRANT: 'character.item_grant',
  CHARACTER_ITEM_REMOVE: 'character.item_remove',
  CHARACTER_TELEPORT: 'character.teleport',
  CHARACTER_LEVEL_SET: 'character.level_set',
  CHARACTER_STAT_RESET: 'character.stat_reset',
  // Server management
  SERVER_START: 'server.start',
  SERVER_STOP: 'server.stop',
  SERVER_RESTART: 'server.restart',
  SERVER_MAINTENANCE: 'server.maintenance',
  // Config
  CONFIG_UPDATE: 'config.update',
  // Tools
  TOOL_EXECUTE: 'tool.execute',
  TOOL_CANCEL: 'tool.cancel',
  // Announcements
  ANNOUNCEMENT_SEND: 'announcement.send',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// --- Account / Player ---

export interface Account {
  id: string;
  username: string;
  email: string;
  role: PlayerRole;
  isBanned: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDetail extends Account {
  characters: Character[];
  bans: Ban[];
  loginHistory: LoginRecord[];
}

export interface LoginRecord {
  id: string;
  accountId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
}

// --- Character ---

export interface Character {
  id: string;
  accountId: string;
  name: string;
  characterClass: CharacterClass;
  level: number;
  kingdom: number;
  experience: number;
  gold: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  str: number;
  dex: number;
  int: number;
  vit: number;
  statPoints: number;
  skillPoints: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  zone: string;
  isOnline: boolean;
  playTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterDetail extends Character {
  account: Account;
  inventory: InventoryItem[];
  equipment: EquipmentSlot[];
  skills: CharacterSkill[];
}

// --- Items ---

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: string;
  subtype: string;
  rarity: string;
  levelRequirement: number;
  classRequirement: CharacterClass | null;
  baseStats: Record<string, number>;
  maxStack: number;
  isTradeable: boolean;
  iconUrl: string;
}

export interface InventoryItem {
  id: string;
  characterId: string;
  itemId: string;
  item: ItemDefinition;
  slot: number;
  quantity: number;
  upgradeLevel: number;
  bonusStats: Record<string, number>;
}

export interface EquipmentSlot {
  id: string;
  characterId: string;
  slot: string; // weapon, helmet, armor, boots, shield, earring, bracelet, necklace
  itemId: string;
  item: ItemDefinition;
  upgradeLevel: number;
  bonusStats: Record<string, number>;
}

export interface CharacterSkill {
  id: string;
  characterId: string;
  skillId: string;
  level: number;
  slotPosition: number | null;
}

// --- Bans ---

export interface Ban {
  id: string;
  accountId: string;
  bannedBy: string;
  reason: string;
  type: BanType;
  expiresAt: string | null;
  createdAt: string;
  isActive: boolean;
}

// --- Server ---

export interface GameServer {
  id: string;
  name: string;
  host: string;
  port: number;
  status: ServerStatus;
  currentPlayers: number;
  maxPlayers: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  version: string;
  lastHeartbeat: string;
  zones: ZoneInfo[];
}

export interface ZoneInfo {
  id: string;
  name: string;
  serverId: string;
  playerCount: number;
  monsterCount: number;
  maxPlayers: number;
}

// --- Config ---

export interface GameConfig {
  id: string;
  category: string;
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  isEditable: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

// --- Audit Logs ---

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorUsername: string;
  action: AuditAction;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

// --- Tools (Kombify) ---

export interface KombifyTool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  parameters: ToolParameter[];
  isDestructive: boolean;
  requiredRole: PlayerRole;
  confirmationMessage: string | null;
}

export interface ToolParameter {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'player' | 'character' | 'item' | 'zone';
  required: boolean;
  defaultValue: unknown;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ToolExecution {
  id: string;
  toolId: string;
  toolName: string;
  executedBy: string;
  executedByUsername: string;
  parameters: Record<string, unknown>;
  status: ToolStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

// --- Announcements ---

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'event';
  target: 'all' | 'kingdom' | 'zone' | 'server';
  targetValue: string | null;
  createdBy: string;
  createdByUsername: string;
  scheduledAt: string | null;
  expiresAt: string | null;
  isSent: boolean;
  createdAt: string;
}

// --- Dashboard ---

export interface DashboardStats {
  totalAccounts: number;
  totalCharacters: number;
  onlinePlayers: number;
  peakPlayersToday: number;
  newAccountsToday: number;
  activeBans: number;
  serverCount: number;
  serversOnline: number;
  averageLatency: number;
  totalGoldInCirculation: number;
}

export interface PlayerActivityPoint {
  timestamp: string;
  count: number;
}

export interface KingdomDistribution {
  kingdom: number;
  name: string;
  count: number;
  percentage: number;
}

export interface ClassDistribution {
  characterClass: CharacterClass;
  count: number;
  percentage: number;
}

export interface LevelDistribution {
  range: string;
  count: number;
}

// --- API Response Types ---

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
