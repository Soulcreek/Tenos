# Massless — Game Design Document

> **Version:** 1.0
> **Date:** 2026-02-17
> **Status:** Living document
> **Genre:** Browser-based Action MMORPG
> **Inspiration:** Metin2 ("spiritual successor" / "Metin3")

---

## 1. Game Vision

### Elevator Pitch

**Massless** is a browser-based MMORPG that captures the fast-paced action combat, kingdom rivalry, and addictive progression of Metin2 — rebuilt for the modern web. No downloads, no installs. Open your browser and enter a world where three kingdoms clash for dominance, corrupted Metin Stones threaten the land, and every equipment upgrade is a gamble between glory and ruin.

### One-Page Summary

Massless drops players into a persistent fantasy world inspired by East Asian martial arts mythology. Three rival kingdoms — the **Crimson Empire**, the **Azure Dominion**, and the **Golden Sovereignty** — compete for territory, resources, and honor. Players choose from four character classes, master combat skills, explore diverse zones from peaceful villages to demonic dungeons, and engage in faction warfare that reshapes the political landscape of the server.

The game emphasizes **accessibility** (browser-based, no download), **fair competition** (server-authoritative, cosmetic-only monetization), and **social bonds** (guilds, kingdom loyalty, cooperative dungeons). Combat is real-time and action-oriented — positioning, timing, and skill combos matter as much as gear and levels.

Progression follows the beloved Metin2 pattern: level up, learn new skills, acquire better equipment, and gamble on upgrading it to legendary status. But where Metin2 aged into pay-to-win stagnation, Massless offers a fresh start with modern design principles: transparent mechanics, balanced PvP, and respect for players' time and money.

---

## 2. Core Pillars

### Pillar 1: Instant Access
> "Click and play — the MMORPG that lives in your browser."

No 10GB download. No launcher. No waiting. WebGPU delivers high-quality 3D visuals directly in the browser. A player can go from clicking a link to fighting their first monster in under 60 seconds.

### Pillar 2: Skill-Based Action Combat
> "Your hands win fights, not your wallet."

Combat rewards player skill — positioning, timing, combo execution, and tactical decisions. Auto-attack is the floor, not the ceiling. Every class has mechanical depth that separates good players from great ones.

### Pillar 3: Kingdom Rivalry
> "Your kingdom is your family, your enemies are real."

Three kingdoms aren't cosmetic factions — they define your allies, your enemies, your territory, and your politics. Kingdom wars have real consequences: territory control affects resource access, trade routes, and dungeon availability.

### Pillar 4: Thrilling Progression
> "One more upgrade. One more level. One more attempt."

The equipment upgrade system creates stories. The +7 sword that took weeks to build. The +9 attempt that succeeded against the odds. Progression feels exciting and meaningful at every stage, not like filling a spreadsheet.

### Pillar 5: Server-Enforced Fairness
> "If you can do it, it's legit."

The server is the single source of truth. No speedhacks, no damage exploits, no duplication glitches. The playing field is level. Monetization is cosmetic-only. Competition is decided by skill and dedication, not by credit card.

---

## 3. Feature Matrix

### MVP (Milestone 1-2): Core Game Loop
*"Move, fight, level up, see other players."*

| Feature | Priority | Description |
|---------|----------|-------------|
| Character creation | P0 | Choose kingdom, class, name, basic appearance |
| World movement | P0 | WASD + click-to-move, 3D terrain, camera control |
| Multiplayer | P0 | See other players, real-time movement sync |
| Basic combat | P0 | Target selection, auto-attack, basic melee |
| Monster spawning | P0 | Static spawn fields with basic monster AI |
| Health/death/respawn | P0 | HP system, death penalty (XP loss), town respawn |
| Leveling | P0 | XP from monsters, level-up stat allocation |
| Basic HUD | P0 | Health bar, mana bar, level display, minimap |
| Basic inventory | P1 | Pick up items, view inventory grid |

### Phase 2: Core MMORPG Features
*"Now it feels like an RPG."*

| Feature | Priority | Description |
|---------|----------|-------------|
| Character classes (4) | P0 | Warrior, Assassin, Shaman, Sorcerer with unique skills |
| Skill system | P0 | Skill learning, leveling, cooldowns, skill bar |
| Equipment system | P0 | Weapon, armor, accessories with stat bonuses |
| NPC shops | P1 | Buy/sell items for Yang |
| Basic quests | P1 | Kill X, Collect Y, Talk to Z quest types |
| Party system | P1 | Form parties, shared XP/loot, party UI |
| Multiple zones | P1 | 3-5 zones with zone transitions, varied environments |
| Equipment upgrading | P1 | +1 to +9 system with success/failure mechanics |
| Chat (local/global) | P1 | Basic chat functionality |

