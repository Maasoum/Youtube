import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  courses,
  licenses,
  notifications,
  orders,
  users,
  type LicenseRow,
  type OrderRow,
  type UserRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import {
  decryptJson,
  encryptJson,
  fingerprint,
  randomToken,
} from "../lib/crypto.js";
import { uniqueConstraint } from "../lib/db-errors.js";
import { AppError, conflict, notFound } from "../lib/errors.js";
import { errorMeta, logger } from "../lib/logger.js";
import { writeAudit } from "./audit.js";
import {
  queueLicenseReady,
  queueLicenseUpdated,
} from "./email.js";
import { getGeneralSettings } from "./settings.js";

const ACTIVE_LICENSE_STATUSES = ["active"] as const;
const FULFILLABLE_STATUSES = ["awaiting_license", "on_hold"] as const;

export interface LicenseServiceDeps {
  db?: AppDb;
  now?: () => Date;
}

export interface LicensePayload {
  licenseKey: string;
  description: string | null;
  providerReference: string | null;
}

export interface FulfillOrderInput {
  licenseCode: string;
  description?: string;
  providerReference?: string;
  notifyUser: boolean;
  confirmDuplicate: boolean;
}

export interface GiftLicenseInput {
  email: string;
  courseId: string;
  licenseCode: string;
  description?: string;
  providerReference?: string;
  notifyUser: boolean;
  confirmDuplicate: boolean;
}

export interface EditLicenseInput {
  licenseCode?: string;
  description?: string;
  providerReference?: string;
  notifyUser: boolean;
  confirmDuplicate: boolean;
}

export interface LicenseReveal {
  licenseId: string;
  orderId: string;
  code: string;
  description: string | null;
  providerReference: string | null;
  providerName: string;
  providerPanelUrl: string | null;
  activationUrl: string | null;
  activationInstructions: string | null;
  status: LicenseRow["status"];
  source: LicenseRow["source"];
}

export interface LicenseListItem {
  id: string;
  maskedCode: string;
  orderId: string;
  orderNumber: number;
  userId: string;
  customerName: string;
  customerEmail: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  emailSentAt: string | null;
  source: LicenseRow["source"];
  revokedAt: string | null;
  revokeReason: string | null;
}

function nowOf(deps: LicenseServiceDeps): Date {
  return deps.now ? deps.now() : new Date();
}

