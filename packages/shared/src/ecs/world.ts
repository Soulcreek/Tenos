import { type IWorld, createWorld as _createWorld } from "bitecs";
import { MAX_ENTITIES } from "../constants/physics.js";

/**
 * Creates a new BitECS world instance.
 * Used on both client (rendering ECS) and server (authoritative ECS).
 */
export function createWorld(): IWorld {
	return _createWorld({ maxEntities: MAX_ENTITIES });
}
