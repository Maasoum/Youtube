import { and, asc, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  courses,
  orders,
  payments,
  users,
  type CourseRow,
  type OrderRow,
} from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { AppError, conflict, notFound } from "../lib/errors.js";
import { errorMeta, logger } from "../lib/logger.js";
import { writeAudit } from "./audit.js";
import { queueAdminNewOrderAlert, queuePaymentReceipt } from "./email.js";
import {
  toPublicOrder,
  redeemDiscountReservation,
  releaseDiscountReservation,
  type PublicOrder,
  type PublicOrderCourse,
} from "./orders.js";
import {
  createPayPingGateway,
  paymentUnavailableError,
} from "./payment-settings.js";
import {
  PayPingError,
  type PayPingGateway,
  type PayPingReport,
} from "./payping.js";

export type PaymentOutcomeState = "success" | "pending" | "failed" | "error";

export interface PaymentServiceDeps {
  db?: AppDb;
  gateway?: PayPingGateway | null;
  now?: () => Date;
}

export interface VerifyOrderPaymentInput {
  /** حداقل یکی از orderId یا code/clientRefId لازم است. */
  orderId?: string;
  userId?: string;
  refId?: string | null;
  code?: string | null;
  clientRefId?: string | null;
}

export interface VerifyOrderPaymentResult {
  state: PaymentOutcomeState;
  message: string;
  alreadyVerified: boolean;
  order: PublicOrder;
  trackingNumber: string | null;
  paidAt: string | null;
}

export interface CallbackResult {
  orderId: string | null;
  state: PaymentOutcomeState;
}

function nowOf(deps: PaymentServiceDeps): Date {
  return deps.now ? deps.now() : new Date();
}

function courseSummary(course: CourseRow, order: OrderRow): PublicOrderCourse {
  return {
    id: course.id,
    slug: course.slug,
    title: order.titleSnapshot || course.title,
    art: course.art,
    priceToman: course.priceToman,
  };
}

async function resolveGateway(
  deps: PaymentServiceDeps,
  executor: AppDb,
): Promise<PayPingGateway> {
  const gateway =
    deps.gateway !== undefined
      ? deps.gateway
      : await createPayPingGateway({ requireActive: false }, executor);

  if (!gateway) {
    throw paymentUnavailableError();
  }
  return gateway;
}

const PAYABLE_AGAIN_STATUSES = ["pending", "expired"] as const;
const FINAL_STATUSES = ["cancelled", "refunded", "failed"] as const;

function messageForState(state: PaymentOutcomeState): string {
  switch (state) {
    case "success":
      return "پرداخت با موفقیت تأیید شد.";
    case "pending":
      return "نتیجه‌ی پرداخت هنوز نهایی نشده است؛ چند لحظه بعد دوباره بررسی کنید.";
    case "failed":
      return "پرداخت تأیید نشد یا با اطلاعات سفارش هم‌خوانی ندارد.";
    default:
      return "بررسی پرداخت ممکن نشد؛ بعداً دوباره تلاش کنید.";
  }
}

/**
 * تطبیق کد پرداخت و شناسه‌ی ارجاع پذیرنده با سفارش، سپس تایید نزد پی‌پینگ.
 * مبلغ همیشه از سفارش (پایگاه داده) گرفته می‌شود، نه از ورودی.
 */
