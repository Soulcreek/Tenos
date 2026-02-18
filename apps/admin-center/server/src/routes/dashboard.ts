import { Hono } from 'hono';
import { db } from '../db/index.js';
import { accountSchemas, characterSchemas, serverSchemas, adminSchemas } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, and, sql, count, desc, gte, lte } from 'drizzle-orm';

const dashboard = new Hono();
dashboard.use('*', authMiddleware);

// GET /dashboard/stats - Main dashboard statistics
dashboard.get('/stats', async (c) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalAccountsResult,
    totalCharactersResult,
    onlinePlayersResult,
    newAccountsTodayResult,
    activeBansResult,
    serversResult,
    totalGoldResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(accountSchemas.accounts),
    db.select({ count: count() }).from(characterSchemas.characters),
    db
      .select({ count: count() })
      .from(characterSchemas.characters)
      .where(eq(characterSchemas.characters.isOnline, true)),
    db
      .select({ count: count() })
      .from(accountSchemas.accounts)
      .where(gte(accountSchemas.accounts.createdAt, todayStart)),
    db
      .select({ count: count() })
      .from(accountSchemas.bans)
      .where(eq(accountSchemas.bans.isActive, true)),
    db.select().from(serverSchemas.gameServers),
    db
      .select({
        total: sql<number>`COALESCE(SUM(${characterSchemas.characters.gold}), 0)`,
      })
      .from(characterSchemas.characters),
  ]);

  const servers = serversResult;
  const serversOnline = servers.filter((s) => s.status === 'online').length;

  // Calculate peak from activity log (today)
  const [peakResult] = await db
    .select({ peak: sql<number>`COALESCE(MAX(${adminSchemas.playerActivityLog.peakCount}), 0)` })
    .from(adminSchemas.playerActivityLog)
    .where(gte(adminSchemas.playerActivityLog.timestamp, todayStart));

  return c.json({
    success: true,
    data: {
      totalAccounts: totalAccountsResult[0]?.count ?? 0,
      totalCharacters: totalCharactersResult[0]?.count ?? 0,
      onlinePlayers: onlinePlayersResult[0]?.count ?? 0,
      peakPlayersToday: Math.max(peakResult?.peak ?? 0, onlinePlayersResult[0]?.count ?? 0),
      newAccountsToday: newAccountsTodayResult[0]?.count ?? 0,
      activeBans: activeBansResult[0]?.count ?? 0,
      serverCount: servers.length,
      serversOnline,
      averageLatency: 0, // Would be from Redis in production
      totalGoldInCirculation: totalGoldResult[0]?.total ?? 0,
    },
  });
});

// GET /dashboard/player-activity - Player online count over time
dashboard.get('/player-activity', async (c) => {
  const hours = parseInt(c.req.query('hours') ?? '24');
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const activity = await db
    .select({
      timestamp: adminSchemas.playerActivityLog.timestamp,
      count: adminSchemas.playerActivityLog.onlineCount,
    })
    .from(adminSchemas.playerActivityLog)
    .where(gte(adminSchemas.playerActivityLog.timestamp, since))
    .orderBy(adminSchemas.playerActivityLog.timestamp);

  return c.json({ success: true, data: activity });
});

// GET /dashboard/kingdom-distribution - Characters per kingdom
dashboard.get('/kingdom-distribution', async (c) => {
  const distribution = await db
    .select({
      kingdom: characterSchemas.characters.kingdom,
      count: count(),
    })
    .from(characterSchemas.characters)
    .groupBy(characterSchemas.characters.kingdom);

  const total = distribution.reduce((sum, d) => sum + d.count, 0);
  const kingdomNames: Record<number, string> = { 1: 'Shinsoo', 2: 'Chunjo', 3: 'Jinno' };

  const data = distribution.map((d) => ({
    kingdom: d.kingdom,
    name: kingdomNames[d.kingdom] ?? `Kingdom ${d.kingdom}`,
    count: d.count,
    percentage: total > 0 ? Math.round((d.count / total) * 100 * 10) / 10 : 0,
  }));

  return c.json({ success: true, data });
});

// GET /dashboard/class-distribution - Characters per class
dashboard.get('/class-distribution', async (c) => {
  const distribution = await db
    .select({
      characterClass: characterSchemas.characters.characterClass,
      count: count(),
    })
    .from(characterSchemas.characters)
    .groupBy(characterSchemas.characters.characterClass);

  const total = distribution.reduce((sum, d) => sum + d.count, 0);

  const data = distribution.map((d) => ({
    characterClass: d.characterClass,
    count: d.count,
    percentage: total > 0 ? Math.round((d.count / total) * 100 * 10) / 10 : 0,
  }));

  return c.json({ success: true, data });
});

// GET /dashboard/level-distribution - Characters by level range
dashboard.get('/level-distribution', async (c) => {
  const ranges = [
    { label: '1-10', min: 1, max: 10 },
    { label: '11-20', min: 11, max: 20 },
    { label: '21-30', min: 21, max: 30 },
    { label: '31-40', min: 31, max: 40 },
    { label: '41-50', min: 41, max: 50 },
    { label: '51-60', min: 51, max: 60 },
    { label: '61-70', min: 61, max: 70 },
    { label: '71-80', min: 71, max: 80 },
    { label: '81-90', min: 81, max: 90 },
    { label: '91-100', min: 91, max: 100 },
    { label: '101-110', min: 101, max: 110 },
    { label: '111-120', min: 111, max: 120 },
  ];

  const data = await Promise.all(
    ranges.map(async (range) => {
      const [result] = await db
        .select({ count: count() })
        .from(characterSchemas.characters)
        .where(
          and(
            gte(characterSchemas.characters.level, range.min),
            lte(characterSchemas.characters.level, range.max),
          ),
        );
      return { range: range.label, count: result?.count ?? 0 };
    }),
  );

  return c.json({ success: true, data });
});

// GET /dashboard/recent-activity - Recent audit log entries
dashboard.get('/recent-activity', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 50);

  const entries = await db
    .select()
    .from(adminSchemas.auditLog)
    .orderBy(desc(adminSchemas.auditLog.createdAt))
    .limit(limit);

  return c.json({ success: true, data: entries });
});

// GET /dashboard/server-overview - All servers with status
dashboard.get('/server-overview', async (c) => {
  const servers = await db.select().from(serverSchemas.gameServers);
  const zones = await db.select().from(serverSchemas.serverZones);

  const data = servers.map((server) => ({
    ...server,
    zones: zones.filter((z) => z.serverId === server.id),
  }));

  return c.json({ success: true, data });
});

export default dashboard;
