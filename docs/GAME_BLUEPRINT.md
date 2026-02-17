# Tenos – Game Blueprint: Browser-basiertes Echtzeit-Multiplayer-Physikspiel

> **Status:** Entwurf v1.0 – Februar 2026
> **Arbeitstitel:** Tenos (vormals "Antigravity")
> **Zielplattform:** Browser-first (Desktop/Mobile), optionaler Desktop-Wrapper

---

## 1. Executive Summary

Dieses Dokument beschreibt die technische Architektur, den Tech Stack und die Entwicklungsstrategie für ein hochperformantes Echtzeit-Multiplayer-Physikspiel im Browser. Es basiert auf einer Analyse des ursprünglichen "Antigravity"-Blueprints, korrigiert identifizierte Risiken und ergänzt fehlende Architektur-Elemente für ein skalierbares Multiplayer-Spiel.

### Kernprinzipien

- **Browser-first:** Kein Download, kein Install, universeller WebGPU/WebGL2-Support
- **Autoritative Serverarchitektur:** Der Server ist die einzige Quelle der Wahrheit
- **Skalierbar von Tag 1:** Zone/Room-Architektur, die von 10 auf 10.000+ CCU wachsen kann
- **Isomorpher TypeScript-Stack:** Geteilte Typen und Logik zwischen Client und Server
- **Zero-Allocation Game Loop:** Keine GC-Spikes im Hot Path

---

## 2. Namensvorschläge (Ersatz für "Antigravity")

Der Name "Antigravity" ist seit November 2025 durch Googles AI-IDE (antigravity.google) besetzt und daher unbrauchbar.

### Physik-inspiriert

- **Massless** – kurz, markant, physikalisch (masselose Teilchen), Domain-freundlich
- **Nullforce** – kein Kraftfeld, technisch klar
- **Driftzone** – Schweben/Treiben im Raum
- **Voidpull** – Anziehung im Nichts, mysteriös

### Weltraum / Sci-Fi

- **Orbital Decay** – physikalisch realer Begriff, dramatisch
- **Phase Shift** – Phasenverschiebung, Sci-Fi-Mechanik
- **Liftoff Protocol** – "Schwerkraft überwinden"-Thema

### Abstrakt / Gaming-tauglich

- **Ascendant** – aufsteigend, episch
- **Ether Drift** – ätherisch + Bewegung
- **Unbound** – "nicht gebunden" an Schwerkraft/Regeln
- **Inverse** – minimalistisch, suggeriert umgekehrte Regeln

> **Empfehlung:** "Massless" oder "Phase Shift" – kurz, technisch korrekt, nicht von Big Tech besetzt, als Domain und Marke brauchbar.

---

## 3. Tech Stack (Finaler Stand)

| Ebene | Technologie | Begründung |
|-------|-------------|------------|
| **Rendering** | Babylon.js 8 (WebGPU + WebGL2 Fallback) | Stärkste WebGPU-Engine, Havok integriert, Microsoft-backed |
| **Physik** | Havok (via @babylonjs/havok WASM) | Industrie-Standard, deterministisch, WASM-Performance |
| **ECS** | BitECS | Structure-of-Arrays, Zero-Allocation, TypedArrays |
| **UI Framework** | SolidJS | Feingranulare Reaktivität ohne Virtual DOM |
| **Netzwerk** | Colyseus | Room-basiert, automatische State-Sync, Matchmaking, 10k+ CCU |
| **Runtime** | Bun (Monorepo mit Workspaces) | Schneller als Node.js, native TS-Unterstützung |
| **DB (Persistence)** | PostgreSQL + Drizzle ORM | Battle-tested, TypeScript-typsicher |
| **DB (Echtzeit)** | Redis | Session-State, Matchmaking-Queues, Pub/Sub |
| **Bundler** | Vite | HMR, ESM-native |
| **Deployment** | Browser-first, optional Tauri v2 | Universell |
| **Infrastruktur** | Docker Compose (Dev), Kubernetes (Prod) | Standardisiert, skalierbar |

### Stack-Änderungen gegenüber Original-Blueprint

| Original | Neu | Grund |
|----------|-----|-------|
| Tauri v2 (primär) | Browser-first | WebGPU-Support in System-WebViews plattformabhängig |
| Geckos.io (UDP/WebRTC) | Colyseus (WebSocket + Binary Sync) | Geringe Aktivität, unklare Bun-Kompatibilität |
| Gel/EdgeDB | PostgreSQL + Drizzle + Redis | Gel ist Nische, PostgreSQL ist Industrie-Standard |

### Zukunftssichere Upgrade-Pfade

| Aktuell | Zukünftig (2027+) | Trigger |
|---------|-------------------|---------|
| WebSocket (Colyseus) | WebTransport (QUIC/UDP) | Browser-Support >90% |
| Browser-only | Tauri v2 Desktop-Wrapper | WebGPU in WebKitGTK stabil |
| Single-Server Colyseus | Multi-Server mit Redis Pub/Sub | CCU >5.000 |

---

## 4. Monorepo-Architektur

