import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

interface HealParticle {
	mesh: Mesh;
	velocity: number;
	lifetime: number;
	maxLifetime: number;
}

export class HealEffectManager {
	private particles: HealParticle[] = [];
	private scene: Scene;
	private material: StandardMaterial;

	constructor(scene: Scene) {
		this.scene = scene;
		this.material = new StandardMaterial("healMat", scene);
		this.material.diffuseColor = new Color3(0.2, 0.9, 0.3);
		this.material.emissiveColor = new Color3(0.1, 0.5, 0.15);
		this.material.alpha = 0.8;
	}

	spawn(x: number, z: number) {
		const count = 6;
		for (let i = 0; i < count; i++) {
			const mesh = MeshBuilder.CreateBox(
				`heal_${Date.now()}_${i}`,
				{ width: 0.06, height: 0.06, depth: 0.06 },
				this.scene,
			);
			mesh.material = this.material;
			mesh.isPickable = false;

			const offsetX = (Math.random() - 0.5) * 0.6;
			const offsetZ = (Math.random() - 0.5) * 0.6;
			mesh.position = new Vector3(x + offsetX, 0.5 + Math.random() * 0.5, z + offsetZ);

			this.particles.push({
				mesh,
				velocity: 1.5 + Math.random() * 1.0,
				lifetime: 0.8 + Math.random() * 0.4,
				maxLifetime: 0.8 + Math.random() * 0.4,
			});
		}
	}

	update(dt: number) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.lifetime -= dt;
			p.mesh.position.y += p.velocity * dt;

			// Fade out
			const alpha = Math.max(0, p.lifetime / p.maxLifetime);
			p.mesh.scaling = new Vector3(alpha, alpha, alpha);

			if (p.lifetime <= 0) {
				p.mesh.dispose();
				this.particles.splice(i, 1);
			}
		}
	}

	dispose() {
		for (const p of this.particles) {
			p.mesh.dispose();
		}
		this.particles = [];
	}
}
