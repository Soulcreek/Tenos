import { Client, Room } from 'colyseus.js';

import { SERVER_PORT } from '@massless/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyState = any;

export class NetworkManager {
  private client: Client;
  private room: Room<AnyState> | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    this.client = new Client(`${protocol}://${host}:${SERVER_PORT}`);
  }

  async joinZone(zoneName: string = 'zone'): Promise<Room<AnyState>> {
    this.room = await this.client.joinOrCreate(zoneName);
    return this.room;
  }

  sendInput(dx: number, dz: number, seq: number): void {
    this.room?.send('input', { dx, dz, seq });
  }

  getRoom(): Room<AnyState> | null {
    return this.room;
  }

  async disconnect(): Promise<void> {
    await this.room?.leave();
    this.room = null;
  }
}
