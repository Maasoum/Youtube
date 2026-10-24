import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import {
  emailVerifications,
  passwordResets,
  sessions,
  users,
  type UserRow,
} from "../db/schema.js";
import {
  decryptString,
  encryptString,
  randomToken,
  tokenHash,
} from "../lib/crypto.js";
import {
  AppError,
  badRequest,
  conflict,
  forbidden,
  tooManyRequests,
  unauthorized,
} from "../lib/errors.js";
import { hashPassword, verifyDummyPassword, verifyPassword, passwordNeedsRehash } from "../lib/password.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { hashIp } from "../lib/ip.js";
import { logger } from "../lib/logger.js";
import {
  buildTotpUri,
  generateTotpSecret,
  verifyTotpCode,
} from "../lib/totp.js";
import { createSession, revokeAllSessions } from "../middleware/auth.js";
import { toPublicUser, type AuthContext, type PublicUser } from "../types/auth.js";
import { writeAudit } from "./audit.js";
import {
  queueEmailVerification,
  queuePasswordReset,
  queueWelcomeEmail,
} from "./email.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const TOTP_REPLAY_WINDOW_MS = 25 * 1000;

export interface RequestMeta {
  ip: string;
  userAgent: string;
}

/**
 * آدرس خام کلاینت هرگز ذخیره یا لاگ نمی‌شود؛ فقط هش پایدار آن برای
 * تشخیص سوءاستفاده در نشست/بازیابی رمز/گزارش مدیر نگه داشته می‌شود.
 */
export function requestMeta(request: FastifyRequest): RequestMeta {
  return {
    ip: hashIp(request.ip),
    userAgent: (request.headers["user-agent"] ?? "").slice(0, 300),
  };
}

async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);
  return rows[0];
}

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<PublicUser> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw conflict("این ایمیل قبلاً ثبت شده است.", "email_taken");
  }

  const passwordHash = await hashPassword(input.password);
  const verificationToken = randomToken(32);
  const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);

  try {
    const created = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone && input.phone.length > 0 ? input.phone : null,
          role: "user",
        })
        .returning();

      if (!user) throw new Error("ساخت حساب ناموفق بود.");

      await tx.insert(emailVerifications).values({
        userId: user.id,
        tokenHash: tokenHash(verificationToken),
        expiresAt,
      });

      await queueEmailVerification(tx, {
        to: user.email,
        fullName: user.fullName,
        token: verificationToken,
      });

      return user;
    });

    await writeAudit({
      actor: { id: created.id, name: created.fullName },
      action: "auth.register",
      entityType: "user",
      entityId: created.id,
      summary: "حساب کاربری تازه ثبت شد و ایمیل تأیید در صف ارسال قرار گرفت.",
    });

    return toPublicUser(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("این ایمیل قبلاً ثبت شده است.", "email_taken");
    }
    throw error;
  }
}

export async function verifyEmail(token: string): Promise<void> {
  const hash = tokenHash(token);
  const pendingAudit: { id?: string; name?: string } = {};

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ verification: emailVerifications, user: users })
      .from(emailVerifications)
      .innerJoin(users, eq(users.id, emailVerifications.userId))
      .where(
        and(
          eq(emailVerifications.tokenHash, hash),
          isNull(emailVerifications.usedAt),
          gt(emailVerifications.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw badRequest(
        "این پیوند تأیید منقضی یا مصرف شده است.",
        "verification_token_invalid",
      );
    }

    const now = new Date();
    await tx
      .update(users)
      .set({ emailVerifiedAt: now })
      .where(eq(users.id, row.user.id));

    await tx
      .update(emailVerifications)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailVerifications.userId, row.user.id),
          isNull(emailVerifications.usedAt),
        ),
      );

    // ایمیل خوش‌آمد فقط یک‌بار و پس از تأیید موفق ثبت می‌شود.
    await queueWelcomeEmail(tx, {
      to: row.user.email,
      fullName: row.user.fullName,
    });

    pendingAudit.id = row.user.id;
    pendingAudit.name = row.user.fullName;
  });

  if (pendingAudit.id && pendingAudit.name) {
    await writeAudit({
      actor: { id: pendingAudit.id, name: pendingAudit.name },
      action: "auth.email_verified",
      entityType: "user",
      entityId: pendingAudit.id,
      summary: "ایمیل حساب کاربر تأیید شد.",
    });
  }
}

