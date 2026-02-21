// ============================================================
// Shinsoo Village — Spawn Point Configuration
// ============================================================

export interface SpawnPoint {
	/** Monster type ID. */
	typeId: number;
	/** Spawn position X. */
	x: number;
	/** Spawn position Z. */
	z: number;
	/** Respawn delay override (0 = use monster default). */
	respawnDelay?: number;
}

/** All monster spawn points for the Shinsoo Village starter zone. */
export const SHINSOO_SPAWNS: SpawnPoint[] = [
	// Wild Dogs - near village edges (easy mobs)
	{ typeId: 1, x: 15, z: 10 },
	{ typeId: 1, x: 20, z: 5 },
	{ typeId: 1, x: 12, z: -8 },
	{ typeId: 1, x: -15, z: 12 },
	{ typeId: 1, x: -18, z: -5 },
	{ typeId: 1, x: 8, z: 18 },
	{ typeId: 1, x: -10, z: 20 },
	{ typeId: 1, x: 22, z: -12 },

	// Forest Wolves - slightly further out
	{ typeId: 2, x: 30, z: 15 },
	{ typeId: 2, x: 25, z: -20 },
	{ typeId: 2, x: -25, z: 18 },
	{ typeId: 2, x: -30, z: -15 },
	{ typeId: 2, x: 35, z: 5 },
	{ typeId: 2, x: -28, z: 8 },

	// Brown Bears - further out, scattered
	{ typeId: 3, x: 40, z: 25 },
	{ typeId: 3, x: -35, z: 30 },
	{ typeId: 3, x: 38, z: -28 },
	{ typeId: 3, x: -40, z: -25 },

	// Bandit Scouts - edge of zone
	{ typeId: 4, x: 48, z: 35 },
	{ typeId: 4, x: -45, z: 40 },
	{ typeId: 4, x: 50, z: -30 },

	// Corrupted Tiger - rare, edge of zone (boss-like)
	{ typeId: 5, x: 55, z: 45 },
	{ typeId: 5, x: -50, z: -45 },
];
