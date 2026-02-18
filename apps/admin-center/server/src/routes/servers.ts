import { Hono } from 'hono';
import { db } from '../db/index.js';
import { serverSchemas } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { eq, sql, count, sum } from 'drizzle-orm';

const servers = new Hono();

// All routes require authentication
servers.use('*', authMiddleware);

// ---------------------------------------------------------------------------
// GET /stats/overview - Aggregate stats across all servers
// (Defined before /:id to avoid route collision)
// ---------------------------------------------------------------------------
servers.get('/stats/overview', async (c) => {
  const [serverStats] = await db
    .select({
      totalServers: count(),
      serversOnline: count(
        sql`CASE WHEN ${serverSchemas.gameServers.status} = 'online' THEN 1 END`,
      ),
      serversMaintenance: count(
        sql`CASE WHEN ${serverSchemas.gameServers.status} = 'maintenance' THEN 1 END`,
      ),
      serversOffline: count(
        sql`CASE WHEN ${serverSchemas.gameServers.status} = 'offline' THEN 1 END`,
      ),
      totalPlayers: sum(serverSchemas.gameServers.currentPlayers),
      totalMaxPlayers: sum(serverSchemas.gameServers.maxPlayers),
      avgCpuUsage: sql<number>`COALESCE(AVG(${serverSchemas.gameServers.cpuUsage}), 0)`,
      avgMemoryUsage: sql<number>`COALESCE(AVG(${serverSchemas.gameServers.memoryUsage}), 0)`,
    })
    .from(serverSchemas.gameServers);

  const [zoneStats] = await db
    .select({
      totalZones: count(),
      totalZonePlayers: sum(serverSchemas.serverZones.playerCount),
      totalMonsters: sum(serverSchemas.serverZones.monsterCount),
    })
    .from(serverSchemas.serverZones);

  return c.json({
    success: true,
    data: {
      totalServers: serverStats.totalServers,
      serversOnline: serverStats.serversOnline,
      serversMaintenance: serverStats.serversMaintenance,
      serversOffline: serverStats.serversOffline,
      totalPlayers: Number(serverStats.totalPlayers ?? 0),
      totalMaxPlayers: Number(serverStats.totalMaxPlayers ?? 0),
      avgCpuUsage: Math.round(Number(serverStats.avgCpuUsage) * 100) / 100,
      avgMemoryUsage: Math.round(Number(serverStats.avgMemoryUsage) * 100) / 100,
      totalZones: zoneStats.totalZones,
      totalZonePlayers: Number(zoneStats.totalZonePlayers ?? 0),
      totalMonsters: Number(zoneStats.totalMonsters ?? 0),
    },
  });
});

// ---------------------------------------------------------------------------
// GET / - List all game servers with their zones
// ---------------------------------------------------------------------------
servers.get('/', async (c) => {
  const allServers = await db
    .select()
    .from(serverSchemas.gameServers)
    .orderBy(serverSchemas.gameServers.name);

  const allZones = await db
    .select()
    .from(serverSchemas.serverZones)
    .orderBy(serverSchemas.serverZones.name);

  // Group zones by serverId
  const zonesByServer = new Map<string, typeof allZones>();
  for (const zone of allZones) {
    const existing = zonesByServer.get(zone.serverId) ?? [];
    existing.push(zone);
    zonesByServer.set(zone.serverId, existing);
  }

  const serversWithZones = allServers.map((server) => ({
    ...server,
    zones: zonesByServer.get(server.id) ?? [],
  }));

  return c.json({
    success: true,
    data: serversWithZones,
  });
});

