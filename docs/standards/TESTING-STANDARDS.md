# Massless — Testing Standards

> **Version:** 1.0
> **Date:** 2026-02-17

---

## Testing Strategy

### Test Pyramid

```
         /  E2E Tests  \         ← Few, slow, high confidence
        / Integration    \       ← Moderate count
       / Unit Tests        \     ← Many, fast, focused
      ──────────────────────
```

### Tools

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | Game logic, ECS systems, formulas, utilities |
| Integration | Vitest + Colyseus test helpers | Room lifecycle, DB operations |
| E2E | Playwright | Client-side game flows in real browser |
| Load | k6 | WebSocket load testing, CCU simulation |
| Visual | Playwright screenshot comparison | UI regression detection |

## Unit Tests

### What to Unit Test
- All damage/combat formulas
- XP curve calculations
- Skill cooldown logic
- Inventory operations (add, remove, swap, stack)
- Equipment validation (can this class equip this item?)
- Input validation functions
- Pathfinding algorithm
- Stat calculation (base + equipment + buffs)
- Serialization/deserialization of network messages

### File Location
Tests are co-located with source files:
```
src/
  combat/
    damageCalculation.ts
    damageCalculation.test.ts
  ecs/
    systems/
      MovementSystem.ts
      MovementSystem.test.ts
```

### Test Naming
```typescript
describe('calculateDamage', () => {
  it('should apply base weapon damage plus stat bonus', () => { ... });
  it('should not deal negative damage', () => { ... });
  it('should apply critical multiplier when crit flag is set', () => { ... });
  it('should reduce damage by defense value', () => { ... });
  it('should apply PvP damage reduction in PvP context', () => { ... });
});
```

Pattern: `should [expected behavior] when [condition]`

### Test Data
```typescript
// Use factory functions for test data
function createTestCharacter(overrides: Partial<CharacterData> = {}): CharacterData {
  return {
    level: 10,
    classId: CharacterClass.Warrior,
    stats: { str: 30, dex: 10, int: 5, vit: 15 },
    equipment: createTestEquipment(),
    ...overrides,
  };
}
```

## Integration Tests

### What to Integration Test
- Colyseus room creation, join, leave, dispose lifecycle
- Player → Room → ECS entity creation pipeline
- Zone transfer: save state → load in new room
- Database operations: character CRUD with Drizzle
- Authentication flow: register → login → JWT → room join
- Chat message routing across channels
- Party formation and XP sharing
- Trade execution (both inventories update atomically)

### Database Tests
Use a dedicated test database (Docker container via `docker-compose.test.yml`):
```typescript
beforeAll(async () => {
  await db.migrate();
  await db.seed(); // Minimal test data
});

afterEach(async () => {
  await db.truncateAll(); // Clean between tests
});
```

### Colyseus Room Tests
```typescript
import { ColyseusTestServer } from '@colyseus/testing';

describe('ZoneRoom', () => {
  let server: ColyseusTestServer;

  beforeAll(async () => {
    server = new ColyseusTestServer(gameServer);
  });

  afterAll(async () => {
    await server.shutdown();
  });

  it('should create player entity when client joins', async () => {
    const client = await server.connectTo('zone', { token: validJWT });
    // Assert player entity created in room state
    await client.waitForMessage('initial_state');
    expect(client.state.players.size).toBe(1);
  });
});
```

## E2E Tests (Playwright)

### What to E2E Test
- Login flow: enter credentials → character select → enter world
- Basic movement: WASD input → character moves on screen
- Combat: target monster → auto-attack → monster HP decreases
- Inventory: pick up item → appears in inventory → equip
- Chat: type message → appears in chat window
- Zone transition: walk to boundary → loading → new zone

### Canvas Testing Strategy
Since the game renders to a WebGPU/WebGL canvas:
- Use Playwright's `page.evaluate()` to query game state
- Expose test hooks: `window.__MASSLESS_TEST__.getPlayerPosition()`
- Screenshot comparison for visual regression
- Avoid pixel-perfect assertions — use game state assertions instead

```typescript
test('player moves when WASD is pressed', async ({ page }) => {
  await page.goto('/');
  await loginFlow(page);

  const posBefore = await page.evaluate(() =>
    window.__MASSLESS_TEST__.getPlayerPosition()
  );

  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');

  const posAfter = await page.evaluate(() =>
    window.__MASSLESS_TEST__.getPlayerPosition()
  );

  expect(posAfter.z).not.toBe(posBefore.z); // Moved forward
});
```

## Load Tests (k6)

### What to Load Test
- WebSocket connection capacity (target: 500 CCU per server)
- State sync bandwidth under load
- Zone transfer under load
- Chat message throughput
- Combat with many simultaneous players

### k6 Script Example
```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp to 100
    { duration: '60s', target: 100 },  // Hold
    { duration: '30s', target: 500 },  // Ramp to 500
    { duration: '60s', target: 500 },  // Hold
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

export default function () {
  const url = 'ws://localhost:2567/zone';
  ws.connect(url, {}, function (socket) {
    socket.on('message', (data) => { /* handle state sync */ });
    // Simulate player input at 20Hz
    socket.setInterval(() => {
      socket.send(JSON.stringify({ type: 'input', dx: 1, dy: 0 }));
    }, 50);
  });
}
```

## Coverage Targets

| Package | Target | Rationale |
|---------|--------|-----------|
| `@massless/shared` | 80%+ | Core game logic, formulas, types — highest value |
| `apps/server/src/ecs` | 70%+ | ECS systems contain game logic |
| `apps/server/src/rooms` | 60%+ | Room handlers, harder to unit test |
| `apps/server/src/db` | 60%+ | Database operations |
| `apps/client/src/ecs` | 50%+ | Client systems, some visual-only |
| `apps/client/src/ui` | 40%+ | SolidJS components, test critical interactions |

## Test-First Development Workflow

1. Read the task specification and acceptance criteria
2. Write test cases that verify each acceptance criterion
3. Run tests — confirm they fail (red)
4. Implement the feature
5. Run tests — confirm they pass (green)
6. Refactor if needed — tests still pass
7. Commit with test and implementation together

## Running Tests

```bash
bun run test              # All tests
bun run test:unit         # Unit tests only
bun run test:integration  # Integration tests only
bun run test:e2e          # E2E tests (requires running server)
bun run test:watch        # Watch mode
bun run test:coverage     # With coverage report
bun run test:load         # Load tests (requires running server)
```
