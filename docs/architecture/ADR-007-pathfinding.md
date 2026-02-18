# ADR-007: Pathfinding System

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** Server-side pathfinding for movement validation and NPC/monster AI

---

## Context

Server needs pathfinding for two purposes:
1. **Movement validation** — Verify that player movement inputs result in valid positions (no wall clipping, no terrain exploits)
2. **AI navigation** — Monsters and NPCs need to navigate the world, chase players, return to spawn areas

## Decision

**Grid-based navigation with A* pathfinding on server, complemented by simple steering behaviors for monsters.**

### Why Grid-Based Over NavMesh

| Factor | Grid | NavMesh |
|--------|------|---------|
| Implementation complexity | Low | High |
| Memory usage | Moderate (1 byte per cell) | Lower |
| Path quality | Good (with smoothing) | Excellent |
| Dynamic updates | Easy (flip cell walkability) | Complex (re-triangulation) |
| Metin2 alignment | Metin2 used grid-based maps | Over-engineered for this style |
| Server CPU | Moderate | Lower per-query but complex setup |

For an MMORPG with relatively simple terrain (no complex indoor 3D navigation), grid-based is sufficient and much simpler to implement and debug.

### Grid Specification

- **Cell size**: 1x1 game unit (same as character width)
- **Walkability**: Each cell is walkable (0) or blocked (1)
- **Height**: Optional height value per cell for slope validation
- **Zone grid**: Each zone has its own grid, sized to zone dimensions
- **Storage**: Packed binary — 1 bit per cell for walkability, 128x128 zone = 2KB

### Movement Validation

```
Client sends: { dx, dy } movement intent
Server processes:
  1. Calculate target position = current position + (dx, dy) × speed × deltaTime
  2. Check grid cell at target position
  3. If walkable: update position
  4. If blocked: reject movement, snap to last valid position
  5. Additional checks: speed validation (is player moving too fast?)
```

### Monster AI Pathfinding

#### A* Implementation
- Standard A* on the grid with 8-directional movement
- Diagonal movement costs √2, cardinal costs 1
- Path caching: monsters re-path every 2 seconds, not every tick
- Max path length: 50 cells (monsters give up if target is too far)
- Path smoothing: remove unnecessary waypoints on straight lines

#### AI Behavior States
```
Idle → (player enters aggro range) → Chase → (in attack range) → Combat
  ↑                                    ↓                            ↓
  └──── (player leaves leash range) ←──┴── (target dies) ← Return ←┘
```

| State | Behavior |
|-------|----------|
| Idle | Stand at spawn, small random movement within 5-unit radius |
| Chase | A* pathfind toward target, re-path every 2s |
| Combat | Face target, execute attack pattern |
| Return | A* pathfind back to spawn point, regen HP, cannot be attacked |

#### Leash System
- Aggro range: 10-20 units (varies by monster type)
- Leash range: 40 units from spawn point
- If target moves beyond leash range, monster returns and resets
- Prevents kiting monsters across the entire zone

### Performance Budget

- A* queries: Max 100 per tick (20Hz) = 2000/s
- Each A* query: Max 200 nodes explored (limited by max path length)
- Total CPU per tick for pathfinding: <2ms target
- Spatial hash for aggro checks: O(1) lookup for entities near a position

## Consequences

- Need a grid generation pipeline: heightmap → walkability grid
- Grid data must be included in zone definition files
- Monster spawn points must be on walkable cells
- Click-to-move (client side) needs client-side pathfinding too (can share grid data)
- Grid must be updated if dynamic obstacles are added (Metin Stones, barriers)
- Debug visualization needed: draw grid overlay in client for development
