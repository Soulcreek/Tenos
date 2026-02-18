import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';
import type { PlayerRole } from '@tenos/shared';

export interface AuthUser {
  id: string;
  username: string;
  role: PlayerRole;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'tenos-admin-dev-secret-change-in-production',
);

export async function signAccessToken(payload: AuthUser): Promise<string> {
  return new jose.SignJWT({ sub: payload.id, username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(JWT_SECRET);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new jose.SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET);
  return payload;
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token);

    if (!payload.sub || !payload.username || !payload.role) {
      throw new HTTPException(401, { message: 'Invalid token payload' });
    }

    c.set('user', {
      id: payload.sub,
      username: payload.username as string,
      role: payload.role as PlayerRole,
    });

    await next();
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
});

export function requireRole(...roles: PlayerRole[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    if (!roles.includes(user.role)) {
      throw new HTTPException(403, {
        message: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
      });
    }
    await next();
  });
}
