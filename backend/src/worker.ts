import { and, asc, eq, lt, lte } from "drizzle-orm";
import nodemailer, { type Transporter } from "nodemailer";
import { PgBoss } from "pg-boss";
import { env } from "./config/env.js";
import { closeDatabase, db } from "./db/client.js";
import { emailOutbox } from "./db/schema.js";
import { errorMeta, workerLogger as logger } from "./lib/logger.js";
import { expirePendingOrders } from "./services/payments.js";
import { sendFulfillmentReminders } from "./services/reminders.js";

const QUEUE_NAME = "email.dispatch";
const ORDER_EXPIRY_QUEUE = "orders.expire";
const SLA_REMINDER_QUEUE = "orders.remind";
const MAX_ATTEMPTS = 5;

type ClaimedEmail = {
  id: string;
  toEmail: string;
  subject: string;
  template: string;
  bodyText: string;
  bodyHtml: string | null;
  attempts: number;
};

function createTransport(): Transporter {
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    throw new Error("SMTP پیکربندی نشده است؛ worker بدون SMTP اجرا نمی‌شود.");
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });
}

let running = false;

async function claimBatch(limit = 20): Promise<ClaimedEmail[]> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.status, "pending"),
          lte(emailOutbox.scheduledAt, new Date()),
        ),
      )
      .orderBy(asc(emailOutbox.createdAt))
      .limit(limit)
      .for("update", { skipLocked: true });

    if (rows.length === 0) return [];

    const claimed: ClaimedEmail[] = [];
    for (const row of rows) {
      await tx
        .update(emailOutbox)
        .set({ status: "sending", attempts: row.attempts + 1 })
        .where(eq(emailOutbox.id, row.id));

      claimed.push({
        id: row.id,
        toEmail: row.toEmail,
        subject: row.subject,
        template: row.template,
        bodyText: row.bodyText,
        bodyHtml: row.bodyHtml,
        attempts: row.attempts + 1,
      });
    }
    return claimed;
  });
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "خطای نامشخص";
  return message.replace(/\s+/g, " ").slice(0, 300);
}

function backoffDate(attempts: number): Date {
  const seconds = Math.min(60 * 2 ** Math.max(0, attempts - 1), 3_600);
  return new Date(Date.now() + seconds * 1_000);
}

async function dispatchEmails(transport: Transporter): Promise<void> {
  if (running) return;
  running = true;

  try {
    // اگر worker وسط ارسال خاموش شده باشد، ردیف‌های گیرکرده آزاد می‌شوند.
    await db
      .update(emailOutbox)
      .set({ status: "pending" })
      .where(
        and(
          eq(emailOutbox.status, "sending"),
          lt(emailOutbox.updatedAt, new Date(Date.now() - 10 * 60 * 1000)),
        ),
      );

    const batch = await claimBatch();
    for (const email of batch) {
      try {
        const result = await transport.sendMail({
          from: env.SMTP_FROM,
          to: email.toEmail,
          subject: email.subject,
          text: email.bodyText,
          html: email.bodyHtml ?? undefined,
        });

        await db
          .update(emailOutbox)
          .set({
            status: "sent",
            sentAt: new Date(),
            lastError: null,
          })
          .where(eq(emailOutbox.id, email.id));

        logger.info(
          { outboxId: email.id, template: email.template, messageId: result.messageId },
          "ایمیل با موفقیت ارسال شد",
        );
      } catch (error) {
        const failed = email.attempts >= MAX_ATTEMPTS;
        await db
          .update(emailOutbox)
          .set({
            status: failed ? "failed" : "pending",
            lastError: safeError(error),
            scheduledAt: failed ? new Date() : backoffDate(email.attempts),
          })
          .where(eq(emailOutbox.id, email.id));

        logger.error(
          {
            outboxId: email.id,
            template: email.template,
            attempts: email.attempts,
            failed,
          },
          "ارسال ایمیل ناموفق بود",
        );
      }
    }
  } catch (error) {
    logger.error(errorMeta(error), "پردازش صندوق ایمیل ناموفق بود");
  } finally {
    running = false;
  }
}

let shuttingDown = false;

async function main(): Promise<void> {
  const transport = createTransport();

  const boss = new PgBoss(env.DATABASE_URL);
  boss.on("error", (error) => {
    logger.error(errorMeta(error), "خطای pg-boss");
  });

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "در حال خاموش‌کردن worker");
    try {
      await boss.stop({ graceful: true });
      transport.close();
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

  await boss.start();

  for (const queue of [QUEUE_NAME, ORDER_EXPIRY_QUEUE, SLA_REMINDER_QUEUE]) {
    const existingQueue = await boss.getQueue(queue);
    if (!existingQueue) {
      await boss.createQueue(queue);
    }
  }

  await boss.work(QUEUE_NAME, { batchSize: 1 }, async (_jobs) => {
    await dispatchEmails(transport);
    return { processed: true };
  });

  await boss.work(ORDER_EXPIRY_QUEUE, { batchSize: 1 }, async (_jobs) => {
    try {
      const summary = await expirePendingOrders();
      if (summary.expired > 0 || summary.verified > 0) {
        logger.info(summary, "پاک‌سازی سفارش‌های منقضی انجام شد");
      }
    } catch (error) {
      // خطای این job نباید صف ایمیل را متوقف کند.
      logger.error(errorMeta(error), "پاک‌سازی سفارش‌های منقضی ناموفق بود");
    }
    return { processed: true };
  });

  await boss.work(SLA_REMINDER_QUEUE, { batchSize: 1 }, async (_jobs) => {
    try {
      const summary = await sendFulfillmentReminders();
      if (summary.sent > 0) {
        logger.info(summary, "یادآوری سفارش‌های گذشته از SLA ثبت شد");
      }
    } catch (error) {
      logger.error(errorMeta(error), "یادآوری سفارش‌های گذشته از SLA ناموفق بود");
    }
    return { processed: true };
  });

  await boss.schedule(QUEUE_NAME, "* * * * *", null, {
    singletonKey: "email-dispatch",
  });

  await boss.schedule(ORDER_EXPIRY_QUEUE, "* * * * *", null, {
    singletonKey: "order-expiry",
  });

  // بررسی ساعتی کافی است؛ هر سفارش حداکثر یک یادآوری در ۲۴ ساعت می‌گیرد.
  await boss.schedule(SLA_REMINDER_QUEUE, "0 * * * *", null, {
    singletonKey: "sla-reminder",
  });

  // اجرای فوری در شروع worker؛ زمان‌بندی برای ادامه کار است.
  await boss.send(QUEUE_NAME, null, { singletonKey: "email-dispatch" });
  await boss.send(ORDER_EXPIRY_QUEUE, null, { singletonKey: "order-expiry" });
  await boss.send(SLA_REMINDER_QUEUE, null, { singletonKey: "sla-reminder" });

  logger.info("worker ایمیل، انقضای سفارش و یادآوری SLA آماده است");

  process.on("unhandledRejection", (reason) => {
    logger.error(errorMeta(reason), "Promise ردشده‌ی مدیریت‌نشده در worker");
  });
  process.on("uncaughtException", (error) => {
    logger.fatal(errorMeta(error), "خطای کشنده در worker");
    process.exit(1);
  });
}

main().catch((error: unknown) => {
  logger.fatal(errorMeta(error), "اجرای worker ناموفق بود");
  process.exit(1);
});
