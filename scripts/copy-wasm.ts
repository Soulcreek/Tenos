import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Bun may hoist deps to root or keep them in workspace node_modules
const candidates = [
	resolve(root, "node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm"),
	resolve(root, "apps/client/node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm"),
];
const havokWasmSrc = candidates.find((p) => existsSync(p));
const clientPublic = resolve(root, "apps/client/public");

if (!havokWasmSrc) {
	console.error("HavokPhysics.wasm not found. Run `bun install` first.");
	process.exit(1);
}

mkdirSync(clientPublic, { recursive: true });
cpSync(havokWasmSrc, resolve(clientPublic, "HavokPhysics.wasm"));
console.log("Copied HavokPhysics.wasm -> apps/client/public/");
