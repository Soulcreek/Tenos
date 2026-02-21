import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

export interface HumanoidJoints {
	root: TransformNode;
	torso: TransformNode;
	headJoint: TransformNode;
	leftArmJoint: TransformNode;
	leftElbowJoint: TransformNode;
	rightArmJoint: TransformNode;
	rightElbowJoint: TransformNode;
	leftLegJoint: TransformNode;
	leftKneeJoint: TransformNode;
	rightLegJoint: TransformNode;
	rightKneeJoint: TransformNode;
}

export interface HumanoidMesh {
	root: TransformNode;
	joints: HumanoidJoints;
	allMeshes: Mesh[];
	material: StandardMaterial;
}

export type WeaponType = "sword" | "staff" | "bow" | "dagger";

export interface HumanoidOptions {
	name: string;
	color: Color3;
	scene: Scene;
	netId?: number;
	entityType?: string;
	weaponType?: WeaponType;
}

export function buildHumanoidMesh(opts: HumanoidOptions): HumanoidMesh {
	const { name, color, scene, netId, entityType } = opts;
	const allMeshes: Mesh[] = [];
	const metadata = netId != null ? { netId, entityType: entityType ?? "player" } : null;

	// Material
	const mat = new StandardMaterial(`${name}_mat`, scene);
	mat.diffuseColor = color;
	mat.specularColor = new Color3(0.3, 0.3, 0.3);

	const skinMat = new StandardMaterial(`${name}_skin`, scene);
	skinMat.diffuseColor = new Color3(0.85, 0.72, 0.6);
	skinMat.specularColor = new Color3(0.2, 0.2, 0.2);

	function applyMat(mesh: Mesh, useSkin = false): void {
		mesh.material = useSkin ? skinMat : mat;
		if (metadata) mesh.metadata = { ...metadata };
		allMeshes.push(mesh);
	}

	// Root
	const root = new TransformNode(`${name}_root`, scene);

	// Torso joint (idle bob pivot)
	const torso = new TransformNode(`${name}_torsoJoint`, scene);
	torso.parent = root;
	torso.position.y = 0.65;

	// Torso mesh
	const torsoMesh = MeshBuilder.CreateBox(
		`${name}_torso`,
		{ width: 0.4, height: 0.5, depth: 0.25 },
		scene,
	);
	torsoMesh.parent = torso;
	applyMat(torsoMesh);

	// Head joint + mesh
	const headJoint = new TransformNode(`${name}_headJoint`, scene);
	headJoint.parent = torso;
	headJoint.position.y = 0.35;
	const headMesh = MeshBuilder.CreateSphere(`${name}_head`, { diameter: 0.3, segments: 6 }, scene);
	headMesh.parent = headJoint;
	applyMat(headMesh, true);

	// --- Arms ---
	// Left arm
	const leftArmJoint = new TransformNode(`${name}_lArmJoint`, scene);
	leftArmJoint.parent = torso;
	leftArmJoint.position = new Vector3(-0.26, 0.18, 0);
	const leftUpperArm = MeshBuilder.CreateBox(
		`${name}_lUpperArm`,
		{ width: 0.12, height: 0.3, depth: 0.12 },
		scene,
	);
	leftUpperArm.parent = leftArmJoint;
	leftUpperArm.position.y = -0.15;
	applyMat(leftUpperArm);

	const leftElbowJoint = new TransformNode(`${name}_lElbow`, scene);
	leftElbowJoint.parent = leftArmJoint;
	leftElbowJoint.position.y = -0.3;
	const leftForearm = MeshBuilder.CreateBox(
		`${name}_lForearm`,
		{ width: 0.1, height: 0.25, depth: 0.1 },
		scene,
	);
	leftForearm.parent = leftElbowJoint;
	leftForearm.position.y = -0.125;
	applyMat(leftForearm, true);

	// Right arm
	const rightArmJoint = new TransformNode(`${name}_rArmJoint`, scene);
	rightArmJoint.parent = torso;
	rightArmJoint.position = new Vector3(0.26, 0.18, 0);
	const rightUpperArm = MeshBuilder.CreateBox(
		`${name}_rUpperArm`,
		{ width: 0.12, height: 0.3, depth: 0.12 },
		scene,
	);
	rightUpperArm.parent = rightArmJoint;
	rightUpperArm.position.y = -0.15;
	applyMat(rightUpperArm);

	const rightElbowJoint = new TransformNode(`${name}_rElbow`, scene);
	rightElbowJoint.parent = rightArmJoint;
	rightElbowJoint.position.y = -0.3;
	const rightForearm = MeshBuilder.CreateBox(
		`${name}_rForearm`,
		{ width: 0.1, height: 0.25, depth: 0.1 },
		scene,
	);
	rightForearm.parent = rightElbowJoint;
	rightForearm.position.y = -0.125;
	applyMat(rightForearm, true);

	// Weapon — varies by type
	const wType = opts.weaponType ?? "sword";
	const weaponMat = new StandardMaterial(`${name}_weaponMat`, scene);
	weaponMat.specularColor = new Color3(0.5, 0.5, 0.5);

	let weaponMesh: Mesh;
	switch (wType) {
		case "staff": {
			weaponMat.diffuseColor = new Color3(0.45, 0.3, 0.15);
			weaponMesh = MeshBuilder.CreateBox(
				`${name}_weapon`,
				{ width: 0.04, height: 0.7, depth: 0.04 },
				scene,
			);
			weaponMesh.parent = rightElbowJoint;
			weaponMesh.position.y = -0.45;
			// Orb on top
			const orb = MeshBuilder.CreateSphere(
				`${name}_staffOrb`,
				{ diameter: 0.1, segments: 6 },
				scene,
			);
			orb.parent = weaponMesh;
			orb.position.y = 0.4;
			const orbMat = new StandardMaterial(`${name}_orbMat`, scene);
			orbMat.diffuseColor = new Color3(0.3, 0.5, 1);
			orbMat.emissiveColor = new Color3(0.1, 0.2, 0.5);
			orb.material = orbMat;
			if (metadata) orb.metadata = { ...metadata };
			allMeshes.push(orb);
			break;
		}
		case "bow": {
			weaponMat.diffuseColor = new Color3(0.5, 0.35, 0.15);
			weaponMesh = MeshBuilder.CreateBox(
				`${name}_weapon`,
				{ width: 0.03, height: 0.55, depth: 0.08 },
				scene,
			);
			weaponMesh.parent = rightElbowJoint;
			weaponMesh.position.y = -0.35;
			weaponMesh.position.z = 0.05;
			break;
		}
		case "dagger": {
			weaponMat.diffuseColor = new Color3(0.6, 0.6, 0.65);
			weaponMesh = MeshBuilder.CreateBox(
				`${name}_weapon`,
				{ width: 0.06, height: 0.25, depth: 0.03 },
				scene,
			);
			weaponMesh.parent = rightElbowJoint;
			weaponMesh.position.y = -0.25;
			break;
		}
		default: {
			// sword
			weaponMat.diffuseColor = new Color3(0.6, 0.6, 0.65);
			weaponMesh = MeshBuilder.CreateBox(
				`${name}_weapon`,
				{ width: 0.05, height: 0.5, depth: 0.05 },
				scene,
			);
			weaponMesh.parent = rightElbowJoint;
			weaponMesh.position.y = -0.35;
			break;
		}
	}
	weaponMesh.material = weaponMat;
	if (metadata) weaponMesh.metadata = { ...metadata };
	allMeshes.push(weaponMesh);

	// --- Legs ---
	// Left leg
	const leftLegJoint = new TransformNode(`${name}_lLegJoint`, scene);
	leftLegJoint.parent = torso;
	leftLegJoint.position = new Vector3(-0.1, -0.25, 0);
	const leftUpperLeg = MeshBuilder.CreateBox(
		`${name}_lUpperLeg`,
		{ width: 0.14, height: 0.35, depth: 0.14 },
		scene,
	);
	leftUpperLeg.parent = leftLegJoint;
	leftUpperLeg.position.y = -0.175;
	applyMat(leftUpperLeg);

	const leftKneeJoint = new TransformNode(`${name}_lKnee`, scene);
	leftKneeJoint.parent = leftLegJoint;
	leftKneeJoint.position.y = -0.35;
	const leftLowerLeg = MeshBuilder.CreateBox(
		`${name}_lLowerLeg`,
		{ width: 0.12, height: 0.3, depth: 0.12 },
		scene,
	);
	leftLowerLeg.parent = leftKneeJoint;
	leftLowerLeg.position.y = -0.15;
	applyMat(leftLowerLeg);

	// Right leg
	const rightLegJoint = new TransformNode(`${name}_rLegJoint`, scene);
	rightLegJoint.parent = torso;
	rightLegJoint.position = new Vector3(0.1, -0.25, 0);
	const rightUpperLeg = MeshBuilder.CreateBox(
		`${name}_rUpperLeg`,
		{ width: 0.14, height: 0.35, depth: 0.14 },
		scene,
	);
	rightUpperLeg.parent = rightLegJoint;
	rightUpperLeg.position.y = -0.175;
	applyMat(rightUpperLeg);

	const rightKneeJoint = new TransformNode(`${name}_rKnee`, scene);
	rightKneeJoint.parent = rightLegJoint;
	rightKneeJoint.position.y = -0.35;
	const rightLowerLeg = MeshBuilder.CreateBox(
		`${name}_rLowerLeg`,
		{ width: 0.12, height: 0.3, depth: 0.12 },
		scene,
	);
	rightLowerLeg.parent = rightKneeJoint;
	rightLowerLeg.position.y = -0.15;
	applyMat(rightLowerLeg);

	return {
		root,
		joints: {
			root,
			torso,
			headJoint,
			leftArmJoint,
			leftElbowJoint,
			rightArmJoint,
			rightElbowJoint,
			leftLegJoint,
			leftKneeJoint,
			rightLegJoint,
			rightKneeJoint,
		},
		allMeshes,
		material: mat,
	};
}
