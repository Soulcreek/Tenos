# Massless — Deployment Architecture

> **Version:** 1.0
> **Date:** 2026-02-17

---

## Overview

Massless is deployed on custom infrastructure (not cloud-managed) using Docker Compose for all environments. The deployment strategy prioritizes simplicity for early development with a clear upgrade path to Kubernetes for scale.

## Environment Matrix

| Environment | Purpose | Trigger | URL Pattern |
|-------------|---------|---------|-------------|
| **Development** | Local dev + testing | `bun run dev` | `localhost:3000` / `localhost:2567` |
| **Staging** | Pre-production testing | Merge to `develop` | `staging.massless.game` |
| **Production** | Live game | Merge to `main` | `play.massless.game` |

## Service Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Reverse Proxy (Caddy)                │
│            TLS termination, HTTP/2, WS              │
│      play.massless.game → game-server:2567          │
│      api.massless.game → game-server:3000           │
│      cdn.massless.game → static file server         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Game Server   │  │PostgreSQL│  │    Redis      │  │
│  │ (Bun)         │  │   16     │  │    7.x        │  │
│  │               │  │          │  │               │  │
│  │ - Colyseus    │  │ - Game   │  │ - Sessions    │  │
│  │ - REST API    │  │   data   │  │ - Pub/Sub     │  │
│  │ - ECS World   │  │ - Logs   │  │ - Cache       │  │
│  │ - Havok WASM  │  │          │  │ - Leaderboard │  │
│  └──────┬───────┘  └─────┬────┘  └──────┬───────┘  │
│         │                │               │           │
│         └────────────────┼───────────────┘           │
│                     Docker Network                    │
└─────────────────────────────────────────────────────┘
```

## Docker Compose

### Development (`docker-compose.yml`)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: massless_dev
      POSTGRES_USER: massless
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

Game server and client run directly via `bun run dev` for hot-reload.

### Production (`docker-compose.prod.yml`)

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - game-server

  game-server:
    build:
      context: .
      dockerfile: Dockerfile
      target: server
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  game-client:
    build:
      context: .
      dockerfile: Dockerfile
      target: client
    # Static files served by Caddy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: massless
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    # No external port exposure in production

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
  caddy_data:
```

## Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
RUN bun install --frozen-lockfile

# Stage 2: Build shared + server
FROM deps AS server-build
COPY . .
RUN bun run build:shared && bun run build:server

# Stage 3: Build client
FROM deps AS client-build
COPY . .
RUN bun run build:client

# Stage 4: Server runtime
FROM oven/bun:1-slim AS server
WORKDIR /app
COPY --from=server-build /app/apps/server/dist ./dist
COPY --from=server-build /app/node_modules ./node_modules
COPY --from=server-build /app/packages/shared/dist ./packages/shared/dist
EXPOSE 2567 3000
CMD ["bun", "run", "dist/main.js"]

# Stage 5: Client static files
FROM nginx:alpine AS client
COPY --from=client-build /app/apps/client/dist /usr/share/nginx/html
```

## Secrets Management

All secrets managed via Doppler:

| Secret | Environment | Purpose |
|--------|-------------|---------|
| `DATABASE_URL` | All | PostgreSQL connection string |
| `REDIS_URL` | All | Redis connection string |
| `REDIS_PASSWORD` | Staging/Prod | Redis auth |
| `JWT_PRIVATE_KEY` | All | RS256 JWT signing |
| `JWT_PUBLIC_KEY` | All | RS256 JWT verification |
| `DOPPLER_TOKEN` | CI/CD | Doppler API access |

**Usage in deployment:**
```bash
# Pull secrets and inject into docker-compose
doppler run -- docker compose -f docker-compose.prod.yml up -d
```

## SSL/TLS

Caddy handles automatic TLS via Let's Encrypt:

```
# Caddyfile
play.massless.game {
    reverse_proxy game-client:80
}

api.massless.game {
    reverse_proxy game-server:3000
}

ws.massless.game {
    reverse_proxy game-server:2567
}
```

## Domain Setup

| Domain | Purpose |
|--------|---------|
| `massless.game` | Landing page |
| `play.massless.game` | Game client |
| `api.massless.game` | REST API |
| `ws.massless.game` | WebSocket (Colyseus) |
| `staging.massless.game` | Staging environment |

## Deployment Process

### Staging (Automatic)

```
1. PR merged to `develop`
2. GitHub Actions CI runs (lint, test, build)
3. Docker images built and tagged with commit SHA
4. SSH to staging server
5. Pull new images
6. docker compose down && docker compose up -d
7. Run database migrations
8. Smoke test (automated health check)
9. Notify on success/failure
```

### Production (Semi-Automatic)

```
1. PR from `develop` to `main` created
2. Full test suite runs
3. Manual approval required
4. On merge: production deployment begins
5. Build production Docker images
6. Tag with version number
7. Rolling update:
   a. Start new containers
   b. Health check passes
   c. Drain old containers (finish active connections)
   d. Stop old containers
8. Run database migrations (backward-compatible only)
9. Post-deploy health check
10. Notify team
```

### Zero-Downtime Strategy

For WebSocket-based games, true zero-downtime is challenging. Strategy:

1. **Planned maintenance window**: Announce 5 minutes before
2. **Graceful shutdown**: Stop accepting new connections, let existing games finish
3. **State persistence**: All player state saved to PostgreSQL before shutdown
4. **Quick restart**: New containers start, players reconnect
5. **Target downtime**: <30 seconds for production updates

## Backup Strategy

### PostgreSQL
- **Continuous**: WAL archiving enabled
- **Daily**: `pg_dump` full backup at 04:00 UTC
- **Retention**: 30 days of daily backups
- **Storage**: Compressed, stored on separate volume
- **Recovery test**: Monthly restore test to verify backup integrity

### Redis
- **RDB snapshots**: Every 15 minutes
- **AOF**: Append-only file for sub-second recovery
- **Note**: Redis data is ephemeral by design — full loss is recoverable

### Backup Script
```bash
#!/bin/bash
# /scripts/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker exec massless-postgres pg_dump -U massless massless | gzip > /backups/massless_${DATE}.sql.gz
# Keep last 30 days
find /backups -name "*.sql.gz" -mtime +30 -delete
```

## Monitoring (Future)

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection (CCU, tick rate, memory) |
| Grafana | Dashboard visualization |
| Loki | Log aggregation |
| Uptime Kuma | Health check monitoring |

### Key Metrics to Track
- CCU per zone
- Server tick rate (target: 20Hz)
- Memory usage per zone room
- Database query latency
- WebSocket message throughput
- Error rate
- Player session duration

## Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url> && cd massless

# 2. Install dependencies
bun install

# 3. Start database services
docker compose up -d postgres redis

# 4. Run migrations
bun run db:migrate

# 5. Start development servers
bun run dev
# → Client: http://localhost:3000
# → Server: http://localhost:2567 (Colyseus)
# → API: http://localhost:3000/api
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "bun run --filter './apps/*' dev",
    "dev:client": "bun run --filter client dev",
    "dev:server": "bun run --filter server dev",
    "build": "bun run build:shared && bun run build:client && bun run build:server",
    "build:shared": "bun run --filter @massless/shared build",
    "build:client": "bun run --filter client build",
    "build:server": "bun run --filter server build",
    "test": "bun run --filter '*' test",
    "test:unit": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . && tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "db:migrate": "bun run --filter server db:migrate",
    "db:seed": "bun run --filter server db:seed",
    "db:studio": "bun run --filter server db:studio"
  }
}
```