function normalizeLicenseKey(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** فقط چهار نویسه‌ی آخر کلید برای فهرست‌ها نگه داشته می‌شود. */
export function licenseLast4(value: string): string {
  const compact = normalizeLicenseKey(value).replace(/\s+/g, "");
  return compact.length > 4 ? compact.slice(-4) : "";
}

export function maskLicenseKey(last4: string | null): string {
  return last4 ? `••••${last4}` : "••••";
}

export function fingerprintLicenseKey(value: string): string {
  return fingerprint(normalizeLicenseKey(value));
}

function encodePayload(input: {
  licenseCode: string;
  description?: string | null;
  providerReference?: string | null;
}): string {
  const payload: LicensePayload = {
    licenseKey: normalizeLicenseKey(input.licenseCode),
    description: input.description?.trim() || null,
    providerReference: input.providerReference?.trim() || null,
  };
  return encryptJson(payload);
}

function decodePayload(payloadEncrypted: string): LicensePayload {
  const parsed = decryptJson<Partial<LicensePayload>>(payloadEncrypted);
  if (!parsed || typeof parsed.licenseKey !== "string" || !parsed.licenseKey) {
    throw new AppError(
      500,
      "license_payload_invalid",
      "داده‌ی لایسنس قابل خواندن نیست؛ با پشتیبانی تماس بگیرید.",
    );
  }
  return {
    licenseKey: parsed.licenseKey,
    description: parsed.description ?? null,
    providerReference: parsed.providerReference ?? null,
  };
}

async function findDuplicateByFingerprint(
  executor: AppDb,
  keyFingerprint: string,
): Promise<LicenseRow | null> {
  const [row] = await executor
    .select()
    .from(licenses)
    .where(eq(licenses.keyFingerprint, keyFingerprint))
    .limit(1);
  return row ?? null;
}

function duplicateKeyError(): AppError {
  return conflict(
    "این کلید قبلاً برای سفارش دیگری ثبت شده است. اگر مطمئن هستید، با تأیید صریح دوباره ثبت کنید.",
    "license_duplicate",
  );
}

function toPublicListItem(row: {
  license: LicenseRow;
  order: OrderRow;
  courseTitle: string;
  customerName: string;
  customerEmail: string;
}): LicenseListItem {
  return {
    id: row.license.id,
    maskedCode: maskLicenseKey(row.license.keyLast4),
    orderId: row.license.orderId,
    orderNumber: row.order.number,
    userId: row.license.userId,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    courseId: row.license.courseId,
    courseTitle: row.courseTitle,
    issuedAt: row.license.deliveredAt.toISOString(),
    emailSentAt: row.license.emailSentAt?.toISOString() ?? null,
    source: row.license.source,
    revokedAt: row.license.revokedAt?.toISOString() ?? null,
    revokeReason: row.license.revokedReason,
  };
}

export async function listLicenses(
  options: {
    status?: "active" | "revoked";
    userId?: string;
    q?: string;
    limit?: number;
    offset?: number;
  } = {},
  executor: AppDb = db,
): Promise<LicenseListItem[]> {
  const conditions = [];
  if (options.status) conditions.push(eq(licenses.status, options.status));
  if (options.userId) conditions.push(eq(licenses.userId, options.userId));
  if (options.q) {
    const pattern = `%${options.q}%`;
    conditions.push(
      sql`(${users.fullName} ILIKE ${pattern} OR ${users.email} ILIKE ${pattern} OR ${courses.title} ILIKE ${pattern} OR ${orders.number}::text ILIKE ${pattern})`,
    );
  }

  const rows = await executor
    .select({
      license: licenses,
      order: orders,
      courseTitle: courses.title,
      customerName: users.fullName,
      customerEmail: users.email,
    })
    .from(licenses)
    .innerJoin(orders, eq(orders.id, licenses.orderId))
    .innerJoin(courses, eq(courses.id, licenses.courseId))
    .innerJoin(users, eq(users.id, licenses.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(licenses.deliveredAt))
    .limit(options.limit ?? 100)
    .offset(options.offset ?? 0);

  return rows.map(toPublicListItem);
}

async function loadLicenseRow(
  executor: AppDb,
  licenseId: string,
  options: { forUpdate?: boolean } = {},
): Promise<LicenseRow | null> {
  const query = executor
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1);

  const rows = options.forUpdate ? await query.for("update") : await query;
  return rows[0] ?? null;
}

async function revealFor(
  license: LicenseRow,
  executor: AppDb,
): Promise<LicenseReveal> {
  const payload = decodePayload(license.payloadEncrypted);
  const [course] = await executor
    .select()
    .from(courses)
    .where(eq(courses.id, license.courseId))
    .limit(1);

  return {
    licenseId: license.id,
    orderId: license.orderId,
    code: payload.licenseKey,
    description: payload.description,
    providerReference: payload.providerReference,
    providerName: course?.providerName ?? "",
    providerPanelUrl: course?.providerSiteUrl ?? null,
    activationUrl: course?.activationUrl ?? null,
    activationInstructions: course?.activationInstructions ?? null,
    status: license.status,
    source: license.source,
  };
}

/** نمایش کلید برای صاحب لایسنس؛ مالکیت پیش از فراخوانی بررسی می‌شود. */
export async function revealLicenseForUser(
  params: {
    userId: string;
    licenseId: string;
    actor: UserRow;
    request?: { ip?: string; userAgent?: string };
  },
  executor: AppDb = db,
): Promise<LicenseReveal> {
  const license = await loadLicenseRow(executor, params.licenseId);
  if (!license || license.userId !== params.userId) {
    // برای عدم افشای وجود لایسنس دیگران، پاسخ ۴۰۴ است.
    throw notFound("لایسنس پیدا نشد.", "license_not_found");
  }

  const reveal = await revealFor(license, executor);

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "license.revealed_by_user",
      entityType: "license",
      entityId: license.id,
      summary: "کاربر کلید لایسنس خود را در داشبورد مشاهده کرد.",
      request: params.request,
    },
    executor,
  );

  return reveal;
}

/** نمایش صریح کلید در پنل مدیر؛ هر مشاهده در audit ثبت می‌شود. */
export async function revealLicenseForAdmin(
  params: { licenseId: string; actor: UserRow; request?: { ip?: string; userAgent?: string } },
  executor: AppDb = db,
): Promise<LicenseReveal> {
  const license = await loadLicenseRow(executor, params.licenseId);
  if (!license) {
    throw notFound("لایسنس پیدا نشد.", "license_not_found");
  }

  const reveal = await revealFor(license, executor);

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "license.revealed_by_admin",
      entityType: "license",
      entityId: license.id,
      summary: "مدیر متن کلید لایسنس را مشاهده کرد.",
      request: params.request,
    },
    executor,
  );

  return reveal;
}


