import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

export interface ActiveProjectile {
	id: number;
	mesh: Mesh;
	targetNetId: number;
	speed: number;
	type: "bolt" | "arrow";
	lifetime: number;
}

const MAX_LIFETIME = 3;

export class ProjectileEffectManager {
	private projectiles = new Map<number, ActiveProjectile>();
	private scene: Scene;

	constructor(scene: Scene) {
		this.scene = scene;
	}

	spawn(
		id: number,
		fromX: number,
		fromZ: number,
		toNetId: number,
		speed: number,
		type: "bolt" | "arrow",
	) {
		// Remove old if exists
		this.remove(id);

		let mesh: Mesh;
		if (type === "bolt") {
			mesh = MeshBuilder.CreateSphere(`proj_${id}`, { diameter: 0.15, segments: 4 }, this.scene);
			const mat = new StandardMaterial(`proj_mat_${id}`, this.scene);
			mat.diffuseColor = new Color3(0.3, 0.5, 1);
			mat.emissiveColor = new Color3(0.2, 0.3, 0.8);
			mesh.material = mat;
		} else {
			mesh = MeshBuilder.CreateBox(
				`proj_${id}`,
				{ width: 0.03, height: 0.03, depth: 0.3 },
				this.scene,
			);
			const mat = new StandardMaterial(`proj_mat_${id}`, this.scene);
			mat.diffuseColor = new Color3(0.6, 0.5, 0.3);
			mesh.material = mat;
		}

		mesh.position = new Vector3(fromX, 1.0, fromZ);
		mesh.isPickable = false;

		this.projectiles.set(id, {
			id,
			mesh,
			targetNetId: toNetId,
			speed,
			type,
			lifetime: MAX_LIFETIME,
		});
	}

	update(dt: number, getTargetPos: (netId: number) => { x: number; z: number } | null) {
		for (const [id, proj] of this.projectiles) {
			proj.lifetime -= dt;
			if (proj.lifetime <= 0) {
				this.remove(id);
				continue;
			}

			const target = getTargetPos(proj.targetNetId);
			if (!target) {
				this.remove(id);
				continue;
			}

			const dx = target.x - proj.mesh.position.x;
			const dz = target.z - proj.mesh.position.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist < 0.5) {
				this.remove(id);
				continue;
			}

			const moveAmount = Math.min(proj.speed * dt, dist);
			const ratio = moveAmount / dist;
			proj.mesh.position.x += dx * ratio;
			proj.mesh.position.z += dz * ratio;

			// Orient arrow toward target
			if (proj.type === "arrow") {
				proj.mesh.rotation.y = Math.atan2(dx, dz);
			}
		}
	}

	remove(id: number) {
		const proj = this.projectiles.get(id);
		if (proj) {
			proj.mesh.dispose();
			this.projectiles.delete(id);
		}
	}

	dispose() {
		for (const [, proj] of this.projectiles) {
			proj.mesh.dispose();
		}
		this.projectiles.clear();
	}
}
