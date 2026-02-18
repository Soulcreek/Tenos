import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
	plugins: [solidPlugin()],
	server: {
		port: 3000,
		proxy: {
			"/ws": {
				target: "ws://localhost:2567",
				ws: true,
			},
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
