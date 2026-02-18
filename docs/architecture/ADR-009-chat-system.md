# ADR-009: Chat System Architecture

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** In-game chat for Massless MMORPG

---

## Context

MMORPGs require robust chat systems with multiple channels, cross-zone messaging, and moderation tools. Chat is critical for social interaction and community building.

## Decision

**Redis Pub/Sub for cross-zone channels, Colyseus messages for local chat, with server-side filtering and moderation.**

### Chat Channels

| Channel | Scope | Transport | Rate Limit |
|---------|-------|-----------|------------|
| Local | 50-unit radius around player | Colyseus broadcast (filtered by AoI) | 10 msg/10s |
| Zone | All players in current zone | Colyseus room broadcast | 5 msg/10s |
| Kingdom | All players of same kingdom | Redis Pub/Sub `kingdom:{id}` | 3 msg/10s |
| Global | All online players | Redis Pub/Sub `global` | 1 msg/10s |
| Whisper | Direct player-to-player | Redis Pub/Sub `player:{id}` | 10 msg/10s |
| Party | Party members only | Redis Pub/Sub `party:{id}` | 20 msg/10s |
| Guild | Guild members only | Redis Pub/Sub `guild:{id}` | 10 msg/10s |
| Trade | Trade channel, zone-wide | Colyseus room broadcast | 1 msg/30s |
| System | Server announcements | Redis Pub/Sub `system` | Server only |

### Message Format

```typescript
interface ChatMessage {
  channel: ChatChannel;
  sender: {
    id: string;
    name: string;
    kingdom: number;
    guildTag?: string;
    role: 'player' | 'gm' | 'admin';
  };
  content: string;        // Max 200 characters
  timestamp: number;
  targetName?: string;     // For whisper
}
```

### Moderation

| Feature | Implementation |
|---------|---------------|
| Profanity filter | Server-side word list + pattern matching |
| Spam detection | Rate limiting + repeated message detection |
| Mute player | Redis set `muted:{playerId}`, respected by all channels |
| Block player | Per-player block list (PostgreSQL), client-side filtering |
| GM commands | `/mute {player} {duration}`, `/ban {player}`, `/announce {message}` |
| Chat logs | Last 1 hour in Redis, important events to PostgreSQL |

### Implementation

- Chat processing is a Colyseus room message handler + Redis subscriber
- Messages validated and filtered server-side before broadcast
- Client stores last 100 messages per channel in memory
- Scroll-back history: fetch from Redis (last 1 hour) on request

## Consequences

- Redis Pub/Sub adds dependency for cross-zone chat
- Need profanity word list (can use open-source lists, localized for target markets)
- Chat UI in SolidJS needs tab-based channel switching
- GM tools need chat monitoring dashboard (future)
- Chat is a potential vector for XSS — all messages must be sanitized server-side
