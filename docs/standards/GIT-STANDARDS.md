# Massless — Git Standards

> **Version:** 1.0
> **Date:** 2026-02-17

---

## Branch Strategy

```
main ──────────────────────────────────── Production (deployed)
  │
  └── develop ────────────────────────── Integration branch
        │
        ├── feature/TASK-001-movement ── Feature branches
        ├── feature/TASK-015-combat
        ├── fix/TASK-042-hp-regen-bug
        ├── chore/update-dependencies
        └── docs/architecture-update
```

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/TASK-{id}-{short-description}` | `feature/TASK-001-basic-movement` |
| Bug fix | `fix/TASK-{id}-{short-description}` | `fix/TASK-042-hp-regen-overflow` |
| Chore | `chore/{description}` | `chore/update-babylonjs-8.1` |
| Docs | `docs/{description}` | `docs/combat-system-spec` |
| Hotfix | `hotfix/{description}` | `hotfix/critical-dupe-bug` |

### Branch Lifecycle

1. Create branch from `develop`
2. Develop and commit with conventional commits
3. Push branch, create PR
4. Code review (automated + manual)
5. CI passes (lint, test, build)
6. Merge to `develop` (squash merge for feature branches)
7. Delete feature branch after merge

### Protected Branches
- `main`: Requires PR, CI pass, and manual approval
- `develop`: Requires PR and CI pass

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to Use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvement |
| `chore` | Build, CI, dependency updates |
| `style` | Code formatting (no logic change) |

### Scopes

| Scope | Area |
|-------|------|
| `movement` | Player/entity movement |
| `combat` | Combat system |
| `ecs` | ECS components/systems |
| `network` | Colyseus, networking |
| `ui` | SolidJS UI components |
| `render` | Babylon.js rendering |
| `db` | Database, Drizzle schemas |
| `auth` | Authentication |
| `quest` | Quest system |
| `guild` | Guild system |
| `chat` | Chat system |
| `terrain` | Terrain/world |
| `ai` | Monster AI |
| `inventory` | Inventory/equipment |
| `shared` | Shared package |

### Examples

```bash
feat(movement): implement WASD movement with client prediction

- Add InputSystem for keyboard capture
- Add MovementSystem with server reconciliation
- Add PredictionSystem for client-side smoothing
- Tests: 12 unit tests, 2 integration tests

Refs: TASK-001

fix(combat): prevent negative HP from overkill damage

Health.current could go negative when damage exceeded remaining HP,
causing issues with death detection.

Clamp Health.current to minimum 0 in DamageSystem.

Refs: TASK-042

test(shared): add unit tests for XP curve calculation

- Cover levels 1-120
- Edge cases: level 0, max level, negative XP
- Verify monotonic increase

Refs: TASK-008

chore: update Babylon.js to 8.1.0

- No breaking changes
- Performance improvements for WebGPU instancing
- Updated import paths where needed
```

## Pull Request Template

```markdown
## Summary
<!-- 1-3 sentences describing the change -->

## Changes
- [ ] List of specific changes made

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Screenshots
<!-- If UI changes, add before/after screenshots -->

## Checklist
- [ ] Code follows project coding standards
- [ ] No TypeScript errors (`bun run typecheck`)
- [ ] No lint errors (`bun run lint`)
- [ ] Tests pass (`bun run test`)
- [ ] No `any` types introduced
- [ ] Zero-allocation rule followed in ECS systems
- [ ] Documentation updated if needed

## Related
- Task: TASK-XXX
- Depends on: #PR_NUMBER (if any)
```

## Code Review Checklist

When reviewing PRs, verify:

### Correctness
- [ ] Logic is correct and handles edge cases
- [ ] No off-by-one errors
- [ ] Async operations handled properly
- [ ] Error cases handled

### Security
- [ ] No user input passed to dangerous operations unsanitized
- [ ] No secrets in code
- [ ] Server-authoritative: client doesn't control game state
- [ ] Rate limiting in place for new endpoints/messages

### Performance
- [ ] Zero-allocation rule followed in game loop
- [ ] No unnecessary database queries
- [ ] No N+1 query patterns
- [ ] Appropriate use of caching

### Style
- [ ] Naming follows conventions
- [ ] No commented-out code
- [ ] No unnecessary complexity
- [ ] Code is self-documenting (clear names, minimal comments needed)

## Versioning

Follow [Semantic Versioning](https://semver.org/) for releases:

- **0.x.y**: Pre-release / development (current phase)
- **1.0.0**: First public playable release
- Version bumps:
  - Patch (0.0.x): Bug fixes
  - Minor (0.x.0): New features
  - Major (x.0.0): Breaking changes

## Release Tags

```bash
git tag -a v0.1.0 -m "Milestone 1: Walking Skeleton"
git push origin v0.1.0
```
