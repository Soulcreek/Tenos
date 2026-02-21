import { ITEM_CATALOG } from "@tenos/shared";
import { createSignal } from "solid-js";

interface DropConfirmProps {
	itemId: number;
	maxQty: number;
	slotIdx: number;
	onConfirm: (slotIdx: number, qty: number) => void;
	onCancel: () => void;
}

export function DropConfirm(props: DropConfirmProps) {
	const [qty, setQty] = createSignal(props.maxQty);
	const item = ITEM_CATALOG[props.itemId];
	const name = item?.name ?? "Item";

	return (
		<div
			style={{
				position: "fixed",
				inset: "0",
				background: "rgba(0,0,0,0.5)",
				display: "flex",
				"align-items": "center",
				"justify-content": "center",
				"z-index": "700",
				"pointer-events": "auto",
			}}
		>
			<div
				style={{
					background: "rgba(15,15,20,0.95)",
					border: "1px solid rgba(255,255,255,0.2)",
					"border-radius": "8px",
					padding: "20px",
					"font-family": "monospace",
					color: "white",
					"min-width": "220px",
					"text-align": "center",
				}}
			>
				<div style={{ "margin-bottom": "12px", "font-size": "13px" }}>Drop {name}?</div>

				{props.maxQty > 1 && (
					<div style={{ "margin-bottom": "12px" }}>
						<input
							type="range"
							min="1"
							max={props.maxQty}
							value={qty()}
							onInput={(e) => setQty(Number(e.currentTarget.value))}
							style={{ width: "100%" }}
						/>
						<div style={{ "font-size": "12px", color: "rgba(255,255,255,0.6)" }}>x{qty()}</div>
					</div>
				)}

				<div style={{ display: "flex", gap: "8px", "justify-content": "center" }}>
					<button
						type="button"
						onClick={props.onCancel}
						style={{
							padding: "6px 16px",
							background: "#333",
							color: "white",
							border: "none",
							"border-radius": "4px",
							"font-family": "monospace",
							cursor: "pointer",
						}}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => props.onConfirm(props.slotIdx, qty())}
						style={{
							padding: "6px 16px",
							background: "#c44",
							color: "white",
							border: "none",
							"border-radius": "4px",
							"font-family": "monospace",
							cursor: "pointer",
						}}
					>
						Drop
					</button>
				</div>
			</div>
		</div>
	);
}
