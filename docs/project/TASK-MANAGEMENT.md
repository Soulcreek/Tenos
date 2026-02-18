# Massless — Task Management

> **Version:** 1.0
> **Date:** 2026-02-17

---

## Task Format

Every development task follows this structure:

```markdown
### [TASK-XXX] Title
**Phase:** [MVP/Phase2/Phase3/Phase4]
**Priority:** [P0-Critical/P1-High/P2-Medium/P3-Low]
**Complexity:** [S(1-2h) / M(half-day) / L(1-2 days) / XL(3+ days)]
**Dependencies:** [TASK-IDs]
**Spec:** [Link to spec document]

#### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

#### Test Requirements
- [ ] Unit tests for [specific logic]
- [ ] Integration test for [specific flow]

#### Files to Create/Modify
- `path/to/file.ts` — Description of changes
```

## Priority Levels

| Level | Meaning | Response |
|-------|---------|----------|
| **P0 — Critical** | Blocks all other work, game is broken | Fix immediately |
| **P1 — High** | Required for current milestone | Complete this sprint |
| **P2 — Medium** | Important but not blocking | Schedule for next sprint |
| **P3 — Low** | Nice to have, polish, optimization | Backlog |

## Complexity Estimates

| Size | Scope | Example |
|------|-------|---------|
| **S** | Single function/component, isolated change | Add HP regen formula |
| **M** | Multiple files, one system | Implement skill cooldown system |
| **L** | Cross-cutting feature, multiple systems | Combat system with damage + effects |
| **XL** | Major feature, architecture changes | Zone transfer system end-to-end |

## Workflow

```
Backlog → Ready → In Progress → Review → Testing → Done
```

1. **Backlog**: Task identified but not refined
2. **Ready**: Spec written, acceptance criteria defined, dependencies met
3. **In Progress**: Actively being worked on
4. **Review**: Code complete, awaiting review
5. **Testing**: Review passed, running full test suite
6. **Done**: All criteria met, merged to develop

## Definition of Done

A task is **Done** when:
- [ ] All acceptance criteria are met
- [ ] All required tests written and passing
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Code reviewed (self-review for autonomous dev)
- [ ] Committed with conventional commit message referencing task ID
- [ ] Documentation updated if applicable
- [ ] PR merged to develop
