import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

export type QuadrupedShape = "dog" | "wolf" | "bear" | "tiger";

interface ShapeParams {
	bodyLen: number;
	bodyWidth: number;
	bodyHeight: number;
	legLength: number;
	headSize: number;
}

const SHAPE_PARAMS: Record<QuadrupedShape, ShapeParams> = {
	dog: { bodyLen: 0.6, bodyWidth: 0.25, bodyHeight: 0.22, legLength: 0.3, headSize: 0.2 },
	wolf: { bodyLen: 0.8, bodyWidth: 0.3, bodyHeight: 0.25, legLength: 0.35, headSize: 0.25 },
	bear: { bodyLen: 0.9, bodyWidth: 0.5, bodyHeight: 0.35, legLength: 0.3, headSize: 0.3 },
	tiger: { bodyLen: 1.0, bodyWidth: 0.35, bodyHeight: 0.28, legLength: 0.4, headSize: 0.28 },
};

/** Maps monster typeId to quadruped shape. typeId 4 (Bandit Scout) uses humanoid instead. */
export function typeIdToShape(typeId: number): QuadrupedShape | "humanoid" {
	switch (typeId) {
		case 1:
			return "dog";
		case 2:
			return "wolf";
		case 3:
			return "bear";
		case 4:
			return "humanoid";
		case 5:
			return "tiger";
		default:
			return "dog";
	}
}

export interface QuadrupedJoints {
	root: TransformNode;
	body: TransformNode;
	headJoint: TransformNode;
	tailJoint: TransformNode;
	frontLeftLeg: TransformNode;
	frontLeftKnee: TransformNode;
	frontRightLeg: TransformNode;
	frontRightKnee: TransformNode;
	rearLeftLeg: TransformNode;
	rearLeftKnee: TransformNode;
	rearRightLeg: TransformNode;
	rearRightKnee: TransformNode;
}

export interface QuadrupedMesh {
	root: TransformNode;
	joints: QuadrupedJoints;
	allMeshes: Mesh[];
	material: StandardMaterial;
}

export interface QuadrupedOptions {
	name: string;
	shape: QuadrupedShape;
	color: Color3;
	scale: number;
	scene: Scene;
	netId: number;
}