### Phase 3: Social & Economy
*"Players interact meaningfully."*

| Feature | Priority | Description |
|---------|----------|-------------|
| Guild system | P0 | Create, invite, ranks, guild chat |
| Kingdom wars | P0 | Scheduled faction battles for territory |
| Whisper/party chat | P1 | Full chat channel system |
| Player trading | P1 | Direct player-to-player item/Yang trading |
| Marketplace | P1 | Auction house for asynchronous trading |
| Crafting | P2 | Basic crafting recipes, material gathering |
| Metin Stones | P1 | World event objects that spawn monsters |
| Dungeon (first) | P1 | First instanced group dungeon |
| Mount system | P2 | Basic mount acquisition and riding |

### Phase 4: Endgame & Polish
*"Long-term engagement."*

| Feature | Priority | Description |
|---------|----------|-------------|
| Dungeon system (full) | P0 | Multiple dungeons with boss mechanics |
| Ranked PvP arena | P1 | Matchmade 1v1 and 3v3 arenas |
| Guild wars | P1 | Guild vs guild warfare with stakes |
| Achievement system | P2 | Titles, cosmetic rewards |
| Pet system | P2 | Companion pets with utility |
| Item enhancement (+10 and beyond) | P2 | Extended upgrade path |
| Seasonal events | P2 | Time-limited content and rewards |
| Transmog | P2 | Appearance customization separate from stats |
| Housing/camps | P3 | Personal space in the world |

---

## 4. Game Mechanics Specification

### 4.1 Character System

#### Kingdoms

| Kingdom | Theme | Color | Bonus |
|---------|-------|-------|-------|
| **Crimson Empire** | Military, discipline, honor | Red | +5% melee damage |
| **Azure Dominion** | Magic, wisdom, knowledge | Blue | +5% magic damage |
| **Golden Sovereignty** | Trade, cunning, agility | Gold | +5% movement speed |

Kingdom is chosen at character creation and cannot be changed. Kingdom determines starting zone, allied players, and faction war allegiance.

#### Classes

##### Warrior
- **Role:** Melee tank/damage
- **Primary Stat:** STR
- **Weapon:** Swords, Two-handed swords
- **Armor:** Heavy armor

| Specialization | Focus | Key Skills |
|---------------|-------|------------|
| **Blade Master** | Single-target melee DPS | Cleave, Blade Storm, Berserk |
| **Guardian** | Tank, party protection | Taunt, Shield Wall, War Banner |

##### Assassin
- **Role:** Melee burst damage
- **Primary Stat:** DEX
- **Weapon:** Daggers, Bows
- **Armor:** Light armor

| Specialization | Focus | Key Skills |
|---------------|-------|------------|
| **Shadow Blade** | Melee assassin, stealth | Backstab, Shadow Step, Poison Blade |
| **Ranger** | Ranged damage | Arrow Rain, Piercing Shot, Trap |

##### Shaman
- **Role:** Healer/support + magic DPS
- **Primary Stat:** INT
- **Weapon:** Fans, Bells
- **Armor:** Cloth

| Specialization | Focus | Key Skills |
|---------------|-------|------------|
| **Healer** | Party healing, buffs | Heal, Blessing, Purify |
| **Dragon Shaman** | Magic DPS, AoE | Lightning Strike, Fire Rain, Earthquake |

##### Sorcerer
- **Role:** Magic DPS with debuffs
- **Primary Stat:** INT
- **Weapon:** Swords (dark magic infused)
- **Armor:** Medium armor

| Specialization | Focus | Key Skills |
|---------------|-------|------------|
| **Dark Sorcerer** | DoT, debuffs, drain | Dark Bolt, Life Drain, Curse |
| **Blade Sorcerer** | Melee/magic hybrid | Enchanted Blade, Dark Aura, Teleport Strike |

#### Stat System

Each level grants **3 stat points** to distribute freely.

| Stat | Per Point Effect | Class Relevance |
|------|-----------------|-----------------|
| **STR** | +2 melee ATK, +3 max HP, +0.5 carry weight | Warrior primary |
| **DEX** | +2 ranged/speed ATK, +0.5% ATK speed, +0.1% dodge | Assassin primary |
| **INT** | +2 magic ATK, +5 max MP, +0.5 magic DEF | Shaman/Sorcerer primary |
| **VIT** | +10 max HP, +0.2 HP/s regen, +0.5 physical DEF | Universal defensive |

