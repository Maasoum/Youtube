import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  discountCodeCourses,
  discountCodes,
  discountRedemptions,
  orders,
  users,
  type UserRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { uniqueConstraint } from "../lib/db-errors.js";
import { conflict, notFound } from "../lib/errors.js";
import { writeAudit } from "./audit.js";

export interface AdminRequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface DiscountView {
  code: string;
  type: "percent" | "fixed";
  percent: number | null;
  amountToman: number | null;
  maxDiscountToman: number | null;
  minOrderToman: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  maxUsesPerUser: number;
  courseIds: string[];
  firstPurchaseOnly: boolean;
  allowFree: boolean;
  createdAt: string;
}

export interface DiscountInput {
  code: string;
  type: "percent" | "fixed";
  percent?: number;
  amountToman?: number;
  maxDiscountToman?: number;
  minOrderToman: number;
  maxUses?: number;
  maxUsesPerUser: number;
  courseIds?: string[];
  firstPurchaseOnly: boolean;
  allowFree: boolean;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface BulkDiscountInput extends Omit<DiscountInput, "code"> {
  prefix: string;
  count: number;
}

function normalizeCode(code: string): string {
  return code.normalize("NFKC").trim().toUpperCase();
}

function toView(
  row: typeof discountCodes.$inferSelect,
  courseIds: string[],
): DiscountView {
  return {
    code: row.code,
    type: row.type,
    percent: row.percent,
    amountToman: row.amountToman,
    maxDiscountToman: row.maxDiscountToman,
    minOrderToman: row.minTotalToman,
    active: row.isActive,
    startsAt: row.startsAt?.toISOString() ?? null,
    expiresAt: row.endsAt?.toISOString() ?? null,
    maxUses: row.maxUses ?? 0,
    usedCount: row.usedCount,
    maxUsesPerUser: row.perUserLimit,
    courseIds,
    firstPurchaseOnly: row.firstPurchaseOnly,
    allowFree: row.allowFree,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadCourseIds(
  executor: AppDb,
  discountId: string,
): Promise<string[]> {
  const rows = await executor
    .select({ courseId: discountCodeCourses.courseId })
    .from(discountCodeCourses)
    .where(eq(discountCodeCourses.discountCodeId, discountId));
  return rows.map((row) => row.courseId);
}

export async function listDiscounts(
  options: { q?: string; limit?: number; offset?: number } = {},
  executor: AppDb = db,
): Promise<DiscountView[]> {
  const rows = await executor
    .select()
    .from(discountCodes)
    .where(
      options.q
        ? sql`upper(${discountCodes.code}) LIKE ${`%${options.q.toUpperCase()}%`}`
        : undefined,
    )
    .orderBy(desc(discountCodes.createdAt))
    .limit(options.limit ?? 200)
    .offset(options.offset ?? 0);

  const result: DiscountView[] = [];
  for (const row of rows) {
    result.push(toView(row, await loadCourseIds(executor, row.id)));
  }
  return result;
}

async function findDiscount(
  executor: AppDb,
  code: string,
): Promise<typeof discountCodes.$inferSelect> {
  const [row] = await executor
    .select()
    .from(discountCodes)
    .where(sql`upper(${discountCodes.code}) = ${normalizeCode(code)}`)
    .limit(1);
  if (!row) throw notFound("کد تخفیف پیدا نشد.", "discount_not_found");
  return row;
}

function valuesOf(input: Omit<DiscountInput, "code">) {
  return {
    type: input.type,
    percent: input.type === "percent" ? input.percent ?? null : null,
    amountToman: input.type === "fixed" ? input.amountToman ?? null : null,
    maxDiscountToman: input.maxDiscountToman ?? null,
    minTotalToman: input.minOrderToman,
    maxUses: input.maxUses ?? null,
    perUserLimit: input.maxUsesPerUser,
    firstPurchaseOnly: input.firstPurchaseOnly,
    allowFree: input.allowFree,
    isActive: input.active,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
}

async function replaceCourseLinks(
  executor: AppDb,
  discountId: string,
  courseIds: string[],
): Promise<void> {
  await executor
    .delete(discountCodeCourses)
    .where(eq(discountCodeCourses.discountCodeId, discountId));
  if (courseIds.length === 0) return;

  await executor.insert(discountCodeCourses).values(
    [...new Set(courseIds)].map((courseId) => ({
      discountCodeId: discountId,
      courseId,
    })),
  );
}

export async function createDiscount(
  params: {
    input: DiscountInput;
    actor: UserRow;
    request?: AdminRequestMeta;
  },
  executor: AppDb = db,
): Promise<DiscountView> {
  const code = normalizeCode(params.input.code);

  let row: typeof discountCodes.$inferSelect | undefined;
  try {
    const inserted = await executor
      .insert(discountCodes)
      .values({
        code,
        ...valuesOf(params.input),
      })
      .returning();
    row = inserted[0];
  } catch (error) {
    if (uniqueConstraint(error)?.includes("discount_codes_code_uq")) {
      throw conflict("این کد تخفیف قبلاً ساخته شده است.", "discount_code_taken");
    }
    throw error;
  }

  if (!row) throw new Error("ساخت کد تخفیف ناموفق بود.");
  await replaceCourseLinks(executor, row.id, params.input.courseIds ?? []);

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "discount.created",
      entityType: "discount",
      entityId: row.id,
      summary: `کد تخفیف «${row.code}» ساخته شد.`,
      request: params.request,
    },
    executor,
  );

  return toView(row, params.input.courseIds ?? []);
}

export async function updateDiscount(
  params: {
    input: DiscountInput;
    actor: UserRow;
    request?: AdminRequestMeta;
  },
  executor: AppDb = db,
): Promise<DiscountView> {
  const current = await findDiscount(executor, params.input.code);
  const code = normalizeCode(params.input.code);

  const [row] = await executor
    .update(discountCodes)
    .set({
      code,
      ...valuesOf(params.input),
      updatedAt: new Date(),
    })
    .where(eq(discountCodes.id, current.id))
    .returning();

  if (!row) throw notFound("کد تخفیف پیدا نشد.", "discount_not_found");
  await replaceCourseLinks(executor, row.id, params.input.courseIds ?? []);

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "discount.updated",
      entityType: "discount",
      entityId: row.id,
      summary: `کد تخفیف «${row.code}» به‌روزرسانی شد.`,
      request: params.request,
    },
    executor,
  );

