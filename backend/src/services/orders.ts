import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { paymentCallbackUrl } from "../config/env.js";
import { db } from "../db/client.js";
import {
  auditLogs,
  courses,
  discountCodeCourses,
  discountCodes,
  discountRedemptions,
  licenses,
  orders,
  payments,
  users,
  type CourseRow,
  type LicenseRow,
  type OrderRow,
  type UserRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { randomToken } from "../lib/crypto.js";
import { PAYPING_BASE_URL } from "./payping.js";
import {
  DISCOUNT_GENERIC_ERROR,
  evaluateDiscount,
  normalizeDiscountCode,
  type DiscountEvaluation,
  type DiscountRule,
} from "../lib/discount.js";
import { uniqueConstraint } from "../lib/db-errors.js";
import { AppError, badRequest, conflict, notFound } from "../lib/errors.js";
import { errorMeta, logger } from "../lib/logger.js";
import { maskLicenseKey } from "./licenses.js";
import { writeAudit } from "./audit.js";
import { queueAdminNewOrderAlert, queuePaymentReceipt } from "./email.js";
import { getGeneralSettings } from "./settings.js";
import {
  createPayPingGateway,
  paymentUnavailableError,
} from "./payment-settings.js";
import {
  PayPingError,
  PAYPING_MAX_AMOUNT_TOMAN,
  PAYPING_MIN_AMOUNT_TOMAN,
  type PayPingGateway,
} from "./payping.js";

export const ORDER_TTL_MS = 30 * 60 * 1000;
export const IN_PROGRESS_STATUSES = [
  "pending",
  "awaiting_license",
  "on_hold",
] as const;

export interface OrderServiceDeps {
  db?: AppDb;
  /**
   * اگر مشخص شده باشد، از درگاه واقعی استفاده نمی‌شود. `undefined` یعنی
   * ساخت درگاه از تنظیمات/محیط و `null` یعنی درگاه در دسترس نیست.
   */
  gateway?: PayPingGateway | null;
  now?: () => Date;
}

export interface PublicOrderCourse {
  id: string;
  slug: string;
  title: string;
  /** کلید تصویر دوره؛ برای کارت‌های سفارش در داشبورد. */
  art: string | null;
  priceToman: number;
}

export interface PublicOrderCustomer {
  fullName: string;
  email: string;
  phone: string | null;
}

export interface PublicOrderDiscount {
  code: string;
  type: "percent" | "fixed";
  label: string;
  amountToman: number;
  percent?: number;
}

export interface PublicOrderLicense {
  id: string;
  maskedCode: string;
  issuedAt: string;
  emailSentAt: string | null;
  source: "provider" | "gift";
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface PublicOrderEvent {
  id: string;
  status: OrderRow["status"] | null;
  at: string;
  note: string;
  byName?: string;
}

export type PublicPaymentState = "success" | "pending" | "failed" | "error" | "unpaid";

/**
 * نمای سفارش برای کاربر. این ساختار دقیقاً همان قرارداد `Order` در فرانت است
 * تا کلاینت وب بدون حدس‌زدن فیلدها بتواند آن را نگاشت کند. کلید کامل لایسنس
 * هرگز در این نما نیست؛ فقط نسخه‌ی ماسک‌شده.
 */
export interface PublicOrder {
  id: string;
  number: number;
  userId: string;
  status: OrderRow["status"];
  source: OrderRow["source"];
  course: PublicOrderCourse;
  customer: PublicOrderCustomer;
  originalPriceToman: number;
  discountToman: number;
  discount: PublicOrderDiscount | null;
  taxPercent: number;
  taxToman: number;
  totalToman: number;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  expiresAt: string | null;
  paymentRef: string | null;
  paymentState: PublicPaymentState;
  paymentUrl: string | null;
  license: PublicOrderLicense | null;
  note: string | null;
  onHoldReason: string | null;
  cancelReason: string | null;
  refund: {
    amountToman: number;
    reason: string | null;
    reference: string | null;
    refundedAt: string;
  } | null;
  statusHistory: PublicOrderEvent[];
}

export interface PublicOrderExtras {
  customer?: PublicOrderCustomer;
  discount?: PublicOrderDiscount | null;
  license?: LicenseRow | null;
  paymentRef?: string | null;
  paymentVerifiedAt?: Date | null;
  paymentUrl?: string | null;
  statusHistory?: PublicOrderEvent[];
}

export interface PublicOrderRowContext {
  order: OrderRow;
  course: CourseRow;
  customer: UserRow | null;
  license: LicenseRow | null;
  paymentRef: string | null;
  paymentVerifiedAt: Date | null;
  discount: PublicOrderDiscount | null;
}

export interface CreateOrderResult {
  order: PublicOrder;
  paymentUrl: string | null;
  requiresPayment: boolean;
}

export interface CreateOrderInput {
  courseId: string;
  discountCode?: string | null;
}

export interface OrderRequestMeta {
  ip?: string;
  userAgent?: string;
}

function nowOf(deps: OrderServiceDeps): Date {
  return deps.now ? deps.now() : new Date();
}

function makeClientRefId(): string {
  return `BP-${Date.now().toString(36).toUpperCase()}-${randomToken(9).toUpperCase()}`;
}

function paymentStateOf(
  row: OrderRow,
  extras: PublicOrderExtras,
): PublicPaymentState {
  if (extras.paymentVerifiedAt || row.paidAt) return "success";
  if (row.paymentCode) {
    if (row.status === "pending") return "pending";
    if (row.status === "expired" || row.status === "failed") return "failed";
  }
  if (row.status === "expired" || row.status === "failed") return "failed";
  return "unpaid";
}

function licenseViewOf(row: LicenseRow | null | undefined): PublicOrderLicense | null {
  if (!row) return null;
  return {
    id: row.id,
    maskedCode: maskLicenseKey(row.keyLast4),
    issuedAt: row.deliveredAt.toISOString(),
    emailSentAt: row.emailSentAt?.toISOString() ?? null,
    source: row.source === "admin_gift" ? "gift" : "provider",
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revokeReason: row.revokedReason,
  };
}


export function toPublicOrder(
  row: OrderRow,
  course: PublicOrderCourse,
  extras: PublicOrderExtras = {},
): PublicOrder {
  return {
    id: row.id,
    number: row.number,
    userId: row.userId,
    status: row.status,
    source: row.source,
    course,
    customer: extras.customer ?? { fullName: "", email: "", phone: null },
    originalPriceToman: row.unitPriceSnapshot,
    discountToman: row.discountToman,
    discount: extras.discount ?? null,
    taxPercent: row.taxPercent,
    taxToman: row.taxToman,
    totalToman: row.totalToman,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    paymentRef: extras.paymentRef ?? null,
    paymentState: paymentStateOf(row, extras),
    paymentUrl: extras.paymentUrl ?? null,
    license: licenseViewOf(extras.license),
    note: row.note,
    onHoldReason: row.onHoldReason,
    cancelReason: row.cancelReason,
    refund: row.refundedAt
      ? {
          amountToman: row.totalToman,
          reason: row.refundReason,
          reference: row.refundReference,
          refundedAt: row.refundedAt.toISOString(),
        }
      : null,
    statusHistory: extras.statusHistory ?? [],
  };
}

function courseOf(row: CourseRow, order: OrderRow): PublicOrderCourse {
  return {
    id: row.id,
    slug: row.slug,
    title: order.titleSnapshot || row.title,
    art: row.art,
    priceToman: row.priceToman,
  };
}

function discountOf(
  row: typeof discountCodes.$inferSelect | null | undefined,
  amountToman: number,
): PublicOrderDiscount | null {
  if (amountToman <= 0) return null;
  if (!row) {
    return {
      code: "",
      type: "fixed",
      label: "تخفیف",
      amountToman,
    };
  }
  return {
    code: row.code,
    type: row.type,
    percent: row.percent ?? undefined,
    label:
      row.type === "percent"
        ? `${row.percent ?? 0}٪ تخفیف`
        : `${row.amountToman?.toLocaleString("fa-IR") ?? ""} تومان تخفیف`,
    amountToman,
  };
}

/** نوع رخدادهای audit را به وضعیت سفارش نگاشت می‌کند. */
const ORDER_EVENT_STATUS: Record<string, OrderRow["status"] | null> = {
  "order.created": "pending",
  "order.created_free": "awaiting_license",
  "order.payment_verified": "awaiting_license",
  "order.fulfilled": "fulfilled",
  "order.gifted": "fulfilled",
  "order.on_hold": "on_hold",
  "order.resumed": "awaiting_license",
  "order.cancelled": "cancelled",
  "order.cancelled_by_user": "cancelled",
  "order.refunded": "refunded",
  "order.expired": "expired",
  "license.revoked": null,
};

async function loadOrderHistory(
  executor: AppDb,
  orderId: string,
): Promise<PublicOrderEvent[]> {
  const rows = await executor
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      summary: auditLogs.summary,
      actorName: auditLogs.actorName,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "order"), eq(auditLogs.entityId, orderId)))
    .orderBy(asc(auditLogs.createdAt));

  return rows.map((row) => ({
    id: String(row.id),
    status: ORDER_EVENT_STATUS[row.action] ?? null,
    at: row.createdAt.toISOString(),
    note: row.summary,
    byName: row.actorName,
  }));
}

