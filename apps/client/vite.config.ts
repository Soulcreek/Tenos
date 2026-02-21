import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
	plugins: [solidPlugin()],
	server: {
		port: 3000,
		proxy: {
			// Colyseus matchmaking (HTTP POST → room allocation)
			"/matchmake": {
				target: "http://localhost:2567",
				changeOrigin: true,
			},
			// Colyseus WebSocket room connections (dynamic paths: /<processId>/<roomId>)
			// Falls back to direct connection via VITE_WS_URL in .env
		},
	},
	optimizeDeps: {
		exclude: ["@babylonjs/havok"],
	},
	build: {
		target: "esnext",
		outDir: "dist",
	},
});