Base stats at level 1 (before class bonus):
- STR: 3, DEX: 3, INT: 3, VIT: 3

Class starting bonuses:
- Warrior: +3 STR, +2 VIT
- Assassin: +3 DEX, +2 STR
- Shaman: +3 INT, +2 VIT
- Sorcerer: +3 INT, +2 STR

### 4.2 Combat Formulas

#### Experience Curve

```
XP required for level N = floor(100 × N^2.2)

Level  1 → 2:     100 XP
Level  5 → 6:   2,924 XP
Level 10 → 11:  15,849 XP
Level 20 → 21:  72,724 XP
Level 50 → 51:  614,366 XP
Level 75 → 76:  1,547,520 XP
Level 99 → 100: 2,955,447 XP
```

Level cap: **120** (initially 90 at launch, expanded in content patches)

#### Damage Formulas

**Physical Damage (melee/ranged):**
```
BaseDamage = WeaponDamage + (STR or DEX) × 2
SkillMultiplier = Skill.baseDamage + (Skill.scalingFactor × SkillLevel)
RawDamage = BaseDamage × (1 + SkillMultiplier / 100) × RandomRange(0.9, 1.1)
Defense = TargetArmor + (TargetVIT × 0.5)
FinalDamage = max(1, RawDamage × (100 / (100 + Defense)))

If Critical: FinalDamage × CritMultiplier (default 2.0)
PvP Modifier: FinalDamage × 0.6 (40% reduction in PvP)
```

**Magic Damage:**
```
BaseDamage = WeaponMagicDamage + INT × 2
Defense = TargetMagicDefense + (TargetINT × 0.5)
// Same formula as physical, using magic stats
```

#### Equipment Stats

**Weapon Damage Ranges by Tier:**

| Tier | Level Range | Damage Range | Drop Source |
|------|-------------|--------------|-------------|
| Common (white) | 1-15 | 10-50 | Monster drops |
| Uncommon (green) | 10-30 | 30-100 | Elite monsters |
| Rare (blue) | 25-50 | 80-200 | Dungeon drops |
| Epic (purple) | 45-75 | 180-400 | Boss drops |
| Legendary (orange) | 70-100 | 350-700 | Raid bosses, crafting |

#### Equipment Upgrade System

The signature Metin2-inspired upgrade system:

| Upgrade Level | Success Rate | Failure Consequence | Bonus |
|--------------|-------------|---------------------|-------|
| +1 | 90% | Item loses upgrade attempt | +5% stats |
| +2 | 85% | Item loses upgrade attempt | +10% stats |
| +3 | 80% | Item loses upgrade attempt | +16% stats |
| +4 | 70% | Item downgrades by 1 | +23% stats |
| +5 | 60% | Item downgrades by 1 | +31% stats |
| +6 | 45% | Item downgrades by 2 | +40% stats |
| +7 | 30% | Item downgrades by 2 | +50% stats |
| +8 | 15% | Item resets to +0 | +65% stats |
| +9 | 7% | Item DESTROYED | +85% stats |

**Protection items** (obtainable in-game, not cash shop):
- **Upgrade Scroll**: Prevents downgrade on failure (consumed)
- **Blessing Scroll**: +10% success chance (consumed)
- **Protection Charm**: Prevents destruction on +9 failure (rare drop)

Visual feedback: Items glow at +4 (faint), +7 (bright), +9 (legendary aura)

### 4.3 Monster Design

#### Monster Categories

| Category | Behavior | Respawn Time | Loot Quality |
|----------|----------|-------------|-------------|
| Normal | Passive until attacked, simple AI | 30-60s | Common items, Yang |
| Aggressive | Attacks on sight within aggro range | 60-120s | Better drop rates |
| Elite | Stronger, special abilities | 5-10 min | Uncommon+ items |
| Metin Stone | Stationary, spawns adds, group content | 30-60 min | Rare items, upgrade materials |
| Field Boss | Rare spawn, announces to zone | 2-6 hours | Epic items |
| Dungeon Boss | Instanced, complex mechanics | Per instance | Epic/Legendary items |

#### Monster Difficulty Scaling

```
Monster Level = Base Level + RandomRange(-1, +1)
MonsterHP = BaseHP × (1 + Level × 0.15)
MonsterATK = BaseATK × (1 + Level × 0.12)
MonsterDEF = BaseDEF × (1 + Level × 0.10)
MonsterXP = BaseXP × (1 + Level × 0.1)
```

