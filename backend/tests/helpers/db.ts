import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { encryptString } from "../../src/lib/crypto.js";
import * as schema from "../../src/db/schema.js";
import type { CourseRow, OrderRow, UserRow } from "../../src/db/schema.js";

export type TestDb = PgliteDatabase<typeof schema>;

export interface TestDatabase {
  db: TestDb;
  client: PGlite;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDatabase> {
  const client = new PGlite();
  const directory = path.resolve(process.cwd(), "drizzle");
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort((first, second) => first.localeCompare(second));

  for (const file of files) {
    await client.exec(await readFile(path.join(directory, file), "utf8"));
  }

  const db = drizzle(client, { schema });

  return {
    db,
    client,
    close: async () => {
      await client.close();
    },
  };
}

export async function resetTestDb(db: TestDb): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE
      "audit_logs", "notifications", "email_outbox", "contact_messages",
      "leads", "faqs", "teachers", "blog_posts", "site_settings",
      "payment_settings", "discount_redemptions", "discount_code_courses",
      "discount_codes", "licenses", "payments", "orders", "courses", "users"
      RESTART IDENTITY CASCADE`,
  );
}

let sequence = 0;

export async function createUser(
  db: TestDb,
  overrides: Partial<typeof schema.users.$inferInsert> = {},
): Promise<UserRow> {
  sequence += 1;
  const [row] = await db
    .insert(schema.users)
    .values({
      email: `user${sequence}@example.com`,
      passwordHash: "test-hash",
      fullName: `کاربر ${sequence}`,
      emailVerifiedAt: new Date(),
      ...overrides,
    })
    .returning();

  if (!row) throw new Error("failed to create user");
  return row;
}

export async function createCourse(
  db: TestDb,
  overrides: Partial<typeof schema.courses.$inferInsert> = {},
): Promise<CourseRow> {
  sequence += 1;
  const [row] = await db
    .insert(schema.courses)
    .values({
      slug: `course-${sequence}`,
      title: `دوره‌ی ${sequence}`,
      description: "توضیح دوره برای آزمون",
      ageMin: 7,
      ageMax: 12,
      providerName: "ارائه‌دهنده",
      priceToman: 1_000_000,
      isPublished: true,
      ...overrides,
    })
    .returning();

  if (!row) throw new Error("failed to create course");
  return row;
}

export async function createOrder(
  db: TestDb,
  overrides: Partial<typeof schema.orders.$inferInsert> & {
    userId: string;
    courseId: string;
  },
): Promise<OrderRow> {
  sequence += 1;
  const [row] = await db
    .insert(schema.orders)
    .values({
      titleSnapshot: `دوره‌ی آزمون ${sequence}`,
      unitPriceSnapshot: 1_000_000,
      totalToman: 1_000_000,
      clientRefId: `BP-TEST-${sequence}`,
      ...overrides,
    })
    .returning();

  if (!row) throw new Error("failed to create order");
  return row;
}

export async function enableGateway(
  db: TestDb,
  token = "test-payping-token-123456",
): Promise<void> {
  await db.insert(schema.paymentSettings).values({
    id: 1,
    isActive: true,
    tokenEncrypted: encryptString(token),
    tokenLast4: token.slice(-4),
  });
}
