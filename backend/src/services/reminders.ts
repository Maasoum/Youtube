import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  courses,
  emailOutbox,
  orders,
  users,
  type OrderRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { writeAudit } from "./audit.js";
import { queueFulfillmentReminder } from "./email.js";
import { fulfillmentSlaHours } from "./settings.js";

const REMINDER_TEMPLATE = "fulfillment_reminder";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface ReminderResult {
  checked: number;
  sent: number;
  skipped: number;
}

/**
 * یادآوری روزانه‌ی سفارش‌های گذشته از SLA برای مدیر.
 *
 * برای هر سفارش حداکثر یک ایمیل در هر ۲۴ ساعت در outbox ثبت می‌شود؛ حتی اگر
 * job چند بار اجرا شود، ردیف تکراری ساخته نمی‌شود.
 */
export async function sendFulfillmentReminders(
  executor: AppDb = db,
  now: Date = new Date(),
): Promise<ReminderResult> {
  const slaHours = await fulfillmentSlaHours(executor);
  const threshold = new Date(now.getTime() - slaHours * 60 * 60 * 1000);

  const rows = await executor
    .select({
      order: orders,
      customer: users,
      course: courses,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .where(
      and(
        inArray(orders.status, ["awaiting_license", "on_hold"]),
        sql`coalesce(${orders.paidAt}, ${orders.createdAt}) < ${threshold}`,
      ),
    )
    .orderBy(asc(orders.paidAt), asc(orders.createdAt))
    .limit(50);

  const result: ReminderResult = {
    checked: rows.length,
    sent: 0,
    skipped: 0,
  };
  const since = new Date(now.getTime() - ONE_DAY_MS);

  for (const row of rows) {
    const [recent] = await executor
      .select({ id: emailOutbox.id })
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.orderId, row.order.id),
          eq(emailOutbox.template, REMINDER_TEMPLATE),
          gt(emailOutbox.createdAt, since),
        ),
      )
      .limit(1);

    if (recent) {
      result.skipped += 1;
      continue;
    }

    const started = row.order.paidAt ?? row.order.createdAt;
    const hoursOverdue = Math.max(
      1,
      Math.floor((now.getTime() - started.getTime()) / (60 * 60 * 1000)) -
        slaHours,
    );

    await queueFulfillmentReminder(executor, {
      orderId: row.order.id,
      orderNumber: row.order.number,
      customerName: row.customer.fullName,
      courseTitle: row.course.title,
      hoursOverdue,
    });

    await writeAudit(
      {
        actor: { id: null, name: "سامانه" },
        action: "order.reminder_sent",
        entityType: "order",
        entityId: row.order.id,
        summary: `یادآوری تأخیر تحویل برای سفارش #${row.order.number} ثبت شد.`,
        details: { hoursOverdue },
      },
      executor,
    );

    result.sent += 1;
  }

  return result;
}

export function isOverdue(
  order: Pick<OrderRow, "status" | "paidAt" | "createdAt">,
  slaHours: number,
  now: Date = new Date(),
): boolean {
  if (order.status !== "awaiting_license" && order.status !== "on_hold") {
    return false;
  }
  const started = order.paidAt ?? order.createdAt;
  return now.getTime() - started.getTime() > slaHours * 60 * 60 * 1000;
}
