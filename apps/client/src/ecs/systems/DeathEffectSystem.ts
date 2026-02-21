import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { Scene } from "@babylonjs/core/scene";

/**
 * Particle burst effect on entity death.
 */
export function createDeathEffect(scene: Scene, position: Vector3): void {
	const ps = new ParticleSystem("deathEffect", 50, scene);

	// Use default particle texture (built into Babylon.js)
	ps.createPointEmitter(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5));

	ps.color1 = new Color4(1, 0.2, 0.2, 1);
	ps.color2 = new Color4(0.8, 0.1, 0.1, 1);
	ps.colorDead = new Color4(0.3, 0, 0, 0);

	ps.minSize = 0.1;
	ps.maxSize = 0.3;
	ps.minLifeTime = 0.3;
	ps.maxLifeTime = 0.8;
	ps.emitRate = 200;
	ps.minEmitPower = 2;
	ps.maxEmitPower = 5;
	ps.gravity = new Vector3(0, -5, 0);

	ps.worldOffset = position;
	ps.targetStopDuration = 0.2;
	ps.disposeOnStop = true;

	ps.start();
}
