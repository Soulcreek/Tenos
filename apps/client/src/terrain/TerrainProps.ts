import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Scene } from "@babylonjs/core/scene";
import { TERRAIN_SIZE } from "./TerrainManager.js";

/** Simple deterministic PRNG (Mulberry32). */
function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

interface PropInstance {
	x: number;
	z: number;
}

function generatePositions(
	rng: () => number,
	count: number,
	minDist: number,
	minFromCenter: number,
	halfSize: number,
): PropInstance[] {
	const placed: PropInstance[] = [];
	let attempts = 0;
	while (placed.length < count && attempts < count * 10) {
		attempts++;
		const x = (rng() - 0.5) * 2 * halfSize;
		const z = (rng() - 0.5) * 2 * halfSize;

		// Keep away from spawn area
		if (x * x + z * z < minFromCenter * minFromCenter) continue;

		// Min distance from other props
		let tooClose = false;
		for (const p of placed) {
			const dx = p.x - x;
			const dz = p.z - z;
			if (dx * dx + dz * dz < minDist * minDist) {
				tooClose = true;
				break;
			}
		}
		if (tooClose) continue;

		placed.push({ x, z });
	}
	return placed;
}

/**
 * Scatter procedural trees across the terrain using thin instances for performance.
 */
export function scatterTrees(scene: Scene): void {
	const rng = mulberry32(137);
	const halfSize = TERRAIN_SIZE * 0.47;
	const positions = generatePositions(rng, 50, 4, 10, halfSize);

	// --- Deciduous tree template ---
	const trunkMat = new StandardMaterial("treeTrunkMat", scene);
	trunkMat.diffuseColor = new Color3(0.4, 0.28, 0.15);
	trunkMat.specularColor = new Color3(0.1, 0.1, 0.1);

	const canopyMat = new StandardMaterial("treeCanopyMat", scene);
	canopyMat.diffuseColor = new Color3(0.2, 0.55, 0.15);
	canopyMat.specularColor = new Color3(0.1, 0.1, 0.1);

	// Deciduous trunk template
	const decTrunk = MeshBuilder.CreateCylinder(
		"treeTrunk",
		{
			height: 2.0,
			diameterTop: 0.15,
			diameterBottom: 0.25,
			tessellation: 6,
		},
		scene,
	);
	decTrunk.material = trunkMat;
	decTrunk.isPickable = false;
	decTrunk.isVisible = false; // template hidden, thin instances render

	// Deciduous canopy template
	const decCanopy = MeshBuilder.CreateSphere(
		"treeCanopy",
		{
			diameter: 2.0,
			segments: 4,
		},
		scene,
	);
	decCanopy.material = canopyMat;
	decCanopy.isPickable = false;
	decCanopy.isVisible = false;

	// --- Pine tree templates ---
	const pineTrunk = MeshBuilder.CreateCylinder(
		"pineTrunk",
		{
			height: 2.5,
			diameterTop: 0.1,
			diameterBottom: 0.2,
			tessellation: 6,
		},
		scene,
	);
	pineTrunk.material = trunkMat;
	pineTrunk.isPickable = false;
	pineTrunk.isVisible = false;

	const pineMat = new StandardMaterial("pineMat", scene);
	pineMat.diffuseColor = new Color3(0.15, 0.4, 0.12);
	pineMat.specularColor = new Color3(0.1, 0.1, 0.1);

	const pineCone1 = MeshBuilder.CreateCylinder(
		"pineCone1",
		{
			height: 1.5,
			diameterTop: 0,
			diameterBottom: 1.8,
			tessellation: 6,
		},
		scene,
	);
	pineCone1.material = pineMat;
	pineCone1.isPickable = false;
	pineCone1.isVisible = false;

	const pineCone2 = MeshBuilder.CreateCylinder(
		"pineCone2",
		{
			height: 1.2,
			diameterTop: 0,
			diameterBottom: 1.4,
			tessellation: 6,
		},
		scene,
	);
	pineCone2.material = pineMat;
	pineCone2.isPickable = false;
	pineCone2.isVisible = false;

	for (let i = 0; i < positions.length; i++) {
		const p = positions[i];
		const scale = 0.8 + rng() * 0.6;
		const rotY = rng() * Math.PI * 2;

		if (i % 3 !== 0) {
			// Deciduous tree (~67%)
			const trunkMatrix = Matrix.Compose(
				new Vector3(scale, scale, scale),
				Quaternion.RotationAxis(Vector3.Up(), rotY),
				new Vector3(p.x, 1.0 * scale, p.z),
			);
			decTrunk.thinInstanceAdd(trunkMatrix);

			const canopyMatrix = Matrix.Compose(
				new Vector3(scale, scale * (0.8 + rng() * 0.4), scale),
				Quaternion.RotationAxis(Vector3.Up(), rotY),
				new Vector3(p.x, 2.2 * scale, p.z),
			);
			decCanopy.thinInstanceAdd(canopyMatrix);
		} else {
			// Pine tree (~33%)
			const trunkMatrix = Matrix.Compose(
				new Vector3(scale, scale, scale),
				Quaternion.RotationAxis(Vector3.Up(), rotY),
				new Vector3(p.x, 1.25 * scale, p.z),
			);
			pineTrunk.thinInstanceAdd(trunkMatrix);

			const cone1Matrix = Matrix.Compose(
				new Vector3(scale, scale, scale),
				Quaternion.RotationAxis(Vector3.Up(), rotY),
				new Vector3(p.x, 3.0 * scale, p.z),
			);
			pineCone1.thinInstanceAdd(cone1Matrix);

			const cone2Matrix = Matrix.Compose(
				new Vector3(scale, scale, scale),
				Quaternion.RotationAxis(Vector3.Up(), rotY),
				new Vector3(p.x, 4.0 * scale, p.z),
			);
			pineCone2.thinInstanceAdd(cone2Matrix);
		}
	}
}

/**
 * Scatter procedural rocks across the terrain using thin instances.
 */
export function scatterRocks(scene: Scene): void {
	const rng = mulberry32(293);
	const halfSize = TERRAIN_SIZE * 0.47;
	const positions = generatePositions(rng, 35, 3, 8, halfSize);

	const rockMat = new StandardMaterial("rockMat", scene);
	rockMat.diffuseColor = new Color3(0.5, 0.48, 0.45);
	rockMat.specularColor = new Color3(0.15, 0.15, 0.15);

	// Rock template — icosphere with non-uniform scaling for irregular shapes
	const rockTemplate = MeshBuilder.CreateIcoSphere(
		"rockTemplate",
		{
			radius: 0.5,
			subdivisions: 1,
		},
		scene,
	);
	rockTemplate.material = rockMat;
	rockTemplate.isPickable = false;
	rockTemplate.isVisible = false;

	for (const p of positions) {
		const sx = 0.5 + rng() * 1.5;
		const sy = 0.3 + rng() * 0.8;
		const sz = 0.5 + rng() * 1.5;
		const rotY = rng() * Math.PI * 2;

		const matrix = Matrix.Compose(
			new Vector3(sx, sy, sz),
			Quaternion.RotationAxis(Vector3.Up(), rotY),
			new Vector3(p.x, sy * 0.3, p.z),
		);
		rockTemplate.thinInstanceAdd(matrix);
	}
}
