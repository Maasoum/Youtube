/**
 * ساخت CSV امن برای خروجی پنل.
 *
 * - BOM اضافه می‌شود تا Excel فارسی را درست باز کند.
 * - هر مقدار در گیومه قرار می‌گیرد و گیومه‌های داخلی دو برابر می‌شوند.
 * - مقادیری که با = + - @ شروع شوند با ' خنثی می‌شوند تا فرمول اجرا نشود.
 * - هیچ کلید لایسنس یا توکنی به این تابع داده نمی‌شود.
 */

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  let text = String(value).replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function csvFileName(prefix: string, date: Date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `${prefix}-${stamp}.csv`;
}