  return toView(row, params.input.courseIds ?? []);
}

export async function toggleDiscount(
  params: { code: string; actor: UserRow; request?: AdminRequestMeta },
  executor: AppDb = db,
): Promise<DiscountView> {
  const current = await findDiscount(executor, params.code);
  const [row] = await executor
    .update(discountCodes)
    .set({ isActive: !current.isActive, updatedAt: new Date() })
    .where(eq(discountCodes.id, current.id))
    .returning();

  if (!row) throw notFound("کد تخفیف پیدا نشد.", "discount_not_found");

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "discount.toggled",
      entityType: "discount",
      entityId: row.id,
      summary: row.isActive
        ? `کد تخفیف «${row.code}» فعال شد.`
        : `کد تخفیف «${row.code}» غیرفعال شد.`,
      request: params.request,
    },
    executor,
  );

  return toView(row, await loadCourseIds(executor, row.id));
}

export async function deleteDiscount(
  params: { code: string; actor: UserRow; request?: AdminRequestMeta },
  executor: AppDb = db,
): Promise<void> {
  const current = await findDiscount(executor, params.code);

  if (current.usedCount > 0) {
    throw conflict(
      "این کد تخفیف مصرف شده و قابل حذف نیست؛ آن را غیرفعال کنید.",
      "discount_in_use",
    );
  }

  await executor.delete(discountCodes).where(eq(discountCodes.id, current.id));

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "discount.deleted",
      entityType: "discount",
      entityId: current.id,
      summary: `کد تخفیف «${current.code}» حذف شد.`,
      request: params.request,
    },
    executor,
  );
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSuffix(length = 6): string {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const position = Math.floor(Math.random() * CODE_ALPHABET.length);
    value += CODE_ALPHABET[position] ?? "A";
  }
  return value;
}

