import type { FastifyInstance } from "fastify";
import {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  parseWith,
  registerSchema,
  resetPasswordSchema,
  totpCodeSchema,
  verifyEmailSchema,
} from "../lib/validation.js";
import { forbidden } from "../lib/errors.js";
import { issueCsrfToken } from "../middleware/csrf.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  getAuth,
  requireAuth,
  revokeSessionByToken,
} from "../middleware/auth.js";
import {
  changePassword,
  enableTotp,
  loginUser,
  registerUser,
  requestMeta,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  setupTotp,
  verifyEmail,
  verifyTotpSession,
} from "../services/auth.js";
import { toPublicUser } from "../types/auth.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/auth/csrf",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (_request, reply) => {
      const csrfToken = issueCsrfToken(reply);
      return reply.send({ csrfToken });
    },
  );

  app.post(
    "/auth/register",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = parseWith(registerSchema, request.body);
      const user = await registerUser({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        phone: input.phone,
      });

      return reply.code(201).send({
        message:
          "حساب ساخته شد. پیوند تأیید به ایمیل شما ارسال می‌شود؛ برای ورود ابتدا ایمیل را تأیید کنید.",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      });
    },
  );

  app.post(
    "/auth/verify-email",
    {
      config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(verifyEmailSchema, request.body);
      await verifyEmail(input.token);
      return reply.send({
        message: "ایمیل تأیید شد. اکنون می‌توانید وارد شوید.",
      });
    },
  );

  app.post(
    "/auth/resend-verification",
    {
      config: { rateLimit: { max: 3, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(emailOnlySchema, request.body);
      await resendVerification(input.email);
      return reply.code(202).send({
        message:
          "اگر حسابی با این ایمیل در انتظار تأیید باشد، پیوند تازه‌ای ارسال می‌شود.",
      });
    },
  );

  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const input = parseWith(loginSchema, request.body);
      const result = await loginUser({
        email: input.email,
        password: input.password,
        totp: input.totp,
        request,
        reply,
      });
      return reply.send(result);
    },
  );

  app.post(
    "/auth/logout",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const token = request.cookies[SESSION_COOKIE];
      if (token) {
        await revokeSessionByToken(token);
      }
      clearSessionCookie(reply);
      return reply.code(204).send();
    },
  );

  app.get(
    "/auth/me",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      const totpSetupRequired =
        auth.user.role === "admin" && auth.user.totpEnabledAt === null;
      const totpRequired =
        auth.user.role === "admin" &&
        auth.user.totpEnabledAt !== null &&
        !auth.session.totpVerified;

      return reply.send({
        user: toPublicUser(auth.user),
        session: {
          id: auth.session.id,
          expiresAt: auth.session.expiresAt.toISOString(),
          totpVerified: auth.session.totpVerified,
        },
        totpRequired,
        totpSetupRequired,
      });
    },
  );

  app.post(
    "/auth/password/forgot",
    {
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(emailOnlySchema, request.body);
      await requestPasswordReset(input.email, requestMeta(request));
      return reply.code(202).send({
        message:
          "اگر حسابی با این ایمیل وجود داشته باشد، پیوند بازیابی رمز ارسال می‌شود.",
      });
    },
  );

  app.post(
    "/auth/password/reset",
    {
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(resetPasswordSchema, request.body);
      await resetPassword({
        token: input.token,
        password: input.password,
        meta: requestMeta(request),
      });
      clearSessionCookie(reply);
      return reply.send({
        message:
          "رمز عبور تغییر کرد. با رمز تازه وارد شوید؛ همه‌ی نشست‌های قبلی بسته شدند.",
      });
    },
  );

  app.post(
    "/auth/password/change",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(changePasswordSchema, request.body);
      await changePassword({
        auth: getAuth(request),
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        meta: requestMeta(request),
      });
      return reply.send({
        message: "رمز عبور تغییر کرد و سایر نشست‌ها بسته شدند.",
      });
    },
  );

  app.post(
    "/auth/totp/setup",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      if (auth.user.role !== "admin") {
        throw forbidden("تأیید دومرحله‌ای فقط برای مدیران است.", "admin_only");
      }
      const result = await setupTotp(auth);
      return reply.send({
        ...result,
        message:
          "کلید را در برنامه‌ی احراز هویت ثبت کنید و سپس کد ۶ رقمی را برای فعال‌سازی وارد کنید.",
      });
    },
  );

  app.post(
    "/auth/totp/enable",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(totpCodeSchema, request.body);
      await enableTotp({
        auth: getAuth(request),
        code: input.code,
        meta: requestMeta(request),
      });
      return reply.send({
        message:
          "تأیید دومرحله‌ای فعال شد. از این پس برای دسترسی مدیریتی کد لازم است.",
      });
    },
  );

  app.post(
    "/auth/totp/verify",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 10, timeWindow: "5 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(totpCodeSchema, request.body);
      await verifyTotpSession({
        auth: getAuth(request),
        code: input.code,
        meta: requestMeta(request),
      });
      return reply.send({ message: "این نشست تأیید شد." });
    },
  );
}
