import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { notifications } from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { notFound } from "../lib/errors.js";

export interface NotificationView {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
}

function toView(row: typeof notifications.$inferSelect): NotificationView {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    kind: row.kind,
    href: row.href,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}

export async function listNotifications(
  userId: string,
  options: { limit?: number; offset?: number } = {},
  executor: AppDb = db,
): Promise<NotificationView[]> {
  const rows = await executor
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);

  return rows.map(toView);
}

export async function unreadNotificationCount(
  userId: string,
  executor: AppDb = db,
): Promise<number> {
  const [row] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return Number(row?.count ?? 0);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
  executor: AppDb = db,
): Promise<NotificationView> {
  const [row] = await executor
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .returning();

  if (!row) {
    throw notFound("اعلان پیدا نشد.", "notification_not_found");
  }
  return toView(row);
}

export async function markAllNotificationsRead(
  userId: string,
  executor: AppDb = db,
): Promise<number> {
  const updated = await executor
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    )
    .returning({ id: notifications.id });

  return updated.length;
}
