import type { FastifyInstance } from "fastify";
import {
  parseWith,
  paymentEnabledSchema,
  paymentTokenSchema,
} from "../lib/validation.js";
import { getAuth, requireAdmin } from "../middleware/auth.js";
import {
  getPaymentSettingsView,
  savePaymentToken,
  setPaymentEnabled,
  testPaymentConnection,
} from "../services/payment-settings.js";

export async function adminPaymentRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/admin/settings/payment",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (_request, reply) => {
      return reply.send(await getPaymentSettingsView());
    },
  );

  app.put(
    "/admin/settings/payment/token",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(paymentTokenSchema, request.body);
      const auth = getAuth(request);
      const receipt = await savePaymentToken({
        token: input.token,
        actor: auth.user,
      });
      return reply.send(receipt);
    },
  );

  app.put(
    "/admin/settings/payment/enabled",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 20, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(paymentEnabledSchema, request.body);
      const auth = getAuth(request);
      const view = await setPaymentEnabled({
        enabled: input.enabled,
        actor: auth.user,
      });
      return reply.send(view);
    },
  );

  app.post(
    "/admin/settings/payment/test",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 5, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      const view = await testPaymentConnection({ actor: auth.user });
      return reply.send(view);
    },
  );
}
