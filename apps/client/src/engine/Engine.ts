import { Engine as WebGL2Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";

export type EngineType = "webgpu" | "webgl2";

/**
 * Common engine handle. `engine` is typed as the intersection the rest of the
 * codebase needs (render loop, resize, fps). Both WebGL2Engine and
 * WebGPUEngine satisfy this at runtime.
 */
export interface EngineHandle {
	engine: WebGL2Engine;
	type: EngineType;
}

/**
 * Creates a Babylon.js engine with WebGPU preferred, falling back to WebGL2.
 * Handles adapter negotiation failures gracefully.
 */
export async function createEngine(canvas: HTMLCanvasElement): Promise<EngineHandle> {
	// Attempt WebGPU first
	const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

	if (hasWebGPU) {
		try {
			const engine = new WebGPUEngine(canvas, {
				adaptToDeviceRatio: false,
				antialias: true,
				stencil: true,
			});
			await engine.initAsync();
			// Cap HiDPI scaling to 1.5x to avoid 4x pixel count on Retina
			engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 1.5));
			console.info("[Engine] WebGPU initialized");
			return { engine: engine as unknown as WebGL2Engine, type: "webgpu" };
		} catch (err) {
			console.warn("[Engine] WebGPU init failed, falling back to WebGL2:", err);
		}
	}

	// WebGL2 fallback
	const engine = new WebGL2Engine(canvas, true, {
		preserveDrawingBuffer: true,
		stencil: true,
		adaptToDeviceRatio: false,
	});
	// Cap HiDPI scaling to 1.5x to avoid 4x pixel count on Retina
	engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 1.5));
	console.info("[Engine] WebGL2 initialized");
	return { engine, type: "webgl2" };
}
