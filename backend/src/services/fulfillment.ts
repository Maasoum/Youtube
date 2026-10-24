import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../db/client.js";
import {
  auditLogs,
  courses,
  licenses,
  notifications,
  orders,
  payments,
  users,
  type CourseRow,
  type LicenseRow,
  type OrderRow,
  type UserRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { conflict, notFound } from "../lib/errors.js";
import { writeAudit } from "./audit.js";
import {
  queueDelayNotice,
  queueOrderCancelled,
  queueRefundNotice,
} from "./email.js";
import { fulfillmentSlaHours } from "./settings.js";
import { maskLicenseKey } from "./licenses.js";
import { releaseDiscountReservation } from "./orders.js";

export interface FulfillmentDeps {
  db?: AppDb;
  now?: () => Date;
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const FULFILLMENT_STATUSES = ["awaiting_license", "on_hold"] as const;
const IN_PROGRESS_STATUSES = [
  "pending",
  "awaiting_license",
  "on_hold",
] as const;

export interface LicenseSummary {
  id: string;
  maskedCode: string;
  status: LicenseRow["status"];
  source: LicenseRow["source"];
  issuedAt: string;
  emailSentAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface PanelOrder {
  id: string;
  number: number;
  status: OrderRow["status"];
  source: OrderRow["source"];
  course: {
    id: string;
    slug: string;
    title: string;
    priceToman: number;
    art: string | null;
  };
  customer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
  originalPriceToman: number;
  discountToman: number;
  taxPercent: number;
  taxToman: number;
  totalToman: number;
  createdAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  expiresAt: string | null;
  note: string | null;
  onHoldReason: string | null;
  cancelReason: string | null;
  refund: {
    amountToman: number;
    reason: string | null;
    reference: string | null;
    refundedAt: string;
  } | null;
  paymentRef: string | null;
  license: LicenseSummary | null;
  overdue: boolean;
  overdueHours: number;
  statusHistory: Array<{
    status: OrderRow["status"] | null;
    at: string;
    note: string;
    byName: string | null;
  }>;
}

export interface PanelOrderList {
  orders: PanelOrder[];
  total: number;
}

function nowOf(deps: FulfillmentDeps): Date {
  return deps.now ? deps.now() : new Date();
}

function toLicenseSummary(license: LicenseRow | null | undefined): LicenseSummary | null {
  if (!license) return null;
  return {
    id: license.id,
    maskedCode: maskLicenseKey(license.keyLast4),
    status: license.status,
    source: license.source,
    issuedAt: license.deliveredAt.toISOString(),
    emailSentAt: license.emailSentAt?.toISOString() ?? null,
    revokedAt: license.revokedAt?.toISOString() ?? null,
    revokeReason: license.revokedReason,
  };
}

function overdueOf(
  order: OrderRow,
  slaHours: number,
  now: Date,
): { overdue: boolean; overdueHours: number } {
  if (
    !(FULFILLMENT_STATUSES as readonly string[]).includes(order.status)
  ) {
    return { overdue: false, overdueHours: 0 };
  }

  const started = order.paidAt ?? order.createdAt;
  const elapsedMs = now.getTime() - started.getTime();
  const slaMs = slaHours * 60 * 60 * 1000;
  if (elapsedMs <= slaMs) {
    return { overdue: false, overdueHours: 0 };
  }
  return {
    overdue: true,
    overdueHours: Math.floor((elapsedMs - slaMs) / (60 * 60 * 1000)),
  };
}

function baseOrder(row: {
  order: OrderRow;
  course: CourseRow;
  customer: UserRow;
  license: LicenseRow | null;
  paymentRef: string | null;
}, slaHours: number, now: Date): PanelOrder {
  const overdue = overdueOf(row.order, slaHours, now);
  return {
    id: row.order.id,
    number: row.order.number,
    status: row.order.status,
    source: row.order.source,
    course: {
      id: row.course.id,
      slug: row.course.slug,
      title: row.order.titleSnapshot || row.course.title,
      priceToman: row.course.priceToman,
      art: row.course.art,
    },
    customer: {
      id: row.customer.id,
      fullName: row.customer.fullName,
      email: row.customer.email,
      phone: row.customer.phone,
    },
    originalPriceToman: row.order.unitPriceSnapshot,
    discountToman: row.order.discountToman,
    taxPercent: row.order.taxPercent,
    taxToman: row.order.taxToman,
    totalToman: row.order.totalToman,
    createdAt: row.order.createdAt.toISOString(),
    paidAt: row.order.paidAt?.toISOString() ?? null,
    fulfilledAt: row.order.fulfilledAt?.toISOString() ?? null,
    expiresAt: row.order.expiresAt?.toISOString() ?? null,
    note: row.order.note,
    onHoldReason: row.order.onHoldReason,
    cancelReason: row.order.cancelReason,
    refund: row.order.refundedAt
      ? {
          amountToman: row.order.totalToman,
          reason: row.order.refundReason,
          reference: row.order.refundReference,
          refundedAt: row.order.refundedAt.toISOString(),
        }
      : null,
    paymentRef: row.paymentRef,
    license: toLicenseSummary(row.license),
    overdue: overdue.overdue,
    overdueHours: overdue.overdueHours,
    statusHistory: [],
  };
}

const EVENT_STATUS: Record<string, OrderRow["status"]> = {
  "order.created": "pending",
  "order.created_free": "awaiting_license",
  "order.payment_verified": "awaiting_license",
  "order.held": "on_hold",
  "order.resumed": "awaiting_license",
  "order.fulfilled": "fulfilled",
  "order.gifted": "fulfilled",
  "order.cancelled": "cancelled",
  "order.refunded": "refunded",
  "order.expired": "expired",
};

async function loadOrderEvents(
  executor: AppDb,
  orderId: string,
): Promise<PanelOrder["statusHistory"]> {
  const rows = await executor
    .select({
      action: auditLogs.action,
      summary: auditLogs.summary,
      actorName: auditLogs.actorName,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "order"), eq(auditLogs.entityId, orderId)))
    .orderBy(asc(auditLogs.createdAt));

  return rows.map((row) => ({
    status: EVENT_STATUS[row.action] ?? null,
    at: row.createdAt.toISOString(),
    note: row.summary,
    byName: row.actorName,
  }));
}

async function loadDetailedOrder(
  executor: AppDb,
  orderId: string,
  slaHours: number,
  now: Date,
): Promise<PanelOrder> {
  const [row] = await executor
    .select({
      order: orders,
      course: courses,
      customer: users,
      license: licenses,
      paymentRef: payments.refId,
    })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .innerJoin(users, eq(users.id, orders.userId))
    .leftJoin(licenses, eq(licenses.orderId, orders.id))
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!row) {
    throw notFound("سفارش پیدا نشد.", "order_not_found");
  }

  return {
    ...baseOrder(row, slaHours, now),
    statusHistory: await loadOrderEvents(executor, orderId),
  };
}

export async function getOrderForAdmin(
  orderId: string,
  deps: FulfillmentDeps = {},
): Promise<PanelOrder> {
  const executor = deps.db ?? db;
  return loadDetailedOrder(
    executor,
    orderId,
    await fulfillmentSlaHours(executor),
    nowOf(deps),
  );
}

export interface AdminOrderFilters {
  status?: string[];
  userId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

function buildFilters(filters: AdminOrderFilters) {
  const conditions = [];
  const statuses = (filters.status ?? []).filter((status) =>
    (
      [
        "pending",
        "awaiting_license",
        "fulfilled",
        "on_hold",
        "failed",
        "cancelled",
        "expired",
        "refunded",
      ] as string[]
    ).includes(status),
  );
  if (statuses.length > 0) {
    conditions.push(
      inArray(orders.status, statuses as Array<OrderRow["status"]>),
    );
  }

  if (filters.userId) {
    conditions.push(eq(orders.userId, filters.userId));
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(users.fullName, pattern),
        ilike(users.email, pattern),
        ilike(courses.title, pattern),
        sql`${orders.number}::text ILIKE ${pattern}`,
      ),
    );
  }

  if (filters.from) {
    const from = new Date(`${filters.from}T00:00:00.000Z`);
    if (!Number.isNaN(from.getTime())) {
      conditions.push(gte(orders.createdAt, from));
    }
  }
  if (filters.to) {
    const to = new Date(`${filters.to}T23:59:59.999Z`);
    if (!Number.isNaN(to.getTime())) {
      conditions.push(lt(orders.createdAt, new Date(to.getTime() + 1)));
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listOrdersForAdmin(
  filters: AdminOrderFilters = {},
  deps: FulfillmentDeps = {},
): Promise<PanelOrderList> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);
  const slaHours = await fulfillmentSlaHours(executor);
  const where = buildFilters(filters);
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const rows = await executor
    .select({
      order: orders,
      course: courses,
      customer: users,
      license: licenses,
      paymentRef: payments.refId,
    })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .innerJoin(users, eq(users.id, orders.userId))
    .leftJoin(licenses, eq(licenses.orderId, orders.id))
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(where);

  return {
    orders: rows.map((row) => baseOrder(row, slaHours, now)),
    total: Number(countRow?.count ?? 0),
  };
}

/** صف تحویل: قدیمی‌ترین سفارش‌ها اول؛ دیرکرد بر اساس SLA تنظیمات. */
export async function listFulfillmentQueue(
  deps: FulfillmentDeps = {},
): Promise<{ orders: PanelOrder[]; slaHours: number }> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);
  const slaHours = await fulfillmentSlaHours(executor);

  const rows = await executor
    .select({
      order: orders,
      course: courses,
      customer: users,
      license: licenses,
      paymentRef: payments.refId,
    })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .innerJoin(users, eq(users.id, orders.userId))
    .leftJoin(licenses, eq(licenses.orderId, orders.id))
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(
      inArray(orders.status, [...FULFILLMENT_STATUSES] as Array<OrderRow["status"]>),
    )
    .orderBy(asc(orders.paidAt), asc(orders.createdAt))
    .limit(200);

  return {
    orders: rows.map((row) => baseOrder(row, slaHours, now)),
    slaHours,
  };
}

