// ============================================================
// Upgrade System — Hybrid Risk (Metin2-inspired)
// ============================================================

export type UpgradeResult = "success" | "fail" | "downgrade" | "destroy";

export interface UpgradeTableEntry {
	level: number;
	materialId: number;
	successRate: number;
	onFail: "none" | "no_change" | "downgrade_1" | "downgrade_2" | "destroy";
}

/** Imbue Stone item ID (for +1 to +7). */
export const IMBUE_STONE_ID = 110;
/** Radiant Imbue Stone item ID (for +8 to +15). */
export const RADIANT_IMBUE_STONE_ID = 111;
/** Warding Seal item ID (prevents destruction). */
export const WARDING_SEAL_ID = 112;

export const UPGRADE_TABLE: UpgradeTableEntry[] = [
	{ level: 1, materialId: IMBUE_STONE_ID, successRate: 1.0, onFail: "none" },
	{ level: 2, materialId: IMBUE_STONE_ID, successRate: 1.0, onFail: "none" },
	{ level: 3, materialId: IMBUE_STONE_ID, successRate: 1.0, onFail: "none" },
	{ level: 4, materialId: IMBUE_STONE_ID, successRate: 1.0, onFail: "none" },
	{ level: 5, materialId: IMBUE_STONE_ID, successRate: 1.0, onFail: "none" },
	{ level: 6, materialId: IMBUE_STONE_ID, successRate: 1.0, onFail: "none" },
	{ level: 7, materialId: IMBUE_STONE_ID, successRate: 1.0, onFail: "none" },
	{ level: 8, materialId: RADIANT_IMBUE_STONE_ID, successRate: 0.7, onFail: "no_change" },
	{ level: 9, materialId: RADIANT_IMBUE_STONE_ID, successRate: 0.7, onFail: "no_change" },
	{ level: 10, materialId: RADIANT_IMBUE_STONE_ID, successRate: 0.5, onFail: "downgrade_1" },
	{ level: 11, materialId: RADIANT_IMBUE_STONE_ID, successRate: 0.5, onFail: "downgrade_1" },
	{ level: 12, materialId: RADIANT_IMBUE_STONE_ID, successRate: 0.35, onFail: "downgrade_2" },
	{ level: 13, materialId: RADIANT_IMBUE_STONE_ID, successRate: 0.25, onFail: "destroy" },
	{ level: 14, materialId: RADIANT_IMBUE_STONE_ID, successRate: 0.25, onFail: "destroy" },
	{ level: 15, materialId: RADIANT_IMBUE_STONE_ID, successRate: 0.15, onFail: "destroy" },
];

/** Get the upgrade table entry for the NEXT level (current+1). */
export function getUpgradeEntry(currentLevel: number): UpgradeTableEntry | null {
	const nextLevel = currentLevel + 1;
	return UPGRADE_TABLE.find((e) => e.level === nextLevel) ?? null;
}

/** Get the required material item ID for upgrading from currentLevel. */
export function getUpgradeMaterial(currentLevel: number): number | null {
	const entry = getUpgradeEntry(currentLevel);
	return entry?.materialId ?? null;
}

/** Roll the upgrade and return the result. */
export function calculateUpgradeResult(
	currentLevel: number,
	hasWardingSeal: boolean,
): UpgradeResult {
	const entry = getUpgradeEntry(currentLevel);
	if (!entry) return "fail";

	const roll = Math.random();
	if (roll < entry.successRate) return "success";

	switch (entry.onFail) {
		case "none":
		case "no_change":
			return "fail";
		case "downgrade_1":
		case "downgrade_2":
			return "downgrade";
		case "destroy":
			return hasWardingSeal ? "fail" : "destroy";
	}
}

/** Get the new level after a downgrade. */
export function getDowngradedLevel(currentLevel: number): number {
	const entry = getUpgradeEntry(currentLevel);
	if (!entry) return currentLevel;
	if (entry.onFail === "downgrade_1") return Math.max(0, currentLevel - 1);
	if (entry.onFail === "downgrade_2") return Math.max(0, currentLevel - 2);
	return currentLevel;
}
