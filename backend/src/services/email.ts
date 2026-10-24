import { emailOutbox } from "../db/schema.js";
import { env } from "../config/env.js";
import type { AppDb } from "../db/types.js";
import { formatJalaliDateTime, formatToman } from "../lib/format.js";
import {
  adminAlertEmail,
  delayNoticeEmail,
  licenseReadyEmail,
  licenseUpdatedEmail,
  orderCancelledEmail,
  passwordResetEmail,
  paymentReceiptEmail,
  refundNoticeEmail,
  verificationEmail,
  welcomeEmail,
} from "../lib/email-templates.js";

type EmailExecutor = Pick<AppDb, "insert">;

export interface QueueEmailInput {
  to: string;
  subject: string;
  template: string;
  text: string;
  html?: string | null;
  /** سفارش مرتبط؛ برای ایمیل‌های تراکنشی و جلوگیری از یادآوری تکراری. */
  orderId?: string | null;
  scheduledAt?: Date;
}

export async function queueEmail(
  executor: EmailExecutor,
  input: QueueEmailInput,
): Promise<void> {
  await executor.insert(emailOutbox).values({
    orderId: input.orderId ?? null,
    toEmail: input.to.trim().toLowerCase(),
    subject: input.subject.slice(0, 200),
    template: input.template.slice(0, 80),
    bodyText: input.text,
    bodyHtml: input.html ?? null,
    scheduledAt: input.scheduledAt ?? new Date(),
    status: "pending",
  });
}

export async function queueEmailVerification(
  executor: EmailExecutor,
  params: { to: string; fullName: string; token: string },
): Promise<void> {
  const link = `${env.APP_URL}/verify-email?token=${encodeURIComponent(params.token)}`;
  const rendered = verificationEmail({ fullName: params.fullName, link });

  await queueEmail(executor, {
    to: params.to,
    subject: rendered.subject,
    template: "email_verification",
    text: rendered.text,
    html: rendered.html,
  });
}

export async function queuePasswordReset(
  executor: EmailExecutor,
  params: { to: string; fullName: string; token: string },
): Promise<void> {
  const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(params.token)}`;
  const rendered = passwordResetEmail({ fullName: params.fullName, link });

  await queueEmail(executor, {
    to: params.to,
    subject: rendered.subject,
    template: "password_reset",
    text: rendered.text,
    html: rendered.html,
  });
}

export async function queueWelcomeEmail(
  executor: EmailExecutor,
  params: { to: string; fullName: string },
): Promise<void> {
  const rendered = welcomeEmail({ fullName: params.fullName });
  await queueEmail(executor, {
    to: params.to,
    subject: rendered.subject,
    template: "welcome",
    text: rendered.text,
    html: rendered.html,
  });
}

export async function queueAdminAlert(
  executor: EmailExecutor,
  params: { subject: string; text: string; lines?: string[]; orderId?: string },
): Promise<void> {
  const rendered = adminAlertEmail({
    subject: params.subject,
    lines: params.lines ?? params.text.split("\n").filter((line) => line.trim()),
  });

  await queueEmail(executor, {
    to: env.ADMIN_ALERT_EMAIL,
    subject: rendered.subject,
    template: "admin_alert",
    text: rendered.text,
    html: rendered.html,
    orderId: params.orderId ?? null,
  });
}

export interface PaymentReceiptEmailInput {
  to: string;
  fullName: string;
  orderId: string;
  orderNumber: number;
  courseTitle: string;
  amountToman: number;
  refId?: string | null;
  paidAt: Date;
}

/** رسید ثبت پرداخت؛ هیچ کلید لایسنس یا توکن درگاهی در ایمیل قرار نمی‌گیرد. */
export async function queuePaymentReceipt(
  executor: EmailExecutor,
  input: PaymentReceiptEmailInput,
): Promise<void> {
  const rendered = paymentReceiptEmail({
    fullName: input.fullName,
    orderNumber: input.orderNumber,
    courseTitle: input.courseTitle,
    amountToman: input.amountToman,
    refId: input.refId,
    paidAt: input.paidAt,
  });

  await queueEmail(executor, {
    to: input.to,
    subject: rendered.subject,
    template: "payment_receipt",
    text: rendered.text,
    html: rendered.html,
    orderId: input.orderId,
  });
}

export interface NewOrderAlertInput {
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  courseTitle: string;
  totalToman: number;
  isFree: boolean;
}

/** هشدار فوری به مدیر؛ عمداً بدون کلید لایسنس و توکن درگاه. */
export async function queueAdminNewOrderAlert(
  executor: EmailExecutor,
  input: NewOrderAlertInput,
): Promise<void> {
  const amountLine = input.isFree
    ? "این سفارش رایگان است و پرداخت آنلاین ندارد."
    : `مبلغ پرداخت‌شده: ${formatToman(input.totalToman)}`;

  await queueAdminAlert(executor, {
    subject: `سفارش جدید در انتظار صدور لایسنس (#${input.orderNumber})`,
    orderId: input.orderId,
    lines: [
      "یک سفارش جدید در انتظار صدور لایسنس است.",
      `شماره سفارش: ${input.orderNumber}`,
      `شناسه سفارش: ${input.orderId}`,
      `دوره: ${input.courseTitle}`,
      `مشتری: ${input.customerName}`,
      `ایمیل مشتری: ${input.customerEmail}`,
      amountLine,
      "برای ثبت لایسنس به پنل مدیریت مراجعه کنید.",
    ],
    text: "",
  });
}

