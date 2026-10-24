import pino, { type LoggerOptions } from "pino";
import { env } from "../config/env.js";

/**
 * مسیرهایی که هرگز نباید در لاگ ظاهر شوند.
 * بدنه‌ی درخواست به‌صورت پیش‌فرض لاگ نمی‌شود؛ این فهرست لایه‌ی دفاعی دوم است.
 */
export const redactedPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-csrf-token']",
  "res.headers['set-cookie']",
  "authorization",
  "cookie",
  "password",
  "newPassword",
  "currentPassword",
  "token",
  "secret",
  "sessionToken",
  "csrfToken",
  "licenseKey",
  "licenseCode",
  "totp",
  "totpSecret",
  "payload",
  "payloadEncrypted",
  "tokenEncrypted",
  "*.password",
  "*.newPassword",
  "*.currentPassword",
  "*.token",
  "*.secret",
  "*.licenseKey",
  "*.licenseCode",
  "*.totp",
  "*.payload",
  "*.payloadEncrypted",
  "*.tokenEncrypted",
] as const;

export function buildLoggerOptions(service: string): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [...redactedPaths],
      censor: "[REDACTED]",
    },
    serializers: {
      req(request: {
        id?: string;
        method?: string;
        url?: string;
      }) {
        // هدرها و بدنه عمداً لاگ نمی‌شوند.
        return {
          id: request.id,
          method: request.method,
          url: request.url,
        };
      },
      res(reply: { statusCode?: number }) {
        return { statusCode: reply.statusCode };
      },
      /**
       * پیام و stack خطاهای درایور می‌تواند شامل متن کوئری و پارامترها باشد؛
       * بنابراین حتی اگر جایی `err` لاگ شود، فقط نوع و کد ثبت می‌شود.
       */
      err(error: Error & { code?: string; statusCode?: number }) {
        return {
          type: error.name,
          code: error.code,
          statusCode: error.statusCode,
        };
      },
    },
  };
}

export const logger = pino(buildLoggerOptions("brightpaths-api"));
export const workerLogger = pino(buildLoggerOptions("brightpaths-worker"));

/**
 * فقط فراداده‌ی امن خطا؛ پیام و stack ممکن است متن کوئری یا پارامترهای حساس
 * را در خود داشته باشند و هرگز لاگ نمی‌شوند.
 */
export function errorMeta(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { errType: typeof error };
  }
  const candidate = error as Error & { code?: unknown; statusCode?: unknown };
  return {
    errName: candidate.name,
    errCode:
      typeof candidate.code === "string" ? candidate.code : undefined,
    statusCode:
      typeof candidate.statusCode === "number"
        ? candidate.statusCode
        : undefined,
  };
}
