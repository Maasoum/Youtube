import type { FastifyInstance } from "fastify";
import {
  adminEmailListQuerySchema,
  auditListQuerySchema,
  generalSettingsSchema,
} from "../lib/validation-panel.js";
import { parseWith } from "../lib/validation.js";
import { getAuth, requireAdmin } from "../middleware/auth.js";
import { requestMeta } from "../services/auth.js";
import {
  listAuditLogs,
  listEmailLogs,
} from "../services/admin-support.js";
import {
  getGeneralSettings,
  updateGeneralSettings,
} from "../services/settings.js";

export async function adminSupportRoutes(
  app: FastifyInstance,
): Promise<void> {
  const adminOnly = { preHandler: requireAdmin };

  app.get(
    "/admin/site-settings",
    {
      ...adminOnly,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (_request, reply) => {
      return reply.send({ settings: await getGeneralSettings() });
    },
  );

  app.put(
    "/admin/site-settings",
    {
      ...adminOnly,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const input = parseWith(generalSettingsSchema, request.body);
      const auth = getAuth(request);
      const settings = await updateGeneralSettings({
        input,
        actor: auth.user,
        request: requestMeta(request),
      });
      return reply.send({ settings });
    },
  );

  app.get(
    "/admin/audit-logs",
    {
      ...adminOnly,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const query = parseWith(auditListQuerySchema, request.query);
      return reply.send({ logs: await listAuditLogs(query) });
    },
  );

  app.get(
    "/admin/emails",
    {
      ...adminOnly,
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const query = parseWith(adminEmailListQuerySchema, request.query);
      return reply.send({ emails: await listEmailLogs(query) });
    },
  );
}
