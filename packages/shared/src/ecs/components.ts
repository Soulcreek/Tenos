import { Types, defineComponent } from "bitecs";

export const Position = defineComponent({
	x: Types.f32,
	y: Types.f32,
	z: Types.f32,
});

export const Velocity = defineComponent({
	x: Types.f32,
	y: Types.f32,
	z: Types.f32,
});

export const Rotation = defineComponent({
	x: Types.f32,
	y: Types.f32,
	z: Types.f32,
	w: Types.f32,
});

export const MeshRef = defineComponent({
	/** Index into a mesh lookup table (avoid string refs in ECS) */
	meshId: Types.ui32,
});

export const NetworkIdentity = defineComponent({
	/** Unique network ID for state sync */
	netId: Types.ui32,
	/** Owner's session ID hash */
	ownerId: Types.ui32,
});
