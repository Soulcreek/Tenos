export enum MessageType {
	PlayerInput = "player_input",
	StateSnapshot = "state_snapshot",
	PlayerJoin = "player_join",
	PlayerLeave = "player_leave",
}

export interface PlayerInput {
	type: MessageType.PlayerInput;
	tick: number;
	moveX: number;
	moveZ: number;
	jump: boolean;
}
