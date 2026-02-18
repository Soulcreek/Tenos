import { createWorld } from 'bitecs';

import { MAX_ENTITIES } from '../constants/game.js';

import type { IWorld } from 'bitecs';

export interface GameWorld extends IWorld {
  /** Accumulated time in seconds */
  time: number;
  /** Delta time for current tick in seconds */
  delta: number;
}

/**
 * Creates a new ECS world with game-specific properties.
 * Used by both client and server.
 */
export function createGameWorld(): GameWorld {
  const world = createWorld({ maxEntities: MAX_ENTITIES }) as unknown as GameWorld;
  world.time = 0;
  world.delta = 0;
  return world;
}
