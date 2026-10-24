import { and, eq, gt, isNull, ne } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env, sessionTtlMs } from "../config/env.js";
import { db } from "../db/client.js";
import type { AppDb } from "../db/types.js";
import { sessions, users } from "../db/schema.js";
import { tokenHash, randomToken } from "../lib/crypto.js";
import { forbidden, notFound, unauthorized } from "../lib/errors.js";
import { hashIp } from "../lib/ip.js";
import { errorMeta, logger } from "../lib/logger.js";
import type { AuthContext } from "../types/auth.js";

export const SESSION_COOKIE = "bp_session";
const LAST_SEEN_UPDATE_MS = 5 * 60 * 1000;

function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
): void {
  const maxAge = Math.max(
    1,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  });
}

export async function createSession(params: {
  userId: string;
  request: FastifyRequest;
  reply: FastifyReply;
  totpVerified: boolean;
}): Promise<{ id: string; token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + sessionTtlMs);

  const [row] = await db
    .insert(sessions)
    .values({
      userId: params.userId,
      tokenHash: tokenHash(token),
      totpVerified: params.totpVerified,
      ip: hashIp(params.request.ip),
      userAgent: (params.request.headers["user-agent"] ?? "").slice(0, 300),
      expiresAt,
    })
    .returning({ id: sessions.id });

  if (!row) throw new Error("ساخت نشست ناموفق بود.");

  setSessionCookie(params.reply, token, expiresAt);
  return { id: row.id, token, expiresAt };
}

export async function revokeSessionById(sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, tokenHash(token)));
}

export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string,
  executor: AppDb = db,
): Promise<void> {
  const conditions = [
    eq(sessions.userId, userId),
    isNull(sessions.revokedAt),
  ];
  if (exceptSessionId) {
    conditions.push(ne(sessions.id, exceptSessionId));
  }
  await executor
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(...conditions));
}

export async function loadAuth(
  request: FastifyRequest,
): Promise<AuthContext | null> {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;

  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.user.disabledAt !== null) {
    await revokeSessionById(row.session.id);
    return null;
  }

  if (Date.now() - row.session.lastSeenAt.getTime() > LAST_SEEN_UPDATE_MS) {
    void db
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.id, row.session.id))
      .catch((error: unknown) => {
        logger.warn(errorMeta(error), "به‌روزرسانی آخرین بازدید نشست ناموفق بود");
      });
  }

  return { user: row.user, session: row.session };
}

export function getAuth(request: FastifyRequest): AuthContext {
  if (!request.auth) throw unauthorized();
  return request.auth;
}

export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const auth = await loadAuth(request);
  if (!auth) {
    throw unauthorized("نشست شما منقضی شده است؛ دوباره وارد شوید.", "session_expired");
  }
  request.auth = auth;
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  const auth = getAuth(request);

  if (auth.user.role !== "admin") {
    throw forbidden("دسترسی به این بخش فقط برای مدیران است.", "admin_only");
  }

  if (!auth.user.totpEnabledAt) {
    throw forbidden(
      "برای دسترسی مدیریتی ابتدا تأیید دومرحله‌ای را فعال کنید.",
      "admin_totp_setup_required",
    );
  }

  if (!auth.session.totpVerified) {
    throw forbidden(
      "تأیید دومرحله‌ای این نشست انجام نشده است.",
      "admin_totp_required",
    );
  }
}

/**
 * بررسی مالکیت منبع. برای جلوگیری از افشای وجود منابع دیگران، پاسخ ۴۰۴ است.
 * مدیران به همه‌ی منابع دسترسی دارند.
 */
export function assertOwnership(
  auth: AuthContext,
  ownerUserId: string,
): void {
  if (auth.user.role === "admin") return;
  if (auth.user.id !== ownerUserId) {
    throw notFound("موردی پیدا نشد.");
  }
}
