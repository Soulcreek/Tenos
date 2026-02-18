# Tenos Admin Center

Production-ready web-based administration panel for managing the Tenos MMORPG. Provides full control over players, characters, servers, game configuration, and bulk operations through the **Kombify Tools** system.

## Architecture

```
admin-center/
├── server/          # Hono API server (Bun runtime)
│   └── src/
│       ├── main.ts            # Server entry point
│       ├── routes/            # API route modules
│       │   ├── auth.ts        # Authentication (login, refresh, logout)
│       │   ├── dashboard.ts   # Dashboard statistics
│       │   ├── players.ts     # Account management (CRUD, ban/unban)
│       │   ├── characters.ts  # Character management (edit, teleport, items)
│       │   ├── servers.ts     # Server management (start/stop/restart)
│       │   ├── config.ts      # Game configuration editor
│       │   ├── logs.ts        # Audit logs & announcements
│       │   └── tools.ts       # Kombify Tools engine (16 admin tools)
│       ├── middleware/        # Auth JWT & request logging
│       ├── services/          # Audit logging service
│       └── db/                # Drizzle ORM schemas & seed data
│           └── schemas/       # accounts, characters, servers, admin
└── client/          # SolidJS SPA
    └── src/
        ├── App.tsx            # Router & auth guard
        ├── lib/api.ts         # API client with auto-refresh
        ├── stores/auth.ts     # Auth state management
        ├── components/layout/ # Sidebar & header layout
        └── pages/             # All page components
            ├── Dashboard.tsx   # Real-time stats & charts
            ├── Players.tsx     # Player list with search/filter
            ├── PlayerDetail.tsx # Account detail, ban/unban
            ├── Characters.tsx  # Character list with filters
            ├── CharacterDetail.tsx # Stats, inventory, teleport
            ├── Servers.tsx     # Server status & controls
            ├── Tools.tsx       # Kombify Tools runner
            ├── Config.tsx      # Game configuration editor
            └── Logs.tsx        # Audit logs & announcements
```

## Features

### Dashboard
- Real-time player count, server status, economy metrics
- Kingdom and class distribution charts
- Level distribution visualization
- Recent admin activity feed

### Player Management
- Search and filter accounts by role, ban status
- View account details with characters, ban history, login history
- Ban/unban accounts (temporary/permanent)
- Role management (player/gm/admin)

### Character Management
- Search by name, filter by class/kingdom/level/zone/online status
- Edit character stats, level, gold
- Teleport characters between zones
- Grant/remove inventory items
- Reset stat point allocations

### Server Management
- Monitor all game servers with CPU/memory/player metrics
- Start, stop, restart servers
- Toggle maintenance mode
- Zone-level player and monster counts

### Kombify Tools (16 Admin Tools)
- **Player Management**: Mass ban, mass unban, broadcast message
- **Character Management**: Mass level set, mass teleport, grant items to all
- **Economy**: Gold adjustment, economy reset
- **Server Operations**: Kick all players, schedule maintenance
- **World Management**: Spawn world boss, clear zone monsters
- **Bulk Operations**: Database cleanup, export player data
- **Maintenance**: Reset daily counters
- **Analytics**: Generate reports (activity, economy, class balance, kingdom comparison)

### Game Configuration
- Edit game parameters grouped by category (gameplay, combat, economy, server, upgrade, event)
- Boolean toggle switches, numeric inputs, string/JSON editors
- Bulk save with change tracking
- Read-only protection for critical settings

### Audit Logs & Announcements
- Full audit trail of all admin actions
- Filter by action type, actor, target, date range
- Create and manage server announcements
- Schedule future announcements

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) v1.1+
- Docker & Docker Compose (for PostgreSQL & Redis)

### Setup

```bash
# 1. Start database services
docker compose up -d

# 2. Install dependencies
bun install

# 3. Copy environment file
cp apps/admin-center/server/.env.example apps/admin-center/server/.env

# 4. Run database migrations
bun run db:generate
bun run db:migrate

# 5. Seed the database with sample data
bun run db:seed

# 6. Start development servers
bun run admin:dev
```

The admin center will be available at `http://localhost:5173`.

### Default Credentials
- **Admin**: `admin` / `admin123`
- **Game Master**: `gamemaster` / `gm123`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Runtime | Bun |
| API Framework | Hono |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 |
| Auth | JWT (jose) + Argon2id |
| Frontend | SolidJS |
| Routing | @solidjs/router |
| Bundler | Vite |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | - | Authenticate |
| POST | /api/auth/refresh | - | Refresh token |
| POST | /api/auth/logout | JWT | Logout |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/dashboard/* | JWT | Dashboard data |
| GET/PATCH | /api/players/* | JWT+Role | Account management |
| GET/PATCH/POST | /api/characters/* | JWT+Role | Character management |
| GET/POST | /api/servers/* | JWT+Role | Server management |
| GET/PATCH/POST | /api/config/* | JWT+Role | Game configuration |
| GET/POST/DELETE | /api/logs/* | JWT+Role | Audit logs & announcements |
| GET/POST | /api/tools/* | JWT+Role | Kombify Tools |

## Security

- JWT authentication with 4-hour access tokens and 7-day refresh tokens
- Role-based access control: player < gm < admin
- Argon2id password hashing
- Full audit trail of all admin actions
- CORS protection
- Request rate limiting (configurable)
- Input validation with Zod on all endpoints
