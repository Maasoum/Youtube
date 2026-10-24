import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { errorMeta, logger } from "../lib/logger.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok" });
  });

  app.get("/readyz", async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return reply.send({ status: "ready" });
    } catch (error) {
      logger.error(errorMeta(error), "بررسی آمادگی پایگاه داده ناموفق بود");
      return reply.code(503).send({ status: "unavailable" });
    }
  });
}
