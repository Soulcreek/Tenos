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
	const positions = generatePositions(rng, 80, 3.5, 10, halfSize);

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
	const positions = generatePositions(rng, 50, 3, 8, halfSize);

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

/**
 * Build village structures near the spawn point (0,0).
 * Creates huts, a well, market stalls, and fence posts.
 */
export function buildVillage(scene: Scene): void {
	// ── Shared Materials ────────────────────────────────
	const woodMat = new StandardMaterial("villagewood", scene);
	woodMat.diffuseColor = new Color3(0.45, 0.3, 0.15);
	woodMat.specularColor = new Color3(0.1, 0.1, 0.1);

	const thatchMat = new StandardMaterial("thatch", scene);
	thatchMat.diffuseColor = new Color3(0.6, 0.5, 0.25);
	thatchMat.specularColor = new Color3(0.05, 0.05, 0.05);

	const stoneMat = new StandardMaterial("stone", scene);
	stoneMat.diffuseColor = new Color3(0.55, 0.52, 0.48);
	stoneMat.specularColor = new Color3(0.15, 0.15, 0.15);

	const clothMat = new StandardMaterial("cloth", scene);
	clothMat.diffuseColor = new Color3(0.7, 0.15, 0.1);
	clothMat.specularColor = new Color3(0.1, 0.1, 0.1);

	// ── Helper: Build a simple hut ──────────────────────
	function buildHut(x: number, z: number, rotY: number, scale: number) {
		// Walls (box)
		const walls = MeshBuilder.CreateBox(
			`hut_${x}_${z}`,
			{ width: 3 * scale, height: 2 * scale, depth: 3 * scale },
			scene,
		);
		walls.position.set(x, 1 * scale, z);
		walls.rotation.y = rotY;
		walls.material = woodMat;
		walls.isPickable = false;

		// Roof (cone)
		const roof = MeshBuilder.CreateCylinder(
			`roof_${x}_${z}`,
			{ height: 1.5 * scale, diameterTop: 0, diameterBottom: 4.5 * scale, tessellation: 4 },
			scene,
		);
		roof.position.set(x, 2.75 * scale, z);
		roof.rotation.y = rotY + Math.PI / 4;
		roof.material = thatchMat;
		roof.isPickable = false;
	}

	// Place huts around spawn
	buildHut(-5, -4, 0.2, 1.0);
	buildHut(5, -5, -0.3, 0.9);
	buildHut(-6, 5, 0.5, 1.1);
	buildHut(6, 4, -0.1, 0.85);
	buildHut(0, -7, 0, 1.0);

	// ── Village Well (center) ───────────────────────────
	const wellBase = MeshBuilder.CreateCylinder(
		"wellBase",
		{ height: 0.8, diameter: 2, tessellation: 8 },
		scene,
	);
	wellBase.position.set(0, 0.4, 0);
	wellBase.material = stoneMat;
	wellBase.isPickable = false;

	// Well pillars
	for (const sx of [-0.6, 0.6]) {
		const pillar = MeshBuilder.CreateCylinder(
			`wellPillar_${sx}`,
			{ height: 2, diameter: 0.12, tessellation: 6 },
			scene,
		);
		pillar.position.set(sx, 1.4, 0);
		pillar.material = woodMat;
		pillar.isPickable = false;
	}

	// Well beam
	const beam = MeshBuilder.CreateBox("wellBeam", { width: 1.4, height: 0.1, depth: 0.1 }, scene);
	beam.position.set(0, 2.45, 0);
	beam.material = woodMat;
	beam.isPickable = false;

	// ── Market Stalls ───────────────────────────────────
	function buildStall(x: number, z: number, rotY: number) {
		// Counter
		const counter = MeshBuilder.CreateBox(
			`stall_${x}_${z}`,
			{ width: 2.5, height: 0.8, depth: 1.2 },
			scene,
		);
		counter.position.set(x, 0.4, z);
		counter.rotation.y = rotY;
		counter.material = woodMat;
		counter.isPickable = false;

		// Canopy poles
		for (const dx of [-1, 1]) {
			const pole = MeshBuilder.CreateCylinder(
				`stallPole_${x}_${z}_${dx}`,
				{ height: 2.2, diameter: 0.08, tessellation: 6 },
				scene,
			);
			pole.position.set(x + dx * 1.1 * Math.cos(rotY), 1.1, z + dx * 1.1 * Math.sin(rotY));
			pole.material = woodMat;
			pole.isPickable = false;
		}

		// Cloth canopy
		const canopy = MeshBuilder.CreateBox(
			`canopy_${x}_${z}`,
			{ width: 2.8, height: 0.05, depth: 1.6 },
			scene,
		);
		canopy.position.set(x, 2.2, z);
		canopy.rotation.y = rotY;
		canopy.material = clothMat;
		canopy.isPickable = false;
	}

	buildStall(3, 0.5, Math.PI / 6);
	buildStall(-3, 1, -Math.PI / 5);

	// ── Fence posts around village perimeter ────────────
	const fenceMat = new StandardMaterial("fence", scene);
	fenceMat.diffuseColor = new Color3(0.5, 0.35, 0.2);
	fenceMat.specularColor = new Color3(0.05, 0.05, 0.05);

	const fenceRadius = 9;
	const fenceCount = 20;
	for (let i = 0; i < fenceCount; i++) {
		const angle = (i / fenceCount) * Math.PI * 2;
		const fx = Math.cos(angle) * fenceRadius;
		const fz = Math.sin(angle) * fenceRadius;

		const post = MeshBuilder.CreateCylinder(
			`fencePost_${i}`,
			{ height: 1.0, diameterTop: 0.06, diameterBottom: 0.1, tessellation: 5 },
			scene,
		);
		post.position.set(fx, 0.5, fz);
		post.material = fenceMat;
		post.isPickable = false;
	}

	// ── Dirt path (flat disc patches from village outward) ─
	const pathMat = new StandardMaterial("path", scene);
	pathMat.diffuseColor = new Color3(0.45, 0.35, 0.2);
	pathMat.specularColor = new Color3(0.05, 0.05, 0.05);

	const pathRng = mulberry32(555);
	// Paths radiating outward in 4 directions
	for (const dir of [
		{ dx: 1, dz: 0 },
		{ dx: -1, dz: 0 },
		{ dx: 0, dz: 1 },
		{ dx: 0, dz: -1 },
	]) {
		for (let d = 4; d < 25; d += 2.5 + pathRng() * 1.5) {
			const px = dir.dx * d + (pathRng() - 0.5) * 1.5;
			const pz = dir.dz * d + (pathRng() - 0.5) * 1.5;
			const size = 1.5 + pathRng() * 1.5;
			const patch = MeshBuilder.CreateDisc(
				`path_${d}_${dir.dx}_${dir.dz}`,
				{ radius: size, tessellation: 6 },
				scene,
			);
			patch.position.set(px, 0.02, pz);
			patch.rotation.x = Math.PI / 2;
			patch.material = pathMat;
			patch.isPickable = false;
		}
	}
}