export async function verifyOrderPayment(
  input: VerifyOrderPaymentInput,
  deps: PaymentServiceDeps = {},
): Promise<VerifyOrderPaymentResult> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);

  const lookup = input.orderId
    ? eq(orders.id, input.orderId)
    : input.code
      ? eq(orders.paymentCode, input.code)
      : eq(orders.clientRefId, input.clientRefId ?? "");

  const [row] = await executor
    .select({ order: orders, course: courses })
    .from(orders)
    .innerJoin(courses, eq(orders.courseId, courses.id))
    .where(lookup)
    .limit(1);

  if (!row) {
    throw notFound("سفارش پیدا نشد.", "order_not_found");
  }

  const { order, course } = row;

  if (input.userId && order.userId !== input.userId) {
    // برای عدم افشای داده‌ی دیگران، پاسخ همان ۴۰۴ است.
    throw notFound("سفارش پیدا نشد.", "order_not_found");
  }

  if (order.totalToman === 0 || !order.paymentCode) {
    throw conflict(
      "این سفارش پرداخت آنلاین ندارد.",
      "order_not_payable",
    );
  }

  if (input.code && input.code !== order.paymentCode) {
    throw new AppError(
      409,
      "payment_reference_conflict",
      "اطلاعات پرداخت با این سفارش هم‌خوانی ندارد.",
    );
  }

  if (input.clientRefId && input.clientRefId !== order.clientRefId) {
    throw new AppError(
      409,
      "payment_reference_conflict",
      "اطلاعات پرداخت با این سفارش هم‌خوانی ندارد.",
    );
  }

  if ((FINAL_STATUSES as readonly string[]).includes(order.status)) {
    throw conflict(
      "این سفارش قابل پرداخت نیست. اگر مبلغی کسر شده، با پشتیبانی تماس بگیرید.",
      "order_not_payable",
    );
  }

  // تکراری‌بودن را قبل از تماس با درگاه هم بررسی می‌کنیم تا refIdهای تکراری
  // دوباره به درگاه فرستاده نشوند.
  if (input.refId) {
    const [existing] = await executor
      .select({ orderId: payments.orderId })
      .from(payments)
      .where(eq(payments.refId, input.refId))
      .limit(1);

    if (existing) {
      if (existing.orderId !== order.id) {
        throw new AppError(
          409,
          "payment_reference_conflict",
          "این تراکنش قبلاً برای سفارش دیگری ثبت شده است.",
        );
      }

      return {
        state: "success",
        message: messageForState("success"),
        alreadyVerified: true,
        order: toPublicOrder(order, courseSummary(course, order)),
        trackingNumber: input.refId,
        paidAt: order.paidAt?.toISOString() ?? null,
      };
    }
  }

  const gateway = await resolveGateway(deps, executor);

  // استعلام با کد پرداخت سفارش: هم شناسه‌ی ارجاع را معتبر می‌کند و هم از
  // جعل refId توسط کاربر جلوگیری می‌کند.
  let report: PayPingReport;
  try {
    report = await gateway.getPaymentReport(order.paymentCode);
  } catch (error) {
    if (error instanceof PayPingError && error.kind === "not_found") {
      throw new AppError(
        404,
        "payment_not_found",
        "پرداختی برای این سفارش پیدا نشد.",
      );
    }
    if (error instanceof PayPingError) {
      logger.warn(
        { ...errorMeta(error), gateway: error.kind, orderId: order.id },
        "استعلام وضعیت پرداخت ناموفق بود",
      );
      throw new AppError(
        502,
        "payment_gateway_unavailable",
        "ارتباط با درگاه برقرار نشد؛ چند لحظه بعد دوباره تلاش کنید.",
      );
    }
    throw error;
  }

  if (report.clientRefId && report.clientRefId !== order.clientRefId) {
    throw new AppError(
      409,
      "payment_reference_conflict",
      "اطلاعات پرداخت با این سفارش هم‌خوانی ندارد.",
    );
  }

  if (
    report.amountToman !== null &&
    report.amountToman !== order.totalToman
  ) {
    throw new AppError(
      422,
      "payment_amount_mismatch",
      "مبلغ پرداخت با مبلغ سفارش هم‌خوانی ندارد.",
    );
  }

  /**
   * برای تایید، فقط `refId` گزارش رسمی همین کد پرداخت استفاده می‌شود.
   * `refId` ورودی کاربر ممکن است متعلق به تراکنش دیگری با همان مبلغ باشد؛
   * حتی اگر کد پرداخت درست باشد، پذیرش آن می‌تواند پرداخت دیگری را به این
   * سفارش نسبت دهد. ورودی refId فقط برای بررسی تکراری‌بودن استفاده می‌شود.
   */
  const refId = report.refId;

  if (!refId) {
    if (report.isPaid || report.awaitingVerify) {
      throw new AppError(
        409,
        "payment_reference_missing",
        "شماره پیگیری پرداخت در دسترس نیست؛ چند لحظه بعد دوباره تلاش کنید.",
      );
    }
    throw new AppError(
      404,
      "payment_not_found",
      "پرداختی برای این سفارش پیدا نشد.",
    );
  }

  let verified: Awaited<ReturnType<PayPingGateway["verifyPayment"]>>;
  try {
    verified = await gateway.verifyPayment({
      refId,
      // فقط مبلغ ثبت‌شده در پایگاه داده؛ هر مبلغی در URL/بدنه نادیده گرفته می‌شود.
      amountToman: order.totalToman,
    });
  } catch (error) {
    if (error instanceof PayPingError) {
      switch (error.kind) {
        case "amount_mismatch":
          throw new AppError(
            422,
            "payment_amount_mismatch",
            "مبلغ پرداخت با مبلغ سفارش هم‌خوانی ندارد.",
          );
        case "pending_verification":
          throw new AppError(
            409,
            "payment_pending",
            "نتیجه‌ی پرداخت هنوز نهایی نشده است؛ چند لحظه بعد دوباره بررسی کنید.",
          );
        case "invalid_ref":
        case "not_found":
        case "invalid_request":
          throw new AppError(
            422,
            "payment_verification_failed",
            "پرداخت تأیید نشد یا با اطلاعات سفارش هم‌خوانی ندارد.",
          );
        case "invalid_token":
          throw paymentUnavailableError();
        default:
          throw new AppError(
            502,
            "payment_gateway_unavailable",
            "ارتباط با درگاه برقرار نشد؛ چند لحظه بعد دوباره تلاش کنید.",
          );
      }
    }
    throw error;
  }

  if (
    verified.amountToman !== null &&
    verified.amountToman !== order.totalToman
  ) {
    throw new AppError(
      422,
      "payment_amount_mismatch",
      "مبلغ پرداخت با مبلغ سفارش هم‌خوانی ندارد.",
    );
  }

  return commitVerifiedPayment({
    order,
    course,
    refId,
    paymentCode: order.paymentCode,
    verified,
    now,
  }, executor);
}

