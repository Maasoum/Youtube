import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { closeDatabase } from "./db/client.js";
import { errorMeta, logger } from "./lib/logger.js";

let shuttingDown = false;

async function main(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, "در حال خاموش‌کردن سرور");
    try {
      await app.close();
    } finally {
      await closeDatabase();
    }
    process.exit(0);
  };

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("unhandledRejection", (reason) => {
    app.log.error(errorMeta(reason), "Promise ردشده‌ی مدیریت‌نشده");
  });
  process.on("uncaughtException", (error) => {
    app.log.fatal(errorMeta(error), "خطای کشنده‌ی مدیریت‌نشده");
    process.exit(1);
  });

  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(
    { address: `http://${env.HOST}:${env.PORT}` },
    "سرور API اجرا شد",
  );
}

main().catch((error: unknown) => {
  logger.fatal(errorMeta(error), "اجرای سرور ناموفق بود");
  process.exit(1);
});