export async function resendVerification(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user || user.emailVerifiedAt !== null || user.disabledAt !== null) {
    return;
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailVerifications.userId, user.id),
          isNull(emailVerifications.usedAt),
        ),
      );

    await tx.insert(emailVerifications).values({
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt,
    });

    await queueEmailVerification(tx, {
      to: user.email,
      fullName: user.fullName,
      token,
    });
  });
}

export interface LoginResult {
  user: PublicUser;
  totpRequired: boolean;
  totpSetupRequired: boolean;
  expiresAt: string;
}

async function consumeTotp(user: UserRow, code: string): Promise<boolean> {
  if (!user.totpSecretEncrypted) return false;
  if (
    user.totpLastUsedAt &&
    Date.now() - user.totpLastUsedAt.getTime() < TOTP_REPLAY_WINDOW_MS
  ) {
    return false;
  }

  let secret: string;
  try {
    secret = decryptString(user.totpSecretEncrypted);
  } catch {
    return false;
  }

  if (!verifyTotpCode(secret, code)) return false;

  await db
    .update(users)
    .set({ totpLastUsedAt: new Date() })
    .where(eq(users.id, user.id));
  return true;
}

export async function loginUser(params: {
  email: string;
  password: string;
  totp?: string;
  request: FastifyRequest;
  reply: FastifyReply;
}): Promise<LoginResult> {
  const user = await findUserByEmail(params.email);

  if (!user) {
    await verifyDummyPassword(params.password);
    throw unauthorized("ایمیل یا رمز عبور نادرست است.", "invalid_credentials");
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw tooManyRequests(
      "به دلیل تلاش‌های ناموفق، حساب موقتاً قفل شده است. کمی بعد دوباره تلاش کنید.",
      "account_locked",
    );
  }

  let previousFailures = user.failedLoginAttempts;
  if (user.lockedUntil && user.lockedUntil.getTime() <= Date.now()) {
    // قفل منقضی شده است؛ شمارنده از صفر شروع می‌شود.
    previousFailures = 0;
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
  }

  const passwordValid = await verifyPassword(user.passwordHash, params.password);

  if (!passwordValid) {
    const attempts = previousFailures + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    await db
      .update(users)
      .set({
        failedLoginAttempts: shouldLock ? MAX_FAILED_ATTEMPTS : attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null,
      })
      .where(eq(users.id, user.id));

    if (shouldLock) {
      throw tooManyRequests(
        "به دلیل تلاش‌های ناموفق، حساب موقتاً قفل شده است. کمی بعد دوباره تلاش کنید.",
        "account_locked",
      );
    }
    throw unauthorized("ایمیل یا رمز عبور نادرست است.", "invalid_credentials");
  }

  if (user.disabledAt !== null) {
    throw forbidden(
      "این حساب غیرفعال شده است؛ با پشتیبانی تماس بگیرید.",
      "account_disabled",
    );
  }

  if (user.emailVerifiedAt === null) {
    throw forbidden(
      "ابتدا ایمیل حساب خود را تأیید کنید.",
      "email_not_verified",
    );
  }

  // رمز معتبر است؛ شمارنده‌ی قفل و در صورت نیاز هش قدیمی به‌روز می‌شود.
  const updates: Partial<UserRow> = {
    failedLoginAttempts: 0,
    lockedUntil: null,
  };
  if (await passwordNeedsRehash(user.passwordHash)) {
    updates.passwordHash = await hashPassword(params.password);
  }
  await db.update(users).set(updates).where(eq(users.id, user.id));

  let totpVerified = false;
  if (user.role === "admin" && user.totpEnabledAt) {
    if (params.totp) {
      const valid = await consumeTotp(user, params.totp);
      if (!valid) {
        throw unauthorized("کد تأیید دومرحله‌ای نادرست است.", "totp_invalid");
      }
      totpVerified = true;
    }
  } else {
    totpVerified = true;
  }

  const session = await createSession({
    userId: user.id,
    request: params.request,
    reply: params.reply,
    totpVerified,
  });

  await writeAudit({
    actor: { id: user.id, name: user.fullName },
    action: "auth.login",
    entityType: "session",
    entityId: session.id,
    summary:
      user.role === "admin"
        ? "ورود موفق مدیر به پنل."
        : "ورود موفق به حساب کاربری.",
    request: requestMeta(params.request),
  });

  return {
    user: toPublicUser({ ...user, ...updates }),
    totpRequired:
      user.role === "admin" && user.totpEnabledAt !== null && !totpVerified,
    totpSetupRequired: user.role === "admin" && user.totpEnabledAt === null,
    expiresAt: session.expiresAt.toISOString(),
  };
}

