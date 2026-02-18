import {
  Scene,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  ShadowGenerator,
  ArcRotateCamera,
} from '@babylonjs/core';

import type { Engine } from '@babylonjs/core';

export interface SceneContext {
  scene: Scene;
  camera: ArcRotateCamera;
  shadowGenerator: ShadowGenerator;
}

/**
 * Creates the initial game scene with ground plane, lighting, and camera.
 */
export function createScene(engine: Engine): SceneContext {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.53, 0.81, 0.92, 1); // Sky blue

  // Camera: isometric-style ArcRotate
  const camera = new ArcRotateCamera('camera', -Math.PI / 4, Math.PI / 3, 30, Vector3.Zero(), scene);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 60;
  camera.lowerBetaLimit = 0.3;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(engine.getRenderingCanvas()!, true);

  // Ambient light
  const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.4;

  // Directional sunlight with shadows
  const sun = new DirectionalLight('sun', new Vector3(-1, -2, -1).normalize(), scene);
  sun.intensity = 0.8;
  sun.position = new Vector3(20, 40, 20);

  const shadowGenerator = new ShadowGenerator(2048, sun);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 32;

  // Ground plane (128x128 zone)
  const ground = MeshBuilder.CreateGround('ground', { width: 128, height: 128, subdivisions: 32 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.3, 0.6, 0.2); // Grass green
  groundMat.specularColor = new Color3(0.1, 0.1, 0.1);
  ground.material = groundMat;
  ground.receiveShadows = true;

  return { scene, camera, shadowGenerator };
}