export interface FulfillOrderResult {
  licenseId: string;
  orderId: string;
  duplicateConfirmed: boolean;
  emailed: boolean;
}

/**
 * ثبت لایسنس و تحویل سفارش در یک تراکنش:
 * رمزنگاری payload، ساخت لایسنس، تغییر وضعیت سفارش، اعلان، ایمیل و audit.
 */
export async function fulfillOrder(
  params: {
    orderId: string;
    input: FulfillOrderInput;
    actor: UserRow;
    request?: { ip?: string; userAgent?: string };
  },
  deps: LicenseServiceDeps = {},
): Promise<FulfillOrderResult> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);
  const keyFingerprint = fingerprintLicenseKey(params.input.licenseCode);
  const payloadEncrypted = encodePayload(params.input);

  const result = await executor.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .for("update")
      .limit(1);
    const order = rows[0];

    if (!order) {
      throw notFound("سفارش پیدا نشد.", "order_not_found");
    }
    if (order.status === "fulfilled") {
      throw conflict("این سفارش قبلاً تحویل شده است.", "order_already_fulfilled");
    }
    if (
      !(FULFILLABLE_STATUSES as readonly string[]).includes(order.status)
    ) {
      throw conflict(
        "برای این سفارش نمی‌توان لایسنس ثبت کرد؛ وضعیت سفارش مناسب نیست.",
        "order_not_fulfillable",
      );
    }

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

    const duplicate = await findDuplicateByFingerprint(tx, keyFingerprint);
    if (duplicate && !params.input.confirmDuplicate) {
      throw duplicateKeyError();
    }

    const settings = await getGeneralSettings(tx);

    let license: LicenseRow | undefined;
    try {
      const inserted = await tx
        .insert(licenses)
        .values({
          userId: order.userId,
          courseId: order.courseId,
          orderId: order.id,
          payloadEncrypted,
          keyFingerprint,
          keyLast4: licenseLast4(params.input.licenseCode),
          status: "active",
          source: "purchase",
          deliveredBy: params.actor.id,
          deliveredAt: now,
          emailSentAt: params.input.notifyUser ? now : null,
        })
        .returning();
      license = inserted[0];
    } catch (error) {
      const constraint = uniqueConstraint(error);
      if (constraint?.includes("licenses_order_uq")) {
        throw conflict(
          "برای این سفارش قبلاً لایسنس ثبت شده است.",
          "order_already_fulfilled",
        );
      }
      if (constraint?.includes("licenses_active_user_course_uq")) {
        throw conflict(
          "این کاربر برای این دوره لایسنس فعال دارد.",
          "license_exists",
        );
      }
      throw error;
    }

    if (!license) throw new Error("ساخت لایسنس ناموفق بود.");

    await tx
      .update(orders)
      .set({
        status: "fulfilled",
        fulfilledAt: now,
        expiresAt: null,
        onHoldReason: null,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await tx.insert(notifications).values({
      userId: order.userId,
      title: "لایسنس شما آماده است",
      body: `لایسنس دوره‌ی «${course.title}» صادر شد. برای دیدن کلید به صفحه‌ی سفارش بروید.`,
      kind: "license",
      href: `/dashboard/orders/${order.id}`,
    });

    if (params.input.notifyUser) {
      await queueLicenseReady(tx, {
        to: customer.email,
        fullName: customer.fullName,
        orderId: order.id,
        orderNumber: order.number,
        courseTitle: course.title,
        licenseKey: settings.includeLicenseKeyInEmail
          ? normalizeLicenseKey(params.input.licenseCode)
          : null,
        activationUrl: course.activationUrl,
        activationInstructions: course.activationInstructions,
        isGift: false,
      });
    }

    return {
      license,
      order,
      courseTitle: course.title,
      customerName: customer.fullName,
    };
  });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "license.issued",
      entityType: "license",
      entityId: result.license.id,
      summary: `لایسنس سفارش #${result.order.number} ثبت و سفارش تحویل شد.`,
      details: {
        orderNumber: result.order.number,
        courseId: result.license.courseId,
        duplicateConfirmed: params.input.confirmDuplicate,
        emailed: params.input.notifyUser,
      },
      request: params.request,
    },
    executor,
  );

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "order.fulfilled",
      entityType: "order",
      entityId: result.order.id,
      summary: `سفارش #${result.order.number} با ثبت لایسنس تحویل شد.`,
      details: { licenseId: result.license.id },
      request: params.request,
    },
    executor,
  );

  return {
    licenseId: result.license.id,
    orderId: result.order.id,
    duplicateConfirmed: params.input.confirmDuplicate,
    emailed: params.input.notifyUser,
  };
}