export async function requestPasswordReset(
  email: string,
  meta: RequestMeta,
): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user || user.disabledAt !== null) return;

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResets.userId, user.id),
          isNull(passwordResets.usedAt),
        ),
      );

    await tx.insert(passwordResets).values({
      userId: user.id,
      tokenHash: tokenHash(token),
      requestedIp: meta.ip.slice(0, 64),
      expiresAt,
    });

    await queuePasswordReset(tx, {
      to: user.email,
      fullName: user.fullName,
      token,
    });
  });

  await writeAudit({
    actor: { id: user.id, name: user.fullName },
    action: "auth.password_reset_requested",
    entityType: "user",
    entityId: user.id,
    summary: "درخواست بازیابی رمز عبور ثبت شد.",
    request: meta,
  });
}

export async function resetPassword(params: {
  token: string;
  password: string;
  meta: RequestMeta;
}): Promise<void> {
  const hash = tokenHash(params.token);
  const pendingAudit: { id?: string; name?: string } = {};

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ reset: passwordResets, user: users })
      .from(passwordResets)
      .innerJoin(users, eq(users.id, passwordResets.userId))
      .where(
        and(
          eq(passwordResets.tokenHash, hash),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw badRequest(
        "پیوند بازیابی رمز منقضی یا مصرف شده است.",
        "reset_token_invalid",
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(params.password);

    await tx
      .update(users)
      .set({
        passwordHash,
        passwordChangedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, row.user.id));

    await tx
      .update(passwordResets)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResets.userId, row.user.id),
          isNull(passwordResets.usedAt),
        ),
      );

    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(eq(sessions.userId, row.user.id), isNull(sessions.revokedAt)),
      );

    pendingAudit.id = row.user.id;
    pendingAudit.name = row.user.fullName;
  });

  if (pendingAudit.id && pendingAudit.name) {
    await writeAudit({
      actor: { id: pendingAudit.id, name: pendingAudit.name },
      action: "auth.password_reset",
      entityType: "user",
      entityId: pendingAudit.id,
      summary: "رمز عبور با پیوند بازیابی تغییر کرد و همه‌ی نشست‌ها بسته شدند.",
      request: params.meta,
    });
  }
}

export async function changePassword(params: {
  auth: AuthContext;
  currentPassword: string;
  newPassword: string;
  meta: RequestMeta;
}): Promise<void> {
  const valid = await verifyPassword(
    params.auth.user.passwordHash,
    params.currentPassword,
  );
  if (!valid) {
    throw badRequest("رمز عبور فعلی نادرست است.", "current_password_invalid", {
      currentPassword: "رمز عبور فعلی نادرست است.",
    });
  }

  if (params.currentPassword === params.newPassword) {
    throw badRequest(
      "رمز جدید باید با رمز فعلی متفاوت باشد.",
      "password_unchanged",
      { newPassword: "رمز جدید باید با رمز فعلی متفاوت باشد." },
    );
  }

  const passwordHash = await hashPassword(params.newPassword);
  await db
    .update(users)
    .set({
      passwordHash,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, params.auth.user.id));

  // پیوندهای بازیابیِ در انتظار پس از تغییر رمز بی‌اعتبار می‌شوند.
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResets.userId, params.auth.user.id),
        isNull(passwordResets.usedAt),
      ),
    );

  await revokeAllSessions(params.auth.user.id, params.auth.session.id);

  await writeAudit({
    actor: { id: params.auth.user.id, name: params.auth.user.fullName },
    action: "auth.password_changed",
    entityType: "user",
    entityId: params.auth.user.id,
    summary: "رمز عبور تغییر کرد و سایر نشست‌ها بسته شدند.",
    request: params.meta,
  });
}