async function loadPublishedCourse(
  executor: AppDb,
  courseId: string,
): Promise<CourseRow> {
  const [course] = await executor
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.isPublished, true)))
    .limit(1);

  if (!course) {
    throw notFound("دوره پیدا نشد.", "course_not_found");
  }
  return course;
}

export async function loadDiscountRule(
  code: string,
  executor: AppDb = db,
): Promise<{ id: string; row: typeof discountCodes.$inferSelect; rule: DiscountRule } | null> {
  const normalized = normalizeDiscountCode(code);
  if (!normalized) return null;

  const [row] = await executor
    .select()
    .from(discountCodes)
    .where(sql`upper(${discountCodes.code}) = ${normalized}`)
    .limit(1);

  if (!row) return null;

  const links = await executor
    .select({ courseId: discountCodeCourses.courseId })
    .from(discountCodeCourses)
    .where(eq(discountCodeCourses.discountCodeId, row.id));

  const rule: DiscountRule = {
    code: row.code,
    type: row.type,
    percent: row.percent,
    amountToman: row.amountToman,
    maxDiscountToman: row.maxDiscountToman,
    minOrderToman: row.minTotalToman,
    active: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    maxUses: row.maxUses ?? 0,
    usedCount: row.usedCount,
    perUserLimit: row.perUserLimit,
    courseIds: links.length > 0 ? links.map((link) => link.courseId) : null,
    firstPurchaseOnly: row.firstPurchaseOnly,
    allowFree: row.allowFree,
  };

  return { id: row.id, row, rule };
}