export function buildQuadrupedMesh(opts: QuadrupedOptions): QuadrupedMesh {
	const { name, shape, color, scale, scene, netId } = opts;
	const p = SHAPE_PARAMS[shape];
	const allMeshes: Mesh[] = [];
	const metadata = { netId, entityType: "monster" };

	const mat = new StandardMaterial(`${name}_mat`, scene);
	mat.diffuseColor = color;
	mat.specularColor = new Color3(0.25, 0.25, 0.25);

	function applyMat(mesh: Mesh): void {
		mesh.material = mat;
		mesh.metadata = { ...metadata };
		allMeshes.push(mesh);
	}

	const root = new TransformNode(`${name}_root`, scene);
	root.scaling = new Vector3(scale, scale, scale);

	// Body joint (breathing bob)
	const body = new TransformNode(`${name}_body`, scene);
	body.parent = root;
	body.position.y = p.legLength + p.bodyHeight * 0.5;

	// Body mesh (elongated box)
	const bodyMesh = MeshBuilder.CreateBox(
		`${name}_bodyMesh`,
		{
			width: p.bodyWidth,
			height: p.bodyHeight,
			depth: p.bodyLen,
		},
		scene,
	);
	bodyMesh.parent = body;
	applyMat(bodyMesh);

	// Head joint + meshes
	const headJoint = new TransformNode(`${name}_headJoint`, scene);
	headJoint.parent = body;
	headJoint.position = new Vector3(0, p.bodyHeight * 0.3, p.bodyLen * 0.5);

	const headMesh = MeshBuilder.CreateBox(
		`${name}_head`,
		{
			width: p.headSize,
			height: p.headSize * 0.8,
			depth: p.headSize,
		},
		scene,
	);
	headMesh.parent = headJoint;
	headMesh.position.z = p.headSize * 0.4;
	applyMat(headMesh);

	// Snout
	const snoutMesh = MeshBuilder.CreateBox(
		`${name}_snout`,
		{
			width: p.headSize * 0.5,
			height: p.headSize * 0.4,
			depth: p.headSize * 0.5,
		},
		scene,
	);
	snoutMesh.parent = headJoint;
	snoutMesh.position.z = p.headSize * 0.9;
	snoutMesh.position.y = -p.headSize * 0.15;
	applyMat(snoutMesh);

	// Ears
	const earSize = p.headSize * 0.2;
	for (const side of [-1, 1]) {
		const ear = MeshBuilder.CreateBox(
			`${name}_ear${side > 0 ? "R" : "L"}`,
			{
				width: earSize,
				height: earSize * 1.5,
				depth: earSize,
			},
			scene,
		);
		ear.parent = headJoint;
		ear.position = new Vector3(side * p.headSize * 0.35, p.headSize * 0.5, p.headSize * 0.3);
		applyMat(ear);
	}

	// Tail
	const tailJoint = new TransformNode(`${name}_tailJoint`, scene);
	tailJoint.parent = body;
	tailJoint.position = new Vector3(0, p.bodyHeight * 0.2, -p.bodyLen * 0.5);
	const tailMesh = MeshBuilder.CreateBox(
		`${name}_tail`,
		{
			width: 0.06,
			height: 0.06,
			depth: p.bodyLen * 0.4,
		},
		scene,
	);
	tailMesh.parent = tailJoint;
	tailMesh.position.z = -p.bodyLen * 0.2;
	applyMat(tailMesh);

	// --- Legs ---
	const legWidth = p.bodyWidth * 0.25;
	const upperLen = p.legLength * 0.55;
	const lowerLen = p.legLength * 0.5;
	const halfBodyLen = p.bodyLen * 0.38;
	const halfBodyW = p.bodyWidth * 0.4;

	const legPositions = [
		{ name: "FL", x: -halfBodyW, z: halfBodyLen },
		{ name: "FR", x: halfBodyW, z: halfBodyLen },
		{ name: "RL", x: -halfBodyW, z: -halfBodyLen },
		{ name: "RR", x: halfBodyW, z: -halfBodyLen },
	];

	const joints: Partial<QuadrupedJoints> = { root, body, headJoint, tailJoint };

	for (const leg of legPositions) {
		const hipJoint = new TransformNode(`${name}_${leg.name}Hip`, scene);
		hipJoint.parent = body;
		hipJoint.position = new Vector3(leg.x, -p.bodyHeight * 0.5, leg.z);

		const upper = MeshBuilder.CreateBox(
			`${name}_${leg.name}Upper`,
			{
				width: legWidth,
				height: upperLen,
				depth: legWidth,
			},
			scene,
		);
		upper.parent = hipJoint;
		upper.position.y = -upperLen * 0.5;
		applyMat(upper);

		const kneeJoint = new TransformNode(`${name}_${leg.name}Knee`, scene);
		kneeJoint.parent = hipJoint;
		kneeJoint.position.y = -upperLen;

		const lower = MeshBuilder.CreateBox(
			`${name}_${leg.name}Lower`,
			{
				width: legWidth * 0.85,
				height: lowerLen,
				depth: legWidth * 0.85,
			},
			scene,
		);
		lower.parent = kneeJoint;
		lower.position.y = -lowerLen * 0.5;
		applyMat(lower);

		// Map joints
		if (leg.name === "FL") {
			joints.frontLeftLeg = hipJoint;
			joints.frontLeftKnee = kneeJoint;
		} else if (leg.name === "FR") {
			joints.frontRightLeg = hipJoint;
			joints.frontRightKnee = kneeJoint;
		} else if (leg.name === "RL") {
			joints.rearLeftLeg = hipJoint;
			joints.rearLeftKnee = kneeJoint;
		} else {
			joints.rearRightLeg = hipJoint;
			joints.rearRightKnee = kneeJoint;
		}
	}

	return {
		root,
		joints: joints as QuadrupedJoints,
		allMeshes,
		material: mat,
	};
}