export interface MyCourse {
  licenseId: string;
  status: LicenseRow["status"];
  source: LicenseRow["source"];
  issuedAt: string;
  emailSentAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  course: {
    id: string;
    slug: string;
    title: string;
    art: string | null;
    providerName: string;
    level: CourseRow["level"];
    durationWeeks: number;
    sessions: number;
  };
  order: { id: string; number: number; status: OrderRow["status"] };
}

/** دوره‌های کاربر با وضعیت لایسنس؛ هیچ کلیدی در خروجی نیست. */
export async function listMyCourses(
  userId: string,
  executor: AppDb = db,
): Promise<MyCourse[]> {
  const rows = await executor
    .select({ license: licenses, course: courses, order: orders })
    .from(licenses)
    .innerJoin(courses, eq(courses.id, licenses.courseId))
    .innerJoin(orders, eq(orders.id, licenses.orderId))
    .where(eq(licenses.userId, userId))
    .orderBy(desc(licenses.deliveredAt));

  return rows.map((row) => ({
    licenseId: row.license.id,
    status: row.license.status,
    source: row.license.source,
    issuedAt: row.license.deliveredAt.toISOString(),
    emailSentAt: row.license.emailSentAt?.toISOString() ?? null,
    revokedAt: row.license.revokedAt?.toISOString() ?? null,
    revokeReason: row.license.revokedReason,
    course: {
      id: row.course.id,
      slug: row.course.slug,
      title: row.course.title,
      art: row.course.art,
      providerName: row.course.providerName,
      level: row.course.level,
      durationWeeks: row.course.durationWeeks,
      sessions: row.course.sessions,
    },
    order: {
      id: row.order.id,
      number: row.order.number,
      status: row.order.status,
    },
  }));
}

