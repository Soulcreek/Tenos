import type { Engine } from "@babylonjs/core/Engines/engine";
import type { EquipmentSlots, InventorySlot } from "@tenos/shared";
import { Show, createSignal, onCleanup } from "solid-js";
import type { EngineType } from "../engine/Engine.js";
import { ClassSelect } from "./ClassSelect.jsx";
import { CombatLog } from "./CombatLog.jsx";
import { DeathScreen } from "./DeathScreen.jsx";
import { DevOverlay } from "./DevOverlay.jsx";
import { DropConfirm } from "./DropConfirm.jsx";
import { HealthBar, ManaBar } from "./HealthBar.jsx";
import { InventoryPanel, type InventoryPanelState } from "./InventoryPanel.jsx";
import { LootPopup } from "./LootPopup.jsx";
import { Minimap } from "./Minimap.jsx";
import { SkillBar, type SkillBarState } from "./SkillBar.jsx";
import { StatPanel } from "./StatPanel.jsx";
import { TargetFrame } from "./TargetFrame.jsx";
import { UpgradePanel } from "./UpgradePanel.jsx";
import { XPBar } from "./XPBar.jsx";

export interface HUDState {
	getPlayerPos: () => { x: number; y: number; z: number };
	getPlayerCount: () => number;
	getHealth: () => { current: number; max: number };
	getMana: () => { current: number; max: number };
	getZoneName: () => string;
	getLevel: () => number;
	getXP: () => { current: number; toLevel: number };
	getTarget: () => {
		name: string;
		typeId: number;
		hp: number;
		hpMax: number;
		level: number;
	} | null;
	getIsDead: () => boolean;
	getRespawnTimer: () => number;
	getXPLost: () => number;
	getCombatLog: () => string[];
	getLootPopups: () => Array<{ name: string; qty: number; time: number }>;
	getPlayerStats: () => {
		str: number;
		dex: number;
		int: number;
		vit: number;
		statPoints: number;
		attackPower: number;
		defense: number;
		attackSpeed: number;
		critChance: number;
		moveSpeed: number;
	};
	allocateStat: (stat: "str" | "dex" | "int" | "vit") => void;
	// Class & Skills
	getCharacterClass: () => string;
	getSkills: () => SkillBarState["getSkills"] extends () => infer R ? R : never;
	getNeedsClassSelect: () => boolean;
	selectClass: (cls: string) => void;
	// Inventory
	getInventory: () => (InventorySlot | null)[];
	getEquipment: () => EquipmentSlots;
	getYang: () => number;
	sendEquipItem: (slot: number) => void;
	sendUnequipItem: (slot: string) => void;
	sendDropItem: (slot: number, qty: number) => void;
	sendUseItem: (slot: number) => void;
	sendUpgradeItem: (slot: number, useSeal: boolean) => void;
	getUpgradeResult: () => {
		success: boolean;
		destroyed: boolean;
		itemName: string;
		newLevel: number;
	} | null;
}

