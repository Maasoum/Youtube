import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  auditLogs,
  contactMessages,
  emailOutbox,
  leads,
  type UserRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { notFound } from "../lib/errors.js";
import { writeAudit } from "./audit.js";
import type { AdminRequestMeta } from "./discounts-admin.js";

export interface MessageView {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "done";
  createdAt: string;
}

export async function listMessages(
  options: {
    status?: "new" | "read" | "done";
    limit?: number;
    offset?: number;
  } = {},
  executor: AppDb = db,
): Promise<MessageView[]> {
  const rows = await executor
    .select()
    .from(contactMessages)
    .where(options.status ? eq(contactMessages.status, options.status) : undefined)
    .orderBy(desc(contactMessages.createdAt))
    .limit(options.limit ?? 100)
    .offset(options.offset ?? 0);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function updateMessageStatus(
  params: {
    messageId: string;
    status: "new" | "read" | "done";
    actor: UserRow;
    request?: AdminRequestMeta;
  },
  executor: AppDb = db,
): Promise<MessageView> {
  const [row] = await executor
    .update(contactMessages)
    .set({ status: params.status, updatedAt: new Date() })
    .where(eq(contactMessages.id, params.messageId))
    .returning();

  if (!row) throw notFound("پیام پیدا نشد.", "message_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "message.status_changed",
      entityType: "contact_message",
      entityId: row.id,
      summary: `وضعیت پیام تماس به «${params.status}» تغییر کرد.`,
      request: params.request,
    },
    executor,
  );

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface LeadView {
  id: string;
  fullName: string;
  contact: string;
  createdAt: string;
}

export async function listLeads(
  options: { limit?: number; offset?: number } = {},
  executor: AppDb = db,
): Promise<LeadView[]> {
  const rows = await executor
    .select()
    .from(leads)
    .orderBy(desc(leads.createdAt))
    .limit(options.limit ?? 100)
    .offset(options.offset ?? 0);

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    contact: row.contact,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function deleteLead(
  params: { leadId: string; actor: UserRow; request?: AdminRequestMeta },
  executor: AppDb = db,
): Promise<void> {
  const [row] = await executor
    .delete(leads)
    .where(eq(leads.id, params.leadId))
    .returning({ id: leads.id });

  if (!row) throw notFound("لید پیدا نشد.", "lead_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "lead.deleted",
      entityType: "lead",
      entityId: params.leadId,
      summary: "درخواست راهنمای کاربر حذف شد.",
      request: params.request,
    },
    executor,
  );
}

export interface AuditEntryView {
  id: number;
  at: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
}

export async function listAuditLogs(
  options: {
    q?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  } = {},
  executor: AppDb = db,
): Promise<AuditEntryView[]> {
  const conditions = [];
  if (options.action) conditions.push(eq(auditLogs.action, options.action));
  if (options.entityType) {
    conditions.push(eq(auditLogs.entityType, options.entityType));
  }
  if (options.q) {
    const pattern = `%${options.q}%`;
    conditions.push(
      or(
        ilike(auditLogs.actorName, pattern),
        ilike(auditLogs.summary, pattern),
        ilike(auditLogs.action, pattern),
        ilike(auditLogs.entityId, pattern),
      ),
    );
  }

  const rows = await executor
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      actorId: auditLogs.actorId,
      actorName: auditLogs.actorName,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      summary: auditLogs.summary,
    })
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);

  return rows.map((row) => ({
    id: row.id,
    at: row.createdAt.toISOString(),
    actorId: row.actorId,
    actorName: row.actorName,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
  }));
}

export interface EmailLogView {
  id: string;
  orderId: string | null;
  to: string;
  subject: string;
  template: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

/**
 * فهرست ایمیل‌ها فقط فراداده برمی‌گرداند؛ بدنه ممکن است کلید لایسنس داشته
 * باشد و هرگز از این مسیر برگردانده نمی‌شود.
 */
export async function listEmailLogs(
  options: {
    status?: "pending" | "sending" | "sent" | "failed";
    limit?: number;
    offset?: number;
  } = {},
  executor: AppDb = db,
): Promise<EmailLogView[]> {
  const rows = await executor
    .select({
      id: emailOutbox.id,
      orderId: emailOutbox.orderId,
      to: emailOutbox.toEmail,
      subject: emailOutbox.subject,
      template: emailOutbox.template,
      status: emailOutbox.status,
      attempts: emailOutbox.attempts,
      lastError: emailOutbox.lastError,
      sentAt: emailOutbox.sentAt,
      createdAt: emailOutbox.createdAt,
    })
    .from(emailOutbox)
    .where(options.status ? eq(emailOutbox.status, options.status) : undefined)
    .orderBy(desc(emailOutbox.createdAt))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);

  return rows.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    to: row.to,
    subject: row.subject,
    template: row.template,
    status: row.status,
    attempts: row.attempts,
    lastError: row.lastError,
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function countAuditLogs(
  executor: AppDb = db,
): Promise<number> {
  const [row] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs);
  return Number(row?.count ?? 0);
}
