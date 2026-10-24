import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { hashIp } from "../lib/ip.js";
import {
  accountDeletionSchema,
  licenseRevealParamsSchema,
  profileUpdateSchema,
} from "../lib/validation-panel.js";
import { parseWith } from "../lib/validation.js";
import { notFound } from "../lib/errors.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { requestAccountDeletion, updateProfile } from "../services/account.js";
import {
  getCourseAccess,
  listMyCourses,
  listReceipts,
} from "../services/fulfillment.js";
import { revealLicenseForUser } from "../services/licenses.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "../services/notifications.js";
import { requestMeta } from "../services/auth.js";

const hashedIpKey = (request: FastifyRequest): string => hashIp(request.ip);
const idSchema = z.uuid({ message: "شناسه معتبر نیست." });

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/me/courses",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      const courses = await listMyCourses(auth.user.id);
      return reply.send({ courses });
    },
  );

  app.get(
    "/me/courses/:courseId/access",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { courseId } = request.params as { courseId: string };
      if (!idSchema.safeParse(courseId).success) {
        throw notFound("دوره پیدا نشد.", "course_not_found");
      }
      const auth = getAuth(request);
      return reply.send({
        access: await getCourseAccess(auth.user.id, courseId),
      });
    },
  );

  app.get(
    "/me/receipts",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      return reply.send({ receipts: await listReceipts(auth.user.id) });
    },
  );

  app.get(
    "/me/notifications",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      const notifications = await listNotifications(auth.user.id);
      const unread = await unreadNotificationCount(auth.user.id);
      return reply.send({ notifications, unread });
    },
  );

  app.post(
    "/me/notifications/:id/read",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = parseWith(notificationReadParams(), request.params);
      const auth = getAuth(request);
      return reply.send({
        notification: await markNotificationRead(auth.user.id, parsed.id),
      });
    },
  );

  app.post(
    "/me/notifications/read-all",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      const updated = await markAllNotificationsRead(auth.user.id);
      return reply.send({ updated });
    },
  );

  app.patch(
    "/me/profile",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 20, timeWindow: "10 minutes" } },
    },
    async (request, reply) => {
      const input = parseWith(profileUpdateSchema, request.body);
      const auth = getAuth(request);
      const user = await updateProfile({
        userId: auth.user.id,
        fullName: input.fullName,
        phone: input.phone,
        meta: requestMeta(request),
      });
      return reply.send({ user });
    },
  );

  app.post(
    "/me/deletion-request",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = parseWith(accountDeletionSchema, request.body);
      const auth = getAuth(request);
      const receipt = await requestAccountDeletion({
        user: auth.user,
        reason: input.reason,
        meta: requestMeta(request),
      });
      return reply.code(202).send(receipt);
    },
  );

  app.get(
    "/me/licenses/:id/reveal",
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
      const { id } = parseWith(licenseRevealParamsSchema, request.params);
      const auth = getAuth(request);
      const license = await revealLicenseForUser({
        userId: auth.user.id,
        licenseId: id,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.header("Cache-Control", "no-store").send({ license });
    },
  );
}

function notificationReadParams() {
  return z.object({ id: z.uuid({ message: "شناسه‌ی اعلان معتبر نیست." }) });
}