async function commitVerifiedPayment(
  params: {
    order: OrderRow;
    course: CourseRow;
    refId: string;
    paymentCode: string;
    verified: {
      alreadyVerified: boolean;
      cardNumberMasked: string | null;
      cardHashPan: string | null;
    };
    now: Date;
  },
  executor: AppDb,
): Promise<VerifyOrderPaymentResult> {
  const result = await executor.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, params.order.id))
      .for("update")
      .limit(1);

    if (!locked) {
      throw notFound("سفارش پیدا نشد.", "order_not_found");
    }

    const [existingByRef] = await tx
      .select({ id: payments.id, orderId: payments.orderId })
      .from(payments)
      .where(eq(payments.refId, params.refId))
      .limit(1);

    if (existingByRef) {
      if (existingByRef.orderId !== locked.id) {
        throw new AppError(
          409,
          "payment_reference_conflict",
          "این تراکنش قبلاً برای سفارش دیگری ثبت شده است.",
        );
      }

      return {
        order: locked,
        newlyVerified: false,
        paidAt: locked.paidAt,
      };
    }

    const [existingByOrder] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.orderId, locked.id))
      .limit(1);

    if (existingByOrder) {
      return {
        order: locked,
        newlyVerified: false,
        paidAt: locked.paidAt,
      };
    }

    if ((FINAL_STATUSES as readonly string[]).includes(locked.status)) {
      throw conflict(
        "این سفارش قابل پرداخت نیست. اگر مبلغی کسر شده، با پشتیبانی تماس بگیرید.",
        "order_not_payable",
      );
    }

    await tx.insert(payments).values({
      orderId: locked.id,
      code: params.paymentCode,
      refId: params.refId,
      cardNumberMasked: params.verified.cardNumberMasked,
      cardHashPan: params.verified.cardHashPan,
      rawResponse: {
        gateway: "payping",
        alreadyVerifiedAtProvider: params.verified.alreadyVerified,
        amountToman: locked.totalToman,
      },
      verifiedAt: params.now,
    });

    // سفارش منقضی هم اگر پولش کسر شده باشد پذیرفته می‌شود؛ فقط وضعیت‌های
    // نهایی (لغو/بازپرداخت/خطا) قابل احیا نیستند.
    const payableAgain = (PAYABLE_AGAIN_STATUSES as readonly string[]).includes(
      locked.status,
    );

    if (payableAgain) {
      await tx
        .update(orders)
        .set({
          status: "awaiting_license",
          paidAt: locked.paidAt ?? params.now,
          expiresAt: null,
          paymentCode: locked.paymentCode ?? params.paymentCode,
        })
        .where(eq(orders.id, locked.id));
    }

    await redeemDiscountReservation(tx, locked.id, params.now);

    return {
      order: {
        ...locked,
        status: payableAgain ? "awaiting_license" : locked.status,
        paidAt: locked.paidAt ?? params.now,
        expiresAt: payableAgain ? null : locked.expiresAt,
      },
      newlyVerified: true,
      paidAt: locked.paidAt ?? params.now,
    };
  });

  const [customer] = await executor
    .select({
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, result.order.userId))
    .limit(1);

  const publicOrder = toPublicOrder(
    result.order,
    courseSummary(params.course, result.order),
    {
      customer: customer
        ? {
            email: customer.email,
            fullName: customer.fullName,
            phone: customer.phone,
          }
        : undefined,
      paymentRef: params.refId,
      paymentVerifiedAt: params.now,
    },
  );

  if (result.newlyVerified) {
    await writeAudit(
      {
        actor: { id: null, name: "درگاه پرداخت" },
        action: "order.payment_verified",
        entityType: "order",
        entityId: result.order.id,
        summary: `پرداخت سفارش #${result.order.number} تأیید شد.`,
        details: {
          orderNumber: result.order.number,
          amountToman: result.order.totalToman,
          gateway: "payping",
        },
      },
      executor,
    );

    await queuePaymentReceipt(executor, {
      to: customer?.email ?? "",
      fullName: customer?.fullName ?? "",
      orderId: result.order.id,
      orderNumber: result.order.number,
      courseTitle: result.order.titleSnapshot,
      amountToman: result.order.totalToman,
      refId: params.refId,
      paidAt: params.now,
    });

    await queueAdminNewOrderAlert(executor, {
      orderId: result.order.id,
      orderNumber: result.order.number,
      customerName: customer?.fullName ?? "",
      customerEmail: customer?.email ?? "",
      courseTitle: result.order.titleSnapshot,
      totalToman: result.order.totalToman,
      isFree: false,
    });
  }

  return {
    state: "success",
    message: messageForState("success"),
    alreadyVerified: !result.newlyVerified,
    order: publicOrder,
    trackingNumber: params.refId,
    paidAt: result.paidAt?.toISOString() ?? null,
  };
}

