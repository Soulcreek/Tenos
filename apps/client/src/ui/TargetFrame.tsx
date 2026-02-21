import { MONSTER_TYPES } from "@tenos/shared";

const containerStyle = {
	position: "absolute",
	top: "12px",
	left: "50%",
	transform: "translateX(-50%)",
	background: "rgba(0,0,0,0.7)",
	"border-radius": "4px",
	border: "1px solid rgba(255,255,255,0.2)",
	padding: "8px 16px",
	"min-width": "200px",
	"pointer-events": "none",
	"text-align": "center",
} as const;

const nameStyle = {
	color: "#ff6666",
	"font-family": "monospace",
	"font-size": "13px",
	"font-weight": "bold",
	"margin-bottom": "4px",
} as const;

const hpBarOuter = {
	width: "100%",
	height: "14px",
	background: "rgba(0,0,0,0.5)",
	"border-radius": "2px",
	overflow: "hidden",
	border: "1px solid rgba(255,255,255,0.1)",
	position: "relative",
} as const;

const hpLabelStyle = {
	position: "absolute",
	width: "100%",
	"text-align": "center",
	color: "#fff",
	"font-size": "10px",
	"font-family": "monospace",
	"line-height": "14px",
	"text-shadow": "0 0 3px rgba(0,0,0,0.9)",
} as const;

interface TargetInfo {
	name: string;
	typeId: number;
	hp: number;
	hpMax: number;
	level: number;
}

export function TargetFrame(props: { target: TargetInfo | null }) {
	const t = () => props.target;
	const hp = () => t()?.hp ?? 0;
	const hpMax = () => t()?.hpMax ?? 1;
	const hpPct = () => Math.max(0, Math.min(100, (hp() / hpMax()) * 100));

	return (
		<>
			{t() && (
				<div style={containerStyle}>
					<div style={nameStyle}>
						{MONSTER_TYPES[t()?.typeId ?? 0]?.name ?? t()?.name ?? "Unknown"} Lv.
						{t()?.level ?? 1}
					</div>
					<div style={hpBarOuter}>
						<div
							style={{
								width: `${hpPct()}%`,
								height: "100%",
								background: "#c0392b",
								transition: "width 0.2s",
							}}
						/>
						<div style={hpLabelStyle}>
							{Math.ceil(hp())} / {Math.ceil(hpMax())}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
