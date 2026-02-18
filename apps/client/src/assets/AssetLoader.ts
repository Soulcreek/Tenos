import type { Scene } from "@babylonjs/core/scene";

/**
 * Centralized asset loader. Currently minimal — will expand when we
 * add GLTF models, textures, and audio assets in later milestones.
 */
export class AssetLoader {
	scene: Scene;

	constructor(scene: Scene) {
		this.scene = scene;
	}

	/**
	 * Preloads essential assets needed before gameplay starts.
	 * Currently a no-op since we use procedural placeholders.
	 */
	async preload(): Promise<void> {
		// Future: load character models, UI sprites, audio, etc.
		// await SceneLoader.ImportMeshAsync("", "/assets/models/", "warrior.glb", this.scene);
	}
}
