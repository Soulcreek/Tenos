# ADR-004: Networking Protocol

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** Network message design for Massless MMORPG

---

## Context

Massless uses Colyseus for networking. We need to define how game state synchronizes between server and clients, what messages are exchanged, and how to minimize bandwidth while maintaining responsive gameplay.

## Decision

**Use a hybrid approach: Colyseus Schema for state synchronization + custom binary messages for high-frequency events.**

### State Synchronization Strategy

#### Colyseus Schema (Automatic Delta Sync)
Used for: Entity state that changes frequently and must be consistent across clients.

- Player positions, rotations
- Health/mana values
- Active status effects (flags)
- Equipment visible on character
- Monster positions and states
- Metin Stone health

Delta-compressed automatically by Colyseus. Sent at server tick rate (20Hz).

#### Custom Messages (colyseus `room.send()` / `room.broadcast()`)
Used for: Events, one-time actions, UI updates.

| Message | Direction | Content |
|---------|-----------|---------|
| `input` | Client → Server | Movement vector, action flags |
| `skill_use` | Client → Server | Skill ID, target entity, target position |
| `interact` | Client → Server | NPC/object entity ID |
| `damage` | Server → Client | Source, target, amount, type, crit flag |
| `skill_effect` | Server → Client | Skill ID, caster, targets, positions |
| `entity_spawn` | Server → Client | Entity type, ID, position, initial state |
| `entity_despawn` | Server → Client | Entity ID |
| `chat` | Bidirectional | Channel, sender, message |
| `loot_drop` | Server → Client | Item ID, position, owner |
| `level_up` | Server → Client | Entity ID, new level |
| `quest_update` | Server → Client | Quest ID, progress, state |
| `zone_transfer` | Server → Client | Target zone, spawn position, room ID |

### Input Protocol

Client sends input at 60Hz (every frame), server processes at 20Hz.

```typescript
// Client → Server (every frame, only if changed)
interface InputMessage {
  seq: number;      // Sequence number for reconciliation
  dx: number;       // Movement X (-1 to 1), quantized to int8
  dy: number;       // Movement Y (-1 to 1), quantized to int8
  angle: number;    // Facing angle, quantized to uint16
  actions: number;  // Bitfield: attack, skill1-8, interact, jump
}
```

Input is packed as binary (6 bytes per message) for minimal bandwidth.

### Client Prediction & Reconciliation

1. Client applies input locally immediately (prediction)
2. Client stores input buffer with sequence numbers
3. Server processes input, broadcasts authoritative state
4. Client receives server state with last-processed sequence number
5. Client replays unprocessed inputs on top of server state
6. If difference is small (<threshold), lerp to correct position
7. If difference is large, snap to server position (anti-cheat trigger)

### Area of Interest (AoI)

Each player has an AoI radius:
- Default: 50 units (visual range)
- Extended: 100 units (audio/event range)

Only entities within AoI are synchronized to the client. Server maintains spatial hash grid for efficient AoI queries.

```
AoI update frequency:
- Entities within 25 units: Every tick (20Hz)
- Entities 25-50 units: Every 2nd tick (10Hz)
- Entities 50-100 units: Every 5th tick (4Hz)
- Entities beyond 100 units: Not synchronized
```

### Bandwidth Budget

| Component | Per-Player Bandwidth | Notes |
|-----------|---------------------|-------|
| Input (up) | ~3.6 KB/s | 60 msgs/s × 6 bytes |
| State sync (down) | ~8-15 KB/s | Depends on nearby entities |
| Events (down) | ~1-3 KB/s | Combat events, chat |
| **Total per player** | **~15-22 KB/s** | Well within WebSocket limits |

### Zone Transfer Protocol

When a player moves to a new zone:

1. Client approaches zone boundary (client shows transition effect)
2. Server detects boundary crossing
3. Server saves player state to PostgreSQL
4. Server sends `zone_transfer` message with new room info
5. Client disconnects from current room
6. Client connects to new room (possibly different server node)
7. New room loads player state from PostgreSQL
8. Client receives initial state sync
9. Gameplay resumes

Target: < 500ms total transfer time.

## Alternatives Considered

### Pure Custom Binary Protocol
- Pro: Maximum control, minimal overhead
- Con: Lose Colyseus delta sync, have to reimplement state management
- **Rejected**: Colyseus Schema provides too much value to abandon

### WebRTC Data Channels
- Pro: True UDP for lower latency
- Con: Complex setup, NAT traversal issues, limited browser support for data channels in gaming contexts
- **Deferred**: WebTransport (QUIC) is a better future upgrade path than WebRTC

### GraphQL Subscriptions
- Pro: Type-safe, flexible queries
- Con: Far too slow for game state, massive overhead
- **Rejected**: Wrong tool for real-time game networking

## Consequences

- Colyseus Schema definitions must mirror ECS components for synced state
- Input serialization needs careful binary packing for efficiency
- Client prediction code must handle reconciliation gracefully
- Zone transfer is the most complex network operation — needs thorough testing
- Rate limiting must be per-message-type (e.g., chat has different limits than input)
- Anti-cheat: server must validate that input rates don't exceed limits