async function countUserRedemptions(
  executor: AppDb,
  discountCodeId: string,
  userId: string,
): Promise<number> {
  const [result] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(discountRedemptions)
    .where(
      and(
        eq(discountRedemptions.discountCodeId, discountCodeId),
        eq(discountRedemptions.userId, userId),
        inArray(discountRedemptions.status, ["reserved", "redeemed"]),
      ),
    );

  return Number(result?.count ?? 0);
}

async function hasPreviousPurchase(
  executor: AppDb,
  userId: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.userId, userId), isNotNull(orders.paidAt)))
    .limit(1);

  return Boolean(row);
}

export async function checkDiscount(params: {
  code: string;
  courseId: string;
  priceToman: number;
  userId: string;
  now?: Date;
  executor?: AppDb;
}): Promise<{ evaluation: DiscountEvaluation; discountCodeId: string | null }> {
  const executor = params.executor ?? db;
  const loaded = await loadDiscountRule(params.code, executor);

  if (!loaded) {
    return {
      evaluation: evaluateDiscount(null, {
        priceToman: params.priceToman,
        courseId: params.courseId,
        userUsageCount: 0,
        isFirstPurchase: false,
      }),
      discountCodeId: null,
    };
  }

  const usageCount = await countUserRedemptions(
    executor,
    loaded.id,
    params.userId,
  );
  const firstPurchase = await hasPreviousPurchase(executor, params.userId);

  return {
    evaluation: evaluateDiscount(loaded.rule, {
      priceToman: params.priceToman,
      courseId: params.courseId,
      userUsageCount: usageCount,
      isFirstPurchase: !firstPurchase,
      now: params.now,
    }),
    discountCodeId: loaded.id,
  };
}

