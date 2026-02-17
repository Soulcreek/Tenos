# ADR-006: Authentication & Session Management

> **Status:** Accepted
> **Date:** 2026-02-17
> **Context:** How players authenticate and maintain sessions

---

## Context

Players need to register, log in, and maintain authenticated sessions across zone transfers and reconnections. The system must be secure, performant, and support the WebSocket-based Colyseus architecture.

## Decision

**JWT-based authentication with Redis session tracking.**

### Authentication Flow

```
1. Player opens game in browser
2. Login screen: email + password
3. POST /api/auth/login → Server validates credentials
4. Server creates JWT (access token, 15min) + refresh token (7 days)
5. Server stores session in Redis with player metadata
6. Client stores JWT in memory (not localStorage for XSS protection)
7. Client uses JWT to join Colyseus room
8. Colyseus room.onAuth() validates JWT on join
9. On zone transfer: same JWT used to join new room
10. On token expiry: client uses refresh token to get new JWT
11. On refresh token expiry: player must re-login
```

### JWT Payload

```typescript
interface JWTPayload {
  sub: string;        // Account ID (UUID)
  charId: string;     // Active character ID
  kingdom: number;    // Kingdom ID (1-3)
  role: string;       // 'player' | 'gm' | 'admin'
  iat: number;        // Issued at
  exp: number;        // Expiry (15 minutes)
}
```

### Security Measures

| Measure | Implementation |
|---------|---------------|
| Password hashing | Argon2id (via `@node-rs/argon2` or `bun:password`) |
| Rate limiting | Redis: max 5 login attempts per IP per minute |
| JWT signing | RS256 (asymmetric) — private key on auth server only |
| Refresh tokens | Stored in Redis, rotated on each use, revocable |
| CORS | Strict origin whitelist |
| HTTPS | TLS termination at reverse proxy |
| Session invalidation | Delete from Redis → immediate effect |
| Account lockout | After 10 failed attempts: 30-minute lockout |

### Registration Flow

```
1. POST /api/auth/register { email, password, username }
2. Validate email format, password strength (min 8 chars, complexity rules)
3. Check username uniqueness
4. Hash password with Argon2id
5. Create account in PostgreSQL
6. Send verification email (optional, Phase 3+)
7. Return success — player can log in
```

### Character Selection

After login, before joining a game room:
1. GET /api/characters → List player's characters
2. Player selects or creates a character
3. POST /api/characters/select { charId } → Server updates JWT with charId
4. Client joins Colyseus room with character-specific JWT

### Colyseus Integration

```typescript
// Server-side room auth
gameRoom.onAuth((client, options) => {
  const token = options.token;
  const payload = verifyJWT(token); // Throws if invalid

  // Check session exists in Redis
  const session = await redis.get(`session:${payload.sub}`);
  if (!session) throw new Error('Session expired');

  // Return payload — accessible via client.auth in room
  return payload;
});
```

### GM/Admin Authentication

- GM accounts have `role: 'gm'` in JWT
- Admin accounts have `role: 'admin'`
- Role assignment only via direct database modification (no self-service)
- GM commands require role check on every execution
- All GM actions logged to `game_logs` table

## Alternatives Considered

### OAuth2 / Social Login (Google, Discord)
- Pro: Convenience for players, less password management
- Con: Adds third-party dependency, more complex, privacy concerns
- **Deferred**: Can add as optional login method in Phase 3+

### Session Cookies Instead of JWT
- Pro: Automatic browser handling, CSRF protection built-in
- Con: Doesn't work cleanly with WebSocket (Colyseus), harder for cross-zone
- **Rejected**: JWT is more appropriate for WebSocket-based game architecture

### Passwordless / Magic Link
- Pro: No password to steal
- Con: Requires email infrastructure, adds latency to login flow
- **Deferred**: Could offer as alternative login method later

## Consequences

- Need auth API server (can be part of main game server or separate service)
- JWT secret keys must be in Doppler secrets management
- Client must handle token refresh transparently (no gameplay interruption)
- Zone transfers must pass JWT to new room seamlessly
- Account/character data API needs rate limiting separate from game traffic
- Need admin panel for account management (ban, unban, role assignment)