export interface LicenseReadyEmailInput {
  to: string;
  fullName: string;
  orderId: string;
  orderNumber: number;
  courseTitle: string;
  /** فقط اگر تنظیمات عمومی اجازه داده باشد پر می‌شود. */
  licenseKey?: string | null;
  activationUrl?: string | null;
  activationInstructions?: string | null;
  isGift?: boolean;
}

/** ایمیل تحویل لایسنس؛ کلید فقط با روشن‌بودن تنظیمات در ایمیل می‌آید. */
export async function queueLicenseReady(
  executor: EmailExecutor,
  input: LicenseReadyEmailInput,
): Promise<void> {
  const rendered = licenseReadyEmail(input);

  await queueEmail(executor, {
    to: input.to,
    subject: rendered.subject,
    template: input.isGift ? "gift_license" : "license_delivery",
    text: rendered.text,
    html: rendered.html,
    orderId: input.orderId,
  });
}

export async function queueLicenseUpdated(
  executor: EmailExecutor,
  params: {
    to: string;
    fullName: string;
    orderId: string;
    courseTitle: string;
    licenseKey?: string | null;
  },
): Promise<void> {
  const rendered = licenseUpdatedEmail(params);
  await queueEmail(executor, {
    to: params.to,
    subject: rendered.subject,
    template: "license_updated",
    text: rendered.text,
    html: rendered.html,
    orderId: params.orderId,
  });
}

export async function queueDelayNotice(
  executor: EmailExecutor,
  params: {
    to: string;
    fullName: string;
    orderId: string;
    orderNumber: number;
    courseTitle: string;
    reason?: string | null;
  },
): Promise<void> {
  const rendered = delayNoticeEmail(params);
  await queueEmail(executor, {
    to: params.to,
    subject: rendered.subject,
    template: "delay_notice",
    text: rendered.text,
    html: rendered.html,
    orderId: params.orderId,
  });
}

export async function queueRefundNotice(
  executor: EmailExecutor,
  params: {
    to: string;
    fullName: string;
    orderId: string;
    orderNumber: number;
    courseTitle: string;
    amountToman: number;
    reason?: string | null;
  },
): Promise<void> {
  const rendered = refundNoticeEmail(params);
  await queueEmail(executor, {
    to: params.to,
    subject: rendered.subject,
    template: "refund_notice",
    text: rendered.text,
    html: rendered.html,
    orderId: params.orderId,
  });
}

export async function queueOrderCancelled(
  executor: EmailExecutor,
  params: {
    to: string;
    fullName: string;
    orderId: string;
    orderNumber: number;
    courseTitle: string;
    reason?: string | null;
  },
): Promise<void> {
  const rendered = orderCancelledEmail(params);
  await queueEmail(executor, {
    to: params.to,
    subject: rendered.subject,
    template: "order_cancelled",
    text: rendered.text,
    html: rendered.html,
    orderId: params.orderId,
  });
}

/** یادآوری روزانه‌ی سفارش‌های گذشته از SLA برای مدیر. */
export async function queueFulfillmentReminder(
  executor: EmailExecutor,
  params: {
    orderId: string;
    orderNumber: number;
    customerName: string;
    courseTitle: string;
    hoursOverdue: number;
  },
): Promise<void> {
  const rendered = adminAlertEmail({
    subject: `یادآوری: سفارش #${params.orderNumber} از مهلت تحویل گذشته است`,
    lines: [
      "این سفارش از مهلت تحویل لایسنس (SLA) گذشته است.",
      `شماره سفارش: ${params.orderNumber}`,
      `دوره: ${params.courseTitle}`,
      `مشتری: ${params.customerName}`,
      `تأخیر: ${formatHours(params.hoursOverdue)}`,
      "برای بررسی به صف تحویل لایسنس مراجعه کنید.",
    ],
  });

  await queueEmail(executor, {
    to: env.ADMIN_ALERT_EMAIL,
    subject: rendered.subject,
    template: "fulfillment_reminder",
    text: rendered.text,
    html: rendered.html,
    orderId: params.orderId,
  });
}

export async function queueAccountDeletionAlert(
  executor: EmailExecutor,
  params: { userId: string; fullName: string; email: string; reason?: string | null },
): Promise<void> {
  const rendered = adminAlertEmail({
    subject: "درخواست حذف حساب کاربری",
    lines: [
      "یک کاربر درخواست حذف حساب داده است.",
      `شناسه کاربر: ${params.userId}`,
      `نام: ${params.fullName}`,
      `ایمیل: ${params.email}`,
      ...(params.reason ? [`دلیل: ${params.reason}`] : []),
      "طبق رویه‌ی پشتیبانی، پیش از حذف داده‌های مالی و حسابرسی را بررسی کنید.",
    ],
  });

  await queueEmail(executor, {
    to: env.ADMIN_ALERT_EMAIL,
    subject: rendered.subject,
    template: "account_deletion_request",
    text: rendered.text,
    html: rendered.html,
  });
}

export function emailTimestamp(value: Date): string {
  return formatJalaliDateTime(value);
}

function formatHours(hours: number): string {
  const safe = Math.max(1, Math.round(hours));
  return `${safe.toLocaleString("fa-IR")} ساعت`;
}
