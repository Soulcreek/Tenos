import { ITEM_CATALOG, type InventorySlot, getUpgradeEntry } from "@tenos/shared";
import { Show, createSignal } from "solid-js";

interface UpgradePanelProps {
	slot: InventorySlot;
	slotIdx: number;
	inventory: (InventorySlot | null)[];
	onUpgrade: (slotIdx: number, useWardingSeal: boolean) => void;
	onClose: () => void;
	lastResult: { success: boolean; destroyed: boolean; itemName: string } | null;
}

export function UpgradePanel(props: UpgradePanelProps) {
	const [useSeal, setUseSeal] = createSignal(false);

	const item = () => ITEM_CATALOG[props.slot.itemId];
	const entry = () => getUpgradeEntry(props.slot.upgradeLevel);

	const hasMaterial = () => {
		const e = entry();
		if (!e) return false;
		return props.inventory.some((s) => s && s.itemId === e.materialId);
	};

	const hasSeal = () => props.inventory.some((s) => s && s.itemId === 112);

	const materialName = () => {
		const e = entry();
		if (!e) return "";
		return ITEM_CATALOG[e.materialId]?.name ?? "Unknown";
	};

	const successRate = () => {
		const e = entry();
		return e ? Math.round(e.successRate * 100) : 0;
	};

	const canDestroy = () => {
		const e = entry();
		return e?.onFail === "destroy";
	};

	const resultColor = () => {
		if (!props.lastResult) return "";
		if (props.lastResult.success) return "#5f5";
		if (props.lastResult.destroyed) return "#f33";
		return "#fa5";
	};

	return (
		<div
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				background: "rgba(10,10,15,0.95)",
				border: "1px solid rgba(255,200,50,0.3)",
				"border-radius": "8px",
				padding: "20px",
				"font-family": "monospace",
				color: "white",
				"z-index": "600",
				width: "260px",
				"pointer-events": "auto",
			}}
		>
			<div style={{ display: "flex", "justify-content": "space-between", "margin-bottom": "16px" }}>
				<span style={{ "font-size": "14px", "font-weight": "bold", color: "#fa5" }}>Forge</span>
				<span style={{ cursor: "pointer", color: "rgba(255,255,255,0.5)" }} onClick={props.onClose}>
					\u2715
				</span>
			</div>

			<div style={{ "text-align": "center", "margin-bottom": "12px" }}>
				<div style={{ "font-size": "14px", color: "#fff" }}>
					{props.slot.upgradeLevel > 0 ? `+${props.slot.upgradeLevel} ` : ""}
					{item()?.name ?? "Unknown"}
				</div>
				<div style={{ "font-size": "11px", color: "rgba(255,255,255,0.5)", "margin-top": "4px" }}>
					\u2192 +{props.slot.upgradeLevel + 1}
				</div>
			</div>

			<Show
				when={entry()}
				fallback={
					<div
						style={{ "text-align": "center", color: "rgba(255,255,255,0.4)", "font-size": "11px" }}
					>
						Maximum upgrade level reached
					</div>
				}
			>
				<div
					style={{
						background: "rgba(255,255,255,0.05)",
						"border-radius": "4px",
						padding: "8px",
						"margin-bottom": "12px",
						"font-size": "11px",
					}}
				>
					<div
						style={{ display: "flex", "justify-content": "space-between", "margin-bottom": "4px" }}
					>
						<span style={{ color: "rgba(255,255,255,0.6)" }}>Material:</span>
						<span style={{ color: hasMaterial() ? "#5f5" : "#f55" }}>
							{materialName()} {hasMaterial() ? "\u2713" : "\u2717"}
						</span>
					</div>
					<div
						style={{ display: "flex", "justify-content": "space-between", "margin-bottom": "4px" }}
					>
						<span style={{ color: "rgba(255,255,255,0.6)" }}>Success:</span>
						<span
							style={{
								color: successRate() >= 70 ? "#5f5" : successRate() >= 35 ? "#fa5" : "#f55",
							}}
						>
							{successRate()}%
						</span>
					</div>
					{canDestroy() && (
						<div style={{ color: "#f55", "font-size": "10px", "margin-top": "4px" }}>
							\u26a0 Item may be destroyed on failure!
						</div>
					)}
				</div>

				{canDestroy() && hasSeal() && (
					<label
						style={{
							display: "flex",
							"align-items": "center",
							gap: "6px",
							"font-size": "11px",
							"margin-bottom": "12px",
							cursor: "pointer",
							color: "#a5f",
						}}
					>
						<input
							type="checkbox"
							checked={useSeal()}
							onChange={(e) => setUseSeal(e.currentTarget.checked)}
						/>
						Use Warding Seal (prevents destruction)
					</label>
				)}

				<button
					disabled={!hasMaterial()}
					onClick={() => props.onUpgrade(props.slotIdx, useSeal())}
					style={{
						width: "100%",
						padding: "8px",
						background: hasMaterial() ? "#b85" : "#333",
						color: hasMaterial() ? "white" : "#666",
						border: "none",
						"border-radius": "4px",
						"font-family": "monospace",
						"font-size": "13px",
						cursor: hasMaterial() ? "pointer" : "not-allowed",
						"font-weight": "bold",
					}}
				>
					Forge
				</button>
			</Show>

			{/* Result feedback */}
			<Show when={props.lastResult}>
				<div
					style={{
						"margin-top": "12px",
						"text-align": "center",
						"font-size": "13px",
						"font-weight": "bold",
						color: resultColor(),
					}}
				>
					{props.lastResult?.success
						? "Upgrade Successful!"
						: props.lastResult?.destroyed
							? `${props.lastResult?.itemName} was destroyed!`
							: "Upgrade Failed"}
				</div>
			</Show>
		</div>
	);
}