XP penalty for level difference:
```
If PlayerLevel > MonsterLevel + 10: XP × 0.1 (almost no XP)
If PlayerLevel > MonsterLevel + 5:  XP × 0.5
If PlayerLevel = MonsterLevel ± 5:  XP × 1.0 (full XP)
If PlayerLevel < MonsterLevel - 5:  XP × 1.5 (bonus, but higher risk)
```

### 4.4 Metin Stones

Metin Stones are the signature world mechanic from Metin2, adapted for Massless:

- Large crystalline stones that appear in zones on a timer (30-60 minute respawn)
- While active, they corrupt the surrounding area:
  - Spawn additional monsters in a radius
  - Buff nearby monsters (+20% ATK, +20% HP)
  - Visual corruption effect on terrain
- Multiple players can attack a Metin Stone simultaneously
- When destroyed:
  - Drops loot for all participants (contribution-based)
  - Spawns a "corruption wave" (final challenge)
  - Removes monster buff in the area
  - Zone-wide announcement

### 4.5 World Design

#### Zone Layout

```
[Starting Zones - Lv. 1-15]
    ├── Crimson Village (Crimson Empire start)
    ├── Azure Haven (Azure Dominion start)
    └── Golden Port (Golden Sovereignty start)

[Neutral Zones - Lv. 15-35]
    ├── Whispering Woods (Lv. 15-25, PvE focused)
    ├── Iron Plains (Lv. 20-30, contested PvP)
    └── Mystic Valley (Lv. 25-35, mixed)

[Contested Zones - Lv. 35-60]
    ├── Scorched Desert (Lv. 35-45, war zone)
    ├── Frozen Peaks (Lv. 40-50, harsh environment)
    └── Shadow Marshes (Lv. 50-60, high difficulty)

[Endgame Zones - Lv. 60-90]
    ├── Demon's Gate (Lv. 60-75, gateway to demonic content)
    ├── Celestial Ruins (Lv. 70-85, ancient dungeon-rich)
    └── Void Rift (Lv. 80-90, max difficulty open world)

[Dungeons - Various Levels]
    ├── Spider Cave (Lv. 20, 3-player, tutorial dungeon)
    ├── Bandit Fortress (Lv. 35, 5-player)
    ├── Dragon's Lair (Lv. 55, 5-player, first major challenge)
    ├── Demon King's Throne (Lv. 75, 5-player raid)
    └── Void Core (Lv. 90, 10-player raid, hardest content)
```

#### Zone Properties

Each zone defines:
- Level range (min/max recommended)
- PvP rules (safe / contested / war)
- Weather (clear, rain, snow, sandstorm — visual only)
- Music and ambient audio
- Monster spawn tables
- Metin Stone spawn points
- NPC placements
- Connection to adjacent zones

### 4.6 Quest System

#### Quest Types

| Type | Description | Reward |
|------|-------------|--------|
| **Main Story** | Linear narrative quests, one per zone | XP, unique items, zone unlock |
| **Side Quests** | Optional zone stories | XP, Yang, items |
| **Kill Quests** | Eliminate X monsters of type Y | XP, Yang |
| **Collection** | Gather X item drops | XP, crafting materials |
| **Delivery** | Bring item from NPC A to NPC B | Yang, reputation |
| **Dungeon** | Complete a dungeon | XP, rare items |
| **Daily** | Repeatable once per day | Yang, tokens |
| **Weekly** | Larger repeatable goals | Premium currency (cosmetic) |

#### Quest Tracking
- Max 20 active quests simultaneously
- Quest log with map markers
- Auto-tracking for nearest active quest
- Quest sharing within party (for group quests)

### 4.7 Economy

#### Currency
- **Yang** — Primary currency for all transactions
- **Honor Points** — Earned from PvP, spent on PvP rewards
- **Dungeon Tokens** — Earned from dungeons, spent on dungeon vendor
- **Star Coins** — Premium currency (cosmetic shop only)

#### Economy Sinks (Yang leaves the game)
- Equipment repair costs
- NPC shop purchases
- Upgrade attempt costs
- Marketplace listing fees (5%)
- Fast travel costs
- Crafting fees
- Guild expansion costs

#### Economy Faucets (Yang enters the game)
- Monster drops
- Quest rewards
- NPC vendoring items
- Daily login bonuses
- Achievement rewards

#### Anti-Inflation Measures
- Yang drop rates scaled to server age
- Marketplace tax removes Yang
- Upgrade failures consume Yang
- Expensive gold sinks for cosmetic prestige items (expensive mounts, titles)

