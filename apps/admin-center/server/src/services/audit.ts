import { db } from '../db/index.js';
import { adminSchemas } from '../db/index.js';
import type { AuditAction } from '@tenos/shared';
import { logger } from '../middleware/logger.js';

interface AuditEntry {
  actorId: string;
  actorUsername: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(adminSchemas.auditLog).values({
      actorId: entry.actorId,
      actorUsername: entry.actorUsername,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      details: entry.details ?? {},
      ipAddress: entry.ipAddress ?? 'unknown',
    });
  } catch (err) {
    logger.error({ err, entry }, 'Failed to write audit log');
  }
}
