# Tenos — "Massless"

Browser-based MMORPG inspired by Metin2, built with WebGPU, authoritative server architecture, and isomorphic TypeScript.

> **Status:** Phase 0 — Bootstrap & Planning (February 2026)
> **Codename:** Massless
> **Previously:** "Antigravity"

## Vision

Massless is a browser-based action MMORPG that reimagines Metin2 for the modern web. No downloads, no installs — open your browser and enter a world of kingdom warfare, skill-based combat, and thrilling equipment progression.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Rendering** | Babylon.js 8 (WebGPU + WebGL2 Fallback) |
| **Physics** | Havok (WASM) |
| **ECS** | BitECS (zero-allocation, TypedArray-based) |
| **UI** | SolidJS |
| **Networking** | Colyseus (WebSocket, authoritative server) |
| **Runtime** | Bun (Monorepo with Workspaces) |
| **Database** | PostgreSQL + Drizzle ORM |
| **Cache/Pub-Sub** | Redis |
| **Bundler** | Vite |

## Project Structure

```
Tenos/
├── docs/
│   ├── GAME_BLUEPRINT.md           # Original technical blueprint
│   ├── research/                    # Research documents
│   │   ├── metin2-analysis.md            # Metin2 game analysis
│   │   ├── metin3-vision.md              # Our vision for "Metin3"
│   │   └── browser-mmorpg-feasibility.md # Browser MMORPG feasibility
│   ├── game-design/
│   │   └── GDD.md                   # Game Design Document
│   ├── architecture/
│   │   ├── ARCHITECTURE.md          # Technical architecture overview
│   │   ├── ADR-001-camera-system.md
│   │   ├── ADR-002-terrain-system.md
│   │   ├── ADR-003-combat-architecture.md
│   │   ├── ADR-004-networking-protocol.md
│   │   ├── ADR-005-persistence-strategy.md
│   │   ├── ADR-006-authentication.md
│   │   ├── ADR-007-pathfinding.md
│   │   ├── ADR-008-asset-pipeline.md
│   │   └── ADR-009-chat-system.md
│   ├── standards/
│   │   ├── CODING-STANDARDS.md
│   │   ├── TESTING-STANDARDS.md
│   │   └── GIT-STANDARDS.md
│   ├── deployment/
│   │   └── DEPLOYMENT.md
│   └── project/
│       ├── TASK-MANAGEMENT.md
│       └── ROADMAP.md
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint, test, build on PR
│       ├── deploy-staging.yml       # Auto-deploy to staging
│       ├── deploy-production.yml    # Production deployment
│       └── e2e.yml                  # Nightly E2E tests
└── (source code — coming in Milestone 1)
```

## Documentation

### Game Design
- [Game Design Document](docs/game-design/GDD.md) — Full game design, mechanics, features
- [Game Blueprint](docs/GAME_BLUEPRINT.md) — Original technical architecture blueprint
- [Metin3 Vision](docs/research/metin3-vision.md) — What Massless aspires to be

### Architecture
- [Technical Architecture](docs/architecture/ARCHITECTURE.md) — System overview, data flows, schemas
- Architecture Decision Records (ADR-001 through ADR-009) — Key technical decisions

### Standards
- [Coding Standards](docs/standards/CODING-STANDARDS.md) — TypeScript, naming, zero-allocation rules
- [Testing Standards](docs/standards/TESTING-STANDARDS.md) — Testing strategy and tools
- [Git Standards](docs/standards/GIT-STANDARDS.md) — Branching, commits, PRs

### Project
- [Roadmap](docs/project/ROADMAP.md) — Milestones 1-5 with detailed task breakdowns
- [Task Management](docs/project/TASK-MANAGEMENT.md) — Task format and workflow
- [Deployment](docs/deployment/DEPLOYMENT.md) — Infrastructure and deployment strategy

## Development Milestones

| Milestone | Name | Goal |
|-----------|------|------|
| M1 | Walking Skeleton | Connect, see world, move, see other players |
| M2 | First Blood | Fight monsters and players |
| M3 | The Adventurer | Classes, skills, equipment, quests |
| M4 | Community | Chat, guilds, trading, kingdom wars |
| M5 | Endgame | Dungeons, ranked PvP, mounts, achievements |

## Getting Started (Coming Soon)

```bash
# Clone and install
git clone <repo-url> && cd Tenos
bun install

# Start database services
docker compose up -d postgres redis

# Run migrations
bun run db:migrate

# Start development
bun run dev
```

## License

Private — All rights reserved.
