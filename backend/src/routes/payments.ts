import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { env } from "../config/env.js";
import { hashIp } from "../lib/ip.js";
import { parseWith, verifyPaymentSchema } from "../lib/validation.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import {
  handlePaymentCallback,
  verifyOrderPayment,
} from "../services/payments.js";

const hashedIpKey = (request: FastifyRequest): string => hashIp(request.ip);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * پارامترهای بازگشت پی‌پینگ ممکن است با حروف کوچک (`refid`, `clientrefid`)
 * یا به شکل camelCase برسند؛ هر دو پشتیبانی می‌شوند.
 */
function normalizeCallbackPayload(raw: unknown): {
  code?: string;
  refId?: string;
  clientRefId?: string;
} {
  if (!isRecord(raw)) return {};

  const lowered = new Map<string, unknown>();
  for (const [key, value] of Object.entries(raw)) {
    lowered.set(key.toLowerCase(), value);
  }

  const read = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = lowered.get(key);
      if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
    return undefined;
  };

  return {
    code: read("code", "paymentcode"),
    refId: read("refid", "ref"),
    clientRefId: read("clientrefid", "clientref"),
  };
}

function callbackRedirect(state: string, orderId: string | null): string {
  const base = `${env.APP_URL}/payment/callback`;
  const params = new URLSearchParams({ state });
  if (orderId) params.set("order", orderId);
  return `${base}?${params.toString()}`;
}

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/payments/verify",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
          keyGenerator: hashedIpKey,
        },
      },
    },
    async (request, reply) => {
      const input = parseWith(verifyPaymentSchema, request.body);
      const auth = getAuth(request);

      const result = await verifyOrderPayment({
        orderId: input.orderId,
        userId: auth.user.id,
        refId: input.refId ?? null,
        code: input.code ?? null,
        clientRefId: input.clientRefId ?? null,
      });

      return reply.send(result);
    },
  );

  const callbackHandler = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const payload =
      request.method === "GET"
        ? normalizeCallbackPayload(request.query)
        : normalizeCallbackPayload(request.body);

    const result = await handlePaymentCallback(payload);

    reply.header("Cache-Control", "no-store");
    return reply.redirect(callbackRedirect(result.state, result.orderId), 302);
  };

  // پی‌پینگ اطلاعات را با POST فرم و گاهی با GET برمی‌گرداند؛ هر دو مسیر
  // یکسان پردازش می‌شوند. این مسیر عمداً از CSRF مستثنی است چون فراخوانی
  // سرور‌به‌سرور است و صحت آن با verify و تطبیق کد پرداخت/مبلغ بررسی می‌شود.
  app.get(
    "/payments/callback",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    callbackHandler,
  );

  app.post(
    "/payments/callback",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    callbackHandler,
  );
}
