import { createHmac } from "node:crypto";
import { env } from "../config/env.js";

/**
 * IP خام هیچ‌جا ذخیره یا لاگ نمی‌شود؛ برای محدودیت نرخ فقط از این هش پایدار
 * استفاده می‌کنیم. کلید HMAC همان SESSION_SECRET است تا بدون آن نتوان
 * آدرس‌ها را بازسازی کرد.
 */
export function hashIp(ip: string): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(`client-ip:${ip}`)
    .digest("base64url")
    .slice(0, 32);
}
