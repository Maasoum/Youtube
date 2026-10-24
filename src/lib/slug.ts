/**
 * ساخت slug فارسی برای نشانی‌های وبلاگ.
 * حروف فارسی حفظ می‌شوند و فقط فاصله‌ها، نیم‌فاصله و علائم به خط تیره تبدیل
 * می‌شوند؛ به همین دلیل نشانی خوانا و قابل اشتراک است.
 */
export function slugifyPersian(input: string): string {
  const normalized = input
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[\u200c\u200d]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80)
    .replace(/-+$/g, "");

  return normalized || "article";
}

/** فقط حروف/اعداد فارسی یا لاتین و خط تیره‌ی میانی مجاز است. */
export function isValidPersianSlug(value: string): boolean {
  return (
    value.length >= 3 &&
    value.length <= 80 &&
    /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(value)
  );
}

/** اگر نشانی تکراری باشد، پسوند عددی ساده می‌سازد. */
export function ensureUniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (item) => item.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`.toLowerCase())) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