/** اعطای دستی لایسنس با ساخت سفارش هدیه (source=admin_gift). */
export async function grantGiftLicense(
  params: {
    input: GiftLicenseInput;
    actor: UserRow;
    request?: { ip?: string; userAgent?: string };
  },
  deps: LicenseServiceDeps = {},
): Promise<{ orderId: string; licenseId: string; orderNumber: number }> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);
  const keyFingerprint = fingerprintLicenseKey(params.input.licenseCode);
  const payloadEncrypted = encodePayload({
    licenseCode: params.input.licenseCode,
    description: params.input.description,
    providerReference: params.input.providerReference,
  });

  const result = await executor.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${params.input.email.toLowerCase()}`)
      .limit(1);

    if (!customer) {
      throw notFound(
        "کاربری با این ایمیل پیدا نشد؛ ابتدا حساب او را بسازید.",
        "user_not_found",
      );
    }
    if (customer.disabledAt) {
      throw conflict("حساب این کاربر غیرفعال است.", "user_disabled");
    }

    const [course] = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, params.input.courseId))
      .limit(1);

    if (!course) {
      throw notFound("دوره پیدا نشد.", "course_not_found");
    }

    const [activeLicense] = await tx
      .select({ id: licenses.id })
      .from(licenses)
      .where(
        and(
          eq(licenses.userId, customer.id),
          eq(licenses.courseId, course.id),
          inArray(licenses.status, [...ACTIVE_LICENSE_STATUSES]),
        ),
      )
      .limit(1);

    if (activeLicense) {
      throw conflict(
        "این کاربر برای این دوره لایسنس فعال دارد.",
        "already_owned",
      );
    }

    const duplicate = await findDuplicateByFingerprint(tx, keyFingerprint);
    if (duplicate && !params.input.confirmDuplicate) {
      throw duplicateKeyError();
    }

    const settings = await getGeneralSettings(tx);

    let order: OrderRow | undefined;
    try {
      const insertedOrders = await tx
        .insert(orders)
        .values({
          userId: customer.id,
          courseId: course.id,
          titleSnapshot: course.title,
          unitPriceSnapshot: course.priceToman,
          discountToman: 0,
          totalToman: 0,
          status: "fulfilled",
          source: "gift",
          clientRefId: `GIFT-${randomToken(12).toUpperCase()}`,
          fulfilledAt: now,
        })
        .returning();
      order = insertedOrders[0];
    } catch (error) {
      if (uniqueConstraint(error)?.includes("orders_active_user_course_uq")) {
        throw conflict(
          "این کاربر برای این دوره سفارش در جریان دارد.",
          "order_in_progress",
        );
      }
      throw error;
    }

    if (!order) throw new Error("ساخت سفارش هدیه ناموفق بود.");

    const insertedLicenses = await tx
      .insert(licenses)
      .values({
        userId: customer.id,
        courseId: course.id,
        orderId: order.id,
        payloadEncrypted,
        keyFingerprint,
        keyLast4: licenseLast4(params.input.licenseCode),
        status: "active",
        source: "admin_gift",
        deliveredBy: params.actor.id,
        deliveredAt: now,
        emailSentAt: params.input.notifyUser ? now : null,
      })
      .returning();

    const license = insertedLicenses[0];
    if (!license) throw new Error("ساخت لایسنس هدیه ناموفق بود.");

    await tx.insert(notifications).values({
      userId: customer.id,
      title: "یک دوره به شما هدیه شد",
      body: `دوره‌ی «${course.title}» به حساب شما اضافه شد.`,
      kind: "license",
      href: `/dashboard/orders/${order.id}`,
    });

    if (params.input.notifyUser) {
      await queueLicenseReady(tx, {
        to: customer.email,
        fullName: customer.fullName,
        orderId: order.id,
        orderNumber: order.number,
        courseTitle: course.title,
        licenseKey: settings.includeLicenseKeyInEmail
          ? normalizeLicenseKey(params.input.licenseCode)
          : null,
        activationUrl: course.activationUrl,
        activationInstructions: course.activationInstructions,
        isGift: true,
      });
    }

    return {
      orderId: order.id,
      licenseId: license.id,
      orderNumber: order.number,
      licenseSource: license.source,
    };
  });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "license.gifted",
      entityType: "license",
      entityId: result.licenseId,
      summary: `لایسنس هدیه برای سفارش #${result.orderNumber} ثبت شد.`,
      details: {
        orderNumber: result.orderNumber,
        courseId: params.input.courseId,
        duplicateConfirmed: params.input.confirmDuplicate,
        emailed: params.input.notifyUser,
      },
      request: params.request,
    },
    executor,
  );

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "order.gifted",
      entityType: "order",
      entityId: result.orderId,
      summary: `سفارش هدیه #${result.orderNumber} با لایسنس ثبت شد.`,
      details: { licenseId: result.licenseId },
      request: params.request,
    },
    executor,
  );

  return {
    orderId: result.orderId,
    licenseId: result.licenseId,
    orderNumber: result.orderNumber,
  };
}