export interface CourseAccess {
  allowed: boolean;
  reason?: "license" | "in-progress" | "pending-payment";
  orderId?: string;
  orderNumber?: number;
  orderStatus?: OrderRow["status"];
  licenseId?: string;
}

export async function getCourseAccess(
  userId: string,
  courseId: string,
  executor: AppDb = db,
): Promise<CourseAccess> {
  const [license] = await executor
    .select({ id: licenses.id, orderId: licenses.orderId })
    .from(licenses)
    .where(
      and(
        eq(licenses.userId, userId),
        eq(licenses.courseId, courseId),
        eq(licenses.status, "active"),
      ),
    )
    .limit(1);

  if (license) {
    const [order] = await executor
      .select({ number: orders.number })
      .from(orders)
      .where(eq(orders.id, license.orderId))
      .limit(1);
    return {
      allowed: false,
      reason: "license",
      orderId: license.orderId,
      orderNumber: order?.number,
      orderStatus: "fulfilled",
      licenseId: license.id,
    };
  }

  const [activeOrder] = await executor
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
    })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.courseId, courseId),
        inArray(orders.status, [...IN_PROGRESS_STATUSES]),
      ),
    )
    .limit(1);

  if (activeOrder) {
    return {
      allowed: false,
      reason:
        activeOrder.status === "pending" ? "pending-payment" : "in-progress",
      orderId: activeOrder.id,
      orderNumber: activeOrder.number,
      orderStatus: activeOrder.status,
    };
  }

  return { allowed: true };
}

