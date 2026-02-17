# ADR-008: Asset Pipeline

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** How 3D models, textures, and animations are created, processed, and loaded

---

## Context

A browser-based MMORPG needs efficient asset loading. Players shouldn't wait for massive downloads, and the game must work on various bandwidth connections. We need a pipeline from asset creation to runtime loading.

## Decision

**glTF 2.0 as the standard 3D format, with progressive loading and asset bundling per zone.**

### Asset Format Standards

| Asset Type | Format | Rationale |
|------------|--------|-----------|
| 3D Models | glTF 2.0 (.glb binary) | Web standard, Babylon.js native support, compact |
| Textures | KTX2 (Basis Universal) | GPU-compressed, 4-6x smaller than PNG, fast decode |
| Animations | glTF embedded | Keep model + animation together |
| Terrain heightmaps | 16-bit PNG | Simple, widely supported |
| Terrain splatmaps | RGBA PNG | 4 channels = 4 material weights |
| Audio | OGG Vorbis + MP3 fallback | Good compression, wide support |
| UI assets | SVG + WebP | Scalable UI, compressed images |

### Loading Strategy

#### Priority Levels
1. **Critical** (before gameplay): Player character model, terrain chunk under player, HUD assets
2. **High** (within 2 seconds): Nearby player models, immediate terrain neighbors, combat VFX
3. **Medium** (within 10 seconds): Full AoI terrain, monster models in view, UI panels
4. **Low** (background): Distant terrain LODs, ambient particles, optional decorations

#### Asset Bundles
Assets are grouped into bundles by zone and type:

```
assets/
├── core/                    # Always loaded
│   ├── ui-bundle.glb        # UI meshes, icons
│   ├── vfx-bundle.glb       # Combat particles, effects
│   └── common-materials/    # Shared materials
├── characters/
│   ├── warrior-male.glb     # Character model + animations
│   ├── warrior-female.glb
│   ├── assassin-male.glb
│   └── ...
├── equipment/
│   ├── weapons-tier1.glb    # Instanced weapon meshes
│   ├── armor-tier1.glb
│   └── ...
├── monsters/
│   ├── zone1-monsters.glb   # All monster models for zone 1
│   └── ...
└── zones/
    ├── zone1/
    │   ├── terrain.glb       # Terrain chunks
    │   ├── heightmap.png
    │   ├── splatmap.png
    │   ├── objects.glb       # Trees, rocks, buildings (instanced)
    │   └── zone1-meta.json   # Spawn points, NPC positions, grid
    └── ...
```

#### Caching
- Service Worker caches all loaded assets
- Version hash in filenames for cache busting
- Total cache budget: ~200MB (expandable)
- On revisit: only download changed assets

### Model Specifications

| Category | Poly Budget | Texture Size | LOD Levels |
|----------|-------------|--------------|------------|
| Player character | 5,000 tris | 1024x1024 | 3 (5k/2k/500) |
| Monster (common) | 3,000 tris | 512x512 | 2 (3k/1k) |
| Monster (boss) | 10,000 tris | 2048x2048 | 3 |
| NPC | 3,000 tris | 512x512 | 2 |
| Building | 2,000-8,000 tris | 1024x1024 | 2 |
| Tree/vegetation | 500-1,000 tris | 512x512 | 2 |
| Weapon | 1,000 tris | 512x512 | 1 |
| Mount | 5,000 tris | 1024x1024 | 2 |

### Animation System

- Skeletal animation via glTF
- Shared skeleton for all humanoid characters (reuse animations across classes)
- Animation blending for smooth transitions (idle → walk → run)
- Root motion for movement alignment
- Animation events for VFX/SFX triggers (sword swing → slash effect)

Key animations per character:
- Idle, Walk, Run, Jump
- Attack (1-3 combo variants), Skill cast, Hit reaction
- Death, Respawn
- Mount, Dismount, Mounted idle/run

### Instancing Strategy

- All identical meshes (trees, rocks, common monsters) use Babylon.js thin instances
- Equipment attachments use bone-based instancing
- Particle systems pooled and reused
- Target: 200 visible entities at 60fps on mid-range GPU

## Alternatives Considered

### FBX Format
- Pro: Industry standard in game dev
- Con: Not web-native, requires conversion, larger files
- **Rejected**: glTF is the web standard, direct Babylon.js support

### Custom Binary Format
- Pro: Maximum control, smallest possible size
- Con: Need custom tooling, no ecosystem support
- **Rejected**: glTF with KTX2 is already very efficient

### Streaming Individual Meshes
- Pro: Load exactly what's needed
- Con: Many small HTTP requests, worse than bundled loading
- **Rejected**: Bundled loading with priority levels is more efficient

## Consequences

- Need Blender → glTF export pipeline (Blender has native glTF export)
- KTX2 texture compression needs build-time processing (using `toktx` or `basisu`)
- Asset build step added to CI/CD (compress textures, optimize meshes)
- Service Worker implementation needed for caching
- Loading screen design must account for progressive loading
- Need asset manifest system to track versions and dependencies
- Placeholder/low-poly assets needed for development before final art
