import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema.js";

/**
 * نوع مشترک پایگاه داده؛ هم اتصال node-postgres در تولید و هم اتصال درون‌حافظه‌ای
 * آزمون‌ها با همین قرارداد کار می‌کنند. سرویس‌ها این نوع را می‌گیرند تا در
 * تست‌ها بدون شبکه هم قابل اجرا باشند.
 */
export type AppDb = PgDatabase<PgQueryResultHKT, typeof schema>;
