import {
	type EquipSlot,
	type EquipmentSlots,
	ITEM_CATALOG,
	type InventorySlot,
} from "@tenos/shared";
import { For, Show, createSignal, onCleanup } from "solid-js";

const RARITY_COLORS: Record<string, string> = {
	common: "#aaa",
	uncommon: "#5f5",
	rare: "#55f",
	epic: "#a5f",
	legendary: "#fa5",
	mythic: "#f55",
};

const EQUIP_SLOT_NAMES: EquipSlot[] = [
	"weapon",
	"helmet",
	"armor",
	"boots",
	"shield",
	"earring",
	"bracelet",
	"necklace",
];
const EQUIP_SLOT_LABELS: Record<string, string> = {
	weapon: "Wpn",
	helmet: "Helm",
	armor: "Armor",
	boots: "Boots",
	shield: "Shld",
	earring: "Ear",
	bracelet: "Brc",
	necklace: "Nck",
};

export interface InventoryPanelState {
	getInventory: () => (InventorySlot | null)[];
	getEquipment: () => EquipmentSlots;
	getYang: () => number;
	onEquip: (slot: number) => void;
	onUnequip: (slot: string) => void;
	onDrop: (slot: number, qty: number) => void;
	onUse: (slot: number) => void;
	onUpgrade: (slot: number) => void;
}

function setHoverBg(el: HTMLElement) {
	el.style.background = "rgba(255,255,255,0.1)";
}

function clearHoverBg(el: HTMLElement) {
	el.style.background = "";
}

