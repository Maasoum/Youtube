import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { csvFileName, toCsv } from "../lib/csv.js";
import { notFound } from "../lib/errors.js";
import {
  adminOrderListQuerySchema,
  cancelOrderSchema,
  fulfillOrderSchema,
  holdOrderSchema,
  refundOrderSchema,
} from "../lib/validation-panel.js";
import { parseWith } from "../lib/validation.js";
import { getAuth, requireAdmin } from "../middleware/auth.js";
import { requestMeta } from "../services/auth.js";
import {
  cancelOrder,
  getOrderForAdmin,
  holdOrder,
  listFulfillmentQueue,
  listOrdersForAdmin,
  refundOrder,
  resumeOrder,
  sendDelayEmail,
  setOrderNote,
} from "../services/fulfillment.js";
import {
  fulfillOrder,
  resendLicenseEmail,
} from "../services/licenses.js";

const orderIdSchema = z.uuid({ message: "شناسه‌ی سفارش معتبر نیست." });

function orderIdOf(params: unknown): string {
  const { id } = params as { id?: string };
  if (!id || !orderIdSchema.safeParse(id).success) {
    throw notFound("سفارش پیدا نشد.", "order_not_found");
  }
  return id;
}

export async function adminOrderRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = { preHandler: requireAdmin };

  app.get(
    "/admin/fulfillment",
    {
      ...adminOnly,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (_request, reply) => {
      return reply.send(await listFulfillmentQueue());
    },
  );

  app.get(
    "/admin/orders",
    {
      ...adminOnly,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const query = parseWith(adminOrderListQuerySchema, request.query);
      return reply.send(await listOrdersForAdmin(query));
    },
  );

  app.get(
    "/admin/orders.csv",
    {
      ...adminOnly,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const query = parseWith(adminOrderListQuerySchema, request.query);
      const { orders } = await listOrdersForAdmin({
        ...query,
        limit: 5_000,
        offset: 0,
      });

      const csv = toCsv(
        [
          "شماره سفارش",
          "تاریخ ثبت",
          "مشتری",
          "ایمیل",
          "تلفن",
          "دوره",
          "وضعیت",
          "مبلغ واحد",
          "تخفیف",
          "مالیات",
          "مبلغ نهایی",
          "تاریخ پرداخت",
          "شماره پیگیری",
          "لایسنس (ماسک)",
          "منبع",
        ],
        orders.map((order) => [
          order.number,
          order.createdAt,
          order.customer.fullName,
          order.customer.email,
          order.customer.phone,
          order.course.title,
          order.status,
          order.originalPriceToman,
          order.discountToman,
          order.taxToman,
          order.totalToman,
          order.paidAt,
          order.paymentRef,
          order.license?.maskedCode ?? "",
          order.source,
        ]),
      );

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="${csvFileName("orders")}"`,
        )
        .header("Cache-Control", "no-store")
        .send(csv);
    },
  );

  app.get(
    "/admin/orders/:id",
    {
      ...adminOnly,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      return reply.send({ order: await getOrderForAdmin(orderIdOf(request.params)) });
    },
  );

  app.post(
    "/admin/orders/:id/license",
    {
      ...adminOnly,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const orderId = orderIdOf(request.params);
      const input = parseWith(fulfillOrderSchema, request.body);
      const auth = getAuth(request);

      const result = await fulfillOrder({
        orderId,
        input,
        actor: auth.user,
        request: requestMeta(request),
      });

      return reply.code(201).send({
        ...result,
        order: await getOrderForAdmin(orderId),
      });
    },
  );

  app.post(
    "/admin/orders/:id/hold",
    {
      ...adminOnly,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const orderId = orderIdOf(request.params);
      const input = parseWith(holdOrderSchema, request.body);
      const auth = getAuth(request);

      await holdOrder({
        orderId,
        reason: input.reason,
        sendDelayEmail: input.sendDelayEmail,
        actor: auth.user,
        request: requestMeta(request),
      });

      return reply.send({ order: await getOrderForAdmin(orderId) });
    },
  );

  app.post(
    "/admin/orders/:id/resume",
    {
      ...adminOnly,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const orderId = orderIdOf(request.params);
      const auth = getAuth(request);
      await resumeOrder({
        orderId,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ order: await getOrderForAdmin(orderId) });
    },
  );

  app.post(
    "/admin/orders/:id/delay-email",
    {
      ...adminOnly,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const orderId = orderIdOf(request.params);
      const auth = getAuth(request);
      await sendDelayEmail({
        orderId,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ order: await getOrderForAdmin(orderId) });
    },
  );

  app.post(
    "/admin/orders/:id/resend-license-email",
    {
      ...adminOnly,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const orderId = orderIdOf(request.params);
      const auth = getAuth(request);
      const result = await resendLicenseEmail({
        orderId,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({
        ...result,
        order: await getOrderForAdmin(orderId),
      });
    },
  );

  app.post(
    "/admin/orders/:id/cancel",
    {
      ...adminOnly,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const orderId = orderIdOf(request.params);
      const input = parseWith(cancelOrderSchema, request.body);
      const auth = getAuth(request);
      await cancelOrder({
        orderId,
        reason: input.reason,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ order: await getOrderForAdmin(orderId) });
    },
  );

  app.post(
    "/admin/orders/:id/refund",
    {
      ...adminOnly,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const orderId = orderIdOf(request.params);
      const input = parseWith(refundOrderSchema, request.body);
      const auth = getAuth(request);
      await refundOrder({
        orderId,
        reason: input.reason,
        reference: input.reference,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ order: await getOrderForAdmin(orderId) });
    },
  );

  app.post(
    "/admin/orders/:id/note",
    {
      ...adminOnly,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const orderId = orderIdOf(request.params);
      const { note } = parseWith(
        z.object({ note: z.string().trim().max(2_000) }),
        request.body,
      );
      const auth = getAuth(request);
      await setOrderNote({
        orderId,
        note,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ order: await getOrderForAdmin(orderId) });
    },
  );
}
