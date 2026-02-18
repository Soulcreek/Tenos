# Browser-Based MMORPG Feasibility Research

> Research compiled February 2026. All figures and references are sourced from web searches of current documentation, benchmarks, community projects, and academic papers.

---

## Table of Contents

1. [Successful Browser-Based MMORPGs](#1-successful-browser-based-mmorpgs)
2. [Babylon.js for MMORPGs](#2-babylonjs-for-mmorpgs)
3. [BitECS Performance Patterns for MMO-Scale](#3-bitecs-performance-patterns-for-mmo-scale)
4. [Colyseus for MMORPGs](#4-colyseus-for-mmorpgs)
5. [Successful Indie MMORPG Architectures](#5-successful-indie-mmorpg-architectures)
6. [WebGPU Status in 2025-2026](#6-webgpu-status-in-2025-2026)
7. [Performance Targets](#7-performance-targets)
8. [Conclusions and Recommendations](#8-conclusions-and-recommendations)

---

## 1. Successful Browser-Based MMORPGs

### 1.1 RuneScape / Old School RuneScape

- **Status**: RuneScape (RS3) offers a browser client alongside its downloadable client. OSRS has moved primarily to a standalone client (RuneLite/official client), though it historically ran in-browser via Java applets.
- **Scale**: ~1.5 million monthly active users across both versions.
- **What works**: Tick-based gameplay (0.6s ticks) is inherently forgiving of network latency. Relatively low graphical fidelity keeps browser rendering feasible. 20+ years of content creates deep retention.
- **What doesn't**: Even RuneScape has largely moved away from browser-only delivery. The Java applet era ended; modern RS3 browser play uses NXT client technology. Pure browser support is increasingly treated as secondary.
- **Lesson**: A slower-paced tick-based MMO is the most natural fit for browser delivery. The gameplay design itself can compensate for browser limitations.

**References**: [Soulbound Blog - 15 Active Browser MMORPGs](https://soulbound.game/blog/15-most-active-browser-mmorpgs-in-2025/), [MMORPG.GG - Best Browser MMOs](https://mmorpg.gg/best-browser-mmos/)

### 1.2 Hordes.io

- **Status**: Active and thriving as a 3D browser MMORPG focused on large-scale PvP.
- **Developer**: Solo developer ("Dek"), working on the project since 2016.
- **Technical evolution**:

| Component | Alpha (2016) | Beta (2018+) |
|---|---|---|
| Rendering | Three.js | Custom engine based on OGL (WebGL) |
| Networking | Socket.io (JSON) | uWebSockets (custom binary protocol) |
| Database | MongoDB | Migrated away from MongoDB |
| Serialization | JSON | Custom binary serialization library |

- **Performance**: Achieves 144+ FPS in browser on consumer hardware using a custom WebGL renderer optimized for many moving entities and large open worlds.
- **Key techniques**: Frustum-based culling, seamless distance-based LOD terrain, custom navmesh generation, dynamic tick rate netcode, bucket-based culling for proximity-based network data, deterministic client-side simulation to reduce bandwidth.
- **What works**: Simple block-style art keeps asset sizes small. Binary protocols drastically reduce bandwidth. Solo developer proves it's possible.
- **What doesn't**: Required abandoning Three.js for a lower-level custom engine for performance. Required writing custom serialization, networking, and navmesh systems.
- **Lesson**: Starting with a higher-level library (Three.js) is fine for prototyping, but scaling to production may require dropping down to lower-level abstractions. Custom binary networking is essential at scale.

**References**: [Web Game Dev - Interview with Dek](https://www.webgamedev.com/interviews/dek-hordes), [Hacker News - Hordes Show HN](https://news.ycombinator.com/item?id=20810627)

### 1.3 BrowserQuest (Mozilla)

- **Status**: Deprecated by Mozilla, but spawned many community forks including Kaetram.
- **Architecture**: HTML5 canvas rendering, Node.js server, Redis for session management, WebSocket communication. Each server hosted multiple world instances with a capacity of ~200 players per instance.
- **What works**: Clean, well-structured open source codebase. Proved HTML5 + WebSockets as a viable real-time multiplayer stack. Spawned an entire ecosystem of forks.
- **What doesn't**: Mozilla stopped maintaining it. Dependencies became deprecated over time. Limited to 2D sprite-based rendering.
- **Lesson**: A simple, clean architecture with zone instancing (200 players per world instance) is a proven pattern. Redis is the standard choice for session management.

**References**: [GitHub - mozilla/BrowserQuest](https://github.com/mozilla/BrowserQuest), [GitHub - Kaetram](https://github.com/Kaetram/Kaetram-Open)

### 1.4 Flyff Universe

- **Status**: Active, commercially successful browser MMORPG.
- **Scale**: 250,000+ players since launch; 78% retention rate during closed beta across 10 countries.
- **Technology**: Custom homemade HTML5 game engine with advanced shaders, antialiasing, and post-processing. No download required -- runs on PC, Mac, mobile, and tablet browsers.
- **Team**: Small team at Sniegu Technologies (subsidiary of Gala Lab), founded by veteran Flyff players.
- **What works**: Full 3D MMORPG running near-native performance in browser. True cross-platform (PC gameplay that also works on mobile). Self-described as "the most advanced browser-based MMORPG available on the market."
- **Lesson**: A custom engine optimized specifically for browser delivery can achieve near-native performance. Small, passionate teams can ship commercial browser MMORPGs.

**References**: [Flyff Universe](https://universe.flyff.com/en/intro/free-web-mmorpg), [MMORPG.com - Flyff Universe Interview](https://www.mmorpg.com/interviews/flyff-universe-interview-bringing-the-anime-mmo-back-to-its-fans-2000125733)

### 1.5 Other Notable Examples

- **Drakensang Online**: Long-running browser ARPG/MMO with isometric perspective.
- **stein.world**: 2D browser MMORPG with pixel art aesthetics.
- **Soulbound**: Rising browser MMORPG with retro-modern visuals, classless progression, 120fps browser gameplay, co-op raids.
- **AdventureQuest 3D**: Cross-platform MMO playable in browser.

### 1.6 Summary: What Works and What Doesn't at Scale

**What works:**
- Simpler art styles (block, low-poly, stylized) that keep asset sizes and draw calls manageable
- Binary networking protocols over WebSockets (not JSON)
- Tick-based or slower-paced gameplay that tolerates network latency
- Zone/instance-based world partitioning (100-200 players per zone)
- Custom engines optimized for the specific game's needs
- Small, focused teams with deep technical skills

**What doesn't:**
- Relying on general-purpose 3D libraries without optimization for your specific workload
- JSON-based networking at scale
- Trying to render thousands of unique, high-fidelity meshes
- Assuming browser performance matches native without significant optimization work

---

## 2. Babylon.js for MMORPGs

### 2.1 Isometric/Top-Down 3D Games

Babylon.js fully supports isometric and top-down camera setups via orthographic cameras. Multiple community members have built MMORPG-style projects:

- **maiu-online.com**: A developer built an MMO with gameplay similar to MU Online and Diablo 2 using Babylon.js and TypeScript, writing the server from scratch with collision, combat, and loot systems.
- **Community RPG asset packs**: Active community interest in RPG-style development with optimized 3D asset packs for Babylon.js.

Babylon.js 8.0 (the latest major release) includes a year's worth of new features, optimizations, and performance improvements.

**References**: [Babylon.js Forum - Browser 3D MMORPG Devlog](https://forum.babylonjs.com/t/babylon-js-browser-3d-mmorpg-devlog/47440), [Babylon.js Official Site](https://www.babylonjs.com/)

### 2.2 WebGPU Rendering Performance for Many Entities

Babylon.js automatically detects WebGPU availability and switches to it when supported. Key WebGPU advantages for entity-heavy scenes:

- **Snapshot Rendering (Render Bundles)**: Renders scenes approximately **10x faster** than without.
- **Compute Shaders**: Can update **100,000 particles in under 2ms** -- a 150x improvement over CPU-based approaches.
- **Multi-threaded command preparation**: WebGPU supports preparing rendering commands across multiple threads simultaneously, reducing CPU overhead. Most visible in complex scenes with hundreds of draw calls.

**Caveats**:
- Don't assume WebGPU automatically makes a heavy scene smooth. If you're fill-rate bound (too many pixels, heavy effects, lots of transparency), a backend swap won't save you.
- Some community members report negligible differences between WebGL and WebGPU for simpler scenes. The benefits become apparent at scale with many draw calls.
- WebGPU initialization times can be longer than WebGL.

**References**: [Babylon.js WebGPU Docs](https://doc.babylonjs.com/setup/support/webGPU), [TheLinuxCode - Babylon.js in 2026](https://thelinuxcode.com/babylonjs-in-2026-building-practical-3d-web-apps-with-webglwebgpu/)

### 2.3 Mesh Instancing for Hundreds of Characters

Babylon.js provides three tiers of instancing, each with increasing performance but decreasing flexibility:

#### Tier 1: Regular Instances (`mesh.createInstance()`)
- Each instance shares the parent mesh's material but has its own transform and collision.
- **Performance**: 1,000 cube meshes at 144fps.
- **Best for**: Moderate numbers of characters (50-200) where you need individual control.

#### Tier 2: Thin Instances
- Maximum performance with minimum overhead. No individual instance objects.
- Instances are specified as arrays of property values (matrices).
- **Limitation**: All-or-nothing rendering -- all thin instances of a mesh are rendered or none (based on a combined bounding box). Mitigation: split instances across multiple "root" meshes for different map tiles.
- **Limitation**: For extremely high counts (millions) of simple primitives, a single merged mesh can outperform thin instances (e.g., 2M quads: 60fps merged vs. 15fps thin instances).

#### Tier 3: Thin Instances + Baked Texture Animations
- For animated characters in RTS-style scenarios, the official Babylon.js approach is:
  1. Bake skeletal animation data into textures.
  2. Use `bakedVertexAnimationSettingsInstanced` thin instance buffer to control per-instance animation.
  3. Use navigation meshes for pathfinding thousands of units.
- This is the recommended pattern for rendering **thousands of animated entities**.

**References**: [Babylon.js - Creating Thousands of Animated Entities](https://babylonjs.medium.com/creating-thousands-of-animated-entities-in-babylon-js-ce3c439bdacf), [Babylon.js Instances Docs](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/instances)

### 2.4 Terrain Systems

#### Dynamic Terrain Extension (Recommended for Large Worlds)
- Keeps vertex count constant as the camera moves; only the covered portion of the data map changes.
- The data map is infinitely repeated/tiled by default.
- Built-in LOD: terrain precision adjusts based on camera distance.
- Supports heightmap-based generation from grayscale images.
- **Best for**: Large/infinite open world terrain streaming.

#### `CreateGroundFromHeightMap` (Built-in)
- Simpler API for creating terrain from heightmap images.
- Parameters: size, subdivisions, min/max height.
- **Best for**: Smaller, fixed terrain areas.

#### Physics on Large Terrains
- Heightmap-based physics imposters via Ammo.js are recommended for large-scale terrain collision.

**References**: [Babylon.js Dynamic Terrain Docs](https://doc.babylonjs.com/communityExtensions/dynamicTerrains/), [Dynamic Terrain GitHub](https://github.com/BabylonJS/Extensions/blob/master/DynamicTerrain/documentation/dynamicTerrainDocumentation.md)

### 2.5 Animation System for Character Models

#### Skeletal Animation Architecture
- `BABYLON.Skeleton` contains a hierarchy of `BABYLON.Bone` objects.
- Supports up to **4 bone influences per vertex**.
- Loads from `.babylon`, `.glb`, `.gltf` formats.
- Animations started via `scene.beginAnimation()` with frame ranges and looping options.
- Skeletons can be cloned for multiple independently-animated characters.
- Objects can be attached to bones (e.g., weapons in hand).

#### Performance Considerations
- **Core challenge**: Skeletal animation consumes significant per-frame CPU time, as all bone transformations must be calculated.
- **Baked animations**: Pre-compute and store bone transformations, eliminating per-frame computation. Critical for scenes with many animated characters.
- **Texture-based bone data**: Using only rotation + position (no scaling) reduces texture reads from 4 to 2 per bone, improving performance for many skeletal meshes.
- **Workflow**: Create in Blender, export as `.glb`/`.babylon`, import into Babylon.js.

**References**: [Babylon.js Bones & Skeletons Docs](https://doc.babylonjs.com/features/featuresDeepDive/mesh/bonesSkeletons), [Skeletal Mesh Performance Forum Thread](https://forum.babylonjs.com/t/skeletal-mesh-performance/40522)

---

## 3. BitECS Performance Patterns for MMO-Scale

### 3.1 Entity Count Capabilities

- **Default world size**: 100,000 entities (configurable upward via `setDefaultSize`).
- **Real-world usage**: Roguelike games report ~3,500 entities per level running smoothly.
- **Scaling demonstration**: The blog post "TypeScript ECS Game: From 20 NPCs to 10,000" demonstrates bitECS enabling dramatic entity scaling in a browser game.

### 3.2 Benchmark Results

From the [noctjs/ecs-benchmark](https://github.com/noctjs/ecs-benchmark) suite (1,000 entities per dataset):

| Benchmark | bitECS (op/s) | wolf-ecs (op/s) | ecsy (op/s) |
|---|---|---|---|
| packed_5 | 335,064 | 378,471 | 7,822 |
| simple_iter | 115,954 | 165,951 | 4,822 |
| frag_iter | 431,207 | 535,362 | 24,537 |
| entity_cycle | 1,634 | 2,597 | 120 |
| add_remove | 2,334 | 3,913 | 975 |

**Key observations**:
- bitECS is among the fastest JavaScript ECS libraries, approximately **40-90x faster than object-based ECS libraries** (like ecsy) for iteration.
- Wolf-ECS is ~5-10% faster at iteration, but the two are effectively equal within run-to-run variance.
- bitECS is **weaker at entity creation/destruction** compared to some competitors (piecs). For games with heavy entity churn, this is worth noting.
- Run-to-run variance is 1-4%; any benchmarks within a few percent should be considered "effectively equal."

### 3.3 Zero-Allocation / Structure-of-Arrays (SoA) Patterns

bitECS achieves its performance through several key design decisions:

- **SoA data layout**: Components use `TypedArrays` (e.g., `Float64Array(10000)`) instead of object arrays. This provides:
  - CPU cache-friendly memory access patterns (sequential reads)
  - Elimination of garbage collection pressure (no object allocations during iteration)
  - Compatibility with `SharedArrayBuffer` for multi-threaded access
- **Typed component stores**: Recommended pattern is `Float64Array` or `Float32Array` for numeric data, enabling zero-allocation iteration.
- **AoS alternative**: Array-of-Structures components are "performant so long as the shape is small and there are < 100k objects," but SoA is preferred for maximum throughput.

#### Practical Performance Characteristics
- **Iteration**: Extremely fast due to cache-coherent memory layout. Systems iterate over contiguous typed arrays.
- **Queries**: Archetype-based queries efficiently match entities with specific component sets.
- **Memory**: Fixed-size typed arrays mean memory is pre-allocated. No GC pauses during gameplay.
- **Thread safety**: `SharedArrayBuffer`-backed stores enable lock-free multi-threaded architectures (as demonstrated by Matrix.org's Third Room project).

### 3.4 Real-World Multiplayer Usage: Third Room (Matrix.org)

The most prominent real-world example of bitECS in a multiplayer/shared-world context:
- Built on Matrix group VoIP spec for WebRTC-based voice and game networking.
- Adopted "bitECS's functional programming patterns throughout the engine for simpler abstractions, better tree shaking, and faster design iteration."
- Uses a **multi-threaded architecture** with lock-free scene graph data structures backed by `SharedArrayBuffers` and `Atomics`.
- Renderer and game thread run at different rates.

### 3.5 Practical Guidance for MMO Use

- **50-200 entities (visible to a player)**: Trivially handled by bitECS. The bottleneck will be rendering, not ECS iteration.
- **1,000-10,000 entities (server-side world simulation)**: Well within bitECS capabilities. Systems processing 10,000 entities per tick at 20Hz is easily achievable.
- **Entity creation/destruction**: This is bitECS's relative weakness. For MMOs where entities frequently enter/leave (players logging in/out, NPCs spawning/despawning), design systems to pool entities rather than create/destroy.

**References**: [bitECS GitHub](https://github.com/NateTheGreatt/bitECS), [noctjs/ecs-benchmark](https://github.com/noctjs/ecs-benchmark), [Joseph O'Dowd - From 20 NPCs to 10,000](https://www.josephodowd.com/blog/8), [Third Room GitHub](https://github.com/matrix-org/thirdroom)

---

## 4. Colyseus for MMORPGs

### 4.1 Max CCU Per Room

Colyseus advertises scalability from **10 to 10,000+ CCU** through vertical and horizontal scaling.

Per-process CCU depends on:
- **CPU**: Complexity of game loop and message handlers. Heavy physics/AI reduces CCU capacity.
- **RAM**: Each connection uses ~2-5KB baseline, growing with state size. Monitor for OOM.
- **State size**: Larger room states mean more serialization work per tick.

**Realistic estimates** (based on community reports and documentation):
- Simple chat/lobby: 1,000+ CCU per process
- Moderate game logic (turn-based): 200-500 CCU per process
- Complex real-time simulation (MMORPG zone): 50-200 CCU per process/room
- With Redis horizontal scaling: limited primarily by total server resources

### 4.2 State Synchronization Strategies

#### Core Mechanism
Colyseus uses **`@colyseus/schema`**, an incremental binary state serializer with delta encoding:

1. **Mutation tracking**: When server mutates state, changed properties are tracked per Schema instance.
2. **Delta encoding**: Only changed properties are encoded and sent during the `patchRate` interval.
3. **Client decode**: Clients receive deltas and apply them, triggering `onChange`, `listen`, `onAdd`/`onRemove` callbacks.
4. **Full state on join**: New clients receive complete state on room join.

#### State Views (`@view()` decorator)
- Filter which properties are sent to specific clients.
- Enables **area-of-interest** filtering -- only send data about entities near a player.
- Critical for MMORPG zone rooms where not all players need to see all entities.

#### Schema Limitations
- Each Schema structure supports up to **64 fields** maximum. Use nested structures for more.
- Instance reference tracking allows sharing references across state.

### 4.3 Room-Based Architecture for Zone Sharding

The recommended MMORPG pattern with Colyseus:

```
World Map
+--------+--------+--------+
| Zone A | Zone B | Zone C |  <- Each zone = 1 Colyseus Room
| Room   | Room   | Room   |
+--------+--------+--------+
| Zone D | Zone E | Zone F |
| Room   | Room   | Room   |
+--------+--------+--------+
```

**Key architectural points**:
- Each Room is bound to a single Colyseus process.
- Rooms are distributed equally across available processes.
- Client connections are directly associated with the process that created the room.
- `selectProcessIdToCreateRoom` callback allows customizing room-to-process assignment.
- Players near zone borders may need connections to adjacent rooms for cross-zone visibility.

#### Connection Flow
1. **Seat reservation**: Any Colyseus process can handle this. Shared presence + driver enable cross-process communication via pub/sub.
2. **WebSocket connection**: Client connects directly to the process hosting the room.
3. **Cross-process messaging**: Messages can be forwarded between processes via Redis.

### 4.4 Redis Scaling Patterns

Redis serves two critical roles:

#### RedisPresence
- Enables communication between rooms and Node.js processes.
- Handles seat reservation across processes.
- Processes register their `processId` and network location.
- Graceful shutdown unregisters processes.

#### RedisDriver
- Stores room data for matchmaking queries.
- Required for multi-process/distributed deployments.
- Supports Redis Cluster configurations.

#### Multi-Process Deployment
- Each Colyseus instance listens on a different port (3001, 3002, 3003...).
- Processes should NOT be exposed publicly (use a reverse proxy/load balancer).
- Each process configured with its own public address for direct client WebSocket connections.

### 4.5 MMORPG-Specific Considerations

- **Authoritative server model**: Game logic runs server-side. Cheat-resistant by design.
- **Client prediction**: Not yet built-in as of 2025; planned for future release. Must implement custom.
- **State persistence**: Rooms are ephemeral. Use external database (Postgres, MongoDB, Redis) for persistent game data.
- **Colyseus Cloud**: Managed deployment option that handles scaling configuration.

**References**: [Colyseus Scalability Docs](https://docs.colyseus.io/deployment/scalability), [Colyseus State Docs](https://docs.colyseus.io/state), [Colyseus FAQ](https://docs.colyseus.io/faq), [colyseus/schema GitHub](https://github.com/colyseus/schema)

---

## 5. Successful Indie MMORPG Architectures

### 5.1 What Architectures Work for Small Teams

#### The Fundamental Warning
Most fresh independent game studios do not have the resources or knowledge to develop an MMO. Compared to any other genre, it takes orders of magnitude more money, marketing, and community management to produce a viable MMO. However, notable exceptions exist (Hordes.io, Ravendawn, Villagers & Heroes, Grudge).

#### Proven Architecture Patterns

**1. In-Memory State with Periodic Persistence**
- Writing every character movement to a database generates ~10 DB transactions/sec/player.
- 10,000 players = 100,000 DB transactions/second -- infeasible.
- Solution: Keep active game state in-memory. Persist to database only on major events (zone changes, level-ups, logout).
- This reduces DB transactions by **3-4 orders of magnitude**.

**2. Separated Networking and Game Logic Threads**
- Network I/O on dedicated thread(s).
- Game simulation on separate thread(s).
- Prevents the application from stalling on large network transfers.

**3. Zone-Based World Partitioning**
- Divide the world into manageable zones (rooms/instances).
- Each zone handles 50-200 concurrent players.
- Single source of truth per zone, but players must be able to interact across zones (trading, messaging).

**4. Simple State Machine for Fault Tolerance**
- Don't over-engineer fault tolerance. If a game event is disrupted for >0.5-2 minutes, you generally won't get the same players back and will need to roll back anyway.
- Fault-tolerant solutions are "complicated, costly, and for the games realm I generally consider them as over-engineering."

### 5.2 Common Pitfalls

1. **Scope creep**: The number one killer of indie MMOs. Feature lists grow faster than implementation capacity.
2. **Database as source of truth for real-time state**: Leads to I/O bottlenecks immediately. Use in-memory state.
3. **JSON-based networking**: Doesn't scale. Must move to binary protocols.
4. **Loot/economy bugs**: A single bug in loot tables or economy can cascade into a community crisis (Corepunk case study: bugged Tier 3 Artifacts led to mass player item loss).
5. **Skill gaps beyond code**: Senior engineers excel at architecture but often lack experience in community management, social media, and narrative content.
6. **Over-engineering early**: Building distributed fault-tolerant systems before you have 100 players.
7. **Underestimating community management**: MMOs require 24/7 community attention that other genres don't.

### 5.3 Minimum Viable MMORPG Feature Set

Based on analysis of successful indie MMOs, the practical MVP includes:

**Core (Must-Have for Day 1)**:
- Character creation (even minimal: name + class selection)
- Persistent world with at least one zone
- Real-time multiplayer movement (see other players)
- Basic combat system (attack, take damage, die, respawn)
- Chat (at minimum: local/area chat)
- Basic inventory system
- NPC enemies with simple AI (aggro, patrol, respawn)
- Experience/leveling (even a simple version)

**Important (Needed within weeks of launch)**:
- Trading between players or an auction house
- Grouping/party system
- Multiple zones with zone transitions
- Equipment with stat bonuses
- Basic questing (kill X, collect Y)

**Can be deferred**:
- PvP
- Guilds/clans
- Crafting
- Housing
- Mount system
- Complex skill trees
- World events/raids

### 5.4 How to Scope Realistically

- **Start with a "game loop" prototype**: Get a single zone with combat and multiplayer working before building anything else.
- **Leverage existing skills**: Teams that succeeded started with skills they already had.
- **Target 50-100 CCU first**: Don't architect for 10,000 players on day one. Architect for 100 with a clear path to 1,000.
- **Ship early, iterate fast**: The MVP methodology applies -- "that version which allows a team to collect the maximum amount of validated learning about customers with the least effort."

### 5.5 Indie Success Stories to Study

| Game | Team Size | Key Achievement |
|---|---|---|
| Hordes.io | 1 developer | Full 3D browser MMORPG, 144+ FPS, custom engine |
| Ravendawn | Small team | Successful 2D sandbox MMO launch (Jan 2024), first expansion by Aug 2024 |
| Villagers & Heroes | Small studio | 4+ million registered users since 2014 |
| Grudge | Solo developer | Multi-genre sandbox MMO |
| Flyff Universe | Small team (Sniegu Technologies) | 250,000+ players, "most advanced browser-based MMORPG" |

**References**: [PRDeving - MMO Architecture](https://prdeving.wordpress.com/2023/09/29/mmo-architecture-source-of-truth-dataflows-i-o-bottlenecks-and-how-to-solve-them/), [MMORPG.com - Case Studies in Indie MMO Development](https://www.mmorpg.com/editorials/case-studies-in-first-timer-indie-mmo-development-part-2-2000130150), [MMORPG.com - 10 Indie MMOs for 2025](https://www.mmorpg.com/features/10-indie-mmos-to-play-and-look-forward-to-playing-in-2025-and-beyond-2000133973)

---

## 6. WebGPU Status in 2025-2026

### 6.1 Browser Support Matrix (as of late 2025)

| Browser | Windows | macOS | Linux | Android | iOS |
|---|---|---|---|---|---|
| Chrome/Edge | Stable (v113+) | Stable | Rolling out (v144+ Intel Gen12+) | Stable (v121+, Android 12+, Qualcomm/ARM) | N/A (uses Safari) |
| Firefox | Stable (v141+) | Stable (v145+, Apple Silicon, macOS Tahoe 26) | Nightly only | Behind flag | N/A |
| Safari | N/A | Stable (v26.0, macOS Tahoe 26) | N/A | N/A | Stable (iOS 26+) |

**Milestone**: As of November 2025, WebGPU ships by default in Chrome, Firefox, Safari, and Edge -- a critical mass achievement.

**Remaining gaps**:
- **Linux**: Still rolling out across browsers. Chrome: driver-specific rollouts. Firefox: Nightly only.
- **Mobile**: Chrome on Android requires recent hardware (Android 12+). Firefox on Android: behind a flag. Safari on iOS 26 is solid but requires latest OS.

### 6.2 Underlying Implementations

- **Dawn** (C++): Powers Chrome and derivatives. Maps to Direct3D 12, Metal, and Vulkan.
- **wgpu** (Rust): Powers Firefox. Targets the same backends through a unified abstraction layer.
- Both ship as standalone libraries usable outside the browser.

### 6.3 Performance vs WebGL2

#### Architectural Advantages
- Built on modern native APIs (Direct3D 12, Metal, Vulkan) instead of OpenGL ES.
- Low-level model for buffers, textures, command buffers with own shading language (WGSL).
- More predictable performance and better GPU feature access than WebGL.

#### Concrete Performance Gains

| Scenario | Improvement |
|---|---|
| Babylon.js Snapshot Rendering (Render Bundles) | ~10x faster scene rendering |
| Compute shader particle updates (100K particles) | 150x improvement (under 2ms) |
| General JavaScript workload for same graphics | "Greatly reduced" |
| ML model inference | 5-15x faster than CPU (200-400ms vs 2-3s) |
| Power consumption for same workload | ~33% less battery drain |

#### Multi-Threaded Command Preparation
- WebGPU supports preparing rendering commands across multiple threads simultaneously.
- Distributes command preparation across all available CPU cores.
- Most visible impact in complex scenes with hundreds of draw calls, which is directly relevant for MMORPGs.

#### Comparison Caveats
- Chrome defaults to low-power GPU for WebGPU on battery, high-power when plugged in. WebGL doesn't do this. Can produce misleading comparisons.
- WebGL default framebuffer is antialiased; WebGPU canvas textures are always single-sampled. Must MSAA explicitly for fair comparison.
- Firefox has some inter-process communication overhead that is being addressed.

### 6.4 Limitations for Game Development

- **Compute shaders (WebGPU-only)**: Enormously powerful for physics, particles, AI, but not available in WebGL fallback.
- **WGSL learning curve**: New shading language, though tools and documentation are maturing.
- **Feature rollout**: Some advanced features (e.g., HDR canvas in Safari, WebXR + WebGPU on Vision Pro) are browser-specific.
- **No ubiquitous mobile support yet**: Must maintain WebGL2 fallback for broad reach in 2026.

### 6.5 Framework Support

| Framework | WebGPU Support |
|---|---|
| Babylon.js | Extensive, with auto-detection and fallback |
| Three.js | WebGPU renderer available |
| PlayCanvas | Ships WebGPU apps |
| Unity 6 | WebGPU rendering backend |
| React Native | WebGPU via Dawn |

### 6.6 Recommendation for 2026

- **Build with WebGPU as primary target** but maintain WebGL2 fallback.
- Babylon.js handles this automatically with its backend auto-detection.
- WebGPU's render bundles and compute shaders are directly beneficial for MMORPG workloads (many entities, particle effects, potential for GPU-driven AI).
- Full Linux and Android coverage expected through 2026.

**References**: [Can I Use - WebGPU](https://caniuse.com/webgpu), [web.dev - WebGPU supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers), [WebGPU Hits Critical Mass](https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers-now-ship-it/), [MDN - WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API), [GPU Acceleration Benchmarks](https://www.mayhemcode.com/2025/12/gpu-acceleration-in-browsers-webgpu.html), [WebGPU Performance Comparison Best Practices](https://toji.dev/webgpu-best-practices/webgl-performance-comparison.html)

---

## 7. Performance Targets

### 7.1 Rendering: 60fps with 50-200 Entities

**What's achievable in a browser (2026)**:

| Entity Count | Rendering Approach | Expected FPS | Notes |
|---|---|---|---|
| 50 entities | Regular instances | 60+ fps | Trivial, even on mid-range hardware |
| 100 entities | Regular instances | 60+ fps | Comfortable with proper culling |
| 200 entities | Thin instances + baked animations | 60+ fps | Requires instancing discipline |
| 500 entities | Thin instances + baked animations | 30-60 fps | Depends on model complexity |
| 1,000 entities | Thin instances + baked animations | 60+ fps (WebGPU) | Demonstrated by Babylon.js team (1K cubes at 144fps) |
| Thousands | Thin instances + texture animations + LOD | Variable | Hordes.io achieves 144+ fps with custom engine |

**Key performance strategies**:
- Frustum culling (only render what the camera sees)
- LOD (reduce detail at distance)
- Instancing (batch identical meshes)
- Baked animations (avoid per-frame skeletal computation)
- Texture atlasing (reduce material/texture switches)
- Visibility-based updates (skip animation updates for off-screen entities)

**The bottleneck hierarchy** (most likely to least likely):
1. Draw calls (solved by instancing)
2. Skeletal animation computation (solved by baked animations)
3. Shader complexity (solved by LOD and material simplification)
4. Fill rate (solved by reducing overdraw, using simpler effects at distance)
5. JavaScript game logic (solved by ECS patterns like bitECS)

### 7.2 Network Bandwidth Requirements

Based on academic research and real-world MMORPG analysis:

| Metric | Typical Value | Notes |
|---|---|---|
| Average bandwidth per client | ~7 Kbps | During normal gameplay |
| Client to Server | 2-5 Kbps | Player input + actions |
| Server to Client | 18-50 Kbps | Entity updates + world state |
| Peak bandwidth (raid/PvP) | Up to 50 Kbps | Dense player concentrations |
| Packet size | 60-150 bytes | Small, frequent updates |
| Packets per second | ~10 pps average | Both directions |
| TCP header overhead | Up to 73% of total bytes | TCP acknowledgements alone: 30% |
| Savings with header compression + multiplexing (TCM) | 60-70% | Standard optimization technique |

**Per-player bandwidth budget** (planning figures):
- **Conservative design target**: 10 Kbps average per player
- **Peak capacity**: 50 Kbps per player during intense scenes
- **Server with 1 Gbps uplink**: Can theoretically serve ~20,000 players at average load
- **Practical limit**: CPU will bottleneck before bandwidth for most MMORPG architectures

**Bandwidth optimization techniques**:
1. Delta compression (only send changes)
2. Area-of-interest filtering (only send nearby entity data)
3. Variable update rates per entity type (fast for players, slow for environment)
4. Binary serialization (not JSON)
5. Header compression and packet multiplexing (TCM technique: 60-70% savings)
6. Client-side prediction and extrapolation (reduce required update frequency)
7. Deterministic simulation where possible (client simulates, server validates)

### 7.3 Server Tick Rates

| Game Type | Typical Tick Rate | Notes |
|---|---|---|
| FPS (competitive) | 64-128 Hz | CS2 runs at 64 Hz (previously 128 Hz servers available) |
| FPS (casual) | 20-60 Hz | Acceptable for most shooters |
| MMORPG | 10-20 Hz | Slower pace tolerates lower rates |
| MMORPG (combat-focused) | 15-30 Hz | More responsive combat needs higher rates |
| Turn-based MMO | 1-5 Hz | Only needs updates on actions |

**How tick rate affects gameplay feel**:

- **10 Hz (100ms between ticks)**: Acceptable for slow-paced MMOs. Actions feel delayed by up to 100ms plus network latency. Adequate for tab-target combat.
- **20 Hz (50ms between ticks)**: Good balance for most MMORPGs. Responsive enough for action combat. Recommended starting point.
- **30 Hz (33ms between ticks)**: High-quality feel for action MMORPGs. Noticeable improvement in combat responsiveness.
- **60 Hz (16ms between ticks)**: Near-instant server responsiveness. Overkill for most MMORPGs. Significantly increases server CPU and bandwidth costs.

**The simulation/render rate split pattern**:
- Render at 60fps on client.
- Simulate game logic at 20-30 Hz on server.
- Send network updates at 10-20 Hz.
- Client interpolates between received states for smooth visual presentation.

This split is standard industry practice. A simulation rate of 20 Hz with client-side interpolation to 60fps rendering feels smooth for MMORPG gameplay.

**Research insight**: Framerate has a larger influence on perceived lag than tick rate. For low framerates and tick rates, the impact of network delay on end-to-end lag is almost completely masked by frame timing.

**References**: [What is eSports - Server Tick Rates](https://whatisesports.xyz/server-tick-rates/), [GameDev.net - Network Tick Rates](https://www.gamedev.net/forums/topic/652377-network-tick-rates/5126249/), [Game Traffic Analysis - MMORPG Perspective](https://homepage.iis.sinica.edu.tw/~swc/pub/game_traffic_analysis.html), [ResearchGate - MMORPG Player Actions Analysis](https://www.researchgate.net/publication/220664433_MMORPG_Player_actions_Network_performance_session_patterns_and_latency_requirements_analysis)

---

## 8. Conclusions and Recommendations

### 8.1 Feasibility Assessment

**Building a browser-based MMORPG in 2026 is feasible**, with the following qualifications:

| Factor | Assessment | Confidence |
|---|---|---|
| Browser rendering (50-200 entities, 60fps) | Achievable with proper instancing | High |
| WebGPU for production use | Ready on desktop, fragmented on mobile | Medium-High |
| Babylon.js as engine | Capable, with proven MMORPG community projects | High |
| bitECS for game logic | Excellent for 1K-10K entities at 20Hz server tick | High |
| Colyseus for networking | Suitable for room-based zones, 50-200 CCU per zone | Medium-High |
| Solo/small team viability | Proven by Hordes.io, Flyff Universe, others | Medium |
| Reaching 1,000 CCU total | Achievable with zone sharding + Redis scaling | Medium-High |
| Reaching 10,000 CCU total | Requires significant architecture investment | Medium |

### 8.2 Recommended Architecture Stack

```
CLIENT                          SERVER
+------------------+            +------------------+
| Babylon.js 8.0   |            | Node.js          |
| (WebGPU/WebGL2)  |            | Colyseus Rooms   |
|                  |  WebSocket  | (zone per room)  |
| bitECS (client   | <--------> | bitECS (server   |
|  prediction +    |  Binary     |  simulation)     |
|  interpolation)  |  Protocol   |                  |
|                  |            | Redis (presence + |
| Baked texture    |            |  matchmaking)    |
| animations       |            |                  |
| Thin instances   |            | PostgreSQL/Redis |
+------------------+            | (persistence)    |
                                +------------------+
```

### 8.3 Key Design Decisions

1. **Art style**: Low-poly or stylized. Keeps draw calls manageable and asset sizes small for browser delivery.
2. **Camera**: Isometric/top-down. Limits visible area, reducing entity count and rendering load.
3. **Combat pace**: Moderate (tab-target or hybrid). Allows 20Hz server tick rate.
4. **Zone size**: 50-200 concurrent players per zone. Map to Colyseus rooms.
5. **Networking**: Binary protocol via Colyseus schema (delta-encoded). Add custom area-of-interest filtering with `@view()`.
6. **Animation**: Baked texture animations for instanced characters. Skeletal only for the player's own character and nearby important NPCs.
7. **Rendering**: Thin instances for distant/many entities. Regular instances for nearby characters needing individual control.
8. **Persistence**: In-memory game state. Persist to database only on zone transitions, level-ups, logout, and periodic checkpoints.

### 8.4 Risk Factors

| Risk | Mitigation |
|---|---|
| WebGPU not available on user's device | Babylon.js auto-falls back to WebGL2 |
| Colyseus CCU limits per zone | Zone sharding + horizontal Redis scaling |
| Skeletal animation performance with many characters | Baked texture animations for non-player characters |
| Scope creep | Ship MVP with 1 zone, basic combat, multiplayer. Expand from there. |
| Network bandwidth spikes during PvP events | Area-of-interest filtering, variable update rates, packet compression |
| bitECS entity creation/destruction overhead | Entity pooling pattern |
| Community management burden | Start small, build community tools from day one |
