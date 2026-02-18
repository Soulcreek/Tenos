import { Server } from "colyseus";
import { ZoneRoom } from "./rooms/ZoneRoom.js";

const port = Number(process.env.PORT) || 2567;

const server = new Server();

// Register zone rooms
server.define("zone", ZoneRoom);

// Health check on a separate port
const healthPort = port + 1;
Bun.serve({
	port: healthPort,
	fetch() {
		return Response.json({ status: "ok", uptime: process.uptime() });
	},
});

server.listen(port).then(() => {
	console.log(`[Tenos] Game server listening on port ${port}`);
	console.log(`[Tenos] Health check: http://localhost:${healthPort}/`);
});
