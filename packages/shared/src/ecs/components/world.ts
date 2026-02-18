import { defineComponent, Types } from 'bitecs';

/**
 * Monster entity data.
 */
export const Monster = defineComponent({
  typeId: Types.ui16,
  spawnX: Types.f32,
  spawnZ: Types.f32,
  aggroRange: Types.f32,
  leashRange: Types.f32,
});

/**
 * AI behavior state machine.
 */
export const AIState = defineComponent({
  /** Current state (0=idle, 1=patrol, 2=chase, 3=attack, 4=return) */
  state: Types.ui8,
  targetEid: Types.ui32,
  pathIndex: Types.ui16,
});

/**
 * NPC identity data.
 */
export const NPCData = defineComponent({
  npcId: Types.ui16,
  dialogueId: Types.ui16,
});

/**
 * Loot drop on the ground.
 */
export const Loot = defineComponent({
  itemId: Types.ui32,
  quantity: Types.ui16,
  ownerPlayerId: Types.ui32,
  despawnTime: Types.f64,
});

/**
 * Metin Stone world object.
 */
export const MetinStone = defineComponent({
  typeId: Types.ui16,
  hp: Types.f32,
  maxHp: Types.f32,
  level: Types.ui16,
});
