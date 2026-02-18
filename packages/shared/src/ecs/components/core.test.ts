import { describe, it, expect } from 'vitest';
import { addEntity, addComponent, hasComponent, removeEntity, defineQuery } from 'bitecs';

import { createGameWorld } from '../world.js';

import { Transform, Velocity, NetworkIdentity, LocalPlayer, RemotePlayer } from './core.js';

describe('Core ECS Components', () => {
  describe('createGameWorld', () => {
    it('should create a world with time and delta properties', () => {
      const world = createGameWorld();
      expect(world.time).toBe(0);
      expect(world.delta).toBe(0);
    });
  });

  describe('Transform', () => {
    it('should store and retrieve position values', () => {
      const world = createGameWorld();
      const eid = addEntity(world);
      addComponent(world, Transform, eid);

      Transform.x[eid] = 10.5;
      Transform.y[eid] = 0;
      Transform.z[eid] = -5.25;
      Transform.rotY[eid] = 1.57;

      expect(Transform.x[eid]).toBeCloseTo(10.5);
      expect(Transform.y[eid]).toBe(0);
      expect(Transform.z[eid]).toBeCloseTo(-5.25);
      expect(Transform.rotY[eid]).toBeCloseTo(1.57);

      removeEntity(world, eid);
    });

    it('should be queryable', () => {
      const world = createGameWorld();
      const eid1 = addEntity(world);
      const eid2 = addEntity(world);
      addComponent(world, Transform, eid1);
      addComponent(world, Transform, eid2);

      const transformQuery = defineQuery([Transform]);
      const entities = transformQuery(world);
      expect(entities.length).toBe(2);
      expect(entities).toContain(eid1);
      expect(entities).toContain(eid2);

      removeEntity(world, eid1);
      removeEntity(world, eid2);
    });
  });

  describe('Velocity', () => {
    it('should store velocity components backed by Float32Array', () => {
      const world = createGameWorld();
      const eid = addEntity(world);
      addComponent(world, Velocity, eid);

      Velocity.vx[eid] = 3.14;
      Velocity.vy[eid] = 0;
      Velocity.vz[eid] = -2.5;

      expect(Velocity.vx[eid]).toBeCloseTo(3.14);
      expect(Velocity.vy[eid]).toBe(0);
      expect(Velocity.vz[eid]).toBeCloseTo(-2.5);

      removeEntity(world, eid);
    });
  });

  describe('NetworkIdentity', () => {
    it('should store network and owner IDs as unsigned integers', () => {
      const world = createGameWorld();
      const eid = addEntity(world);
      addComponent(world, NetworkIdentity, eid);

      NetworkIdentity.netId[eid] = 42;
      NetworkIdentity.ownerId[eid] = 7;

      expect(NetworkIdentity.netId[eid]).toBe(42);
      expect(NetworkIdentity.ownerId[eid]).toBe(7);

      removeEntity(world, eid);
    });
  });

  describe('Tag Components', () => {
    it('should distinguish local from remote players', () => {
      const world = createGameWorld();
      const localEid = addEntity(world);
      const remoteEid = addEntity(world);

      addComponent(world, LocalPlayer, localEid);
      addComponent(world, RemotePlayer, remoteEid);

      expect(hasComponent(world, LocalPlayer, localEid)).toBe(true);
      expect(hasComponent(world, RemotePlayer, localEid)).toBe(false);
      expect(hasComponent(world, RemotePlayer, remoteEid)).toBe(true);
      expect(hasComponent(world, LocalPlayer, remoteEid)).toBe(false);

      removeEntity(world, localEid);
      removeEntity(world, remoteEid);
    });
  });

  describe('Multi-component queries', () => {
    it('should query entities with Transform + Velocity', () => {
      const world = createGameWorld();
      const movingEid = addEntity(world);
      const staticEid = addEntity(world);

      addComponent(world, Transform, movingEid);
      addComponent(world, Velocity, movingEid);
      addComponent(world, Transform, staticEid);

      const movingQuery = defineQuery([Transform, Velocity]);
      const movingEntities = movingQuery(world);
      expect(movingEntities.length).toBe(1);
      expect(movingEntities[0]).toBe(movingEid);

      removeEntity(world, movingEid);
      removeEntity(world, staticEid);
    });
  });
});
