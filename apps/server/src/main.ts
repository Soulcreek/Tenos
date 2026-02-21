import { readFile, stat } from "node:fs/promises";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import { extname, join } from "node:path";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, db, ensureDbConnection } from "./db/client.js";
import { ZoneRoom } from "./rooms/ZoneRoom.js";

const port = Number(process.env.PORT) || 2567;
const isProduction = Bun.env.NODE_ENV === "production";
const PUBLIC_DIR = join(process.cwd(), "public");

const MIME_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript",
	".css": "text/css",
	".wasm": "application/wasm",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".map": "application/json",
};

async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
	if (!isProduction) return false;

	const url = new URL(req.url || "/", "http://localhost");
	let filePath = join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);

	try {
		const stats = await stat(filePath);
		if (stats.isDirectory()) {
			filePath = join(filePath, "index.html");
			await stat(filePath);
		}

		const ext = extname(filePath);
		const contentType = MIME_TYPES[ext] || "application/octet-stream";
		const content = await readFile(filePath);

		res.writeHead(200, { "Content-Type": contentType });
		res.end(content);
		return true;
	} catch {
		return false;
	}
}

const httpServer = createServer(async (req, res) => {
	// Try serving static files in production
	const served = await serveStatic(req, res);
	if (served) return;

	// SPA fallback: serve index.html for unmatched GET routes
	if (isProduction && req.method === "GET") {
		try {
			const indexPath = join(PUBLIC_DIR, "index.html");
			const content = await readFile(indexPath);
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(content);
			return;
		} catch {
			// fall through
		}
	}

	res.writeHead(404);
	res.end("Not found");
});

const transport = new WebSocketTransport({ server: httpServer });
const gameServer = new Server({ transport });

gameServer.define("zone", ZoneRoom);

// Health check on a separate port
const healthPort = port + 1;
Bun.serve({
	port: healthPort,
	fetch() {
		return Response.json({ status: "ok", uptime: process.uptime() });
	},
});

async function start() {
	await ensureDbConnection();
	await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
	console.log("[DB] Migrations applied");

	await gameServer.listen(port);
	console.log(`[Tenos] Game server listening on port ${port}`);
	console.log(`[Tenos] Health check: http://localhost:${healthPort}/`);
	if (isProduction) {
		console.log(`[Tenos] Serving static files from ${PUBLIC_DIR}`);
	}
}

// Graceful shutdown (guard against duplicate signals)
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, async () => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log(`\n[Tenos] Received ${signal}, shutting down...`);
		try {
			await gameServer.gracefullyShutdown();
		} catch {
			// Already shutting down — ignore
		}
		await closeDb();
		process.exit(0);
	});
}

start().catch((err) => {
	console.error("[Tenos] Failed to start:", err);
	process.exit(1);
});
