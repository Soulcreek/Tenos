import { GRAVITY, Position, TICK_INTERVAL_MS, Velocity } from "@tenos/shared";
import { addComponent, addEntity, createWorld } from "bitecs";
import { type Client, Room } from "colyseus";

export class GameRoom extends Room {
	private world = createWorld();
	private cubeEid = 0;
	private tickInterval: ReturnType<typeof setInterval> | null = null;

	onCreate() {
		console.log("[GameRoom] Room created");

		// Create a test cube entity
		this.cubeEid = addEntity(this.world);
		addComponent(this.world, Position, this.cubeEid);
		addComponent(this.world, Velocity, this.cubeEid);

		// Start cube at y=10
		Position.x[this.cubeEid] = 0;
		Position.y[this.cubeEid] = 10;
		Position.z[this.cubeEid] = 0;
		Velocity.x[this.cubeEid] = 0;
		Velocity.y[this.cubeEid] = 0;
		Velocity.z[this.cubeEid] = 0;

		// Gravity tick at 20Hz
		this.tickInterval = setInterval(() => {
			this.tick();
		}, TICK_INTERVAL_MS);
	}

	private tick() {
		const dt = TICK_INTERVAL_MS / 1000;
		const eid = this.cubeEid;

		// Simple gravity for the test cube
		Velocity.y[eid] += GRAVITY * dt;
		Position.x[eid] += Velocity.x[eid] * dt;
		Position.y[eid] += Velocity.y[eid] * dt;
		Position.z[eid] += Velocity.z[eid] * dt;

		// Floor collision at y=0
		if (Position.y[eid] < 0) {
			Position.y[eid] = 0;
			Velocity.y[eid] = 0;
		}

		// Broadcast state to all clients
		this.broadcast("state", {
			tick: Date.now(),
			entities: [
				{
					x: Position.x[eid],
					y: Position.y[eid],
					z: Position.z[eid],
				},
			],
		});
	}

	onJoin(client: Client) {
		console.log(`[GameRoom] Client joined: ${client.sessionId}`);
	}

	onLeave(client: Client) {
		console.log(`[GameRoom] Client left: ${client.sessionId}`);
	}

	onDispose() {
		if (this.tickInterval) {
			clearInterval(this.tickInterval);
		}
		console.log("[GameRoom] Room disposed");
	}
}
