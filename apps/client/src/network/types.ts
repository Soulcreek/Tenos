/** Client-side mirror of ZoneState schema for type safety */
export interface PlayerStateData {
  sessionId: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  vx: number;
  vz: number;
  netId: number;
  name: string;
}

export interface ZoneState {
  players: Map<string, PlayerStateData>;
}
