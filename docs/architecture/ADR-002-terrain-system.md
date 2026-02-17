# ADR-002: Terrain System

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** How to build scrollable MMO worlds in Babylon.js

---

## Context

Massless requires large, continuous worlds divided into zones (like Metin2's maps). We need a terrain system that supports varied landscapes, seamless player movement, and efficient rendering for browser-based play.

## Decision

**Use a heightmap-based terrain system with chunk streaming**, combining Babylon.js's ground mesh capabilities with custom chunk management.

### Terrain Architecture

#### Heightmap-Based Ground
- Each zone is defined by a heightmap texture (grayscale PNG)
- Babylon.js `MeshBuilder.CreateGroundFromHeightMap()` generates terrain mesh
- Resolution: 256x256 vertices per chunk (adjustable based on performance)
- Chunk size: 128x128 game units

#### Chunk Streaming
- World divided into a grid of terrain chunks
- Only chunks within player's view distance are loaded (3x3 to 5x5 grid around player)
- Chunks load/unload as player moves (with hysteresis to prevent thrashing)
- Loading happens asynchronously, with LOD placeholder for distant chunks

#### Multi-Texture Splatmap
- Each chunk has a splatmap (RGBA texture) defining terrain material blend
- Up to 4 terrain materials per chunk: grass, dirt, stone, sand (etc.)
- Shader blends textures based on splatmap weights
- Normal maps for each terrain type for visual depth

#### Zone Boundaries
- Zones are logical groupings of chunks with shared properties
- Zone transitions: seamless walking (no loading screen) within a server room
- Cross-server zone transitions: brief fade-to-black, reconnect to new Colyseus room

### Level of Detail (LOD)

| Distance | LOD Level | Vertex Density | Textures |
|----------|-----------|----------------|----------|
| 0-64 units | LOD 0 (Full) | 256x256 | Full resolution + normal maps |
| 64-128 units | LOD 1 | 128x128 | Half resolution, no normal maps |
| 128-256 units | LOD 2 | 64x64 | Quarter resolution, simplified |
| 256+ units | LOD 3 | 32x32 | Minimal, flat shaded |

### World Objects
- Trees, rocks, buildings placed as instanced meshes on terrain
- Object placement data stored in zone definition files (JSON)
- Babylon.js thin instances for repeated objects (trees, grass patches)
- Collision meshes simplified compared to visual meshes

### Water
- Babylon.js `WaterMaterial` for lakes and rivers
- Reflection/refraction for visual quality
- Simplified water plane for lower-end devices
- Water areas defined in zone data, not heightmap

### Server-Side Terrain
- Server maintains a simplified heightmap for:
  - Pathfinding validation (is this position walkable?)
  - Line-of-sight checks
  - Spawn point validation
- Server does NOT render terrain — uses 2D grid representation
- Havok physics uses simplified collision geometry on server

## Technical Implementation

```
packages/shared/src/terrain/
├── chunk.ts          # Chunk definition types
├── zone.ts           # Zone configuration types
└── heightmap.ts      # Shared heightmap utilities

apps/client/src/terrain/
├── TerrainManager.ts # Chunk loading/unloading
├── TerrainChunk.ts   # Single chunk mesh + materials
├── TerrainLOD.ts     # LOD management
├── SplatmapShader.ts # Multi-texture blending shader
└── WaterSystem.ts    # Water rendering

apps/server/src/terrain/
├── ServerTerrain.ts  # Simplified terrain for validation
├── Pathfinding.ts    # A* or navmesh pathfinding
└── SpawnZones.ts     # Monster spawn area definitions
```

## Alternatives Considered

### Procedural Terrain Generation
- Pro: Infinite variety, small data footprint
- Con: Less artistic control, harder to design meaningful zones, Metin2 had hand-crafted maps
- **Rejected**: MMORPGs need designed, purposeful worlds

### Single Large Mesh
- Pro: Simple, no streaming logic
- Con: Performance disaster for large worlds, can't LOD effectively
- **Rejected**: Won't scale to MMORPG world sizes

### Voxel-Based Terrain
- Pro: Destructible, Minecraft-style
- Con: Wrong aesthetic, high memory usage, complex rendering
- **Rejected**: Not appropriate for this game style

### Tile-Based 2D with 3D Objects
- Pro: Very performant, simple
- Con: Doesn't match Metin2's 3D terrain feel
- **Rejected**: We want 3D terrain elevation changes

## Consequences

- Need to create heightmap + splatmap editor or pipeline (can use external tools like World Machine, L3DT)
- Zone design becomes a content creation pipeline task
- Memory management for chunk loading is critical — budget ~50MB for terrain data
- Terrain shader needs WebGPU and WebGL2 versions
- Server needs lightweight terrain representation — not full mesh data
- Asset loading strategy must prioritize terrain chunks in view frustum
