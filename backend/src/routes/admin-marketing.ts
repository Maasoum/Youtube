import { z } from "zod";
import { badRequest, notFound } from "../lib/errors.js";
import type { FastifyInstance } from "fastify";
import {
  adminListQuerySchema,
  bulkDiscountSchema,
  createDiscountSchema,
  messageStatusSchema,
  updateDiscountSchema,
} from "../lib/validation-panel.js";
import { parseWith } from "../lib/validation.js";
import { getAuth, requireAdmin } from "../middleware/auth.js";
import { requestMeta } from "../services/auth.js";
import {
  bulkCreateDiscounts,
  createDiscount,
  deleteDiscount,
  getDiscountUsage,
  listDiscounts,
  toggleDiscount,
  updateDiscount,
} from "../services/discounts-admin.js";
import {
  deleteLead,
  listLeads,
  listMessages,
  updateMessageStatus,
} from "../services/admin-support.js";

const idSchema = z.uuid({ message: "شناسه معتبر نیست." });

function idOf(params: unknown, message: string): string {
  const { id } = params as { id?: string };
  if (!id || !idSchema.safeParse(id).success) {
    throw notFound(message, "not_found");
  }
  return id;
}

function codeOf(params: unknown): string {
  const { code } = params as { code?: string };
  if (!code || code.trim().length === 0) {
    throw badRequest("کد تخفیف معتبر نیست.", "discount_code_invalid");
  }
  return code.trim().toUpperCase();
}

const messageListSchema = z.object({
  status: z.enum(["new", "read", "done"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export async function adminMarketingRoutes(
  app: FastifyInstance,
): Promise<void> {
  const adminOnly = { preHandler: requireAdmin };
  const readConfig = { rateLimit: { max: 120, timeWindow: "1 minute" } };
  const writeConfig = { rateLimit: { max: 30, timeWindow: "1 minute" } };

  app.get(
    "/admin/discounts",
    { ...adminOnly, config: readConfig },
    async (request, reply) => {
      const query = parseWith(adminListQuerySchema, request.query);
      return reply.send({ discounts: await listDiscounts(query) });
    },
  );

  app.post(
    "/admin/discounts",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const input = parseWith(createDiscountSchema, request.body);
      const auth = getAuth(request);
      const discount = await createDiscount({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(201).send({ discount });
    },
  );

  app.post(
    "/admin/discounts/bulk",
    { ...adminOnly, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = parseWith(bulkDiscountSchema, request.body);
      const auth = getAuth(request);
      const discounts = await bulkCreateDiscounts({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(201).send({ discounts });
    },
  );

  app.get(
    "/admin/discounts/:code/usage",
    { ...adminOnly, config: readConfig },
    async (request, reply) => {
      return reply.send({
        usage: await getDiscountUsage(codeOf(request.params)),
      });
    },
  );

  app.put(
    "/admin/discounts/:code",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const pathCode = codeOf(request.params);
      const input = parseWith(updateDiscountSchema, request.body);
      if (input.code.trim().toUpperCase() !== pathCode) {
        throw badRequest(
          "کد تخفیف مسیر و بدنه یکسان نیست.",
          "discount_code_mismatch",
        );
      }
      const auth = getAuth(request);
      const discount = await updateDiscount({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ discount });
    },
  );

  app.post(
    "/admin/discounts/:code/toggle",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const auth = getAuth(request);
      const discount = await toggleDiscount({
        code: codeOf(request.params),
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ discount });
    },
  );

  app.delete(
    "/admin/discounts/:code",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const auth = getAuth(request);
      await deleteDiscount({
        code: codeOf(request.params),
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(204).send();
    },
  );

  app.get(
    "/admin/messages",
    { ...adminOnly, config: readConfig },
    async (request, reply) => {
      const query = parseWith(messageListSchema, request.query);
      return reply.send({ messages: await listMessages(query) });
    },
  );

  app.patch(
    "/admin/messages/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const messageId = idOf(request.params, "پیام پیدا نشد.");
      const input = parseWith(messageStatusSchema, request.body);
      const auth = getAuth(request);
      const message = await updateMessageStatus({
        messageId,
        status: input.status,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ message });
    },
  );

  app.get(
    "/admin/leads",
    { ...adminOnly, config: readConfig },
    async (request, reply) => {
      const query = parseWith(adminListQuerySchema, request.query);
      return reply.send({ leads: await listLeads(query) });
    },
  );

  app.delete(
    "/admin/leads/:id",
    { ...adminOnly, config: writeConfig },
    async (request, reply) => {
      const leadId = idOf(request.params, "لید پیدا نشد.");
      const auth = getAuth(request);
      await deleteLead({
        leadId,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.code(204).send();
    },
  );
}
