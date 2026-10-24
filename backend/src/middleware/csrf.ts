import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env, appOrigin } from "../config/env.js";
import { forbidden } from "../lib/errors.js";
import { randomToken } from "../lib/crypto.js";

export const CSRF_COOKIE = "bp_csrf";
export const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * مسیرهایی که فراخوانی آن‌ها از سمت سرور درگاه انجام می‌شود و توکن CSRF
 * ندارند. صحت این درخواست‌ها با verify و تطبیق مبلغ/کد پرداخت بررسی می‌شود.
 */
const CSRF_EXEMPT_PATHS = new Set(["/api/v1/payments/callback"]);

function sign(nonce: string): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(`csrf:${nonce}`)
    .digest("base64url");
}

export function issueCsrfToken(reply: FastifyReply): string {
  const nonce = randomToken(24);
  const token = `${nonce}.${sign(nonce)}`;
  reply.setCookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60,
  });
  return token;
}

function isValidCsrfToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [nonce, signature] = parts;
  if (!nonce || !signature) return false;

  const expected = sign(nonce);
  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function headerValue(request: FastifyRequest): string | null {
  const raw = request.headers[CSRF_HEADER];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length === 1) return raw[0] ?? null;
  return null;
}

/**
 * محافظت CSRF با الگوی double-submit امضاشده.
 * توکن در کوکی غیر-httpOnly و هدر درخواست قرار می‌گیرد؛ امضا مانع جعل کوکی
 * از سوی زیردامنه یا مهاجم می‌شود.
 */
export async function csrfGuard(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (SAFE_METHODS.has(request.method)) return;

  const pathname = request.url.split("?")[0] ?? request.url;
  if (CSRF_EXEMPT_PATHS.has(pathname)) return;

  const origin = request.headers.origin;
  if (typeof origin === "string" && origin.length > 0 && origin !== appOrigin) {
    throw forbidden("منشأ درخواست معتبر نیست.", "csrf_origin_mismatch");
  }

  const cookieToken = request.cookies[CSRF_COOKIE];
  const sentToken = headerValue(request);

  if (
    !cookieToken ||
    !sentToken ||
    cookieToken !== sentToken ||
    !isValidCsrfToken(cookieToken)
  ) {
    throw forbidden(
      "اعتبار درخواست منقضی شده است؛ صفحه را تازه کنید.",
      "csrf_invalid",
    );
  }
}