// ---------------------------------------------------------------------------
// GET /:id - Get server detail with zone info
// ---------------------------------------------------------------------------
servers.get('/:id', async (c) => {
  const { id } = c.req.param();

  const [server] = await db
    .select()
    .from(serverSchemas.gameServers)
    .where(eq(serverSchemas.gameServers.id, id))
    .limit(1);

  if (!server) {
    return c.json({ success: false, error: 'Server not found', code: 'NOT_FOUND' }, 404);
  }

  const zones = await db
    .select()
    .from(serverSchemas.serverZones)
    .where(eq(serverSchemas.serverZones.serverId, id))
    .orderBy(serverSchemas.serverZones.name);

  return c.json({
    success: true,
    data: {
      ...server,
      zones,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /:id/start - Start a server (update status to 'starting')
// ---------------------------------------------------------------------------
servers.post('/:id/start', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';

  const [server] = await db
    .select()
    .from(serverSchemas.gameServers)
    .where(eq(serverSchemas.gameServers.id, id))
    .limit(1);

  if (!server) {
    return c.json({ success: false, error: 'Server not found', code: 'NOT_FOUND' }, 404);
  }

  if (server.status === 'online' || server.status === 'starting') {
    return c.json(
      {
        success: false,
        error: `Cannot start server: current status is '${server.status}'`,
        code: 'INVALID_STATE',
      },
      409,
    );
  }

  const [updated] = await db
    .update(serverSchemas.gameServers)
    .set({ status: 'starting' })
    .where(eq(serverSchemas.gameServers.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: 'server.start',
    targetType: 'server',
    targetId: id,
    details: { serverName: server.name, previousStatus: server.status },
    ipAddress: ip,
  });

  return c.json({
    success: true,
    data: updated,
    message: `Server '${server.name}' is starting`,
  });
});

// ---------------------------------------------------------------------------
// POST /:id/stop - Stop a server (update status to 'stopping')
// ---------------------------------------------------------------------------
servers.post('/:id/stop', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';

  const [server] = await db
    .select()
    .from(serverSchemas.gameServers)
    .where(eq(serverSchemas.gameServers.id, id))
    .limit(1);

  if (!server) {
    return c.json({ success: false, error: 'Server not found', code: 'NOT_FOUND' }, 404);
  }

  if (server.status === 'offline' || server.status === 'stopping') {
    return c.json(
      {
        success: false,
        error: `Cannot stop server: current status is '${server.status}'`,
        code: 'INVALID_STATE',
      },
      409,
    );
  }

  const [updated] = await db
    .update(serverSchemas.gameServers)
    .set({ status: 'stopping' })
    .where(eq(serverSchemas.gameServers.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: 'server.stop',
    targetType: 'server',
    targetId: id,
    details: { serverName: server.name, previousStatus: server.status },
    ipAddress: ip,
  });

  return c.json({
    success: true,
    data: updated,
    message: `Server '${server.name}' is stopping`,
  });
});

// ---------------------------------------------------------------------------
// POST /:id/restart - Restart a server
// ---------------------------------------------------------------------------
servers.post('/:id/restart', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';

  const [server] = await db
    .select()
    .from(serverSchemas.gameServers)
    .where(eq(serverSchemas.gameServers.id, id))
    .limit(1);

  if (!server) {
    return c.json({ success: false, error: 'Server not found', code: 'NOT_FOUND' }, 404);
  }

  if (server.status === 'offline') {
    return c.json(
      {
        success: false,
        error: 'Cannot restart server: server is offline. Use start instead.',
        code: 'INVALID_STATE',
      },
      409,
    );
  }

  // Set to stopping first, then to starting to represent a restart cycle
  const [updated] = await db
    .update(serverSchemas.gameServers)
    .set({ status: 'starting' })
    .where(eq(serverSchemas.gameServers.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: 'server.restart',
    targetType: 'server',
    targetId: id,
    details: { serverName: server.name, previousStatus: server.status },
    ipAddress: ip,
  });

  return c.json({
    success: true,
    data: updated,
    message: `Server '${server.name}' is restarting`,
  });
});

// ---------------------------------------------------------------------------
// POST /:id/maintenance - Put server in maintenance mode
// ---------------------------------------------------------------------------
servers.post('/:id/maintenance', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';

  const [server] = await db
    .select()
    .from(serverSchemas.gameServers)
    .where(eq(serverSchemas.gameServers.id, id))
    .limit(1);

  if (!server) {
    return c.json({ success: false, error: 'Server not found', code: 'NOT_FOUND' }, 404);
  }

  if (server.status === 'maintenance') {
    return c.json(
      {
        success: false,
        error: 'Server is already in maintenance mode',
        code: 'INVALID_STATE',
      },
      409,
    );
  }

  const [updated] = await db
    .update(serverSchemas.gameServers)
    .set({ status: 'maintenance' })
    .where(eq(serverSchemas.gameServers.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: 'server.maintenance',
    targetType: 'server',
    targetId: id,
    details: { serverName: server.name, previousStatus: server.status },
    ipAddress: ip,
  });

  return c.json({
    success: true,
    data: updated,
    message: `Server '${server.name}' is now in maintenance mode`,
  });
});

export default servers;