export async function handlePaymentCallback(
  input: { code?: string | null; refId?: string | null; clientRefId?: string | null },
  deps: PaymentServiceDeps = {},
): Promise<CallbackResult> {
  const executor = deps.db ?? db;

  if (!input.code && !input.clientRefId) {
    return { orderId: null, state: "error" };
  }

  const [order] = await executor
    .select({ id: orders.id })
    .from(orders)
    .where(
      input.code
        ? eq(orders.paymentCode, input.code)
        : eq(orders.clientRefId, input.clientRefId ?? ""),
    )
    .limit(1);

  if (!order) {
    return { orderId: null, state: "error" };
  }

  try {
    const result = await verifyOrderPayment(
      {
        orderId: order.id,
        code: input.code ?? null,
        refId: input.refId ?? null,
        clientRefId: input.clientRefId ?? null,
      },
      deps,
    );
    return { orderId: order.id, state: result.state };
  } catch (error) {
    if (error instanceof AppError) {
      if (
        error.code === "payment_pending" ||
        error.code === "payment_gateway_unavailable" ||
        error.code === "payment_reference_missing"
      ) {
        return { orderId: order.id, state: "pending" };
      }
      return { orderId: order.id, state: "failed" };
    }
    logger.error(errorMeta(error), "پردازش بازگشت از درگاه ناموفق بود");
    return { orderId: order.id, state: "error" };
  }
}

export interface ExpirySweepResult {
  expired: number;
  verified: number;
  skipped: number;
}

/**
 * منقضی‌کردن سفارش‌های pending. پیش از انقضا، در صورت دسترسی به درگاه،
 * وضعیت تراکنش استعلام می‌شود و اگر پرداختی وجود داشته باشد تایید می‌گردد.
 */