/** ویرایش کلید/اطلاعات تکمیلی لایسنس و ارسال اختیاری ایمیل به‌روزرسانی. */
export async function editLicense(
  params: {
    licenseId: string;
    input: EditLicenseInput;
    actor: UserRow;
    request?: { ip?: string; userAgent?: string };
  },
  deps: LicenseServiceDeps = {},
): Promise<{ licenseId: string; orderId: string; emailed: boolean }> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const result = await executor.transaction(async (tx) => {
    const license = await loadLicenseRow(tx, params.licenseId, { forUpdate: true });
    if (!license) {
      throw notFound("لایسنس پیدا نشد.", "license_not_found");
    }
    if (license.status === "revoked") {
      throw conflict(
        "لایسنس لغوشده قابل ویرایش نیست.",
        "license_revoked",
      );
    }

    const current = decodePayload(license.payloadEncrypted);
    const nextKey =
      params.input.licenseCode !== undefined
        ? normalizeLicenseKey(params.input.licenseCode)
        : current.licenseKey;
    const nextFingerprint = fingerprintLicenseKey(nextKey);

    if (nextFingerprint !== license.keyFingerprint) {
      const duplicate = await findDuplicateByFingerprint(tx, nextFingerprint);
      if (duplicate && duplicate.id !== license.id && !params.input.confirmDuplicate) {
        throw duplicateKeyError();
      }
    }

    const payloadEncrypted = encodePayload({
      licenseCode: nextKey,
      description:
        params.input.description !== undefined
          ? params.input.description
          : current.description,
      providerReference:
        params.input.providerReference !== undefined
          ? params.input.providerReference
          : current.providerReference,
    });

    await tx
      .update(licenses)
      .set({
        payloadEncrypted,
        keyFingerprint: nextFingerprint,
        keyLast4: licenseLast4(nextKey),
        emailSentAt: params.input.notifyUser ? now : license.emailSentAt,
        updatedAt: now,
      })
      .where(eq(licenses.id, license.id));

    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, license.orderId))
      .limit(1);
    const [customer] = await tx
      .select()
      .from(users)
      .where(eq(users.id, license.userId))
      .limit(1);
    const [course] = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, license.courseId))
      .limit(1);

    if (!order || !customer || !course) {
      throw notFound("اطلاعات لایسنس کامل نیست.", "license_incomplete");
    }

    if (params.input.notifyUser) {
      const settings = await getGeneralSettings(tx);
      await queueLicenseUpdated(tx, {
        to: customer.email,
        fullName: customer.fullName,
        orderId: order.id,
        courseTitle: course.title,
        licenseKey: settings.includeLicenseKeyInEmail ? nextKey : null,
      });
    }

    return { licenseId: license.id, orderId: order.id };
  });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "license.updated",
      entityType: "license",
      entityId: result.licenseId,
      summary: "اطلاعات لایسنس ویرایش شد.",
      details: { emailed: params.input.notifyUser },
      request: params.request,
    },
    executor,
  );

  return { ...result, emailed: params.input.notifyUser };
}

