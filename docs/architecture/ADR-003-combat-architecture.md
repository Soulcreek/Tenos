# ADR-003: Combat Architecture

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** Combat system design for Massless, inspired by Metin2's action combat

---

## Context

Metin2's combat was simple but engaging: click on a target, your character auto-attacks, press number keys for skills. Combat was real-time with positioning mattering for AoE skills. We want to preserve this accessibility while adding more skill expression.

## Decision

**Server-authoritative action combat with client prediction**, combining Metin2's accessibility with modern action combat depth.

### Combat Flow

```
Client Input → Server Validation → Damage Calculation → State Update → Client Sync
```

1. **Client** sends combat intents (attack target, use skill, move)
2. **Server** validates (is target in range? is skill off cooldown? has enough mana?)
3. **Server** calculates damage using authoritative formulas
4. **Server** applies state changes (HP reduction, buff application, etc.)
5. **Server** broadcasts state delta to relevant clients
6. **Client** plays animations/VFX based on state changes

### Targeting System

#### Target Selection
- **Left-click** on entity: Set as primary target (persistent until cleared)
- **Tab**: Cycle through nearby hostile entities
- **No target + attack key**: Attack nearest hostile in front arc
- Target indicator UI ring under targeted entity

#### Range Check
- Melee range: 3 units (sword length)
- Short range: 8 units (assassin skills)
- Medium range: 15 units (shaman spells)
- Long range: 25 units (special abilities)
- Server validates range on every combat action

### Auto-Attack System
- When target is selected and in range, character auto-attacks at weapon speed
- Auto-attack is the baseline damage source
- Skills interrupt auto-attack chain, then auto-attack resumes
- Auto-attack speed determined by weapon type and DEX stat

### Skill System Architecture

#### Skill Execution Pipeline
```
Skill Input → Cooldown Check → Resource Check → Range Check → Cast Time →
→ Hit Detection → Damage Calc → Effect Application → Cooldown Start
```

#### Skill Types
| Type | Behavior | Example |
|------|----------|---------|
| Instant | Immediate effect, no cast time | Warrior's Charge |
| Cast | Channel for X seconds, then fire | Shaman's Lightning |
| Toggle | Active buff, drains mana/s | Sura's Dark Aura |
| Passive | Always active, no activation | Warrior's Sword Mastery |
| AoE Ground | Target area, affects all in radius | Shaman's Rain of Fire |
| AoE Self | Centered on caster | Warrior's War Cry |
| Combo | Chains from previous skill | Assassin's 3-hit combo |

#### Skill Data Structure
```typescript
interface SkillDefinition {
  id: number;
  name: string;
  class: CharacterClass;
  type: SkillType;
  targetType: 'self' | 'single' | 'aoe_ground' | 'aoe_self' | 'cone';
  range: number;
  cooldown: number;        // milliseconds
  castTime: number;        // milliseconds (0 for instant)
  manaCost: number;
  baseDamage: number;
  scalingStat: 'STR' | 'DEX' | 'INT';
  scalingFactor: number;
  aoeRadius?: number;
  maxTargets?: number;
  effects?: StatusEffect[];
  levelRequirement: number;
  maxLevel: number;
  upgradeScaling: number;  // damage increase per skill level
}
```

### Damage Calculation

#### Base Formula (inspired by Metin2, modernized)
```
Raw Damage = (WeaponDamage + StatBonus) × SkillMultiplier × RandomVariance
StatBonus = PrimaryStat × ClassScaling
Defense = (Armor × ArmorEfficiency) + (VIT × 0.5)
Actual Damage = max(1, RawDamage - Defense) × ElementalModifier × CritMultiplier
```

#### Stat Contributions
| Stat | Primary Effect | Secondary Effect |
|------|---------------|-----------------|
| STR | Melee damage (+2 per point) | Max HP (+3 per point) |
| DEX | Ranged/speed damage (+2 per point) | Attack speed (+0.5% per point), Dodge (+0.1% per point) |
| INT | Magic damage (+2 per point) | Max MP (+5 per point), Magic defense (+0.5 per point) |
| VIT | Max HP (+10 per point) | HP regen (+0.2/s per point), Physical defense (+0.5 per point) |

#### Critical Hits
- Base crit chance: 5%
- Crit chance increase: From DEX, equipment, buffs
- Crit multiplier: 2.0x base, modifiable by equipment
- Visual feedback: Different hit effect, floating damage number color