async function reserveDiscountCapacity(
  executor: AppDb,
  discountCodeId: string,
): Promise<boolean> {
  const updated = await executor
    .update(discountCodes)
    .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
    .where(
      and(
        eq(discountCodes.id, discountCodeId),
        eq(discountCodes.isActive, true),
        or(
          isNull(discountCodes.maxUses),
          lt(discountCodes.usedCount, discountCodes.maxUses),
        ),
      ),
    )
    .returning({ id: discountCodes.id });

  return updated.length === 1;
}

/** آزادسازی رزرو تخفیف؛ فقط اگر رزرو هنوز در وضعیت reserved باشد. */
export async function releaseDiscountReservation(
  executor: AppDb,
  orderId: string,
  releasedAt: Date = new Date(),
): Promise<boolean> {
  const released = await executor
    .update(discountRedemptions)
    .set({ status: "released", releasedAt })
    .where(
      and(
        eq(discountRedemptions.orderId, orderId),
        eq(discountRedemptions.status, "reserved"),
      ),
    )
    .returning({ discountCodeId: discountRedemptions.discountCodeId });

  if (released.length === 0) return false;

  const discountCodeId = released[0]?.discountCodeId;
  if (discountCodeId) {
    await executor
      .update(discountCodes)
      .set({
        usedCount: sql`greatest(${discountCodes.usedCount} - 1, 0)`,
      })
      .where(eq(discountCodes.id, discountCodeId));
  }

  return true;
}

export async function redeemDiscountReservation(
  executor: AppDb,
  orderId: string,
  redeemedAt: Date,
): Promise<void> {
  await executor
    .update(discountRedemptions)
    .set({ status: "redeemed", redeemedAt })
    .where(
      and(
        eq(discountRedemptions.orderId, orderId),
        eq(discountRedemptions.status, "reserved"),
      ),
    );
}

async function markPaymentFailedAndRelease(
  executor: AppDb,
  orderId: string,
): Promise<void> {
  await executor.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: "failed", expiresAt: null })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));

    await releaseDiscountReservation(tx, orderId);
  });
}