export async function expirePendingOrders(
  deps: PaymentServiceDeps = {},
  limit = 25,
): Promise<ExpirySweepResult> {
  const executor = deps.db ?? db;
  const now = nowOf(deps);
  const summary: ExpirySweepResult = { expired: 0, verified: 0, skipped: 0 };

  const candidates = await executor
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        isNotNull(orders.expiresAt),
        lt(orders.expiresAt, now),
      ),
    )
    .orderBy(asc(orders.expiresAt))
    .limit(limit);

  if (candidates.length === 0) return summary;

  let gateway: PayPingGateway | null = null;
  try {
    gateway =
      deps.gateway !== undefined
        ? deps.gateway
        : await createPayPingGateway({ requireActive: false }, executor);
  } catch (error) {
    logger.warn(errorMeta(error), "ساخت درگاه برای بررسی انقضا ناموفق بود");
  }

  for (const candidate of candidates) {
    try {
      const [row] = await executor
        .select({ order: orders, course: courses })
        .from(orders)
        .innerJoin(courses, eq(orders.courseId, courses.id))
        .where(eq(orders.id, candidate.id))
        .limit(1);

      if (!row) {
        summary.skipped += 1;
        continue;
      }

      const { order } = row;
      if (
        order.status !== "pending" ||
        !order.expiresAt ||
        order.expiresAt.getTime() >= now.getTime()
      ) {
        summary.skipped += 1;
        continue;
      }

      if (order.paymentCode && gateway) {
        let report: PayPingReport | null = null;
        try {
          report = await gateway.getPaymentReport(order.paymentCode);
        } catch (error) {
          if (error instanceof PayPingError && error.kind === "not_found") {
            report = null;
          } else {
            // درگاه در دسترس نیست؛ این سفارش را برای اجرای بعدی نگه می‌داریم
            // تا پرداخت احتمالی از دست نرود.
            summary.skipped += 1;
            continue;
          }
        }

        if (report?.refId) {
          try {
            await verifyOrderPayment(
              {
                orderId: order.id,
                code: order.paymentCode,
                refId: report.refId,
                clientRefId: report.clientRefId,
              },
              { ...deps, db: executor, gateway, now: () => now },
            );
            summary.verified += 1;
          } catch (error) {
            /**
             * گیرنده‌ی بانکی شماره‌ی ارجاع صادر کرده است؛ حتی اگر تایید
             * فعلاً ممکن نباشد، منقضی‌کردن سفارش می‌تواند پول کسرشده را
             * بی‌صاحب کند. پس سفارش را برای بررسی بعدی pending نگه می‌داریم.
             */
            if (!(error instanceof AppError)) {
              logger.warn(errorMeta(error), "تایید خودکار پرداخت منقضی ناموفق بود");
            }
            summary.skipped += 1;
          }
          continue;
        } else if (report?.isPaid || report?.awaitingVerify) {
          // پرداخت انجام شده اما شماره پیگیری در دسترس نیست؛ منقضی نمی‌کنیم.
          summary.skipped += 1;
          continue;
        }
      } else if (order.paymentCode && !gateway) {
        // بدون توکن نمی‌توان وضعیت را استعلام کرد؛ سفارشِ دارای کد پرداخت را
        // منقضی نمی‌کنیم تا پرداخت احتمالی از دست نرود.
        summary.skipped += 1;
        continue;
      }

      const expired = await executor.transaction(async (tx) => {
        const rows = await tx
          .update(orders)
          .set({ status: "expired" })
          .where(
            and(
              eq(orders.id, order.id),
              eq(orders.status, "pending"),
              lt(orders.expiresAt, now),
            ),
          )
          .returning({ id: orders.id });

        if (rows.length === 0) return false;

        await releaseDiscountReservation(tx, order.id, now);
        return true;
      });

      if (expired) {
        summary.expired += 1;
        await writeAudit(
          {
            actor: { id: null, name: "سامانه" },
            action: "order.expired",
            entityType: "order",
            entityId: order.id,
            summary: `سفارش #${order.number} به دلیل پرداخت‌نشدن منقضی شد.`,
            details: { orderNumber: order.number, totalToman: order.totalToman },
          },
          executor,
        );
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.skipped += 1;
      logger.error(
        { ...errorMeta(error), orderId: candidate.id },
        "پردازش انقضای سفارش ناموفق بود",
      );
    }
  }

  return summary;
}
