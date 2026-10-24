import type { CourseLevel, OrderStatus } from "@/api";
import { toPersianDigits } from "./format";

export const courseLevelLabels: Record<CourseLevel, string> = {
  beginner: "مقدماتی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "در انتظار پرداخت",
  awaiting_license: "در انتظار صدور لایسنس",
  fulfilled: "لایسنس تحویل شد",
  on_hold: "در حال بررسی",
  failed: "پرداخت ناموفق",
  cancelled: "لغو شده",
  expired: "منقضی شده",
  refunded: "بازگشت وجه",
};

/** سفارش‌هایی که پول دریافت کرده‌اند (به‌جز موارد بازگشت‌داده‌شده). */
export const paidOrderStatuses: OrderStatus[] = [
  "awaiting_license",
  "fulfilled",
  "on_hold",
];

/** سفارش‌هایی که نشان می‌دهند کاربر برای دوره لایسنس فعال دارد. */
export const licenseOrderStatuses: OrderStatus[] = ["fulfilled"];

/** سفارش‌های در جریان که خرید دوباره را مسدود می‌کنند. */
export const blockingOrderStatuses: OrderStatus[] = [
  "pending",
  "awaiting_license",
  "on_hold",
];

export function isPaidOrder(status: OrderStatus): boolean {
  return paidOrderStatuses.includes(status);
}

export function isBlockingOrder(status: OrderStatus): boolean {
  return blockingOrderStatuses.includes(status);
}

export function formatAgeRange(min: number, max: number): string {
  return `${toPersianDigits(min)} تا ${toPersianDigits(max)} سال`;
}

export function formatWeeks(weeks: number): string {
  return `${toPersianDigits(weeks)} هفته`;
}

export function formatSessions(sessions: number): string {
  return `${toPersianDigits(sessions)} جلسه`;
}

export function formatOrderNumber(number: number): string {
  return `سفارش ${toPersianDigits(number)}`;
}

/** برچسب فارسی اقدام‌های گزارش حسابرسیِ نمایشی. */
export const auditActionLabels: Record<string, string> = {
  "license.fulfilled": "ثبت لایسنس",
  "license.duplicate_accepted": "ثبت لایسنس با کلید تکراری",
  "license.updated": "ویرایش لایسنس",
  "license.revealed": "نمایش کلید لایسنس",
  "license.gifted": "صدور لایسنس هدیه",
  "license.email_resent": "ارسال دوباره‌ی ایمیل لایسنس",
  "license.revoked": "لغو لایسنس",
  "order.on_hold": "قرار دادن سفارش در حال بررسی",
  "order.resumed": "بازگشت سفارش به صف",
  "order.cancelled": "لغو سفارش",
  "order.refunded": "ثبت بازگشت وجه",
  "order.delay_email_sent": "ارسال ایمیل تأخیر",
  "discount.created": "ساخت کد تخفیف",
  "discount.updated": "ویرایش کد تخفیف",
  "discount.deleted": "حذف کد تخفیف",
  "discount.activated": "فعال‌سازی کد تخفیف",
  "discount.deactivated": "غیرفعال‌سازی کد تخفیف",
  "discount.bulk_created": "ساخت گروهی کد تخفیف",
  "course.created": "ساخت دوره",
  "course.updated": "ویرایش دوره",
  "course.deleted": "حذف دوره",
  "course.published": "انتشار دوره",
  "course.unpublished": "خروج دوره از انتشار",
  "post.created": "ساخت مقاله",
  "post.updated": "ویرایش مقاله",
  "post.deleted": "حذف مقاله",
  "post.published": "انتشار مقاله",
  "post.unpublished": "انتقال مقاله به پیش‌نویس",
  "faq.created": "ساخت پرسش متداول",
  "faq.updated": "ویرایش پرسش متداول",
  "faq.deleted": "حذف پرسش متداول",
  "faq.reordered": "تغییر ترتیب پرسش‌ها",
  "teacher.created": "افزودن مربی",
  "teacher.updated": "ویرایش مربی",
  "teacher.deleted": "حذف مربی",
  "teacher.reordered": "تغییر ترتیب مربیان",
  "message.status_changed": "تغییر وضعیت پیام",
  "lead.deleted": "حذف لید",
  "user.disabled": "غیرفعال‌سازی حساب",
  "user.enabled": "فعال‌سازی حساب",
  "settings.updated": "ویرایش تنظیمات عمومی",
  "payment.token_saved": "ذخیره‌ی توکن درگاه",
  "payment.enabled": "فعال‌سازی درگاه پرداخت",
  "payment.disabled": "غیرفعال‌سازی درگاه پرداخت",
  "payment.tested": "تست اتصال درگاه پرداخت",
  "account.password_changed": "تغییر رمز عبور",
  "account.deletion_requested": "درخواست حذف حساب",
};

export function auditActionLabel(action: string): string {
  return auditActionLabels[action] ?? action;
}

export const messageStatusLabels = {
  new: "تازه",
  read: "خوانده‌شده",
  done: "انجام‌شده",
} as const;

export const contentStatusLabels = {
  draft: "پیش‌نویس",
  published: "منتشرشده",
} as const;

export const teacherAccentLabels = {
  lavender: "بنفش روشن",
  yellow: "زرد",
  sky: "آبی آسمانی",
  coral: "مرجانی",
} as const;

export const messageStatusStyles = {
  new: "bg-accent text-ink",
  read: "bg-sky-50 text-sky-800",
  done: "bg-emerald-50 text-emerald-800",
} as const;
