import { createSignal, onCleanup } from "solid-js";

export interface SkillBarState {
	getSkills: () => Array<{
		id: string;
		name: string;
		manaCost: number;
		cooldown: number;
		cooldownMax: number;
		key: string;
	}>;
}

export function SkillBar(props: { state: SkillBarState }) {
	const [skills, setSkills] = createSignal(props.state.getSkills());

	const interval = setInterval(() => {
		setSkills(props.state.getSkills());
	}, 50);

	onCleanup(() => clearInterval(interval));

	return (
		<div
			style={{
				position: "absolute",
				bottom: "50px",
				left: "50%",
				transform: "translateX(-50%)",
				display: "flex",
				gap: "4px",
				"pointer-events": "none",
			}}
		>
			{skills().map((skill) => {
				const cdPct = skill.cooldownMax > 0 ? skill.cooldown / skill.cooldownMax : 0;
				const onCd = skill.cooldown > 0;
				return (
					<div
						style={{
							width: "52px",
							height: "52px",
							background: "rgba(0,0,0,0.7)",
							border: `1px solid ${onCd ? "rgba(255,255,255,0.15)" : "rgba(255,200,50,0.5)"}`,
							"border-radius": "4px",
							position: "relative",
							overflow: "hidden",
						}}
					>
						{/* Skill icon placeholder */}
						<div
							style={{
								position: "absolute",
								inset: "0",
								display: "flex",
								"align-items": "center",
								"justify-content": "center",
								"font-size": "18px",
								"font-family": "monospace",
								"font-weight": "bold",
								color: onCd ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.9)",
							}}
						>
							{skill.name.charAt(0)}
						</div>

						{/* Cooldown sweep overlay */}
						{onCd && (
							<div
								style={{
									position: "absolute",
									inset: "0",
									background: "rgba(0,0,0,0.6)",
									"clip-path": `inset(0 0 ${(1 - cdPct) * 100}% 0)`,
								}}
							/>
						)}

						{/* Cooldown text */}
						{onCd && (
							<div
								style={{
									position: "absolute",
									inset: "0",
									display: "flex",
									"align-items": "center",
									"justify-content": "center",
									"font-size": "14px",
									"font-family": "monospace",
									color: "#ffa",
									"text-shadow": "0 0 4px black",
								}}
							>
								{Math.ceil(skill.cooldown)}
							</div>
						)}

						{/* Keybind */}
						<div
							style={{
								position: "absolute",
								top: "1px",
								left: "3px",
								"font-size": "9px",
								"font-family": "monospace",
								color: "rgba(255,255,255,0.5)",
							}}
						>
							{skill.key}
						</div>

						{/* Mana cost */}
						<div
							style={{
								position: "absolute",
								bottom: "1px",
								right: "3px",
								"font-size": "8px",
								"font-family": "monospace",
								color: "rgba(100,150,255,0.7)",
							}}
						>
							{skill.manaCost}
						</div>
					</div>
				);
			})}
		</div>
	);
}
