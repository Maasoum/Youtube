/**
 * آدرس فایل‌های داخل `public` را می‌سازد و به `base` ویت احترام می‌گذارد؛
 * بنابراین انتشار زیرمسیر (مثلاً `/shop/`) هم تصویرها را درست بارگذاری می‌کند.
 */
export function assetUrl(file: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const path = file.replace(/^\/+/, "");
  return `${base}/${path}`;
}
