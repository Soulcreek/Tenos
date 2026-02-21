import { For } from "solid-js";

const containerStyle = {
	position: "absolute",
	right: "20px",
	bottom: "100px",
	display: "flex",
	"flex-direction": "column-reverse",
	gap: "4px",
	"pointer-events": "none",
} as const;

const popupStyle = {
	background: "rgba(0,0,0,0.7)",
	"border-radius": "4px",
	border: "1px solid rgba(46,204,113,0.4)",
	padding: "6px 12px",
	color: "#2ecc71",
	"font-family": "monospace",
	"font-size": "12px",
	"white-space": "nowrap",
} as const;

interface LootPopupData {
	name: string;
	qty: number;
	time: number;
}

export function LootPopup(props: { items: LootPopupData[] }) {
	return (
		<div style={containerStyle}>
			<For each={props.items}>
				{(item) => (
					<div
						style={{
							...popupStyle,
							opacity: String(Math.min(1, item.time)),
						}}
					>
						+ {item.name} x{item.qty}
					</div>
				)}
			</For>
		</div>
	);
}