export interface Receipt {
  orderId: string;
  orderNumber: number;
  courseTitle: string;
  amountToman: number;
  status: OrderRow["status"];
  paidAt: string;
  paymentRef: string | null;
  refundedAt: string | null;
  refundReason: string | null;
}

export async function listReceipts(
  userId: string,
  executor: AppDb = db,
): Promise<Receipt[]> {
  const rows = await executor
    .select({
      order: orders,
      courseTitle: sql<string>`coalesce(${orders.titleSnapshot}, ${courses.title})`,
      paymentRef: payments.refId,
    })
    .from(orders)
    .innerJoin(courses, eq(courses.id, orders.courseId))
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(and(eq(orders.userId, userId), isNotNull(orders.paidAt)))
    .orderBy(desc(orders.paidAt));

  return rows.map((row) => ({
    orderId: row.order.id,
    orderNumber: row.order.number,
    courseTitle: row.courseTitle,
    amountToman: row.order.totalToman,
    status: row.order.status,
    paidAt: row.order.paidAt?.toISOString() ?? row.order.createdAt.toISOString(),
    paymentRef: row.paymentRef,
    refundedAt: row.order.refundedAt?.toISOString() ?? null,
    refundReason: row.order.refundReason,
  }));
}

/* -------------------------------------------------------------------------- */
/* Admin actions                                                              */
/* -------------------------------------------------------------------------- */

async function lockOrder(
  tx: AppDb,
  orderId: string,
): Promise<OrderRow> {
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .for("update")
    .limit(1);

  if (!order) throw notFound("سفارش پیدا نشد.", "order_not_found");
  return order;
}

async function loadCustomerAndCourse(
  tx: AppDb,
  order: OrderRow,
): Promise<{ customer: UserRow; course: CourseRow }> {
  const [customer] = await tx
    .select()
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);
  const [course] = await tx
    .select()
    .from(courses)
    .where(eq(courses.id, order.courseId))
    .limit(1);

  if (!customer || !course) {
    throw notFound("اطلاعات سفارش کامل نیست.", "order_incomplete");
  }
  return { customer, course };
}

