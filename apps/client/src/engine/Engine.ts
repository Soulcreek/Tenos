import { Engine as BabylonEngine, WebGPUEngine } from '@babylonjs/core';

/**
 * Initializes the Babylon.js rendering engine.
 * Attempts WebGPU first, falls back to WebGL2.
 */
export async function createEngine(canvas: HTMLCanvasElement): Promise<BabylonEngine | WebGPUEngine> {
  const supportsWebGPU = 'gpu' in navigator;

  if (supportsWebGPU) {
    try {
      const engine = new WebGPUEngine(canvas, {
        adaptToDeviceRatio: true,
        antialias: true,
      });
      await engine.initAsync();
      // eslint-disable-next-line no-console
      console.log('[Massless] Renderer: WebGPU');
      return engine;
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[Massless] WebGPU init failed, falling back to WebGL2');
    }
  }

  const engine = new BabylonEngine(canvas, true, {
    adaptToDeviceRatio: true,
    antialias: true,
  });
  // eslint-disable-next-line no-console
  console.log('[Massless] Renderer: WebGL2');
  return engine;
}