export async function createOrder(
  params: {
    user: Pick<UserRow, "id" | "email" | "fullName" | "phone">;
    input: CreateOrderInput;
    request?: OrderRequestMeta;
  },
  deps: OrderServiceDeps = {},
): Promise<CreateOrderResult> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);
  const course = await loadPublishedCourse(executor, params.input.courseId);
  const requestedCode =
    params.input.discountCode && params.input.discountCode.trim() !== ""
      ? normalizeDiscountCode(params.input.discountCode)
      : null;

  if (
    requestedCode &&
    (requestedCode.length < 2 || requestedCode.length > 40)
  ) {
    throw badRequest(DISCOUNT_GENERIC_ERROR, "discount_invalid");
  }

  const clientRefId = makeClientRefId();

  let created: {
    order: OrderRow;
    gateway: PayPingGateway | null;
    requiresPayment: boolean;
  };

  try {
    created = await executor.transaction(async (tx) => {
      // قفل ردیف کاربر، سفارش‌سازی هم‌زمان یک کاربر را سریالی می‌کند تا
      // محدودیت هر کاربر و رزرو ظرفیت قابل اتکا باشد.
      const [lockedUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, params.user.id))
        .for("update")
        .limit(1);

      if (!lockedUser) {
        throw new AppError(401, "session_expired", "نشست شما منقضی شده است؛ دوباره وارد شوید.");
      }

      const [activeLicense] = await tx
        .select({ id: licenses.id })
        .from(licenses)
        .where(
          and(
            eq(licenses.userId, params.user.id),
            eq(licenses.courseId, course.id),
            eq(licenses.status, "active"),
          ),
        )
        .limit(1);

      if (activeLicense) {
        throw conflict(
          "برای این دوره لایسنس فعال دارید؛ نیازی به خرید دوباره نیست.",
          "already_owned",
        );
      }

      const [inProgress] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.userId, params.user.id),
            eq(orders.courseId, course.id),
            inArray(orders.status, [...IN_PROGRESS_STATUSES]),
          ),
        )
        .limit(1);

      if (inProgress) {
        throw conflict(
          "برای این دوره یک سفارش در جریان دارید؛ ابتدا نتیجه‌ی آن را بررسی کنید.",
          "order_in_progress",
        );
      }

      let discountAmount = 0;
      let total = course.priceToman;
      let discountCodeId: string | null = null;
      let allowFree = false;

      if (requestedCode) {
        const checked = await checkDiscount({
          code: requestedCode,
          courseId: course.id,
          priceToman: course.priceToman,
          userId: params.user.id,
          now,
          executor: tx,
        });

        if (!checked.evaluation.valid) {
          // پیام خروجی عمداً عمومی است تا وجود/نبود کد لو نرود.
          throw badRequest(DISCOUNT_GENERIC_ERROR, "discount_invalid");
        }

        discountCodeId = checked.discountCodeId;
        discountAmount = checked.evaluation.amountToman;
        total = checked.evaluation.finalToman;
        allowFree = checked.evaluation.discount.allowFree === true;

        if (discountCodeId) {
          const reserved = await reserveDiscountCapacity(tx, discountCodeId);
          if (!reserved) {
            // ظرفیت همین لحظه توسط سفارش دیگری پر شده است.
            throw conflict(DISCOUNT_GENERIC_ERROR, "discount_invalid");
          }
        }
      }

      /**
       * مالیات بر ارزش افزوده از تنظیمات خوانده و روی مبلغ پس از تخفیف
       * اعمال می‌شود؛ مبلغ نهایی همچنان فقط در سرور محاسبه می‌شود.
       */
      const general = await getGeneralSettings(tx);
      const taxPercent = general.taxPercent;
      const taxToman =
        taxPercent > 0 ? Math.round((total * taxPercent) / 100) : 0;
      total += taxToman;

      if (total === 0 && !allowFree) {
        throw badRequest(
          "ثبت سفارش با مبلغ صفر مجاز نیست؛ کد تخفیف یا دوره‌ی دیگری را بررسی کنید.",
          "free_order_not_allowed",
        );
      }

      if (total > 0) {
        if (total < PAYPING_MIN_AMOUNT_TOMAN) {
          throw new AppError(
            422,
            "amount_below_gateway_minimum",
            `مبلغ نهایی کمتر از حداقل مجاز درگاه (${PAYPING_MIN_AMOUNT_TOMAN.toLocaleString("fa-IR")} تومان) است؛ کد تخفیف دیگری امتحان کنید.`,
          );
        }
        if (total > PAYPING_MAX_AMOUNT_TOMAN) {
          throw new AppError(
            422,
            "amount_above_gateway_maximum",
            "مبلغ این سفارش بیش از سقف مجاز درگاه است؛ با پشتیبانی تماس بگیرید.",
          );
        }
      }

      let gateway: PayPingGateway | null = null;
      const requiresPayment = total > 0;

      if (requiresPayment) {
        gateway =
          deps.gateway !== undefined
            ? deps.gateway
            : await createPayPingGateway({ requireActive: true }, tx);
        if (!gateway) throw paymentUnavailableError();
      }

      const free = !requiresPayment;

      const [order] = await tx
        .insert(orders)
        .values({
          userId: params.user.id,
          courseId: course.id,
          titleSnapshot: course.title,
          unitPriceSnapshot: course.priceToman,
          discountCodeId,
          discountToman: discountAmount,
          taxPercent,
          taxToman,
          totalToman: total,
          status: free ? "awaiting_license" : "pending",
          clientRefId,
          expiresAt: free ? null : new Date(now.getTime() + ORDER_TTL_MS),
          paidAt: free ? now : null,
        })
        .returning();

      if (!order) throw new Error("ساخت سفارش ناموفق بود.");

      if (discountCodeId) {
        await tx.insert(discountRedemptions).values({
          discountCodeId,
          userId: params.user.id,
          orderId: order.id,
          status: free ? "redeemed" : "reserved",
          reservedAt: now,
          redeemedAt: free ? now : null,
        });
      }

      return { order, gateway, requiresPayment };
    });
  } catch (error) {
    const constraint = uniqueConstraint(error);
    if (constraint !== null) {
      if (
        constraint.includes("orders_active_user_course_uq") ||
        constraint.includes("licenses_active_user_course_uq")
      ) {
        throw conflict(
          "برای این دوره یک سفارش در جریان دارید؛ ابتدا نتیجه‌ی آن را بررسی کنید.",
          "order_in_progress",
        );
      }
      if (constraint.includes("discount_redemptions_order_uq")) {
        throw conflict("این سفارش قبلاً ثبت شده است.", "order_duplicate");
      }
    }
    throw error;
  }

  const { order, gateway, requiresPayment } = created;
  const publicOrder = toPublicOrder(order, courseOf(course, order), {
    customer: {
      fullName: params.user.fullName,
      email: params.user.email,
      phone: params.user.phone,
    },
  });

  if (!requiresPayment) {
    await writeAudit(
      {
        actor: { id: params.user.id, name: params.user.fullName },
        action: "order.created_free",
        entityType: "order",
        entityId: order.id,
        summary: `سفارش رایگان #${order.number} برای «${course.title}» ثبت شد.`,
        details: { orderNumber: order.number, courseId: course.id, totalToman: 0 },
        request: params.request,
      },
      executor,
    );

    await queuePaymentReceipt(executor, {
      to: params.user.email,
      fullName: params.user.fullName,
      orderId: order.id,
      orderNumber: order.number,
      courseTitle: course.title,
      amountToman: 0,
      refId: null,
      paidAt: now,
    });

    await queueAdminNewOrderAlert(executor, {
      orderId: order.id,
      orderNumber: order.number,
      customerName: params.user.fullName,
      customerEmail: params.user.email,
      courseTitle: course.title,
      totalToman: 0,
      isFree: true,
    });

    return { order: publicOrder, paymentUrl: null, requiresPayment: false };
  }

  if (!gateway) {
    await markPaymentFailedAndRelease(executor, order.id);
    throw paymentUnavailableError();
  }

  try {
    const payment = await gateway.createPayment({
      amountToman: order.totalToman,
      returnUrl: paymentCallbackUrl,
      clientRefId: order.clientRefId,
      payerIdentity: params.user.email,
      payerName: params.user.fullName,
      description: `سفارش #${order.number} - ${course.title}`,
    });

    const updated = await executor
      .update(orders)
      .set({ paymentCode: payment.code })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
      .returning({ id: orders.id });

    if (updated.length === 0) {
      throw new Error("ثبت کد پرداخت روی سفارش ناموفق بود.");
    }

    await writeAudit(
      {
        actor: { id: params.user.id, name: params.user.fullName },
        action: "order.created",
        entityType: "order",
        entityId: order.id,
        summary: `سفارش #${order.number} برای «${course.title}» ایجاد شد.`,
        details: {
          orderNumber: order.number,
          courseId: course.id,
          totalToman: order.totalToman,
        },
        request: params.request,
      },
      executor,
    );

    return {
      order: { ...publicOrder, paymentUrl: payment.paymentUrl },
      paymentUrl: payment.paymentUrl,
      requiresPayment: true,
    };
  } catch (error) {
    await markPaymentFailedAndRelease(executor, order.id);

    logger.error(
      {
        ...errorMeta(error),
        ...(error instanceof PayPingError ? { gateway: error.kind } : {}),
        orderId: order.id,
      },
      "ساخت کد پرداخت ناموفق بود",
    );

    if (error instanceof PayPingError) {
      throw new AppError(
        502,
        "payment_gateway_error",
        "ارتباط با درگاه پرداخت برقرار نشد؛ کمی بعد دوباره تلاش کنید.",
      );
    }

    throw error;
  }
}

