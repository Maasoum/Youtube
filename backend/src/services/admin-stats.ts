import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { contactMessages, orders, users } from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { getGeneralSettings } from "./settings.js";

/**
 * آمار داشبورد مدیر. محاسبه در سرور انجام می‌شود تا کلاینت وب برای نمایش
 * نمودار درآمد مجبور نباشد همه‌ی سفارش‌ها را دریافت کند.
 */
export interface AdminStatsView {
  totalRevenueToman: number;
  pendingLicenses: number;
  overdueFulfillments: number;
  totalOrders: number;
  customers: number;
  deliveredLicenses: number;
  todayOrders: number;
  newMessages: number;
  revenueSeries: Array<{
    date: string;
    label: string;
    amountToman: number;
    orders: number;
  }>;
}

export interface AdminStatsDeps {
  db?: AppDb;
  now?: () => Date;
}

const PAID_STATUSES = [
  "awaiting_license",
  "on_hold",
  "fulfilled",
  "refunded",
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function getAdminStats(
  deps: AdminStatsDeps = {},
): Promise<AdminStatsView> {
  const executor = deps.db ?? db;
  const now = deps.now ? deps.now() : new Date();
  const settings = await getGeneralSettings(executor);
  const slaCutoff = new Date(
    now.getTime() - settings.fulfillmentSlaHours * 60 * 60 * 1000,
  );

  const [totals] = await executor
    .select({
      totalOrders: sql<number>`count(*) filter (
        where ${orders.status} not in ('cancelled', 'expired')
      )::int`,
      pendingLicenses: sql<number>`count(*) filter (
        where ${orders.status} = 'awaiting_license'
      )::int`,
      deliveredLicenses: sql<number>`count(*) filter (
        where ${orders.status} = 'fulfilled'
      )::int`,
      todayOrders: sql<number>`count(*) filter (
        where ${orders.paidAt} is not null
          and ${orders.status} in ('awaiting_license', 'on_hold', 'fulfilled', 'refunded')
          and (${orders.paidAt} at time zone 'UTC')::date = (now() at time zone 'UTC')::date
      )::int`,
      totalRevenueToman: sql<number>`coalesce(sum(${orders.totalToman}) filter (
        where ${orders.paidAt} is not null
          and ${orders.status} in ('awaiting_license', 'on_hold', 'fulfilled')
      ), 0)::bigint`,
    })
    .from(orders);

  const [overdue] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        inArray(orders.status, ["awaiting_license", "on_hold"]),
        lt(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`, slaCutoff),
      ),
    );

  const [customers] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "user"));

  const [messages] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(eq(contactMessages.status, "new"));

  const startOfSeries = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      6 * DAY_MS,
  );

  const daily = await executor
    .select({
      day: sql<string>`to_char(
        (coalesce(${orders.paidAt}, ${orders.createdAt}) at time zone 'UTC')::date,
        'YYYY-MM-DD'
      )`,
      amountToman: sql<number>`coalesce(sum(${orders.totalToman}), 0)::bigint`,
      ordersCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        inArray(
          orders.status,
          PAID_STATUSES.filter((status) => status !== "refunded"),
        ),
        gte(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`, startOfSeries),
      ),
    )
    .groupBy(
      sql`(coalesce(${orders.paidAt}, ${orders.createdAt}) at time zone 'UTC')::date`,
    );

  const dailyMap = new Map(
    daily.map((row) => [row.day, row] as const),
  );

  const revenueSeries: AdminStatsView["revenueSeries"] = [];
  const baseUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(baseUtc - offset * DAY_MS);
    const key = dayKey(day);
    const row = dailyMap.get(key);
    revenueSeries.push({
      date: key,
      label: dayLabel(day),
      amountToman: Number(row?.amountToman ?? 0),
      orders: Number(row?.ordersCount ?? 0),
    });
  }

  return {
    totalRevenueToman: Number(totals?.totalRevenueToman ?? 0),
    pendingLicenses: Number(totals?.pendingLicenses ?? 0),
    overdueFulfillments: Number(overdue?.count ?? 0),
    totalOrders: Number(totals?.totalOrders ?? 0),
    customers: Number(customers?.count ?? 0),
    deliveredLicenses: Number(totals?.deliveredLicenses ?? 0),
    todayOrders: Number(totals?.todayOrders ?? 0),
    newMessages: Number(messages?.count ?? 0),
    revenueSeries,
  };
}
