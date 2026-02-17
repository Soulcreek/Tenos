# Massless — Coding Standards

> **Version:** 1.0
> **Date:** 2026-02-17

---

## TypeScript Configuration

- **Strict mode**: `"strict": true` in all tsconfig files
- **No `any`**: `"noImplicitAny": true` — use `unknown` and type guards instead
- **No unused**: `"noUnusedLocals": true`, `"noUnusedParameters": true`
- **Exact optional**: `"exactOptionalPropertyTypes": true`
- **Target**: `"target": "ESNext"` (Bun runtime)
- **Module**: `"module": "ESNext"`, `"moduleResolution": "bundler"`

## Naming Conventions

### Files

| Type | Convention | Example |
|------|-----------|---------|
| ECS System | `PascalCase` + `System` suffix | `MovementSystem.ts` |
| ECS Component | `PascalCase` | `Health.ts` |
| SolidJS Component | `PascalCase` | `InventoryPanel.tsx` |
| Utility/helper | `camelCase` | `damageCalculation.ts` |
| Constants | `SCREAMING_SNAKE` file, `camelCase` content | `gameConstants.ts` |
| Type definitions | `PascalCase` | `PlayerTypes.ts` |
| Test files | Same name + `.test` | `MovementSystem.test.ts` |
| Colyseus Room | `PascalCase` + `Room` suffix | `ZoneRoom.ts` |
| Drizzle schema | `camelCase` | `characters.ts` |

### Code

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | `camelCase` | `playerHealth` |
| Functions | `camelCase` | `calculateDamage()` |
| Classes | `PascalCase` | `TerrainManager` |
| Interfaces | `PascalCase` (no `I` prefix) | `CombatStats` |
| Types | `PascalCase` | `SkillType` |
| Enums | `PascalCase`, members `PascalCase` | `CharacterClass.Warrior` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_INVENTORY_SLOTS` |
| ECS Component definitions | `PascalCase` | `const Health = defineComponent({...})` |
| Network message types | `snake_case` | `'skill_use'`, `'damage_dealt'` |
| Database columns | `snake_case` | `account_id`, `last_login` |

## Import Ordering

```typescript
// 1. Node/Bun built-ins
import { readFile } from 'fs/promises';

// 2. External dependencies
import { Room } from 'colyseus';
import { defineComponent, Types } from 'bitecs';

// 3. Shared package (@massless/shared)
import { Health, Transform } from '@massless/shared';

// 4. Internal absolute imports
import { ZoneRoom } from '../rooms/ZoneRoom';

// 5. Relative imports
import { validateInput } from './validation';

// 6. Type-only imports (at the end of each group)
import type { PlayerState } from '@massless/shared';
```

Use ESLint `import/order` to enforce this automatically.

## The Zero-Allocation Rule

**In the game loop (ECS systems running at 20Hz server / 60Hz client), follow these rules strictly:**

### Forbidden in Game Loop
```typescript
// ❌ NO array methods that allocate
entities.map(e => ...)
entities.filter(e => ...)
entities.forEach(e => ...)
entities.reduce(...)
[...spread]

// ❌ NO object allocation
const pos = { x: 1, y: 2 }
const result = new SomeClass()
JSON.parse(...)
JSON.stringify(...)

// ❌ NO string operations
`template ${literal}`
string.split(...)
string + string

// ❌ NO closures
const fn = () => { ... }
array.sort((a, b) => ...)
```

### Allowed in Game Loop
```typescript
// ✅ Plain for loops
for (let i = 0; i < entities.length; i++) { ... }

// ✅ Pre-allocated arrays (reuse, don't create)
const tempVec3 = new Float32Array(3); // allocated once, reused

// ✅ Direct component access
Health.current[eid] = newValue;
Transform.x[eid] += velocity;

// ✅ Bitwise operations
const isAlive = (StatusEffects.flags[eid] & FLAG_ALIVE) !== 0;

// ✅ Math operations
const dist = Math.sqrt(dx * dx + dz * dz);
```

### Pre-Allocation Pattern
```typescript
// Allocate buffers outside the system
const _tempPositions = new Float32Array(MAX_ENTITIES * 3);
const _queryResult = new Uint32Array(MAX_ENTITIES);

// System function reuses pre-allocated buffers
function movementSystem(world: World): void {
  const entities = query(world, [Transform, Velocity]);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    Transform.x[eid] += Velocity.vx[eid] * deltaTime;
    Transform.y[eid] += Velocity.vy[eid] * deltaTime;
    Transform.z[eid] += Velocity.vz[eid] * deltaTime;
  }
}
```

## Error Handling

### Server-Side
```typescript
// Use typed error classes for game logic errors
class GameError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'GameError';
  }
}

// Specific errors
class NotFoundError extends GameError { ... }
class InsufficientResourcesError extends GameError { ... }
class CooldownActiveError extends GameError { ... }

// In room handlers: catch and respond gracefully
try {
  processSkillUse(client, message);
} catch (error) {
  if (error instanceof GameError) {
    client.send('error', { code: error.code, message: error.message });
  } else {
    logger.error('Unexpected error in skill processing', { error });
    client.send('error', { code: 'INTERNAL', message: 'Something went wrong' });
  }
}
```

### Client-Side
- Network errors: Reconnection logic with exponential backoff
- Asset loading errors: Fallback to placeholder meshes
- WebGPU unavailable: Automatic WebGL2 fallback

## Logging

Use structured logging with levels:

```typescript
import { logger } from '@massless/shared/logger';

// Levels: debug, info, warn, error
logger.info('Player joined zone', {
  playerId: player.id,
  zone: 'iron_plains',
  level: player.level,
});

logger.error('Failed to save character', {
  characterId: char.id,
  error: err.message,
});
```

- **debug**: Development details, component state dumps
- **info**: Player actions, zone events, system state changes
- **warn**: Recoverable issues, rate limit triggers, suspicious behavior
- **error**: Failures requiring attention, unhandled exceptions

Never log sensitive data (passwords, tokens, full item inventories).

## Comments

- **Don't comment obvious code** — well-named functions and variables are self-documenting
- **Do comment** "why", not "what" — explain non-obvious decisions
- **JSDoc** for public API functions in shared package
- **TODO comments** must include a task ID: `// TODO(TASK-042): implement party loot distribution`
- No commented-out code in committed files

## Formatting (Prettier)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "bracketSpacing": true
}
```

## ESLint

Key rules beyond defaults:
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-unused-vars`: error (with `_` prefix exception)
- `import/order`: enforce import ordering
- `no-console`: warn (use logger instead)
- Custom rule: no allocations in files matching `*System.ts` pattern (future)
