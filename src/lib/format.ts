const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل ارقام فارسی و عربی به ارقام لاتین برای اعتبارسنجی و داده‌های داخلی. */
export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(char);
    if (persianIndex >= 0) return String(persianIndex);
    return String(ARABIC_DIGITS.indexOf(char));
  });
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

const numberFormatter = new Intl.NumberFormat("fa-IR");

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatToman(value: number): string {
  return `${formatNumber(value)} تومان`;
}

export function formatPercent(value: number): string {
  return `${formatNumber(value)}٪`;
}

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "—";
  return dateFormatter.format(date);
}

export function formatShortDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "—";
  return shortDateFormatter.format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "—";
  return dateTimeFormatter.format(date);
}

export function formatRelativeTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return "—";
  const diffInMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const relative = new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" });

  if (Math.abs(diffInMinutes) < 60) {
    return relative.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return relative.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);
  if (Math.abs(diffInDays) < 30) {
    return relative.format(diffInDays, "day");
  }

  return formatDate(date);
}

export function getCurrentPersianYear(): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
  }).format(new Date());
}

export function normalizeCode(value: string): string {
  return toEnglishDigits(value).trim().toUpperCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return toEnglishDigits(value).replace(/[\s-]/g, "");
}

export function normalizeLicenseCode(value: string): string {
  return toEnglishDigits(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}
