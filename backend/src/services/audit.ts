import { db } from "../db/client.js";
import { auditLogs } from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { errorMeta, logger } from "../lib/logger.js";

export interface AuditActor {
  id: string | null;
  name: string;
}

export interface AuditRequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuditInput {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
  request?: AuditRequestMeta;
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * ثبت اقدام حساس. این تابع هرگز رمز، توکن، کلید لایسنس یا کوکی دریافت نمی‌کند
 * و فقط خلاصه‌ی قابل‌نمایش را در پایگاه داده می‌گذارد.
 */
export async function writeAudit(
  input: AuditInput,
  executor: AppDb = db,
): Promise<void> {
  try {
    await executor.insert(auditLogs).values({
      actorId: input.actor.id,
      actorName: clip(input.actor.name, 120),
      action: clip(input.action, 80),
      entityType: clip(input.entityType, 80),
      entityId: input.entityId ? clip(input.entityId, 120) : null,
      summary: clip(input.summary, 500),
      details: input.details ?? null,
      // ورودی این فیلد از requestMeta می‌آید و هش‌شده است، نه IP خام.
      ip: input.request?.ip ? clip(input.request.ip, 64) : null,
      userAgent: input.request?.userAgent
        ? clip(input.request.userAgent, 300)
        : null,
    });
  } catch (error) {
    // شکست لاگ نباید عملیات اصلی را نیمه‌کاره کند، اما باید دیده شود.
    logger.error(
      { ...errorMeta(error), action: input.action },
      "ثبت audit ناموفق بود",
    );
  }
}
