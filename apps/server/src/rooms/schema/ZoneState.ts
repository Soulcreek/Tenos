import { Schema, MapSchema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') sessionId: string = '';
  @type('float32') x: number = 0;
  @type('float32') y: number = 0;
  @type('float32') z: number = 0;
  @type('float32') rotY: number = 0;
  @type('float32') vx: number = 0;
  @type('float32') vz: number = 0;
  @type('uint32') netId: number = 0;
  @type('string') name: string = '';
}

export class ZoneState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
