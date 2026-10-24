import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../middleware/auth.js";
import { getAdminStats } from "../services/admin-stats.js";

export async function adminStatsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/admin/stats",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (_request, reply) => {
      return reply.send(await getAdminStats());
    },
  );
}
