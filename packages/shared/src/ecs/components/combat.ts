import { defineComponent, Types } from 'bitecs';

/**
 * Derived combat statistics (recalculated from base stats + equipment).
 */
export const CombatStats = defineComponent({
  atk: Types.f32,
  def: Types.f32,
  critChance: Types.f32,
  critMultiplier: Types.f32,
  atkSpeed: Types.f32,
});

/**
 * Current target reference.
 */
export const Target = defineComponent({
  entityId: Types.ui32,
  distance: Types.f32,
});

/**
 * Auto-attack state.
 */
export const AutoAttack = defineComponent({
  lastTime: Types.f64,
  interval: Types.f32,
  active: Types.ui8,
});

/**
 * Maximum number of tracked skill cooldowns per entity.
 */
const MAX_SKILL_SLOTS = 20;

/**
 * Skill cooldown end times (indexed by skill slot).
 */
export const SkillCooldowns = defineComponent({
  cooldownEnd: [Types.f64, MAX_SKILL_SLOTS],
});

/**
 * Maximum number of concurrent status effects per entity.
 */
const MAX_STATUS_EFFECTS = 16;

/**
 * Active status effects as bitflags + expiry times.
 */
export const StatusEffects = defineComponent({
  flags: Types.ui32,
  endTimes: [Types.f64, MAX_STATUS_EFFECTS],
});