export async function setupTotp(auth: AuthContext): Promise<{
  secret: string;
  otpauthUrl: string;
}> {
  if (auth.user.role !== "admin") {
    throw forbidden("تأیید دومرحله‌ای فقط برای مدیران است.", "admin_only");
  }
  if (auth.user.totpEnabledAt) {
    throw conflict("تأیید دومرحله‌ای قبلاً فعال شده است.", "totp_already_enabled");
  }

  const secret = generateTotpSecret();
  await db
    .update(users)
    .set({
      totpSecretEncrypted: encryptString(secret),
      totpEnabledAt: null,
      totpLastUsedAt: null,
    })
    .where(eq(users.id, auth.user.id));

  await writeAudit({
    actor: { id: auth.user.id, name: auth.user.fullName },
    action: "auth.totp_setup_started",
    entityType: "user",
    entityId: auth.user.id,
    summary: "راه‌اندازی تأیید دومرحله‌ای آغاز شد.",
  });

  return {
    secret,
    otpauthUrl: buildTotpUri(secret, auth.user.email),
  };
}

export async function enableTotp(params: {
  auth: AuthContext;
  code: string;
  meta: RequestMeta;
}): Promise<void> {
  if (params.auth.user.role !== "admin") {
    throw forbidden("تأیید دومرحله‌ای فقط برای مدیران است.", "admin_only");
  }
  if (params.auth.user.totpEnabledAt) {
    throw conflict("تأیید دومرحله‌ای قبلاً فعال شده است.", "totp_already_enabled");
  }
  if (!params.auth.user.totpSecretEncrypted) {
    throw badRequest(
      "ابتدا مرحله‌ی راه‌اندازی را انجام دهید.",
      "totp_setup_missing",
    );
  }

  const secret = decryptString(params.auth.user.totpSecretEncrypted);
  if (!verifyTotpCode(secret, params.code)) {
    throw badRequest("کد تأیید نادرست است.", "totp_invalid", {
      code: "کد تأیید نادرست است.",
    });
  }

  const now = new Date();
  await db
    .update(users)
    .set({ totpEnabledAt: now, totpLastUsedAt: now })
    .where(eq(users.id, params.auth.user.id));

  await db
    .update(sessions)
    .set({ totpVerified: true })
    .where(eq(sessions.id, params.auth.session.id));

  await writeAudit({
    actor: { id: params.auth.user.id, name: params.auth.user.fullName },
    action: "auth.totp_enabled",
    entityType: "user",
    entityId: params.auth.user.id,
    summary: "تأیید دومرحله‌ای برای حساب مدیر فعال شد.",
    request: params.meta,
  });
}

export async function verifyTotpSession(params: {
  auth: AuthContext;
  code: string;
  meta: RequestMeta;
}): Promise<void> {
  if (params.auth.user.role !== "admin") {
    throw forbidden("تأیید دومرحله‌ای فقط برای مدیران است.", "admin_only");
  }
  if (!params.auth.user.totpEnabledAt) {
    throw forbidden(
      "ابتدا تأیید دومرحله‌ای را فعال کنید.",
      "admin_totp_setup_required",
    );
  }
  if (!params.auth.user.totpSecretEncrypted) {
    throw new AppError(
      500,
      "totp_configuration_invalid",
      "پیکربندی تأیید دومرحله‌ای کامل نیست.",
    );
  }

  const valid = await consumeTotp(params.auth.user, params.code);
  if (!valid) {
    throw unauthorized("کد تأیید نادرست است.", "totp_invalid");
  }

  await db
    .update(sessions)
    .set({ totpVerified: true })
    .where(eq(sessions.id, params.auth.session.id));

  logger.info(
    { userId: params.auth.user.id },
    "تأیید دومرحله‌ای نشست انجام شد",
  );

  await writeAudit({
    actor: { id: params.auth.user.id, name: params.auth.user.fullName },
    action: "auth.totp_verified",
    entityType: "session",
    entityId: params.auth.session.id,
    summary: "تأیید دومرحله‌ای برای این نشست انجام شد.",
    request: params.meta,
  });
}
