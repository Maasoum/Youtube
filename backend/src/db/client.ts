import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import { errorMeta, logger } from "../lib/logger.js";
import * as schema from "./schema.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 12,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "brightpaths-api",
});

pool.on("error", (error) => {
  logger.error(errorMeta(error), "خطای غیرمنتظره در اتصال PostgreSQL");
});

export const db = drizzle(pool, {
  schema,
  logger: false,
});

export type Database = typeof db;

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
