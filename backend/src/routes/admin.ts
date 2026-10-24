import type { FastifyInstance } from "fastify";
import { getAuth, requireAdmin } from "../middleware/auth.js";
import { toPublicUser } from "../types/auth.js";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  /**
   * نقطه‌ی کنترل دسترسی مدیریتی؛ در مرحله‌های بعدی مسیرهای پنل هم از همین
   * preHandler استفاده می‌کنند.
   */
  app.get(
    "/admin/security",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      return reply.send({
        user: toPublicUser(auth.user),
        session: {
          id: auth.session.id,
          totpVerified: auth.session.totpVerified,
          expiresAt: auth.session.expiresAt.toISOString(),
        },
      });
    },
  );
}
