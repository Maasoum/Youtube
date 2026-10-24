import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { notFound } from "../lib/errors.js";
import { setUserActiveSchema, adminListQuerySchema } from "../lib/validation-panel.js";
import { parseWith } from "../lib/validation.js";
import { getAuth, requireAdmin } from "../middleware/auth.js";
import { requestMeta } from "../services/auth.js";
import {
  getUserDetail,
  listUsers,
  setUserActive,
} from "../services/users-admin.js";

const idSchema = z.uuid({ message: "شناسه‌ی کاربر معتبر نیست." });

function userIdOf(params: unknown): string {
  const { id } = params as { id?: string };
  if (!id || !idSchema.safeParse(id).success) {
    throw notFound("کاربر پیدا نشد.", "user_not_found");
  }
  return id;
}

export async function adminUserRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = { preHandler: requireAdmin };

  app.get(
    "/admin/users",
    {
      ...adminOnly,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const query = parseWith(adminListQuerySchema, request.query);
      return reply.send({ users: await listUsers(query) });
    },
  );

  app.get(
    "/admin/users/:id",
    {
      ...adminOnly,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      return reply.send({
        detail: await getUserDetail(userIdOf(request.params)),
      });
    },
  );

  app.patch(
    "/admin/users/:id",
    {
      ...adminOnly,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const userId = userIdOf(request.params);
      const input = parseWith(setUserActiveSchema, request.body);
      const auth = getAuth(request);
      const user = await setUserActive({
        userId,
        active: input.active,
        reason: input.reason,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ user });
    },
  );
}
