import { defineComponent, Types } from 'bitecs';

/**
 * Position and rotation in world space.
 * Used by all spatially-located entities.
 */
export const Transform = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
  rotY: Types.f32,
});

/**
 * Linear velocity for physics/movement.
 */
export const Velocity = defineComponent({
  vx: Types.f32,
  vy: Types.f32,
  vz: Types.f32,
});

/**
 * Network identity for synchronizing entities between client and server.
 * netId: unique network identifier assigned by the server.
 * ownerId: the player who owns/controls this entity (0 for server-owned).
 */
export const NetworkIdentity = defineComponent({
  netId: Types.ui32,
  ownerId: Types.ui32,
});

/**
 * Tags an entity as the local player (client-side only).
 * This is a tag component — no data fields.
 */
export const LocalPlayer = defineComponent();

/**
 * Tags an entity as a remote player (client-side only).
 */
export const RemotePlayer = defineComponent();
