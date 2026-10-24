import type { DiscountCode } from "@/api/types";
import { formatNumber, toEnglishDigits, toPersianDigits } from "./format";

/**
 * موتور تخفیف؛ توابع خالص و بدون وابستگی به مرورگر.
 * همین فایل بعداً بدون تغییر در سرور هم قابل استفاده است.
 *
 * ترتیب بررسی‌ها:
 * ۱) وجود کد و فعال بودن
 * ۲) بازه‌ی زمانی
 * ۳) سقف کل مصرف
 * ۴) سقف مصرف هر کاربر
 * ۵) اعتبار برای دوره
 * ۶) حداقل مبلغ سفارش
 * ۷) فقط اولین خرید
 * ۸) محاسبه‌ی مبلغ و قاعده‌ی مبلغ صفر
 */

export const DISCOUNT_EMPTY_ERROR = "کد تخفیف را وارد کنید.";

/** پیام عمومی؛ وجود یا نبود کد را لو نمی‌دهد. */
export const DISCOUNT_GENERIC_ERROR =
  "کد تخفیف معتبر نیست یا برای این سفارش قابل استفاده نیست.";

export const DISCOUNT_FREE_ERROR =
  "مبلغ نهایی این سفارش صفر می‌شود و ثبت سفارش رایگان با این کد مجاز نیست.";

export const DISCOUNT_ZERO_ERROR =
  "این کد مبلغی از سفارش شما کم نمی‌کند؛ لطفاً کد دیگری وارد کنید.";

export type DiscountFailureReason =
  | "empty"
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "usage_limit"
  | "per_user_limit"
  | "course_mismatch"
  | "min_order"
  | "first_purchase_only"
  | "zero_amount"
  | "free_not_allowed";

export interface DiscountContext {
  /** مبلغ سفارش پیش از تخفیف، به تومان و عدد صحیح. */
  priceToman: number;
  courseId: string;
  /** تعداد دفعات استفاده‌ی همین کاربر از این کد. */
  userUsageCount: number;
  /** آیا کاربر تاکنون خرید موفقی داشته است؟ */
  isFirstPurchase: boolean;
  now?: Date;
}

export type DiscountEvaluation =
  | {
      valid: true;
      discount: DiscountCode;
      amountToman: number;
      finalToman: number;
      label: string;
    }
  | {
      valid: false;
      reason: DiscountFailureReason;
      message: string;
    };

function fail(
  reason: DiscountFailureReason,
  message: string = DISCOUNT_GENERIC_ERROR,
): DiscountEvaluation {
  return { valid: false, reason, message };
}

/**
 * نرمال‌سازی کد: حذف فاصله‌های اضافی، حروف بزرگ و تبدیل ارقام فارسی/عربی.
 */
export function normalizeDiscountCode(value: string): string {
  return toEnglishDigits(value).replace(/\s+/g, "").trim().toUpperCase();
}

export function describeDiscount(discount: DiscountCode): string {
  if (discount.type === "percent") {
    const percentLabel = `${toPersianDigits(discount.percent ?? 0)}٪ تخفیف`;
    return discount.maxDiscountToman
      ? `${percentLabel} تا سقف ${formatNumber(discount.maxDiscountToman)} تومان`
      : percentLabel;
  }
  return `${formatNumber(discount.amountToman ?? 0)} تومان تخفیف`;
}

/**
 * محاسبه‌ی مبلغ تخفیف.
 * درصدی: floor(قیمت × درصد / ۱۰۰) سپس سقف maxDiscountToman.
 * ثابت: min(مبلغ ثابت، قیمت).
 * نتیجه هرگز منفی یا بیشتر از قیمت نمی‌شود.
 */
export function computeDiscountAmount(
  discount: DiscountCode,
  priceToman: number,
): number {
  const safePrice = Number.isFinite(priceToman)
    ? Math.max(0, Math.floor(priceToman))
    : 0;

  let amount = 0;

  if (discount.type === "percent") {
    const percent = Math.min(100, Math.max(0, discount.percent ?? 0));
    amount = Math.floor((safePrice * percent) / 100);
    if (discount.maxDiscountToman && discount.maxDiscountToman > 0) {
      amount = Math.min(amount, Math.floor(discount.maxDiscountToman));
    }
  } else {
    amount = Math.floor(discount.amountToman ?? 0);
  }

  return Math.max(0, Math.min(amount, safePrice));
}

function isWithinWindow(discount: DiscountCode, now: Date): boolean {
  const timestamp = now.getTime();
  if (discount.startsAt) {
    const start = new Date(discount.startsAt).getTime();
    if (Number.isFinite(start) && start > timestamp) return false;
  }
  if (discount.expiresAt) {
    const end = new Date(discount.expiresAt).getTime();
    if (Number.isFinite(end) && end < timestamp) return false;
  }
  return true;
}

/** بررسی کامل و به‌ترتیب یک کد تخفیف برای یک سفارش. */
export function evaluateDiscount(
  discount: DiscountCode | null,
  context: DiscountContext,
): DiscountEvaluation {
  if (!discount) return fail("not_found");

  const now = context.now ?? new Date();

  if (!discount.active) return fail("inactive");
  if (!isWithinWindow(discount, now)) return fail("expired");

  if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses) {
    return fail("usage_limit");
  }

  if (
    discount.maxUsesPerUser > 0 &&
    context.userUsageCount >= discount.maxUsesPerUser
  ) {
    return fail("per_user_limit");
  }

  if (
    discount.courseIds &&
    discount.courseIds.length > 0 &&
    !discount.courseIds.includes(context.courseId)
  ) {
    return fail("course_mismatch");
  }

  if (
    discount.minOrderToman &&
    discount.minOrderToman > 0 &&
    context.priceToman < discount.minOrderToman
  ) {
    return fail("min_order");
  }

  if (discount.firstPurchaseOnly && !context.isFirstPurchase) {
    return fail("first_purchase_only");
  }

  const amountToman = computeDiscountAmount(discount, context.priceToman);
  if (amountToman <= 0) {
    return fail("zero_amount", DISCOUNT_ZERO_ERROR);
  }

  const finalToman = Math.max(0, context.priceToman - amountToman);
  if (finalToman === 0 && discount.allowFree !== true) {
    return fail("free_not_allowed", DISCOUNT_FREE_ERROR);
  }

  return {
    valid: true,
    discount,
    amountToman,
    finalToman,
    label: describeDiscount(discount),
  };
}

/** برای نمایش وضعیت کد در پنل مدیریت. */
export function isDiscountCurrentlyAvailable(
  discount: DiscountCode,
  now: Date = new Date(),
): boolean {
  if (!discount.active) return false;
  if (!isWithinWindow(discount, now)) return false;
  return discount.maxUses === 0 || discount.usedCount < discount.maxUses;
}