export function HUD(props: { engine: Engine; engineType: EngineType; state: HUDState }) {
	const [health, setHealth] = createSignal({ current: 100, max: 100 });
	const [mana, setMana] = createSignal({ current: 50, max: 50 });
	const [playerPos, setPlayerPos] = createSignal({ x: 0, y: 0, z: 0 });
	const [zoneName, setZoneName] = createSignal("Shinsoo Village");
	const [level, setLevel] = createSignal(1);
	const [xp, setXp] = createSignal({ current: 0, toLevel: 100 });
	const [target, setTarget] = createSignal<ReturnType<HUDState["getTarget"]>>(null);
	const [isDead, setIsDead] = createSignal(false);
	const [respawnTimer, setRespawnTimer] = createSignal(0);
	const [xpLost, setXpLost] = createSignal(0);
	const [combatLog, setCombatLog] = createSignal<string[]>([]);
	const [lootPopups, setLootPopups] = createSignal<
		Array<{ name: string; qty: number; time: number }>
	>([]);
	const [stats, setStats] = createSignal(props.state.getPlayerStats());
	const [showStats, setShowStats] = createSignal(false);
	const [showInventory, setShowInventory] = createSignal(false);
	const [needsClassSelect, setNeedsClassSelect] = createSignal(false);
	const [upgradeSlot, setUpgradeSlot] = createSignal<{ slot: InventorySlot; idx: number } | null>(
		null,
	);
	const [dropConfirm, setDropConfirm] = createSignal<{
		itemId: number;
		maxQty: number;
		slotIdx: number;
	} | null>(null);
	const [upgradeResult, setUpgradeResult] = createSignal<{
		success: boolean;
		destroyed: boolean;
		itemName: string;
	} | null>(null);

	const interval = setInterval(() => {
		setHealth(props.state.getHealth());
		setMana(props.state.getMana());
		setPlayerPos(props.state.getPlayerPos());
		setZoneName(props.state.getZoneName());
		setLevel(props.state.getLevel());
		setXp(props.state.getXP());
		setTarget(props.state.getTarget());
		setIsDead(props.state.getIsDead());
		setRespawnTimer(props.state.getRespawnTimer());
		setXpLost(props.state.getXPLost());
		setCombatLog([...props.state.getCombatLog()]);
		setLootPopups([...props.state.getLootPopups()]);
		setStats(props.state.getPlayerStats());
		setNeedsClassSelect(props.state.getNeedsClassSelect());
		const ur = props.state.getUpgradeResult();
		if (ur) setUpgradeResult(ur);
	}, 100);

	const onKeyDown = (e: KeyboardEvent) => {
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === "INPUT" || tag === "TEXTAREA") return;
		if (e.key.toLowerCase() === "c") {
			setShowStats((prev) => !prev);
		}
		if (e.key.toLowerCase() === "i") {
			setShowInventory((prev) => !prev);
			if (!showInventory()) {
				setUpgradeSlot(null);
				setDropConfirm(null);
			}
		}
	};
	window.addEventListener("keydown", onKeyDown);

	onCleanup(() => {
		clearInterval(interval);
		window.removeEventListener("keydown", onKeyDown);
	});

	const skillBarState: SkillBarState = {
		getSkills: () => props.state.getSkills(),
	};

	const inventoryState: InventoryPanelState = {
		getInventory: () => props.state.getInventory(),
		getEquipment: () => props.state.getEquipment(),
		getYang: () => props.state.getYang(),
		onEquip: (slot) => props.state.sendEquipItem(slot),
		onUnequip: (slot) => props.state.sendUnequipItem(slot),
		onDrop: (slot, _qty) => {
			const inv = props.state.getInventory();
			const s = inv[slot];
			if (s && s.quantity > 1) {
				setDropConfirm({ itemId: s.itemId, maxQty: s.quantity, slotIdx: slot });
			} else {
				props.state.sendDropItem(slot, 1);
			}
		},
		onUse: (slot) => props.state.sendUseItem(slot),
		onUpgrade: (idx) => {
			const inv = props.state.getInventory();
			const s = inv[idx];
			if (s) {
				setUpgradeResult(null);
				setUpgradeSlot({ slot: s, idx });
			}
		},
	};

	return (
		<>
			{/* Class Selection Overlay */}
			<Show when={needsClassSelect()}>
				<ClassSelect onSelect={(cls) => props.state.selectClass(cls)} />
			</Show>

			{/* Dev overlay (top-left) */}
			<DevOverlay
				engine={props.engine}
				engineType={props.engineType}
				getPlayerPos={props.state.getPlayerPos}
				getPlayerCount={props.state.getPlayerCount}
			/>

			{/* Target frame (top-center) */}
			<TargetFrame target={target()} />

			{/* Health & Mana (bottom-left) */}
			<div
				style={{
					position: "absolute",
					bottom: "20px",
					left: "20px",
					display: "flex",
					"flex-direction": "column",
					gap: "4px",
					"pointer-events": "none",
				}}
			>
				<HealthBar current={health().current} max={health().max} />
				<ManaBar current={mana().current} max={mana().max} />
				<div
					style={{
						color: "rgba(255,255,255,0.6)",
						"font-family": "monospace",
						"font-size": "10px",
						"text-shadow": "0 0 3px rgba(0,0,0,0.8)",
					}}
				>
					Lv.{level()}
				</div>
			</div>

			{/* Minimap (top-right) */}
			<div
				style={{
					position: "absolute",
					top: "12px",
					right: "12px",
					"pointer-events": "none",
				}}
			>
				<Minimap playerX={playerPos().x} playerZ={playerPos().z} zoneName={zoneName()} />
			</div>

			{/* XP Bar (bottom of screen) */}
			<XPBar current={xp().current} toLevel={xp().toLevel} level={level()} />

			{/* Skill Bar (bottom-center) */}
			<SkillBar state={skillBarState} />

			{/* Combat Log (bottom-left, above health bars) */}
			<CombatLog messages={combatLog()} />

			{/* Loot Popups (right side) */}
			<LootPopup items={lootPopups()} />

			{/* Stat Panel (toggle with C) */}
			{showStats() && (
				<StatPanel
					stats={stats()}
					level={level()}
					onAllocate={props.state.allocateStat}
					onClose={() => setShowStats(false)}
				/>
			)}

			{/* Inventory Panel (toggle with I) */}
			<Show when={showInventory()}>
				<InventoryPanel
					state={inventoryState}
					onClose={() => {
						setShowInventory(false);
						setUpgradeSlot(null);
					}}
				/>
			</Show>

			{/* Upgrade Panel */}
			<Show when={upgradeSlot()}>
				{(us) => (
					<UpgradePanel
						slot={us().slot}
						slotIdx={us().idx}
						inventory={props.state.getInventory()}
						onUpgrade={(idx, useSeal) => {
							props.state.sendUpgradeItem(idx, useSeal);
						}}
						onClose={() => setUpgradeSlot(null)}
						lastResult={upgradeResult()}
					/>
				)}
			</Show>

			{/* Drop Confirmation */}
			<Show when={dropConfirm()}>
				{(dc) => (
					<DropConfirm
						itemId={dc().itemId}
						maxQty={dc().maxQty}
						slotIdx={dc().slotIdx}
						onConfirm={(idx, qty) => {
							props.state.sendDropItem(idx, qty);
							setDropConfirm(null);
						}}
						onCancel={() => setDropConfirm(null)}
					/>
				)}
			</Show>

			{/* Death Screen */}
			{isDead() && <DeathScreen respawnTimer={respawnTimer()} xpLost={xpLost()} />}
		</>
	);
}
