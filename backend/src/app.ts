import { randomUUID } from "node:crypto";
import Fastify, {
  type FastifyError,
  type FastifyInstance,
} from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { errorBody, isAppError, payloadTooLarge } from "./lib/errors.js";
import { hashIp } from "./lib/ip.js";
import { buildLoggerOptions, logger } from "./lib/logger.js";
import { csrfGuard } from "./middleware/csrf.js";
import { adminCatalogRoutes } from "./routes/admin-catalog.js";
import { adminLicenseRoutes } from "./routes/admin-licenses.js";
import { adminMarketingRoutes } from "./routes/admin-marketing.js";
import { adminOrderRoutes } from "./routes/admin-orders.js";
import { adminPaymentRoutes } from "./routes/admin-payment.js";
import { adminRoutes } from "./routes/admin.js";
import { adminStatsRoutes } from "./routes/admin-stats.js";
import { adminSupportRoutes } from "./routes/admin-support.js";
import { adminUserRoutes } from "./routes/admin-users.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { meRoutes } from "./routes/me.js";
import { orderRoutes } from "./routes/orders.js";
import { paymentRoutes } from "./routes/payments.js";
import { publicRoutes } from "./routes/public.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions("brightpaths-api"),
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 64 * 1024,
    requestTimeout: 15_000,
    connectionTimeout: 10_000,
    genReqId: () => randomUUID(),
  });

  app.decorateRequest("auth", null);

  /**
   * پی‌پینگ نتیجه‌ی پرداخت را به‌صورت فرم URL-encoded به returnUrl می‌فرستد.
   * پارسر بدنه فقط برای همین نوع محتوا و با سقف کوچک فعال می‌شود.
   */
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string", bodyLimit: 16 * 1024 },
    (_request, body, done) => {
      try {
        const values: Record<string, string> = {};
        for (const [key, value] of new URLSearchParams(body as string)) {
          values[key] = value;
        }
        done(null, values);
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );

  await app.register(cookie, {
    hook: "onRequest",
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
  });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
    // کلید محدودیت نرخ هم هش IP است تا آدرس خام در هیچ فروشگاهی نگه‌داری نشود.
    keyGenerator: (request) => hashIp(request.ip),
    allowList: (request) =>
      request.url === "/healthz" || request.url === "/readyz",
    errorResponseBuilder: () => errorBody(
      "rate_limited",
      "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.",
    ),
  });

  // همه‌ی درخواست‌های تغییردهنده باید توکن CSRF معتبر داشته باشند.
  app.addHook("onRequest", csrfGuard);

  app.setNotFoundHandler((_request, reply) => {
    return reply
      .code(404)
      .send(errorBody("not_found", "مسیر درخواستی پیدا نشد."));
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (isAppError(error)) {
      if (error.statusCode >= 500) {
        request.log.error(
          { code: error.code, reqId: request.id },
          "خطای داخلی ثبت‌شده",
        );
      }
      return reply
        .code(error.statusCode)
        .send(errorBody(error.code, error.message, error.fields));
    }

    if (error.statusCode === 429) {
      return reply
        .code(429)
        .send(
          errorBody(
            "rate_limited",
            "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.",
          ),
        );
    }

    if (error.statusCode === 413) {
      const tooLarge = payloadTooLarge();
      return reply
        .code(tooLarge.statusCode)
        .send(errorBody(tooLarge.code, tooLarge.message));
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply
        .code(error.statusCode)
        .send(errorBody("request_error", "درخواست معتبر نیست."));
    }

    /**
     * پیام و stack خطاهای درایور می‌تواند متن کوئری و پارامترها را داشته باشد؛
     * بنابراین حتی در توسعه هم فقط نوع، کد و مسیر ثبت می‌شود.
     */
    request.log.error(
      {
        route: request.routeOptions.url,
        errName: error.name,
        errCode: (error as { code?: string }).code,
        statusCode: error.statusCode,
      },
      "خطای پیش‌بینی‌نشده",
    );

    return reply
      .code(500)
      .send(errorBody("internal_error", "خطای داخلی سرور؛ بعداً تلاش کنید."));
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(adminRoutes, { prefix: "/api/v1" });
  await app.register(adminStatsRoutes, { prefix: "/api/v1" });
  await app.register(adminPaymentRoutes, { prefix: "/api/v1" });
  await app.register(adminOrderRoutes, { prefix: "/api/v1" });
  await app.register(adminLicenseRoutes, { prefix: "/api/v1" });
  await app.register(adminCatalogRoutes, { prefix: "/api/v1" });
  await app.register(adminMarketingRoutes, { prefix: "/api/v1" });
  await app.register(adminUserRoutes, { prefix: "/api/v1" });
  await app.register(adminSupportRoutes, { prefix: "/api/v1" });
  await app.register(publicRoutes, { prefix: "/api/v1" });
  await app.register(meRoutes, { prefix: "/api/v1" });
  await app.register(orderRoutes, { prefix: "/api/v1" });
  await app.register(paymentRoutes, { prefix: "/api/v1" });

  app.addHook("onReady", async () => {
    logger.info(
      {
        environment: env.NODE_ENV,
        port: env.PORT,
        cookieSecure: env.COOKIE_SECURE,
      },
      "API آماده‌ی دریافت درخواست است",
    );
  });

  return app;
}