const userOrderSelection = {
  order: orders,
  course: courses,
  customer: users,
  license: licenses,
  paymentRef: payments.refId,
  paymentVerifiedAt: payments.verifiedAt,
  discountCode: discountCodes.code,
  discountType: discountCodes.type,
  discountPercent: discountCodes.percent,
  discountAmount: discountCodes.amountToman,
} as const;

type UserOrderRow = {
  order: OrderRow;
  course: CourseRow;
  customer: UserRow;
  license: LicenseRow | null;
  paymentRef: string | null;
  paymentVerifiedAt: Date | null;
  discountCode: string | null;
  discountType: "percent" | "fixed" | null;
  discountPercent: number | null;
  discountAmount: number | null;
};

function orderViewOf(
  row: UserOrderRow,
  history: PublicOrderEvent[] = [],
): PublicOrder {
  const discount: PublicOrderDiscount | null =
    row.discountCode && row.order.discountToman > 0
      ? {
          code: row.discountCode,
          type: row.discountType ?? "fixed",
          percent: row.discountPercent ?? undefined,
          label:
            row.discountType === "percent"
              ? `${row.discountPercent ?? 0}٪ تخفیف`
              : `${(row.discountAmount ?? row.order.discountToman).toLocaleString("fa-IR")} تومان تخفیف`,
          amountToman: row.order.discountToman,
        }
      : discountOf(null, row.order.discountToman);

  return toPublicOrder(row.order, courseOf(row.course, row.order), {
    customer: {
      fullName: row.customer.fullName,
      email: row.customer.email,
      phone: row.customer.phone,
    },
    discount,
    license: row.license,
    paymentRef: row.paymentRef,
    paymentVerifiedAt: row.paymentVerifiedAt,
    statusHistory: history,
  });
}