/**
 * Create a pond/water feature near the village.
 */
export function buildPond(scene: Scene): void {
	const waterMat = new StandardMaterial("water", scene);
	waterMat.diffuseColor = new Color3(0.15, 0.35, 0.55);
	waterMat.specularColor = new Color3(0.3, 0.3, 0.3);
	waterMat.alpha = 0.7;

	// Main pond body
	const pond = MeshBuilder.CreateDisc("pond", { radius: 4, tessellation: 16 }, scene);
	pond.position.set(-8, 0.03, -2);
	pond.rotation.x = Math.PI / 2;
	pond.material = waterMat;
	pond.isPickable = false;

	// Pond edge rocks
	const edgeMat = new StandardMaterial("pondEdge", scene);
	edgeMat.diffuseColor = new Color3(0.45, 0.42, 0.38);
	edgeMat.specularColor = new Color3(0.1, 0.1, 0.1);

	const rng = mulberry32(777);
	for (let i = 0; i < 12; i++) {
		const angle = (i / 12) * Math.PI * 2 + (rng() - 0.5) * 0.3;
		const dist = 3.8 + rng() * 0.8;
		const rx = -8 + Math.cos(angle) * dist;
		const rz = -2 + Math.sin(angle) * dist;
		const rock = MeshBuilder.CreateIcoSphere(
			`pondRock_${i}`,
			{ radius: 0.2 + rng() * 0.3, subdivisions: 1 },
			scene,
		);
		rock.position.set(rx, 0.1 + rng() * 0.15, rz);
		rock.scaling.y = 0.5 + rng() * 0.3;
		rock.material = edgeMat;
		rock.isPickable = false;
	}
}