/** ساخت انبوه کدهای یکتا با پیشوند مشخص؛ حداکثر ۲۰۰ کد در هر اجرا. */
export async function bulkCreateDiscounts(
  params: {
    input: BulkDiscountInput;
    actor: UserRow;
    request?: AdminRequestMeta;
  },
  executor: AppDb = db,
): Promise<DiscountView[]> {
  const prefix = normalizeCode(params.input.prefix);
  const count = params.input.count;
  const created: DiscountView[] = [];

  for (let index = 0; index < count; index += 1) {
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      const code = `${prefix}-${randomSuffix()}`;
      if (code.length > 40) {
        throw conflict("پیشوند بلند است؛ طول کل کد حداکثر ۴۰ نویسه است.", "prefix_too_long");
      }

      try {
        const [row] = await executor
          .insert(discountCodes)
          .values({ code, ...valuesOf(params.input) })
          .returning();
        if (row) {
          await replaceCourseLinks(executor, row.id, params.input.courseIds ?? []);
          created.push(toView(row, params.input.courseIds ?? []));
          inserted = true;
        }
      } catch (error) {
        if (!uniqueConstraint(error)?.includes("discount_codes_code_uq")) {
          throw error;
        }
      }
    }
    if (!inserted) {
      throw conflict(
        "ساخت کد یکتا ممکن نشد؛ دوباره تلاش کنید.",
        "discount_generation_failed",
      );
    }
  }

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "discount.bulk_created",
      entityType: "discount",
      entityId: null,
      summary: `${created.length.toLocaleString("fa-IR")} کد تخفیف با پیشوند «${prefix}» ساخته شد.`,
      details: { count: created.length, prefix },
      request: params.request,
    },
    executor,
  );

  return created;
}

export interface DiscountUsage {
  code: string;
  totalUses: number;
  totalDiscountToman: number;
  orders: Array<{
    orderId: string;
    orderNumber: number;
    customerName: string;
    usedAt: string;
    discountToman: number;
  }>;
}

export async function getDiscountUsage(
  code: string,
  executor: AppDb = db,
): Promise<DiscountUsage> {
  const current = await findDiscount(executor, code);

  const rows = await executor
    .select({
      orderId: orders.id,
      orderNumber: orders.number,
      customerName: users.fullName,
      usedAt: discountRedemptions.redeemedAt,
      reservedAt: discountRedemptions.reservedAt,
      discountToman: orders.discountToman,
    })
    .from(discountRedemptions)
    .innerJoin(orders, eq(orders.id, discountRedemptions.orderId))
    .innerJoin(users, eq(users.id, discountRedemptions.userId))
    .where(
      and(
        eq(discountRedemptions.discountCodeId, current.id),
        eq(discountRedemptions.status, "redeemed"),
      ),
    )
    .orderBy(desc(discountRedemptions.redeemedAt))
    .limit(500);

  return {
    code: current.code,
    totalUses: rows.length,
    totalDiscountToman: rows.reduce((sum, row) => sum + row.discountToman, 0),
    orders: rows.map((row) => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      customerName: row.customerName,
      usedAt: (row.usedAt ?? row.reservedAt).toISOString(),
      discountToman: row.discountToman,
    })),
  };
}

export async function findDiscountIdsByCode(
  codes: string[],
  executor: AppDb = db,
): Promise<string[]> {
  if (codes.length === 0) return [];
  const rows = await executor
    .select({ id: discountCodes.id })
    .from(discountCodes)
    .where(inArray(discountCodes.code, codes.map(normalizeCode)));
  return rows.map((row) => row.id);
}