export function InventoryPanel(props: { state: InventoryPanelState; onClose: () => void }) {
	const [inventory, setInventory] = createSignal(props.state.getInventory());
	const [equipment, setEquipment] = createSignal(props.state.getEquipment());
	const [yang, setYang] = createSignal(props.state.getYang());
	const [contextMenu, setContextMenu] = createSignal<{
		x: number;
		y: number;
		slotIdx: number;
		isEquip: boolean;
		equipSlot?: string;
	} | null>(null);

	const interval = setInterval(() => {
		setInventory(props.state.getInventory());
		setEquipment(props.state.getEquipment());
		setYang(props.state.getYang());
	}, 200);

	onCleanup(() => clearInterval(interval));

	const getItemColor = (itemId: number) => {
		const item = ITEM_CATALOG[itemId];
		return item ? (RARITY_COLORS[item.rarity] ?? "#aaa") : "#aaa";
	};

	const getItemName = (slot: InventorySlot) => {
		const item = ITEM_CATALOG[slot.itemId];
		if (!item) return "?";
		return slot.upgradeLevel > 0 ? `+${slot.upgradeLevel} ${item.name}` : item.name;
	};

	const renderSlot = (
		slot: InventorySlot | null,
		idx: number,
		isEquip = false,
		equipSlotName?: string,
	) => {
		const item = slot ? ITEM_CATALOG[slot.itemId] : null;
		const label = equipSlotName ? (EQUIP_SLOT_LABELS[equipSlotName] ?? "") : "";
		return (
			<div
				style={{
					width: "36px",
					height: "36px",
					background: slot ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
					border: `1px solid ${slot ? `${getItemColor(slot.itemId)}66` : "rgba(255,255,255,0.08)"}`,
					"border-radius": "3px",
					position: "relative",
					cursor: slot ? "pointer" : "default",
					display: "flex",
					"align-items": "center",
					"justify-content": "center",
					"font-size": "12px",
					"font-family": "monospace",
					color: slot ? getItemColor(slot.itemId) : "rgba(255,255,255,0.15)",
				}}
				title={slot ? getItemName(slot) : isEquip ? label : ""}
				onContextMenu={(e) => {
					e.preventDefault();
					if (!slot) return;
					setContextMenu({
						x: e.clientX,
						y: e.clientY,
						slotIdx: idx,
						isEquip,
						equipSlot: equipSlotName,
					});
				}}
				onClick={() => setContextMenu(null)}
			>
				{slot ? item?.name.charAt(0).toUpperCase() : isEquip ? label.charAt(0) : ""}
				{/* Upgrade badge */}
				{slot && slot.upgradeLevel > 0 && (
					<div
						style={{
							position: "absolute",
							top: "-2px",
							right: "-2px",
							"font-size": "8px",
							color: "#ffa",
							"text-shadow": "0 0 2px black",
						}}
					>
						+{slot.upgradeLevel}
					</div>
				)}
				{/* Quantity badge */}
				{slot && slot.quantity > 1 && (
					<div
						style={{
							position: "absolute",
							bottom: "0",
							right: "1px",
							"font-size": "8px",
							color: "rgba(255,255,255,0.7)",
						}}
					>
						{slot.quantity}
					</div>
				)}
			</div>
		);
	};

	return (
		<div
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				background: "rgba(10,10,15,0.92)",
				border: "1px solid rgba(255,255,255,0.15)",
				"border-radius": "8px",
				padding: "16px",
				"font-family": "monospace",
				color: "white",
				"z-index": "500",
				"min-width": "420px",
				"pointer-events": "auto",
			}}
			onClick={() => setContextMenu(null)}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					"justify-content": "space-between",
					"margin-bottom": "12px",
				}}
			>
				<span style={{ "font-size": "14px", "font-weight": "bold" }}>Inventory</span>
				<span
					style={{
						cursor: "pointer",
						color: "rgba(255,255,255,0.5)",
						"font-size": "14px",
					}}
					onClick={props.onClose}
				>
					\u2715
				</span>
			</div>

			<div style={{ display: "flex", gap: "16px" }}>
				{/* Inventory Grid 5x9 */}
				<div>
					<div
						style={{
							display: "grid",
							"grid-template-columns": "repeat(5, 36px)",
							gap: "3px",
						}}
					>
						<For each={inventory()}>{(slot, idx) => renderSlot(slot, idx())}</For>
					</div>
				</div>

				{/* Equipment Slots */}
				<div
					style={{
						display: "flex",
						"flex-direction": "column",
						gap: "3px",
						"align-items": "center",
					}}
				>
					<div
						style={{
							"font-size": "10px",
							color: "rgba(255,255,255,0.4)",
							"margin-bottom": "4px",
						}}
					>
						Equipment
					</div>
					<For each={EQUIP_SLOT_NAMES}>
						{(slotName) => {
							const eq = () => equipment()[slotName];
							return (
								<div style={{ display: "flex", "align-items": "center", gap: "4px" }}>
									{renderSlot(eq(), -1, true, slotName)}
									<span
										style={{
											"font-size": "8px",
											color: "rgba(255,255,255,0.3)",
											width: "30px",
										}}
									>
										{EQUIP_SLOT_LABELS[slotName]}
									</span>
								</div>
							);
						}}
					</For>
				</div>
			</div>

			{/* Yang */}
			<div
				style={{
					"margin-top": "8px",
					"font-size": "11px",
					color: "#ffd700",
					"text-align": "right",
				}}
			>
				{yang().toLocaleString()} Yang
			</div>

			{/* Context Menu */}
			<Show when={contextMenu()}>
				{(menu) => {
					const slot = menu().isEquip
						? equipment()[menu().equipSlot as EquipSlot]
						: inventory()[menu().slotIdx];
					if (!slot) return null;
					const item = ITEM_CATALOG[slot.itemId];
					if (!item) return null;
					const isEquipable = item.slot != null;
					const isConsumable = item.type === "consumable";

					return (
						<div
							style={{
								position: "fixed",
								left: `${menu().x}px`,
								top: `${menu().y}px`,
								background: "rgba(20,20,25,0.95)",
								border: "1px solid rgba(255,255,255,0.2)",
								"border-radius": "4px",
								padding: "4px 0",
								"z-index": "600",
								"min-width": "100px",
							}}
						>
							<div
								style={{
									padding: "4px 12px",
									"font-size": "11px",
									color: getItemColor(slot.itemId),
									"border-bottom": "1px solid rgba(255,255,255,0.1)",
								}}
							>
								{getItemName(slot)}
							</div>
							{menu().isEquip ? (
								<div
									style={{
										padding: "6px 12px",
										"font-size": "11px",
										cursor: "pointer",
										color: "white",
									}}
									onMouseOver={(e) => setHoverBg(e.currentTarget)}
									onMouseOut={(e) => clearHoverBg(e.currentTarget)}
									onClick={() => {
										const eqSlot = menu().equipSlot;
										if (eqSlot) props.state.onUnequip(eqSlot);
										setContextMenu(null);
									}}
								>
									Unequip
								</div>
							) : (
								<>
									{isEquipable && (
										<div
											style={{
												padding: "6px 12px",
												"font-size": "11px",
												cursor: "pointer",
												color: "white",
											}}
											onMouseOver={(e) => setHoverBg(e.currentTarget)}
											onMouseOut={(e) => clearHoverBg(e.currentTarget)}
											onClick={() => {
												props.state.onEquip(menu().slotIdx);
												setContextMenu(null);
											}}
										>
											Equip
										</div>
									)}
									{isConsumable && (
										<div
											style={{
												padding: "6px 12px",
												"font-size": "11px",
												cursor: "pointer",
												color: "#5f5",
											}}
											onMouseOver={(e) => setHoverBg(e.currentTarget)}
											onMouseOut={(e) => clearHoverBg(e.currentTarget)}
											onClick={() => {
												props.state.onUse(menu().slotIdx);
												setContextMenu(null);
											}}
										>
											Use
										</div>
									)}
									{isEquipable && (
										<div
											style={{
												padding: "6px 12px",
												"font-size": "11px",
												cursor: "pointer",
												color: "#fa5",
											}}
											onMouseOver={(e) => setHoverBg(e.currentTarget)}
											onMouseOut={(e) => clearHoverBg(e.currentTarget)}
											onClick={() => {
												props.state.onUpgrade(menu().slotIdx);
												setContextMenu(null);
											}}
										>
											Upgrade
										</div>
									)}
									<div
										style={{
											padding: "6px 12px",
											"font-size": "11px",
											cursor: "pointer",
											color: "#f55",
										}}
										onMouseOver={(e) => setHoverBg(e.currentTarget)}
										onMouseOut={(e) => clearHoverBg(e.currentTarget)}
										onClick={() => {
											props.state.onDrop(menu().slotIdx, slot.quantity);
											setContextMenu(null);
										}}
									>
										Drop
									</div>
								</>
							)}
						</div>
					);
				}}
			</Show>
		</div>
	);
}