export async function holdOrder(
  params: {
    orderId: string;
    reason: string;
    sendDelayEmail: boolean;
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: FulfillmentDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const data = await executor.transaction(async (tx) => {
    const order = await lockOrder(tx, params.orderId);
    if (order.status === "fulfilled" || order.status === "refunded") {
      throw conflict(
        "سفارش تحویل‌شده یا بازگشت‌خورده را نمی‌توان متوقف کرد.",
        "order_not_holdable",
      );
    }
    if (order.status !== "awaiting_license" && order.status !== "on_hold") {
      throw conflict(
        "فقط سفارش در انتظار لایسنس را می‌توان متوقف کرد.",
        "order_not_holdable",
      );
    }

    await tx
      .update(orders)
      .set({
        status: "on_hold",
        onHoldReason: params.reason,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    const { customer, course } = await loadCustomerAndCourse(tx, order);

    await tx.insert(notifications).values({
      userId: order.userId,
      title: "سفارش شما در حال بررسی است",
      body: `صدور لایسنس دوره‌ی «${course.title}» کمی بیشتر طول می‌کشد.`,
      kind: "order",
      href: `/dashboard/orders/${order.id}`,
    });

    if (params.sendDelayEmail) {
      await queueDelayNotice(tx, {
        to: customer.email,
        fullName: customer.fullName,
        orderId: order.id,
        orderNumber: order.number,
        courseTitle: course.title,
        reason: params.reason,
      });
    }

    return { order, emailed: params.sendDelayEmail };
  });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "order.held",
      entityType: "order",
      entityId: data.order.id,
      summary: `سفارش #${data.order.number} با ثبت دلیل متوقف شد.`,
      details: { emailed: data.emailed },
      request: params.request,
    },
    executor,
  );
}

export async function resumeOrder(
  params: { orderId: string; actor: UserRow; request?: RequestMeta },
  deps: FulfillmentDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const order = await executor.transaction(async (tx) => {
    const locked = await lockOrder(tx, params.orderId);
    if (locked.status !== "on_hold") {
      throw conflict("این سفارش متوقف نیست.", "order_not_on_hold");
    }

    await tx
      .update(orders)
      .set({
        status: "awaiting_license",
        onHoldReason: null,
        updatedAt: now,
      })
      .where(eq(orders.id, locked.id));

    await tx.insert(notifications).values({
      userId: locked.userId,
      title: "سفارش شما از حالت انتظار خارج شد",
      body: "صدور لایسنس دوره‌ی شما دوباره در جریان قرار گرفت.",
      kind: "order",
      href: `/dashboard/orders/${locked.id}`,
    });

    return locked;
  });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "order.resumed",
      entityType: "order",
      entityId: order.id,
      summary: `سفارش #${order.number} از حالت توقف خارج شد.`,
      request: params.request,
    },
    executor,
  );
}

export async function sendDelayEmail(
  params: { orderId: string; actor: UserRow; request?: RequestMeta },
  deps: FulfillmentDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;

  const order = await executor.transaction(async (tx) => {
    const order = await lockOrder(tx, params.orderId);
    if (
      !(FULFILLMENT_STATUSES as readonly string[]).includes(order.status)
    ) {
      throw conflict(
        "برای این سفارش ایمیل تأخیر قابل ارسال نیست.",
        "order_not_fulfillable",
      );
    }
    const { customer, course } = await loadCustomerAndCourse(tx, order);

    await queueDelayNotice(tx, {
      to: customer.email,
      fullName: customer.fullName,
      orderId: order.id,
      orderNumber: order.number,
      courseTitle: course.title,
      reason: order.onHoldReason,
    });

    return order;
  });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "order.delay_notified",
      entityType: "order",
      entityId: order.id,
      summary: `ایمیل اطلاع‌رسانی تأخیر برای سفارش #${order.number} ارسال شد.`,
      request: params.request,
    },
    executor,
  );
}