export async function listOrdersForUser(
  userId: string,
  executor: AppDb = db,
): Promise<PublicOrder[]> {
  const rows: UserOrderRow[] = await executor
    .select(userOrderSelection)
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .innerJoin(users, eq(users.id, orders.userId))
    .leftJoin(licenses, eq(licenses.orderId, orders.id))
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .leftJoin(discountCodes, eq(discountCodes.id, orders.discountCodeId))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return rows.map((row) => orderViewOf(row));
}

export async function getOrderForUser(
  userId: string,
  orderId: string,
  executor: AppDb = db,
): Promise<PublicOrder> {
  const [row] = await executor
    .select(userOrderSelection)
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .innerJoin(users, eq(users.id, orders.userId))
    .leftJoin(licenses, eq(licenses.orderId, orders.id))
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .leftJoin(discountCodes, eq(discountCodes.id, orders.discountCodeId))
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!row) {
    throw notFound("سفارش پیدا نشد.", "order_not_found");
  }

  return orderViewOf(row, await loadOrderHistory(executor, orderId));
}

/**
 * لغو سفارش توسط خود کاربر؛ فقط سفارش در انتظار پرداخت و فقط برای صاحب آن.
 * رزرو تخفیف آزاد می‌شود تا سقف استفاده هدر نرود.
 */
export async function cancelOrderForUser(
  userId: string,
  orderId: string,
  deps: OrderServiceDeps = {},
): Promise<PublicOrder> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const [row] = await executor
    .select({ order: orders, customer: users })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!row) {
    throw notFound("سفارش پیدا نشد.", "order_not_found");
  }

  if (row.order.status !== "pending") {
    throw conflict(
      "این سفارش در وضعیت فعلی قابل لغو نیست.",
      "order_not_cancellable",
    );
  }

  const updated = await executor
    .update(orders)
    .set({
      status: "cancelled",
      cancelReason: "لغو توسط کاربر",
      expiresAt: null,
      updatedAt: now,
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id });

  if (updated.length === 0) {
    throw conflict(
      "این سفارش در وضعیت فعلی قابل لغو نیست.",
      "order_not_cancellable",
    );
  }

  await releaseDiscountReservation(executor, orderId, now);

  await writeAudit(
    {
      actor: { id: userId, name: row.customer.fullName },
      action: "order.cancelled_by_user",
      entityType: "order",
      entityId: orderId,
      summary: `سفارش #${row.order.number} توسط کاربر لغو شد.`,
      details: { orderNumber: row.order.number },
    },
    executor,
  );

  return getOrderForUser(userId, orderId, executor);
}

