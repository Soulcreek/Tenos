import { initEngine } from "./engine/setup.js";
import { initUI } from "./ui/App.jsx";

async function main() {
	const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
	if (!canvas) throw new Error("Canvas element not found");

	const { engine, scene } = await initEngine(canvas);

	// Init SolidJS UI overlay
	const uiRoot = document.getElementById("ui-root");
	if (uiRoot) initUI(uiRoot, engine);

	// Main render loop
	engine.runRenderLoop(() => {
		scene.render();
	});

	// Handle resize
	window.addEventListener("resize", () => {
		engine.resize();
	});
}

main().catch(console.error);
