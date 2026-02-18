const containerStyle = {
	width: "150px",
	height: "150px",
	background: "rgba(0,0,0,0.5)",
	"border-radius": "4px",
	border: "1px solid rgba(255,255,255,0.2)",
	position: "relative",
	overflow: "hidden",
} as const;

const dotStyle = {
	width: "6px",
	height: "6px",
	background: "#3498db",
	"border-radius": "50%",
	position: "absolute",
	transform: "translate(-50%, -50%)",
	"box-shadow": "0 0 4px #3498db",
} as const;

const labelStyle = {
	position: "absolute",
	bottom: "4px",
	left: "0",
	width: "100%",
	"text-align": "center",
	color: "rgba(255,255,255,0.5)",
	"font-size": "9px",
	"font-family": "monospace",
} as const;

/** Terrain size for mapping world coords to minimap coords. */
const TERRAIN_HALF = 64;

export function Minimap(props: { playerX: number; playerZ: number; zoneName: string }) {
	const mapX = () => ((props.playerX + TERRAIN_HALF) / (TERRAIN_HALF * 2)) * 100;
	const mapZ = () => ((props.playerZ + TERRAIN_HALF) / (TERRAIN_HALF * 2)) * 100;

	return (
		<div style={containerStyle}>
			<div
				style={{
					...dotStyle,
					left: `${mapX()}%`,
					top: `${100 - mapZ()}%`,
				}}
			/>
			<div style={labelStyle}>{props.zoneName}</div>
		</div>
	);
}
