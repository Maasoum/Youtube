import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { notFound } from "../lib/errors.js";
import {
  editLicenseSchema,
  giftLicenseSchema,
  licenseRevealParamsSchema,
  revokeLicenseSchema,
} from "../lib/validation-panel.js";
import { parseWith } from "../lib/validation.js";
import { getAuth, requireAdmin } from "../middleware/auth.js";
import { requestMeta } from "../services/auth.js";
import {
  editLicense,
  grantGiftLicense,
  listLicenses,
  revealLicenseForAdmin,
  revokeLicense,
} from "../services/licenses.js";
import { getOrderForAdmin } from "../services/fulfillment.js";

const licenseIdSchema = z.uuid({ message: "شناسه‌ی لایسنس معتبر نیست." });

const listQuerySchema = z.object({
  status: z.enum(["active", "revoked"]).optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

function licenseIdOf(params: unknown): string {
  const { id } = params as { id?: string };
  if (!id || !licenseIdSchema.safeParse(id).success) {
    throw notFound("لایسنس پیدا نشد.", "license_not_found");
  }
  return id;
}

export async function adminLicenseRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/admin/licenses",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const query = parseWith(listQuerySchema, request.query);
      return reply.send({ licenses: await listLicenses(query) });
    },
  );

  app.post(
    "/admin/licenses/gift",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const input = parseWith(giftLicenseSchema, request.body);
      const auth = getAuth(request);

      const result = await grantGiftLicense({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });

      return reply.code(201).send({
        ...result,
        order: await getOrderForAdmin(result.orderId),
      });
    },
  );

  app.patch(
    "/admin/licenses/:id",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const licenseId = licenseIdOf(request.params);
      const input = parseWith(editLicenseSchema, request.body);
      const auth = getAuth(request);

      const result = await editLicense({
        licenseId,
        input,
        actor: auth.user,
        request: requestMeta(request),
      });

      return reply.send({
        ...result,
        order: await getOrderForAdmin(result.orderId),
      });
    },
  );

  app.post(
    "/admin/licenses/:id/revoke",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const licenseId = licenseIdOf(request.params);
      const input = parseWith(revokeLicenseSchema, request.body);
      const auth = getAuth(request);

      const result = await revokeLicense({
        licenseId,
        reason: input.reason,
        actor: auth.user,
        request: requestMeta(request),
      });

      return reply.send({
        ...result,
        order: await getOrderForAdmin(result.orderId),
      });
    },
  );

  app.post(
    "/admin/licenses/:id/reveal",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { id } = parseWith(licenseRevealParamsSchema, request.params);
      const auth = getAuth(request);
      const license = await revealLicenseForAdmin({
        licenseId: id,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.header("Cache-Control", "no-store").send({ license });
    },
  );

}
