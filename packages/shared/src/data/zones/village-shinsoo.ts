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
	// ── Wild Dogs (typeId 1, Lv.1) — near village edges ────
	{ typeId: 1, x: 15, z: 10 },
	{ typeId: 1, x: 20, z: 5 },
	{ typeId: 1, x: 12, z: -8 },
	{ typeId: 1, x: -15, z: 12 },
	{ typeId: 1, x: -18, z: -5 },
	{ typeId: 1, x: 8, z: 18 },
	{ typeId: 1, x: -10, z: 20 },
	{ typeId: 1, x: 22, z: -12 },
	{ typeId: 1, x: -12, z: -15 },
	{ typeId: 1, x: 18, z: 16 },

	// ── Wild Boars (typeId 6, Lv.2) — grazing near fields ──
	{ typeId: 6, x: 10, z: 15 },
	{ typeId: 6, x: -8, z: 14 },
	{ typeId: 6, x: 16, z: -5 },
	{ typeId: 6, x: -14, z: -10 },
	{ typeId: 6, x: 20, z: 12 },
	{ typeId: 6, x: -20, z: 8 },
	{ typeId: 6, x: 14, z: -18 },
	{ typeId: 6, x: -16, z: 18 },

	// ── Forest Wolves (typeId 2, Lv.3) — in the tree line ──
	{ typeId: 2, x: 30, z: 15 },
	{ typeId: 2, x: 25, z: -20 },
	{ typeId: 2, x: -25, z: 18 },
	{ typeId: 2, x: -30, z: -15 },
	{ typeId: 2, x: 35, z: 5 },
	{ typeId: 2, x: -28, z: 8 },
	{ typeId: 2, x: 28, z: -10 },
	{ typeId: 2, x: -22, z: -22 },

	// ── Giant Spiders (typeId 7, Lv.4) — dark corners ──────
	{ typeId: 7, x: 32, z: -18 },
	{ typeId: 7, x: -28, z: -20 },
	{ typeId: 7, x: 35, z: 20 },
	{ typeId: 7, x: -32, z: 22 },
	{ typeId: 7, x: 25, z: 28 },
	{ typeId: 7, x: -25, z: -28 },

	// ── Brown Bears (typeId 3, Lv.5) — deep forest ─────────
	{ typeId: 3, x: 40, z: 25 },
	{ typeId: 3, x: -35, z: 30 },
	{ typeId: 3, x: 38, z: -28 },
	{ typeId: 3, x: -40, z: -25 },
	{ typeId: 3, x: 42, z: 10 },
	{ typeId: 3, x: -38, z: -10 },

	// ── Bandit Archers (typeId 8, Lv.6) — outpost ruins ────
	{ typeId: 8, x: 42, z: -15 },
	{ typeId: 8, x: -38, z: 15 },
	{ typeId: 8, x: 35, z: 35 },
	{ typeId: 8, x: -35, z: -35 },
	{ typeId: 8, x: 45, z: 20 },

	// ── Bandit Scouts (typeId 4, Lv.7) — camp perimeter ────
	{ typeId: 4, x: 48, z: 35 },
	{ typeId: 4, x: -45, z: 40 },
	{ typeId: 4, x: 50, z: -30 },
	{ typeId: 4, x: -48, z: -32 },
	{ typeId: 4, x: 46, z: 8 },

	// ── Dire Wolves (typeId 9, Lv.8) — wilderness edge ─────
	{ typeId: 9, x: 50, z: 40 },
	{ typeId: 9, x: -48, z: 35 },
	{ typeId: 9, x: 52, z: -35 },
	{ typeId: 9, x: -50, z: -40 },

	// ── Corrupted Tigers (typeId 5, Lv.10) — deep wild ─────
	{ typeId: 5, x: 55, z: 45 },
	{ typeId: 5, x: -50, z: -45 },
	{ typeId: 5, x: 55, z: -40 },

	// ── Bandit Captain (typeId 10, Lv.12) — zone boss ──────
	{ typeId: 10, x: -55, z: 50, respawnDelay: 120 },
];
