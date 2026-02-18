export interface GameState {
	tick: number;
	playerCount: number;
	entities: EntitySnapshot[];
}

export interface EntitySnapshot {
	netId: number;
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
}