```
project-root/
├── package.json              # Bun Workspace Root
├── bun.lockb
├── tsconfig.base.json
├── docker-compose.yml        # PostgreSQL + Redis
├── apps/
│   ├── client/               # Browser-Client
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── engine/       # Babylon.js Setup, WebGPU Init
│   │   │   ├── ecs/          # Client-Systeme
│   │   │   ├── network/      # Colyseus Client
│   │   │   └── ui/           # SolidJS Komponenten
│   └── server/               # Autoritativer Game Server
│       └── src/
│           ├── main.ts
│           ├── rooms/        # Colyseus Room Definitionen
│           ├── ecs/          # Server-Systeme
│           ├── db/           # Drizzle Schema
│           └── services/     # Auth, Matchmaking
├── packages/
│   └── shared/               # Geteilte Typen und Logik
│       └── src/
│           ├── ecs/          # BitECS Komponentendefinitionen
│           ├── network/      # Nachrichtentypen
│           ├── constants/    # Tick-Rates, Physics-Constants
│           └── types/        # DB-Typen, Game-Typen
└── scripts/
    ├── setup.sh
    ├── db-migrate.sh
    └── copy-wasm.sh
```

**Abhängigkeitsregel:** Client und Server referenzieren `@project/shared: workspace:*`. Identische Versionen für kritische Pakete (bitecs, Babylon.js-Typen) werden erzwungen.

---

## 5. Rendering & Physik: Babylon.js + Havok

WebGPU wird priorisiert mit automatischem WebGL2 Fallback. Havok WASM wird über ein `locateFile`-Hook aus dem public/-Verzeichnis geladen. Kritische Konfiguration: `@babylonjs/havok` muss in `vite.config.ts` unter `optimizeDeps.exclude` stehen.

---

## 6. ECS-Architektur: BitECS

Komponenten werden in `packages/shared` definiert (Single Source of Truth): Transform, Velocity, NetworkIdentity, Health, RigidBody.

**Zero-Allocation Regel:** Im Game Loop NUR `for`-Schleifen. Kein `.map()`, `.forEach()`, `.filter()`, keine Objekt-Allokationen, keine Template-Strings.

| Aspekt | Server | Client |
|--------|--------|--------|
| Physik | Autoritativ (Havok headless) | Vorhersage + Korrektur |
| Tick-Rate | Fest (20Hz) | requestAnimationFrame (60Hz+) |
| Rendering | Nicht vorhanden | Babylon.js Mesh-Sync |

---

## 7. Netzwerk-Architektur: Colyseus

Colyseus bietet automatische State-Synchronisation (delta-komprimiert, binär), Room-Architektur für Zone-Mapping, eingebautes Matchmaking, und Skalierung via Redis. Jede Spielzone ist ein Colyseus Room.

Snapshot-Interpolation zwischen Server-Ticks (20Hz → 60Hz Client-Rendering) sorgt für flüssige Darstellung.

---

## 8. Multiplayer-Architektur: Zonen & Skalierung

Area of Interest (AoI) Filterung: Nur Entities im Sichtradius des Spielers werden synchronisiert.

| Phase | CCU | Architektur |
|-------|-----|-------------|
| **Alpha** (0-500) | <500 | Single Colyseus Server, Docker Compose |
| **Beta** (500-5.000) | 500-5k | Colyseus + Redis, Horizontal Scaling |
| **Launch** (5.000+) | 5k+ | Kubernetes, Auto-Scaling, Load Balancer |

---

## 9. Datenbank-Architektur

**PostgreSQL (Drizzle ORM)** für Persistence: players, inventory_items, leaderboard Tabellen.

**Redis** für flüchtige Daten: Sessions (TTL 30min), Zone-Player-Sets, Matchmaking-Queue, Rate-Limiting, Chat (Pub/Sub).

---

## 10. Client-Architektur: SolidJS + Babylon.js

Entkopplung: Babylon.js Render Loop (60Hz+) operiert unabhängig vom SolidJS Signal-Graph. UI-Updates werden auf 10Hz gedrosselt über einen Pull-Mechanismus.

---

## 11. Sicherheit & Anti-Cheat

- **Input-Validierung:** Client sendet nur Absichten, nie Positionen oder Damage-Werte
- **Server-seitige Physik:** Havok headless auf Server
- **Rate-Limiting:** Max 60 Inputs/Sekunde pro Client
- **JWT-Authentifizierung:** Login → Token → Colyseus Room Join mit Token

---

## 12. Entwicklungs-Roadmap

### Phase 1: Foundation (Wochen 1-4)

- [ ] Monorepo aufsetzen (Bun Workspaces)
- [ ] Docker Compose (PostgreSQL + Redis)
- [ ] Babylon.js + Havok WASM im Browser lauffähig
- [ ] BitECS World mit Basis-Komponenten
- [ ] Colyseus Server mit Test-Room
- [ ] "Hello World": Würfel fällt unter Schwerkraft

### Phase 2: Multiplayer Core (Wochen 5-8)

- [ ] Colyseus State-Sync ↔ BitECS
- [ ] Mehrere Clients sehen sich gegenseitig
- [ ] Input-System + Snapshot-Interpolation
- [ ] Basis-UI mit SolidJS

### Phase 3: Persistence & Auth (Wochen 9-12)

- [ ] PostgreSQL Schema (Drizzle)
- [ ] JWT-Authentifizierung
- [ ] Spieler-Persistenz + Inventar-System
- [ ] Zone-Wechsel (Room → Room Transfer)

### Phase 4: Gameplay & Polish (Wochen 13+)

- [ ] Mehrere Zonen mit Terrain
- [ ] Combat-System + NPC/AI
- [ ] Leaderboard + Sound
- [ ] Mobile-Optimierung

---

## 13. Referenzen

- [Babylon.js 8 Docs](https://doc.babylonjs.com)
- [BitECS GitHub](https://github.com/NateTheGreatt/bitECS)
- [Colyseus Docs](https://docs.colyseus.io)
- [Drizzle ORM](https://orm.drizzle.team)
- [SolidJS](https://www.solidjs.com)
- [Bun Workspaces](https://bun.com/docs/pm/workspaces)
