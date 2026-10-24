import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { env } from "../config/env.js";
import { errorMeta, logger } from "../lib/logger.js";

const { Pool } = pg;

async function run(): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), "drizzle");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((first, second) => first.localeCompare(second));

  if (files.length === 0) {
    logger.warn({ migrationsDir }, "هیچ فایل migration پیدا نشد");
    return;
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 1,
    application_name: "brightpaths-migrate",
  });

  const client = await pool.connect();
  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtext('brightpaths:migrations')::bigint)",
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__migrations" (
        "name" text PRIMARY KEY,
        "applied_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    const appliedResult = await client.query<{ name: string }>(
      'SELECT "name" FROM "__migrations"',
    );
    const applied = new Set(appliedResult.rows.map((row) => row.name));

    for (const file of files) {
      if (applied.has(file)) {
        logger.info({ migration: file }, "migration قبلاً اعمال شده است");
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      logger.info({ migration: file }, "در حال اعمال migration");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "__migrations" ("name") VALUES ($1)',
          [file],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    logger.info({ count: files.length }, "migrationها با موفقیت اعمال شدند");
  } finally {
    await client.query(
      "SELECT pg_advisory_unlock(hashtext('brightpaths:migrations')::bigint)",
    );
    client.release();
    await pool.end();
  }
}

run().catch((error: unknown) => {
  logger.error(errorMeta(error), "اجرای migration ناموفق بود");
  process.exitCode = 1;
});
