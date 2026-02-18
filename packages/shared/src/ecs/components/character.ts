import { defineComponent, Types } from 'bitecs';

/**
 * Health pool for damageable entities.
 */
export const Health = defineComponent({
  current: Types.f32,
  max: Types.f32,
  regenRate: Types.f32,
});

/**
 * Mana pool for skill-using entities.
 */
export const Mana = defineComponent({
  current: Types.f32,
  max: Types.f32,
  regenRate: Types.f32,
});

/**
 * Base character attributes.
 */
export const CharacterStats = defineComponent({
  str: Types.ui16,
  dex: Types.ui16,
  int: Types.ui16,
  vit: Types.ui16,
});

/**
 * Character progression.
 */
export const CharacterLevel = defineComponent({
  level: Types.ui16,
  xp: Types.ui32,
  xpToNext: Types.ui32,
});

/**
 * Character class and specialization.
 */
export const CharacterClass = defineComponent({
  classId: Types.ui8,
  specId: Types.ui8,
});

/**
 * Kingdom allegiance (3-kingdom system).
 */
export const Kingdom = defineComponent({
  kingdomId: Types.ui8,
});
