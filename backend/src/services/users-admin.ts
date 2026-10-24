import { eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, type UserRow } from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { revokeAllSessions } from "../middleware/auth.js";
import { writeAudit } from "./audit.js";
import {
  listOrdersForAdmin,
  type PanelOrder,
} from "./fulfillment.js";
import { listLicenses, type LicenseListItem } from "./licenses.js";

export interface AdminUserSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRow["role"];
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  deletionRequestedAt: string | null;
  ordersCount: number;
  licensesCount: number;
  totalSpentToman: number;
  lastOrderAt: string | null;
}

export interface AdminUserDetail {
  user: AdminUserSummary;
  orders: PanelOrder[];
  licenses: LicenseListItem[];
}

const lastOrderAtSql = sql<Date | null>`(SELECT max("orders"."created_at") FROM "orders" WHERE "orders"."user_id" = ${users.id})`;

function summarySelection() {
  return {
    user: users,
    ordersCount: sql<number>`(SELECT count(*)::int FROM "orders" WHERE "orders"."user_id" = ${users.id})`,
    licensesCount: sql<number>`(SELECT count(*)::int FROM "licenses" WHERE "licenses"."user_id" = ${users.id} AND "licenses"."status" = 'active')`,
    totalSpentToman: sql<string>`(
      SELECT coalesce(sum("orders"."total_toman"), 0)::bigint
      FROM "orders"
      WHERE "orders"."user_id" = ${users.id}
        AND "orders"."paid_at" IS NOT NULL
        AND "orders"."status" IN ('fulfilled', 'awaiting_license', 'on_hold', 'refunded')
    )`,
    lastOrderAt: lastOrderAtSql,
  };
}

type SummaryRow = {
  user: UserRow;
  ordersCount: number;
  licensesCount: number;
  totalSpentToman: string;
  lastOrderAt: Date | null;
};

function toSummary(row: SummaryRow): AdminUserSummary {
  return {
    id: row.user.id,
    fullName: row.user.fullName,
    email: row.user.email,
    phone: row.user.phone,
    role: row.user.role,
    isActive: row.user.disabledAt === null,
    emailVerified: row.user.emailVerifiedAt !== null,
    createdAt: row.user.createdAt.toISOString(),
    deletionRequestedAt: row.user.deletionRequestedAt?.toISOString() ?? null,
    ordersCount: Number(row.ordersCount ?? 0),
    licensesCount: Number(row.licensesCount ?? 0),
    totalSpentToman: Number(row.totalSpentToman ?? 0),
    lastOrderAt: row.lastOrderAt?.toISOString() ?? null,
  };
}

export async function listUsers(
  options: { q?: string; limit?: number; offset?: number } = {},
  executor: AppDb = db,
): Promise<AdminUserSummary[]> {
  const where = options.q
    ? or(
        ilike(users.fullName, `%${options.q}%`),
        ilike(users.email, `%${options.q}%`),
        ilike(users.phone, `%${options.q}%`),
      )
    : undefined;

  const rows = await executor
    .select(summarySelection())
    .from(users)
    .where(where)
    .orderBy(sql`${users.createdAt} DESC`)
    .limit(options.limit ?? 100)
    .offset(options.offset ?? 0);

  return rows.map(toSummary);
}

export async function getUserDetail(
  userId: string,
  executor: AppDb = db,
): Promise<AdminUserDetail> {
  const [row] = await executor
    .select(summarySelection())
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    throw notFound("کاربر پیدا نشد.", "user_not_found");
  }

  const [orders, licenses] = [
    await listOrdersForAdmin({ userId, limit: 100 }, { db: executor }),
    await listLicenses({ userId, limit: 100 }, executor),
  ];

  return {
    user: toSummary(row),
    orders: orders.orders,
    licenses,
  };
}

async function loadSummary(
  userId: string,
  executor: AppDb,
): Promise<AdminUserSummary> {
  const [row] = await executor
    .select(summarySelection())
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) throw notFound("کاربر پیدا نشد.", "user_not_found");
  return toSummary(row);
}

export async function setUserActive(
  params: {
    userId: string;
    active: boolean;
    reason?: string;
    actor: UserRow;
    request?: { ip?: string; userAgent?: string };
  },
  executor: AppDb = db,
): Promise<AdminUserSummary> {
  if (params.userId === params.actor.id && !params.active) {
    throw badRequest(
      "نمی‌توانید حساب خودتان را غیرفعال کنید.",
      "self_disable_forbidden",
    );
  }

  const [target] = await executor
    .select({ id: users.id, role: users.role, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!target) {
    throw notFound("کاربر پیدا نشد.", "user_not_found");
  }

  if (!params.active && target.role === "admin") {
    throw conflict(
      "حساب مدیر را نمی‌توان از این مسیر غیرفعال کرد.",
      "admin_protected",
    );
  }

  if (!params.active && !params.reason?.trim()) {
    throw badRequest(
      "برای غیرفعال‌کردن حساب، دلیل را وارد کنید.",
      "reason_required",
      { reason: "دلیل غیرفعال‌سازی الزامی است." },
    );
  }

  const now = new Date();
  await executor
    .update(users)
    .set({
      disabledAt: params.active ? null : now,
      disabledReason: params.active ? null : params.reason?.trim() ?? null,
      updatedAt: now,
    })
    .where(eq(users.id, params.userId));

  if (!params.active) {
    await revokeAllSessions(params.userId, undefined, executor);
  }

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: params.active ? "user.enabled" : "user.disabled",
      entityType: "user",
      entityId: params.userId,
      summary: params.active
        ? `حساب «${target.fullName}» دوباره فعال شد.`
        : `حساب «${target.fullName}» غیرفعال شد و نشست‌های آن بسته شد.`,
      details: params.reason ? { reason: params.reason } : undefined,
      request: params.request,
    },
    executor,
  );

  return loadSummary(params.userId, executor);
}
