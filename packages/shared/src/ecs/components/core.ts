import { Types, defineComponent } from "bitecs";

// ── Core Components ────────────────────────────────────────────
// Used on both client and server. All components are TypedArray-backed
// for zero-allocation iteration per the BitECS design.

/** Spatial position in world space. */
export const Position = defineComponent({
	x: Types.f32,
	y: Types.f32,
	z: Types.f32,
});

/** Linear velocity (units/second). */
export const Velocity = defineComponent({
	x: Types.f32,
	y: Types.f32,
	z: Types.f32,
});

/** Y-axis rotation in radians (facing direction). */
export const Rotation = defineComponent({
	y: Types.f32,
});

/** Network replication identity. */
export const NetworkIdentity = defineComponent({
	/** Unique network entity ID. */
	netId: Types.ui32,
	/** Owner session ID hash (0 = server-owned). */
	ownerId: Types.ui32,
});

/** Client-only: index into a mesh lookup table. */
export const MeshRef = defineComponent({
	meshId: Types.ui32,
});

/** Tags an entity as locally controlled (the player's own character). */
export const LocalPlayer = defineComponent();

/** Tags an entity as a remote player (other players in the zone). */
export const RemotePlayer = defineComponent();