#### Elemental System (future phase)
- Elements: Fire, Ice, Lightning, Poison, Dark
- Weapons can have elemental properties
- Monsters have resistances/weaknesses
- Rock-paper-scissors modifier (+/- 25%)

### Hit Detection

#### Server-Side
- Distance check (attacker to target, using ECS Position components)
- For AoE: sphere/cone/rectangle intersection with entity positions
- For melee: front-arc check (120° cone from facing direction)
- No client-side hit detection — server is authoritative

#### Client-Side (Visual Only)
- Play attack animation when input is sent
- Play hit reaction animation when server confirms damage
- Particle effects at impact point
- Floating damage numbers

### Status Effects / Buffs & Debuffs

```typescript
interface StatusEffect {
  id: number;
  name: string;
  type: 'buff' | 'debuff';
  duration: number;        // milliseconds
  tickInterval?: number;   // for DoT/HoT effects
  stackable: boolean;
  maxStacks: number;
  effects: {
    stat?: string;         // which stat to modify
    modifier?: number;     // flat or percentage
    modifierType?: 'flat' | 'percent';
    damagePerTick?: number;
    healPerTick?: number;
    speedModifier?: number;
    stunned?: boolean;
    silenced?: boolean;    // can't cast skills
    rooted?: boolean;      // can't move
  };
}
```

### PvP Considerations

#### PvP Zones
- **Safe Zone**: No PvP possible (towns, starting areas)
- **Contested Zone**: PvP with penalties (karma system — killing non-hostile players reduces karma)
- **War Zone**: Free PvP, no penalties (kingdom war areas, PvP arenas)

#### Karma System (from Metin2)
- Killing a player of the same kingdom in contested zone: -1000 karma
- Killing a player of enemy kingdom: no karma penalty
- Low karma: name turns red, NPC shops refuse service, guards attack
- Karma recovery: killing monsters, time-based regeneration

#### Balance Approach
- Separate PvE and PvP damage scaling factors
- PvP damage reduction: 40% (prevents one-shot kills)
- Diminishing returns on CC (stun, root, silence) in PvP
- Regular balance patches based on data

### ECS Component Design for Combat

```typescript
// In packages/shared/src/ecs/components/combat.ts
const CombatStats = defineComponent({
  attack: Types.f32,
  defense: Types.f32,
  critChance: Types.f32,
  critMultiplier: Types.f32,
  attackSpeed: Types.f32,
  moveSpeed: Types.f32,
});

const Health = defineComponent({
  current: Types.f32,
  max: Types.f32,
  regenRate: Types.f32,
});

const Mana = defineComponent({
  current: Types.f32,
  max: Types.f32,
  regenRate: Types.f32,
});

const Target = defineComponent({
  entityId: Types.eid,
  distance: Types.f32,
});

const AutoAttack = defineComponent({
  lastAttackTime: Types.f64,
  attackInterval: Types.f32,
  isAttacking: Types.ui8,
});

const SkillCooldown = defineComponent({
  // Array of 20 skill slots
  cooldownEnd: [Types.f64, 20],
});

const StatusEffects = defineComponent({
  // Bitfield for active effects
  activeFlags: Types.ui32,
  // Duration tracking for up to 16 effects
  effectEnd: [Types.f64, 16],
  effectStacks: [Types.ui8, 16],
});
```

## Alternatives Considered

### Tab-Target Combat (WoW-style)
- Pro: Proven, easier to balance, lower network requirements
- Con: Feels dated, doesn't match Metin2's action combat identity
- **Rejected**: Core identity of the game is action combat

### Full Action Combat (Dark Souls / BDO style)
- Pro: Very skill-expressive, modern feel
- Con: Network latency makes this hard in browser, higher barrier to entry, harder to balance
- **Rejected**: Too demanding for browser latency, too far from Metin2

### Hybrid Lock-On (Lost Ark style)
- Pro: Best of both worlds, skill shots + assisted targeting
- Con: Complex to implement well, can feel imprecise
- **Considered for future**: Could evolve the system this direction in later phases

## Consequences

- Server must process combat at 20Hz tick rate — all damage calculations server-side
- Network messages for combat: `attack_start`, `skill_use`, `damage_dealt`, `effect_applied`, `entity_died`
- Client plays animations optimistically but reconciles with server state
- Need combat animation system in Babylon.js with canceling and blending
- Balance testing framework needed — automated stat simulation tools
- PvP balance requires separate scaling — must track PvE and PvP multipliers independently