/** لغو لایسنس؛ سابقه حفظ می‌شود و کلید دیگر معتبر نیست. */
export async function revokeLicense(
  params: {
    licenseId: string;
    reason: string;
    actor: UserRow;
    request?: { ip?: string; userAgent?: string };
  },
  deps: LicenseServiceDeps = {},
): Promise<{ licenseId: string; orderId: string; alreadyRevoked: boolean }> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const result = await executor.transaction(async (tx) => {
    const license = await loadLicenseRow(tx, params.licenseId, { forUpdate: true });
    if (!license) {
      throw notFound("لایسنس پیدا نشد.", "license_not_found");
    }

    if (license.status === "revoked") {
      return {
        licenseId: license.id,
        orderId: license.orderId,
        alreadyRevoked: true,
      };
    }

    await tx
      .update(licenses)
      .set({
        status: "revoked",
        revokedAt: now,
        revokedReason: params.reason,
        updatedAt: now,
      })
      .where(eq(licenses.id, license.id));

    await tx.insert(notifications).values({
      userId: license.userId,
      title: "لایسنس شما لغو شد",
      body: "لایسنس یکی از دوره‌های شما لغو شده است. برای پیگیری با پشتیبانی تماس بگیرید.",
      kind: "license",
      href: `/dashboard/orders/${license.orderId}`,
    });

    return {
      licenseId: license.id,
      orderId: license.orderId,
      alreadyRevoked: false,
    };
  });

  if (!result.alreadyRevoked) {
    await writeAudit(
      {
        actor: { id: params.actor.id, name: params.actor.fullName },
        action: "license.revoked",
        entityType: "license",
        entityId: result.licenseId,
        summary: "لایسنس با ثبت دلیل لغو شد.",
        request: params.request,
      },
      executor,
    );
  }

  return result;
}

/** ارسال مجدد ایمیل لایسنس؛ کلید فقط با مجوز تنظیمات در ایمیل می‌آید. */
export async function resendLicenseEmail(
  params: {
    orderId: string;
    actor: UserRow;
    request?: { ip?: string; userAgent?: string };
  },
  deps: LicenseServiceDeps = {},
): Promise<{ orderId: string; licenseId: string; includesKey: boolean }> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const result = await executor.transaction(async (tx) => {
    const [row] = await tx
      .select({ order: orders, customer: users, course: courses, license: licenses })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .innerJoin(courses, eq(courses.id, orders.courseId))
      .innerJoin(licenses, eq(licenses.orderId, orders.id))
      .where(eq(orders.id, params.orderId))
      .limit(1);

    if (!row) {
      throw notFound(
        "برای این سفارش لایسنس ثبت نشده است.",
        "license_not_found",
      );
    }
    if (row.license.status === "revoked") {
      throw conflict("لایسنس این سفارش لغو شده است.", "license_revoked");
    }

    const payload = decodePayload(row.license.payloadEncrypted);
    const settings = await getGeneralSettings(tx);

    await queueLicenseReady(tx, {
      to: row.customer.email,
      fullName: row.customer.fullName,
      orderId: row.order.id,
      orderNumber: row.order.number,
      courseTitle: row.course.title,
      licenseKey: settings.includeLicenseKeyInEmail ? payload.licenseKey : null,
      activationUrl: row.course.activationUrl,
      activationInstructions: row.course.activationInstructions,
      isGift: row.license.source === "admin_gift",
    });

    await tx
      .update(licenses)
      .set({ emailSentAt: now, updatedAt: now })
      .where(eq(licenses.id, row.license.id));

    return {
      orderId: row.order.id,
      licenseId: row.license.id,
      includesKey: settings.includeLicenseKeyInEmail,
    };
  });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "license.email_resent",
      entityType: "license",
      entityId: result.licenseId,
      summary: "ایمیل لایسنس دوباره در صف ارسال قرار گرفت.",
      details: { includesKey: result.includesKey },
      request: params.request,
    },
    executor,
  );

  return result;
}

export async function getLicenseForUser(
  userId: string,
  licenseId: string,
  executor: AppDb = db,
): Promise<LicenseRow | null> {
  const [row] = await executor
    .select()
    .from(licenses)
    .where(and(eq(licenses.id, licenseId), eq(licenses.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** بررسی وجود کلید در سامانه، بدون برگرداندن کلید یا اطلاعات دیگران. */
export async function isLicenseKeyDuplicate(
  key: string,
  executor: AppDb = db,
): Promise<boolean> {
  const rows = await executor
    .select({ id: licenses.id })
    .from(licenses)
    .where(eq(licenses.keyFingerprint, fingerprintLicenseKey(key)))
    .limit(1);
  return rows.length > 0;
}

export function licenseDebugLabel(row: LicenseRow): string {
  return `license:${row.id.slice(0, 8)}`;
}

export function logLicenseError(error: unknown, action: string): void {
  logger.error({ ...errorMeta(error), action }, "عملیات لایسنس ناموفق بود");
}
