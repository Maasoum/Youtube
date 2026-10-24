import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { notFound } from "../lib/errors.js";
import { hashIp } from "../lib/ip.js";
import { createOrderSchema, parseWith } from "../lib/validation.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { requestMeta } from "../services/auth.js";
import {
  cancelOrderForUser,
  createOrder,
  getOrderForUser,
  listOrdersForUser,
  startOrderPaymentForUser,
} from "../services/orders.js";

const orderIdSchema = z.uuid({ message: "شناسه‌ی سفارش معتبر نیست." });

const hashedIpKey = (request: FastifyRequest): string => hashIp(request.ip);

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/orders",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
          keyGenerator: hashedIpKey,
        },
      },
    },
    async (request, reply) => {
      const input = parseWith(createOrderSchema, request.body);
      const auth = getAuth(request);

      const result = await createOrder({
        user: {
          id: auth.user.id,
          email: auth.user.email,
          fullName: auth.user.fullName,
          phone: auth.user.phone,
        },
        input: {
          courseId: input.courseId,
          discountCode: input.discountCode ?? null,
        },
        request: requestMeta(request),
      });

      return reply.code(201).send(result);
    },
  );

  app.get(
    "/orders",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      const orders = await listOrdersForUser(auth.user.id);
      return reply.send({ orders });
    },
  );

  app.get(
    "/orders/:id",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!orderIdSchema.safeParse(id).success) {
        throw notFound("سفارش پیدا نشد.", "order_not_found");
      }

      const auth = getAuth(request);
      const order = await getOrderForUser(auth.user.id, id);
      return reply.send({ order });
    },
  );

  /** لغو سفارش در انتظار پرداخت توسط خود کاربر. */
  app.post(
    "/orders/:id/cancel",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
          keyGenerator: hashedIpKey,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!orderIdSchema.safeParse(id).success) {
        throw notFound("سفارش پیدا نشد.", "order_not_found");
      }
      const auth = getAuth(request);
      const order = await cancelOrderForUser(auth.user.id, id);
      return reply.send({ order });
    },
  );

  /**
   * بازگرداندن لینک پرداخت سفارش در جریان؛ برای دکمه‌ی «پرداخت دوباره» در
   * داشبورد و ادامه‌ی پرداخت پس از بستن صفحه‌ی درگاه.
   */
  app.post(
    "/orders/:id/payment",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
          keyGenerator: hashedIpKey,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!orderIdSchema.safeParse(id).success) {
        throw notFound("سفارش پیدا نشد.", "order_not_found");
      }
      const auth = getAuth(request);
      const result = await startOrderPaymentForUser(auth.user.id, id);
      return reply.send(result);
    },
  );
}
