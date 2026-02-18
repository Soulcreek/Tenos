import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';

import { createEngine } from './engine/Engine.js';
import { createScene } from './engine/SceneManager.js';
import { NetworkManager } from './network/NetworkManager.js';

import type { Engine, Mesh } from '@babylonjs/core';

// Input state
const keys: Record<string, boolean> = {};
let inputSeq = 0;

// Player meshes indexed by sessionId
const playerMeshes = new Map<string, Mesh>();

async function main() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element #game-canvas not found');

  // Initialize engine and scene
  const engine = await createEngine(canvas);
  const { scene, shadowGenerator } = createScene(engine as Engine);

  // Connect to server
  const network = new NetworkManager();
  let localSessionId = '';

  try {
    const room = await network.joinZone();
    localSessionId = room.sessionId;

    // Colyseus MapSchema exposes onAdd/onRemove callbacks
    // Colyseus MapSchema exposes onAdd/onRemove/onChange callbacks at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = room.state.players as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    players.onAdd((player: any, sessionId: string) => {
      const isLocal = sessionId === localSessionId;
      const mesh = MeshBuilder.CreateCapsule(
        `player_${sessionId}`,
        { height: 1.8, radius: 0.4 },
        scene,
      );
      mesh.position.set(player.x as number, 0.9, player.z as number);

      const mat = new StandardMaterial(`mat_${sessionId}`, scene);
      mat.diffuseColor = isLocal ? new Color3(0.2, 0.5, 1.0) : new Color3(0.9, 0.3, 0.3);
      mesh.material = mat;

      shadowGenerator.addShadowCaster(mesh);
      playerMeshes.set(sessionId, mesh);

      // Listen for state changes on this player
      player.onChange(() => {
        const m = playerMeshes.get(sessionId);
        if (m) {
          m.position.set(player.x as number, 0.9, player.z as number);
          m.rotation.y = player.rotY as number;
        }
      });
    });

    players.onRemove((_player: unknown, sessionId: string) => {
      const mesh = playerMeshes.get(sessionId);
      if (mesh) {
        mesh.dispose();
        playerMeshes.delete(sessionId);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Massless] Failed to connect to server:', err);
  }

  // Input handling
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // FPS display
  const fpsEl = document.getElementById('fps');

  // Render loop
  engine.runRenderLoop(() => {
    // Calculate input direction
    let dx = 0;
    let dz = 0;
    if (keys['w']) dz -= 1;
    if (keys['s']) dz += 1;
    if (keys['a']) dx -= 1;
    if (keys['d']) dx += 1;

    if (dx !== 0 || dz !== 0) {
      network.sendInput(dx, dz, inputSeq++);
    }

    scene.render();

    if (fpsEl) {
      fpsEl.textContent = `${engine.getFps().toFixed(0)} FPS`;
    }
  });

  // Handle resize
  window.addEventListener('resize', () => {
    engine.resize();
  });
}

main();
