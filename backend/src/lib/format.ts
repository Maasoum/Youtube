const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function formatToman(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString("fa-IR")} تومان`;
}

const jalaliFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

/** تاریخ جلالی برای متن ایمیل‌ها؛ ورودی نامعتبر به مقدار خالی تبدیل می‌شود. */
export function formatJalaliDateTime(value: Date): string {
  if (Number.isNaN(value.getTime())) return "";
  return jalaliFormatter.format(value);
}