export async function cancelOrder(
  params: {
    orderId: string;
    reason: string;
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: FulfillmentDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const data = await executor.transaction(async (tx) => {
    const order = await lockOrder(tx, params.orderId);
    if (order.status === "fulfilled") {
      throw conflict(
        "سفارش تحویل‌شده را باید از مسیر بازگشت وجه لغو کرد.",
        "order_already_fulfilled",
      );
    }
    if (order.status === "refunded" || order.status === "cancelled") {
      throw conflict("این سفارش قبلاً بسته شده است.", "order_closed");
    }
    if (
      !(
        ["pending", "awaiting_license", "on_hold"] as readonly string[]
      ).includes(order.status)
    ) {
      throw conflict("این سفارش قابل لغو نیست.", "order_not_cancellable");
    }

    await tx
      .update(orders)
      .set({
        status: "cancelled",
        cancelReason: params.reason,
        expiresAt: null,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await releaseDiscountReservation(tx, order.id, now);

    const { customer, course } = await loadCustomerAndCourse(tx, order);

    await tx.insert(notifications).values({
      userId: order.userId,
      title: "سفارش شما لغو شد",
      body: `سفارش دوره‌ی «${course.title}» لغو شد.`,
      kind: "order",
      href: `/dashboard/orders/${order.id}`,
    });

    await queueOrderCancelled(tx, {
      to: customer.email,
      fullName: customer.fullName,
      orderId: order.id,
      orderNumber: order.number,
      courseTitle: course.title,
      reason: params.reason,
    });

    return order;
  });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "order.cancelled",
      entityType: "order",
      entityId: data.id,
      summary: `سفارش #${data.number} لغو شد و دلیل آن ثبت گردید.`,
      request: params.request,
    },
    executor,
  );
}

export async function refundOrder(
  params: {
    orderId: string;
    reason: string;
    reference?: string;
    actor: UserRow;
    request?: RequestMeta;
  },
  deps: FulfillmentDeps = {},
): Promise<void> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const data = await executor.transaction(async (tx) => {
    const order = await lockOrder(tx, params.orderId);
    if (order.status === "refunded") {
      return { order, already: true, licenseRevoked: false };
    }
    if (
      !(
        ["fulfilled", "awaiting_license", "on_hold"] as readonly string[]
      ).includes(order.status)
    ) {
      throw conflict(
        "برای این سفارش بازگشت وجه دستی مجاز نیست.",
        "order_not_refundable",
      );
    }

    await tx
      .update(orders)
      .set({
        status: "refunded",
        refundedAt: now,
        refundReason: params.reason,
        refundReference: params.reference ?? null,
        expiresAt: null,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    const revoked = await tx
      .update(licenses)
      .set({
        status: "revoked",
        revokedAt: now,
        revokedReason: `بازگشت وجه: ${params.reason}`,
        updatedAt: now,
      })
      .where(and(eq(licenses.orderId, order.id), eq(licenses.status, "active")))
      .returning({ id: licenses.id });

    await releaseDiscountReservation(tx, order.id, now);

    const { customer, course } = await loadCustomerAndCourse(tx, order);

    await tx.insert(notifications).values({
      userId: order.userId,
      title: "بازگشت وجه ثبت شد",
      body: `سفارش دوره‌ی «${course.title}» بازگشت وجه شد و لایسنس آن لغو گردید.`,
      kind: "order",
      href: `/dashboard/orders/${order.id}`,
    });

    await queueRefundNotice(tx, {
      to: customer.email,
      fullName: customer.fullName,
      orderId: order.id,
      orderNumber: order.number,
      courseTitle: course.title,
      amountToman: order.totalToman,
      reason: params.reason,
    });

    return {
      order,
      already: false,
      licenseRevoked: revoked.length > 0,
    };
  });

  if (!data.already) {
    await writeAudit(
      {
        actor: { id: params.actor.id, name: params.actor.fullName },
        action: "order.refunded",
        entityType: "order",
        entityId: data.order.id,
        summary: `بازگشت وجه دستی برای سفارش #${data.order.number} ثبت شد.`,
        details: { licenseRevoked: data.licenseRevoked },
        request: params.request,
      },
      executor,
    );
  }
}

export async function setOrderNote(
  params: { orderId: string; note: string; actor: UserRow; request?: RequestMeta },
  executor: AppDb = db,
): Promise<void> {
  const [order] = await executor
    .select()
    .from(orders)
    .where(eq(orders.id, params.orderId))
    .limit(1);
  if (!order) throw notFound("سفارش پیدا نشد.", "order_not_found");

  await executor
    .update(orders)
    .set({ note: params.note.slice(0, 2_000), updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "order.note_updated",
      entityType: "order",
      entityId: order.id,
      summary: "یادداشت داخلی سفارش به‌روزرسانی شد.",
      request: params.request,
    },
    executor,
  );
}
