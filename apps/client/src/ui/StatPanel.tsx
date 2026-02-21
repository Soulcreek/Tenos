import { For } from "solid-js";

const panelStyle = {
	position: "absolute",
	top: "50%",
	right: "20px",
	transform: "translateY(-50%)",
	background: "rgba(0,0,0,0.85)",
	"border-radius": "6px",
	border: "1px solid rgba(255,255,255,0.2)",
	padding: "16px",
	"min-width": "220px",
	color: "#fff",
	"font-family": "monospace",
	"font-size": "12px",
} as const;

const titleStyle = {
	"font-size": "14px",
	"font-weight": "bold",
	"margin-bottom": "12px",
	"text-align": "center",
	color: "#f1c40f",
} as const;

const rowStyle = {
	display: "flex",
	"justify-content": "space-between",
	"align-items": "center",
	"margin-bottom": "6px",
} as const;

const btnStyle = {
	background: "#2ecc71",
	color: "#000",
	border: "none",
	"border-radius": "3px",
	padding: "2px 8px",
	cursor: "pointer",
	"font-size": "11px",
	"font-family": "monospace",
} as const;

const sectionStyle = {
	"border-top": "1px solid rgba(255,255,255,0.1)",
	"margin-top": "8px",
	"padding-top": "8px",
} as const;

interface PlayerStatsData {
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
}

export function StatPanel(props: {
	stats: PlayerStatsData;
	level: number;
	onAllocate: (stat: "str" | "dex" | "int" | "vit") => void;
	onClose: () => void;
}) {
	const canAllocate = () => props.stats.statPoints > 0;

	return (
		<div style={panelStyle}>
			<div style={titleStyle}>Character Stats</div>

			<div style={rowStyle}>
				<span>Level</span>
				<span>{props.level}</span>
			</div>

			<div style={rowStyle}>
				<span>Points</span>
				<span style={{ color: "#2ecc71" }}>{props.stats.statPoints}</span>
			</div>

			<div style={sectionStyle}>
				<For each={["str", "dex", "int", "vit"] as const}>
					{(stat) => (
						<div style={rowStyle}>
							<span>{stat.toUpperCase()}</span>
							<span>
								{props.stats[stat]}
								{canAllocate() && (
									<button
										type="button"
										style={{ ...btnStyle, "margin-left": "8px" }}
										onClick={() => props.onAllocate(stat)}
									>
										+
									</button>
								)}
							</span>
						</div>
					)}
				</For>
			</div>

			<div style={sectionStyle}>
				<div style={rowStyle}>
					<span>ATK</span>
					<span>{props.stats.attackPower.toFixed(1)}</span>
				</div>
				<div style={rowStyle}>
					<span>DEF</span>
					<span>{props.stats.defense.toFixed(1)}</span>
				</div>
				<div style={rowStyle}>
					<span>SPD</span>
					<span>{props.stats.attackSpeed.toFixed(2)}</span>
				</div>
				<div style={rowStyle}>
					<span>CRIT</span>
					<span>{(props.stats.critChance * 100).toFixed(1)}%</span>
				</div>
			</div>

			<div style={{ "text-align": "center", "margin-top": "12px" }}>
				<button
					type="button"
					style={{
						...btnStyle,
						background: "#e74c3c",
						color: "#fff",
						padding: "4px 16px",
					}}
					onClick={props.onClose}
				>
					Close [C]
				</button>
			</div>
		</div>
	);
}