export interface StartPaymentResult {
  order: PublicOrder;
  paymentUrl: string;
}

/**
 * بازگرداندن لینک پرداخت یک سفارش در انتظار. اگر کد پرداخت قبلی وجود داشته
 * باشد همان استفاده می‌شود (ساخت پرداخت تکراری نزد درگاه لازم نیست)؛ در غیر
 * این صورت یک کد تازه ساخته و روی سفارش ثبت می‌شود.
 */
export async function startOrderPaymentForUser(
  userId: string,
  orderId: string,
  deps: OrderServiceDeps = {},
): Promise<StartPaymentResult> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const [row] = await executor
    .select({ order: orders, course: courses, customer: users })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!row) {
    throw notFound("سفارش پیدا نشد.", "order_not_found");
  }

  if (row.order.status !== "pending") {
    throw conflict(
      "این سفارش در وضعیت فعلی قابل پرداخت نیست.",
      "order_not_payable",
    );
  }

  const view = (paymentUrl: string | null): PublicOrder =>
    toPublicOrder(row.order, courseOf(row.course, row.order), {
      customer: {
        fullName: row.customer.fullName,
        email: row.customer.email,
        phone: row.customer.phone,
      },
      paymentUrl,
    });

  if (row.order.paymentCode) {
    return {
      order: view(
        `${PAYPING_BASE_URL}/v2/pay/gotoipg/${encodeURIComponent(row.order.paymentCode)}`,
      ),
      paymentUrl: `${PAYPING_BASE_URL}/v2/pay/gotoipg/${encodeURIComponent(row.order.paymentCode)}`,
    };
  }

  const gateway =
    deps.gateway !== undefined
      ? deps.gateway
      : await createPayPingGateway({ requireActive: true }, executor);

  if (!gateway) throw paymentUnavailableError();

  let payment: { code: string; paymentUrl: string };
  try {
    payment = await gateway.createPayment({
      amountToman: row.order.totalToman,
      returnUrl: paymentCallbackUrl,
      clientRefId: row.order.clientRefId,
      payerIdentity: row.customer.email,
      payerName: row.customer.fullName,
      description: `سفارش #${row.order.number} - ${row.course.title}`,
    });
  } catch (error) {
    logger.error(
      {
        ...errorMeta(error),
        ...(error instanceof PayPingError ? { gateway: error.kind } : {}),
        orderId: row.order.id,
      },
      "ساخت کد پرداخت برای سفارش در جریان ناموفق بود",
    );
    throw new AppError(
      502,
      "payment_gateway_error",
      "ارتباط با درگاه پرداخت برقرار نشد؛ کمی بعد دوباره تلاش کنید.",
    );
  }

  const [updated] = await executor
    .update(orders)
    .set({
      paymentCode: payment.code,
      expiresAt: new Date(now.getTime() + ORDER_TTL_MS),
      updatedAt: now,
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning();

  if (!updated) {
    throw conflict(
      "این سفارش در وضعیت فعلی قابل پرداخت نیست.",
      "order_not_payable",
    );
  }

  return {
    order: toPublicOrder(updated, courseOf(row.course, updated), {
      customer: {
        fullName: row.customer.fullName,
        email: row.customer.email,
        phone: row.customer.phone,
      },
      paymentUrl: payment.paymentUrl,
    }),
    paymentUrl: payment.paymentUrl,
  };
}

export async function loadOrderById(
  orderId: string,
  executor: AppDb = db,
): Promise<{ order: OrderRow; course: CourseRow } | null> {
  const [row] = await executor
    .select({ order: orders, course: courses })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  return row ?? null;
}
