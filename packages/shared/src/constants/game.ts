/** Maximum entities the ECS world supports */
export const MAX_ENTITIES = 10_000;

/** Server simulation tick rate in Hz */
export const SERVER_TICK_RATE = 20;

/** Server tick interval in milliseconds */
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE;

/** Client target frame rate */
export const CLIENT_TARGET_FPS = 60;

/** Maximum movement speed (units per second) */
export const BASE_MOVE_SPEED = 5.0;

/** Maximum run speed multiplier */
export const RUN_SPEED_MULTIPLIER = 1.5;

/** Zone dimensions in world units */
export const ZONE_SIZE = 128;

/** Network state sync rate in Hz */
export const STATE_SYNC_RATE = 20;

/** Persistence save interval in milliseconds */
export const SAVE_INTERVAL_MS = 30_000;

/** Maximum players per zone room */
export const MAX_PLAYERS_PER_ZONE = 200;

/** Server port */
export const SERVER_PORT = 2567;

/** Client dev server port */
export const CLIENT_PORT = 3000;
