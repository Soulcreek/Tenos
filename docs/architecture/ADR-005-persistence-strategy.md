# ADR-005: Persistence Strategy

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** What data goes where — PostgreSQL vs Redis vs in-memory

---

## Context

An MMORPG has different categories of data with different persistence requirements, access patterns, and latency needs. We need a clear strategy for what lives where.

## Decision

**Three-tier data architecture: PostgreSQL (durable), Redis (ephemeral/cache), ECS in-memory (real-time).**

### Data Classification

#### Tier 1: PostgreSQL (Durable Persistence)
Data that must survive server restarts and represents permanent player progress.

| Table | Purpose | Write Frequency |
|-------|---------|-----------------|
| `accounts` | Login credentials, email, created_at | Rarely |
| `characters` | Name, class, level, XP, stats, kingdom | On level/stat change |
| `inventories` | Item instances, quantities, slots | On item change |
| `equipment` | Equipped items per slot | On equip/unequip |
| `skills` | Learned skills, skill levels | On skill learn/upgrade |
| `quests` | Quest progress, completed quests | On quest update |
| `guilds` | Guild name, leader, ranks, settings | On guild change |
| `guild_members` | Player-guild relationships | On join/leave |
| `friendships` | Player social connections | On add/remove |
| `mail` | Player-to-player mail with attachments | On send |
| `marketplace_listings` | Auction house items | On list/buy |
| `character_positions` | Last known position per zone | On zone exit / periodic |
| `bans` | Account bans and history | On admin action |
| `game_logs` | Important events (trades, drops, PvP kills) | Append-only, batched |

**Write Strategy:**
- Batch writes every 30 seconds for non-critical data (position saves)
- Immediate writes for critical data (item transactions, trades)
- Use Drizzle ORM transactions for multi-table operations (e.g., trade = update both inventories)

#### Tier 2: Redis (Ephemeral / Cache / Pub/Sub)
Data that is transient, needs fast access, or coordinates between server nodes.

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `session:{token}` | JWT session validation | 30 min |
| `player:{id}:online` | Online status flag | 5 min (heartbeat refresh) |
| `zone:{id}:players` | Set of player IDs in zone | None (cleaned on leave) |
| `zone:{id}:entity_count` | Current entity count | None |
| `matchmaking:queue:{type}` | Matchmaking queue (dungeon, arena) | None |
| `chat:{channel}:{timestamp}` | Recent chat history | 1 hour |
| `rate_limit:{ip}:{action}` | Rate limiting counters | Action-specific |
| `cooldown:{player}:{skill}` | Skill cooldown tracking (cross-zone) | Cooldown duration |
| `guild_war:{guild1}:{guild2}` | Active war state | War duration |
| `leaderboard:pvp` | Sorted set of PvP rankings | None |
| `leaderboard:level` | Sorted set of level rankings | None |
| `cache:item_def:{id}` | Item definition cache | 1 hour |
| `cache:skill_def:{id}` | Skill definition cache | 1 hour |

**Pub/Sub Channels:**
- `global_chat` — Cross-zone global chat
- `kingdom_chat:{kingdom}` — Kingdom-wide announcements
- `guild_chat:{guild_id}` — Guild chat across zones
- `server_events` — Server-wide events (world bosses, maintenance)
- `player_events:{player_id}` — Direct player notifications

#### Tier 3: ECS In-Memory (Real-Time)
Data that exists only during active gameplay in a zone's ECS world.

| Component | Purpose | Persisted? |
|-----------|---------|-----------|
| `Transform` | Position, rotation | To PostgreSQL on zone exit |
| `Velocity` | Current movement vector | Never |
| `Health` | Current/max HP | To PostgreSQL on zone exit |
| `Mana` | Current/max MP | To PostgreSQL on zone exit |
| `CombatStats` | Calculated combat values | Recalculated on load |
| `Target` | Current combat target | Never |
| `AutoAttack` | Attack timing state | Never |
| `StatusEffects` | Active buffs/debuffs | Never (lost on zone transfer) |
| `AIState` | Monster behavior state | Never |
| `Loot` | Dropped item on ground | Never (despawns after 60s) |
| `NetworkIdentity` | Maps ECS entity to network ID | Never |

### Save Pipeline

```
Player Joins Zone:
  1. Load character from PostgreSQL
  2. Create ECS entity with loaded data
  3. Register in Redis (online status, zone membership)
  4. Begin gameplay

During Gameplay:
  1. ECS systems update state every tick (20Hz)
  2. Every 30s: batch-save position and stats to PostgreSQL
  3. On important event: immediate save (level up, item obtained)
  4. Redis updated for cross-zone queries (online status, leaderboards)

Player Leaves Zone:
  1. Save full character state to PostgreSQL
  2. Remove from Redis zone set
  3. Destroy ECS entity
  4. If zone transfer: new zone loads from PostgreSQL
```

### Database Schema (Drizzle ORM)

Key tables with relationships:

```
accounts (1) ─── (N) characters
characters (1) ─── (N) inventory_items
characters (1) ─── (N) character_skills
characters (1) ─── (N) quest_progress
characters (N) ─── (1) guilds (via guild_members)
guilds (1) ─── (N) guild_members
marketplace_listings (N) ─── (1) characters (seller)
marketplace_listings (N) ─── (1) item_definitions
```

### Backup Strategy

- PostgreSQL: Daily automated pg_dump + WAL archiving for point-in-time recovery
- Redis: RDB snapshots every 15 minutes (acceptable loss for ephemeral data)
- Game logs: Append to PostgreSQL, archive to compressed files monthly

## Alternatives Considered

### Everything in PostgreSQL
- Pro: Simple, single data store
- Con: Too slow for real-time operations (rate limiting, session checks, pub/sub)
- **Rejected**: Redis is necessary for the real-time layer

### MongoDB Instead of PostgreSQL
- Pro: Flexible schema, JSON-native
- Con: Weaker consistency guarantees, not ideal for financial transactions (trades)
- **Rejected**: MMORPG item economies need ACID transactions

### Custom In-Memory Database
- Pro: Maximum performance
- Con: Data loss on crash, complex replication
- **Rejected**: PostgreSQL + Redis covers all use cases without custom infrastructure

## Consequences

- Need robust save pipeline with error handling (what if PostgreSQL write fails mid-play?)
- Character loading must be fast (<200ms) — index character table appropriately
- Redis connection must be monitored — fallback behavior if Redis is temporarily unavailable
- Game logs can grow large — need archival/rotation strategy
- Drizzle migrations must be backward-compatible for zero-downtime deploys
- Need admin tools to inspect/modify player data in PostgreSQL
