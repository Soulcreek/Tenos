import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, accountSchemas } from '../db/index.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  authMiddleware,
  type AuthUser,
} from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { loginRateLimit } from '../middleware/rate-limit.js';
import { AuditAction } from '@tenos/shared';

const auth = new Hono();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(32, 'Username must be at most 32 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be at most 128 characters'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIp(c: Parameters<Parameters<typeof auth.post>[1]>[0]): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  );
}

function getUserAgent(c: Parameters<Parameters<typeof auth.post>[1]>[0]): string {
  return c.req.header('user-agent')?.slice(0, 512) ?? '';
}

async function recordLoginAttempt(
  accountId: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  failureReason?: string,
): Promise<void> {
  await db.insert(accountSchemas.loginHistory).values({
    accountId,
    ipAddress,
    userAgent,
    success,
    failureReason: failureReason ?? null,
  });
}

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

auth.post('/login', loginRateLimit, zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');
  const ipAddress = getClientIp(c);
  const userAgent = getUserAgent(c);

  // Look up the account by username
  const [account] = await db
    .select()
    .from(accountSchemas.accounts)
    .where(eq(accountSchemas.accounts.username, username))
    .limit(1);

  if (!account) {
    // Do not reveal whether the username exists
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // Check if the account is banned
  if (account.isBanned) {
    await recordLoginAttempt(account.id, ipAddress, userAgent, false, 'account_banned');

    await logAudit({
      actorId: account.id,
      actorUsername: account.username,
      action: AuditAction.LOGIN_FAILED,
      details: { reason: 'account_banned' },
      ipAddress,
    });

    return c.json({ error: 'Account is banned' }, 403);
  }

  // Only gm and admin roles may access the admin center
  if (account.role !== 'gm' && account.role !== 'admin') {
    await recordLoginAttempt(account.id, ipAddress, userAgent, false, 'insufficient_role');

    await logAudit({
      actorId: account.id,
      actorUsername: account.username,
      action: AuditAction.LOGIN_FAILED,
      details: { reason: 'insufficient_role', role: account.role },
      ipAddress,
    });

    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // Verify the password
  const passwordValid = await Bun.password.verify(password, account.passwordHash, 'argon2id');

  if (!passwordValid) {
    await recordLoginAttempt(account.id, ipAddress, userAgent, false, 'invalid_password');

    await logAudit({
      actorId: account.id,
      actorUsername: account.username,
      action: AuditAction.LOGIN_FAILED,
      details: { reason: 'invalid_password' },
      ipAddress,
    });

    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // Build the token payload
  const tokenUser: AuthUser = {
    id: account.id,
    username: account.username,
    role: account.role,
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenUser),
    signRefreshToken(account.id),
  ]);

  // Update last login timestamp
  await db
    .update(accountSchemas.accounts)
    .set({ lastLogin: new Date() })
    .where(eq(accountSchemas.accounts.id, account.id));

  // Record successful login
  await recordLoginAttempt(account.id, ipAddress, userAgent, true);

  await logAudit({
    actorId: account.id,
    actorUsername: account.username,
    action: AuditAction.LOGIN,
    details: { userAgent },
    ipAddress,
  });

  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: account.id,
      username: account.username,
      role: account.role,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /refresh
// ---------------------------------------------------------------------------

auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');

  let payload;
  try {
    payload = await verifyToken(refreshToken);
  } catch {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }

  // Ensure this is actually a refresh token
  if (payload.type !== 'refresh' || !payload.sub) {
    return c.json({ error: 'Invalid token type' }, 401);
  }

  // Look up the account to ensure it still exists and is not banned
  const [account] = await db
    .select()
    .from(accountSchemas.accounts)
    .where(eq(accountSchemas.accounts.id, payload.sub))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Account not found' }, 401);
  }

  if (account.isBanned) {
    return c.json({ error: 'Account is banned' }, 403);
  }

  if (account.role !== 'gm' && account.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  const tokenUser: AuthUser = {
    id: account.id,
    username: account.username,
    role: account.role,
  };

  const [newAccessToken, newRefreshToken] = await Promise.all([
    signAccessToken(tokenUser),
    signRefreshToken(account.id),
  ]);

  return c.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------

auth.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  const ipAddress = getClientIp(c);

  await logAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: AuditAction.LOGOUT,
    ipAddress,
  });

  return c.json({ message: 'Logged out successfully' });
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');

  // Fetch fresh account data to include fields not stored in the JWT
  const [account] = await db
    .select({
      id: accountSchemas.accounts.id,
      username: accountSchemas.accounts.username,
      email: accountSchemas.accounts.email,
      role: accountSchemas.accounts.role,
      lastLogin: accountSchemas.accounts.lastLogin,
      createdAt: accountSchemas.accounts.createdAt,
    })
    .from(accountSchemas.accounts)
    .where(eq(accountSchemas.accounts.id, user.id))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }

  return c.json({ user: account });
});

export default auth;
