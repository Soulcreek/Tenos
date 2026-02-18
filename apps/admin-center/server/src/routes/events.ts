/**
 * Server-Sent Events (SSE) stream for real-time dashboard updates.
 *
 * Publishes periodic snapshots of online player count, server status,
 * recent audit entries, and tool execution progress to connected clients.
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { db } from '../db/index.js';
import { characterSchemas, serverSchemas, adminSchemas } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, count, desc, sql } from 'drizzle-orm';

const sse = new Hono();
sse.use('*', authMiddleware);

// ---------------------------------------------------------------
// SSE: /events/dashboard — periodic dashboard metrics
// ---------------------------------------------------------------
sse.get('/dashboard', async (c) => {
  return streamSSE(c, async (stream) => {
    let alive = true;
    stream.onAbort(() => {
      alive = false;
    });

    while (alive) {
      try {
        const [onlineResult] = await db
          .select({ count: count() })
          .from(characterSchemas.characters)
          .where(eq(characterSchemas.characters.isOnline, true));

        const serversResult = await db
          .select({
            id: serverSchemas.gameServers.id,
            name: serverSchemas.gameServers.name,
            status: serverSchemas.gameServers.status,
            currentPlayers: serverSchemas.gameServers.currentPlayers,
            cpuUsage: serverSchemas.gameServers.cpuUsage,
            memoryUsage: serverSchemas.gameServers.memoryUsage,
          })
          .from(serverSchemas.gameServers);

        const recentAudit = await db
          .select()
          .from(adminSchemas.auditLog)
          .orderBy(desc(adminSchemas.auditLog.createdAt))
          .limit(5);

        const runningTools = await db
          .select()
          .from(adminSchemas.toolExecutions)
          .where(eq(adminSchemas.toolExecutions.status, 'running'));

        const payload = {
          onlinePlayers: onlineResult?.count ?? 0,
          servers: serversResult,
          recentAudit,
          runningTools,
          timestamp: new Date().toISOString(),
        };

        await stream.writeSSE({
          event: 'dashboard',
          data: JSON.stringify(payload),
        });
      } catch {
        // Swallow DB errors during streaming — client will reconnect
      }

      await stream.sleep(5000); // Push every 5 seconds
    }
  });
});

// ---------------------------------------------------------------
// SSE: /events/tool/:id — watch a specific tool execution
// ---------------------------------------------------------------
sse.get('/tool/:executionId', async (c) => {
  const executionId = c.req.param('executionId');

  return streamSSE(c, async (stream) => {
    let alive = true;
    stream.onAbort(() => {
      alive = false;
    });

    while (alive) {
      try {
        const [execution] = await db
          .select()
          .from(adminSchemas.toolExecutions)
          .where(eq(adminSchemas.toolExecutions.id, executionId));

        if (!execution) {
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({ error: 'Execution not found' }),
          });
          break;
        }

        await stream.writeSSE({
          event: 'tool-status',
          data: JSON.stringify(execution),
        });

        // Stop streaming once the tool is no longer running
        if (execution.status !== 'running' && execution.status !== 'idle') {
          await stream.writeSSE({
            event: 'tool-complete',
            data: JSON.stringify(execution),
          });
          break;
        }
      } catch {
        // Swallow
      }

      await stream.sleep(1000); // Poll every second for running tools
    }
  });
});

export default sse;
