/**
 * موتور تخفیف سمت سرور؛ همان منطق `src/lib/discount.ts` فرانت‌اند با توابع
 * خالص و بدون وابستگی به پایگاه داده. مبلغ نهایی فقط با همین توابع محاسبه
 * می‌شود و ورودی کلاینت هرگز مبنای قیمت نیست.
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

export interface DiscountRule {
  code: string;
  type: "percent" | "fixed";
  /** در کدهای درصدی، درصد تخفیف. */
  percent?: number | null;
  /** در کدهای ثابت، مبلغ تخفیف به تومان. */
  amountToman?: number | null;
  /** سقف تخفیف برای کدهای درصدی. */
  maxDiscountToman?: number | null;
  minOrderToman?: number | null;
  active: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  /** صفر یعنی بدون سقف. */
  maxUses: number;
  usedCount: number;
  /** صفر یعنی بدون سقف. */
  perUserLimit: number;
  /** خالی یعنی برای همه‌ی دوره‌ها. */
  courseIds?: string[] | null;
  firstPurchaseOnly?: boolean;
  allowFree?: boolean;
}

export interface DiscountContext {
  /** مبلغ سفارش پیش از تخفیف، به تومان و عدد صحیح. */
  priceToman: number;
  courseId: string;
  /** تعداد استفاده‌های در جریان یا تکمیل‌شده‌ی همین کاربر از این کد. */
  userUsageCount: number;
  /** آیا کاربر تاکنون خرید موفقی داشته است؟ */
  isFirstPurchase: boolean;
  now?: Date;
}

export type DiscountEvaluation =
  | {
      valid: true;
      discount: DiscountRule;
      amountToman: number;
      finalToman: number;
      label: string;
    }
  | {
      valid: false;
      reason: DiscountFailureReason;
      message: string;
    };

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(char);
    if (persianIndex >= 0) return String(persianIndex);
    return String(ARABIC_DIGITS.indexOf(char));
  });
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

function fail(
  reason: DiscountFailureReason,
  message: string = DISCOUNT_GENERIC_ERROR,
): DiscountEvaluation {
  return { valid: false, reason, message };
}

/** نرمال‌سازی کد: حذف فاصله‌ها، حروف بزرگ و تبدیل ارقام فارسی/عربی. */
export function normalizeDiscountCode(value: string): string {
  return toEnglishDigits(value).replace(/\s+/g, "").trim().toUpperCase();
}

export function describeDiscount(discount: DiscountRule): string {
  if (discount.type === "percent") {
    const percentLabel = `${toPersianDigits(discount.percent ?? 0)}٪ تخفیف`;
    return discount.maxDiscountToman && discount.maxDiscountToman > 0
      ? `${percentLabel} تا سقف ${discount.maxDiscountToman.toLocaleString("fa-IR")} تومان`
      : percentLabel;
  }
  return `${(discount.amountToman ?? 0).toLocaleString("fa-IR")} تومان تخفیف`;
}

/**
 * محاسبه‌ی مبلغ تخفیف.
 * درصدی: floor(قیمت × درصد / ۱۰۰) سپس سقف maxDiscountToman.
 * ثابت: min(مبلغ ثابت، قیمت).
 */
export function computeDiscountAmount(
  discount: Pick<
    DiscountRule,
    "type" | "percent" | "amountToman" | "maxDiscountToman"
  >,
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

function toTimestamp(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isWithinWindow(discount: DiscountRule, now: Date): boolean {
  const timestamp = now.getTime();
  const start = toTimestamp(discount.startsAt);
  if (start !== null && start > timestamp) return false;
  const end = toTimestamp(discount.endsAt);
  if (end !== null && end < timestamp) return false;
  return true;
}

/** بررسی کامل و به‌ترتیب یک کد تخفیف برای یک سفارش. */
export function evaluateDiscount(
  discount: DiscountRule | null,
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
    discount.perUserLimit > 0 &&
    context.userUsageCount >= discount.perUserLimit
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

  if (discount.firstPurchaseOnly === true && !context.isFirstPurchase) {
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
  discount: DiscountRule,
  now: Date = new Date(),
): boolean {
  if (!discount.active) return false;
  if (!isWithinWindow(discount, now)) return false;
  return discount.maxUses === 0 || discount.usedCount < discount.maxUses;
}
