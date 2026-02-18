import { Room } from 'colyseus';
import { addEntity, addComponent, removeEntity, defineQuery } from 'bitecs';

import {
  createGameWorld,
  Transform,
  Velocity,
  NetworkIdentity,
  MAX_PLAYERS_PER_ZONE,
  SERVER_TICK_MS,
  BASE_MOVE_SPEED,
  STATE_SYNC_RATE,
} from '@massless/shared';

import { PlayerState, ZoneState } from './schema/ZoneState.js';

import type { GameWorld } from '@massless/shared';
import type { Client } from 'colyseus';

interface InputMessage {
  dx: number;
  dz: number;
  seq: number;
}

const networkQuery = defineQuery([Transform, Velocity, NetworkIdentity]);

/** Counter for assigning unique network IDs */
let nextNetId = 1;

export class ZoneRoom extends Room<ZoneState> {
  /** Server-side ECS world */
  private world!: GameWorld;

  /** Map from client sessionId to ECS entity ID */
  private playerEntities = new Map<string, number>();

  onCreate() {
    this.setState(new ZoneState());
    this.maxClients = MAX_PLAYERS_PER_ZONE;
    this.setPatchRate(1000 / STATE_SYNC_RATE);

    this.world = createGameWorld();

    this.onMessage('input', (client: Client, message: InputMessage) => {
      this.handleInput(client, message);
    });

    this.setSimulationInterval((delta) => this.tick(delta), SERVER_TICK_MS);
  }

  onJoin(client: Client) {
    const eid = addEntity(this.world);
    addComponent(this.world, Transform, eid);
    addComponent(this.world, Velocity, eid);
    addComponent(this.world, NetworkIdentity, eid);

    const netId = nextNetId++;
    NetworkIdentity.netId[eid] = netId;
    NetworkIdentity.ownerId[eid] = netId;

    // Spawn at random position near center
    Transform.x[eid] = (Math.random() - 0.5) * 20;
    Transform.y[eid] = 0;
    Transform.z[eid] = (Math.random() - 0.5) * 20;

    this.playerEntities.set(client.sessionId, eid);

    // Create schema state for this player
    const playerState = new PlayerState();
    playerState.sessionId = client.sessionId;
    playerState.netId = netId;
    playerState.name = `Player_${netId}`;
    playerState.x = Transform.x[eid]!;
    playerState.y = Transform.y[eid]!;
    playerState.z = Transform.z[eid]!;
    this.state.players.set(client.sessionId, playerState);

    client.send('spawn', {
      netId,
      x: Transform.x[eid],
      y: Transform.y[eid],
      z: Transform.z[eid],
    });
  }

  onLeave(client: Client) {
    const eid = this.playerEntities.get(client.sessionId);
    if (eid !== undefined) {
      removeEntity(this.world, eid);
      this.playerEntities.delete(client.sessionId);
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    this.playerEntities.clear();
  }

  private handleInput(client: Client, message: InputMessage) {
    const eid = this.playerEntities.get(client.sessionId);
    if (eid === undefined) return;

    // Clamp input to [-1, 1]
    const dx = Math.max(-1, Math.min(1, message.dx));
    const dz = Math.max(-1, Math.min(1, message.dz));

    // Normalize diagonal movement
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      Velocity.vx[eid] = (dx / len) * BASE_MOVE_SPEED;
      Velocity.vz[eid] = (dz / len) * BASE_MOVE_SPEED;
    } else {
      Velocity.vx[eid] = 0;
      Velocity.vz[eid] = 0;
    }
  }

  private tick(delta: number) {
    const dt = delta / 1000; // Convert ms to seconds
    this.world.delta = dt;
    this.world.time += dt;

    // Movement: apply velocity to position
    const entities = networkQuery(this.world);
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i]!;
      Transform.x[eid] = (Transform.x[eid] ?? 0) + (Velocity.vx[eid] ?? 0) * dt;
      Transform.z[eid] = (Transform.z[eid] ?? 0) + (Velocity.vz[eid] ?? 0) * dt;

      // Face movement direction
      if (Velocity.vx[eid] !== 0 || Velocity.vz[eid] !== 0) {
        Transform.rotY[eid] = Math.atan2(Velocity.vx[eid]!, Velocity.vz[eid]!);
      }
    }

    // Sync ECS state to Colyseus schema
    this.state.players.forEach((playerState, sessionId) => {
      const eid = this.playerEntities.get(sessionId);
      if (eid === undefined) return;
      playerState.x = Transform.x[eid]!;
      playerState.y = Transform.y[eid]!;
      playerState.z = Transform.z[eid]!;
      playerState.rotY = Transform.rotY[eid]!;
      playerState.vx = Velocity.vx[eid]!;
      playerState.vz = Velocity.vz[eid]!;
    });
  }
}