---

## 5. UI/UX Design

### Main HUD Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [Player Portrait]  HP ████████████████░░░  [Target Portrait]     │
│  Lv.45 WarriorName MP ████████████░░░░░░  Lv.47 MonsterName     │
│                    XP ████████░░░░░░░░░░  HP ██████████░░░░░     │
├──────────────────────────────────────────────────────────────────┤
│                                                    ┌──────────┐ │
│                                                    │ Minimap  │ │
│                                                    │          │ │
│                        3D GAME                     │   [N]    │ │
│                        WORLD                       │          │ │
│                                                    └──────────┘ │
│                                                                  │
│                                                                  │
│                                                                  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ [Chat Window]                                      [Tabs]  │  │
│ │ > [Local] PlayerA: Hello!                                  │  │
│ │ > [Guild] PlayerB: Need healer for dungeon                 │  │
│ │ > [System] Metin Stone destroyed in Iron Plains!           │  │
│ │ [Type message here...]                                     │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│    [1][2][3][4][5][6][7][8][9][0]  [HP Pot][MP Pot]  [Mount]   │
│    ← Skill Bar →                    ← Quick Items →             │
│                                                                  │
│    [Character][Inventory][Skills][Quests][Guild][Map][Settings]  │
│    ← Menu Bar →                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Screens

| Screen | Access | Content |
|--------|--------|---------|
| **Character Sheet** | 'C' key | Stats, equipment slots, appearance |
| **Inventory** | 'I' key | Grid-based item storage, sort, filter |
| **Skill Tree** | 'K' key | Class skills, specialization, upgrades |
| **Quest Log** | 'L' key | Active/completed quests, tracking |
| **Map** | 'M' key | Full zone map, markers, waypoints |
| **Guild** | 'G' key | Members, ranks, wars, guild settings |
| **Marketplace** | 'H' key | Search, buy, sell, my listings |
| **Settings** | ESC | Graphics, audio, controls, account |

---

## 6. Audio Design (Direction)

### Music
- Zone-specific ambient music (Eastern fantasy orchestral)
- Combat music trigger when in battle
- Boss encounter themes
- Town/safe zone relaxing themes
- Silence/minimal ambient in dangerous zones for tension

### Sound Effects
- Weapon impact sounds (per weapon type)
- Skill activation sounds
- Monster sounds (idle, aggro, attack, death)
- UI feedback (equip, level up, quest complete, upgrade success/failure)
- Environmental (wind, water, fire, ambient creatures)

---

## 7. Technical Requirements

See [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) for full technical architecture.

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Client FPS | 60fps | Mid-range GPU (GTX 1060 / RX 580 equivalent) |
| Server tick rate | 20Hz | With 200 entities per zone |
| Input latency | <100ms | Input → visual response |
| Network round-trip | <150ms | Client → server → client |
| Zone load time | <3s | Including asset loading |
| Time to first interaction | <10s | URL click → character moving |
| Memory (client) | <500MB | Including textures and meshes |
| Memory (server per zone) | <200MB | ECS + Colyseus state |

### Browser Support

| Browser | Tier | Rendering |
|---------|------|-----------|
| Chrome 113+ | Tier 1 (full WebGPU) | WebGPU |
| Edge 113+ | Tier 1 (full WebGPU) | WebGPU |
| Firefox 130+ | Tier 1 (WebGPU) | WebGPU |
| Safari 18+ | Tier 2 (WebGPU) | WebGPU with caveats |
| Chrome <113 | Tier 3 (fallback) | WebGL2 |
| Firefox <130 | Tier 3 (fallback) | WebGL2 |
| Mobile Chrome | Tier 3 (experimental) | WebGL2, reduced quality |

---

## Appendix: Glossary

| Term | Definition |
|------|-----------|
| AoI | Area of Interest — the radius around a player within which entities are synchronized |
| CCU | Concurrent Users — number of players online simultaneously |
| ECS | Entity Component System — data-oriented architecture for game entities |
| GC | Garbage Collection — JavaScript's automatic memory management (avoided in game loop) |
| HUD | Heads-Up Display — the overlay UI during gameplay |
| LOD | Level of Detail — reduced-quality models for distant objects |
| NPC | Non-Player Character — game-controlled characters (shops, quest givers) |
| PvE | Player vs Environment — combat against monsters/NPCs |
| PvP | Player vs Player — combat between players |
| Tick | One server processing cycle (50ms at 20Hz) |
| Yang | In-game primary currency |
