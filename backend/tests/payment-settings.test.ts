import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { auditLogs, paymentSettings } from "../src/db/schema.js";
import { decryptString } from "../src/lib/crypto.js";
import {
  getPaymentSettingsView,
  savePaymentToken,
  setPaymentEnabled,
} from "../src/services/payment-settings.js";
import {
  createTestDb,
  createUser,
  resetTestDb,
  type TestDatabase,
} from "./helpers/db.js";

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDb();
});

afterAll(async () => {
  await database.close();
});

beforeEach(async () => {
  await resetTestDb(database.db);
});

describe("payment settings", () => {
  it("توکن را رمزنگاری می‌کند و فقط نسخه‌ی ماسک‌شده را برمی‌گرداند", async () => {
    const admin = await createUser(database.db, { role: "admin" });
    const token = "payping-secret-token-9876";

    const receipt = await savePaymentToken({ token, actor: admin }, database.db);

    expect(receipt).toEqual({
      message: "توکن با موفقیت ذخیره شد.",
      maskedToken: "••••9876",
      hasToken: true,
    });
    expect(JSON.stringify(receipt)).not.toContain(token);

    const [row] = await database.db.select().from(paymentSettings);
    expect(row?.tokenEncrypted).not.toBeNull();
    expect(row?.tokenEncrypted).not.toContain(token);
    expect(row?.tokenLast4).toBe("9876");
    expect(decryptString(row?.tokenEncrypted ?? "")).toBe(token);

    const view = await getPaymentSettingsView(database.db);
    expect(view.hasToken).toBe(true);
    expect(view.maskedToken).toBe("••••9876");
    expect(view.enabled).toBe(false);
    expect(JSON.stringify(view)).not.toContain(token);
  });

  it("فعال‌سازی بدون توکن ذخیره‌شده را رد می‌کند", async () => {
    const admin = await createUser(database.db, { role: "admin" });

    await expect(
      setPaymentEnabled({ enabled: true, actor: admin }, database.db),
    ).rejects.toMatchObject({ code: "payment_token_missing" });
  });

  it("پس از ذخیره‌ی توکن، فعال‌سازی ممکن است", async () => {
    const admin = await createUser(database.db, { role: "admin" });
    await savePaymentToken(
      { token: "another-secret-token-1234", actor: admin },
      database.db,
    );

    const view = await setPaymentEnabled(
      { enabled: true, actor: admin },
      database.db,
    );
    expect(view.enabled).toBe(true);

    const actions = (await database.db.select().from(auditLogs)).map(
      (row) => row.action,
    );
    expect(actions).toContain("payment.token_saved");
    expect(actions).toContain("payment.enabled");
  });

  it("ذخیره‌ی توکن، وضعیت تست قبلی را پاک می‌کند", async () => {
    const admin = await createUser(database.db, { role: "admin" });
    await database.db.insert(paymentSettings).values({
      id: 1,
      isActive: false,
      lastTestResult: "success",
      lastTestedAt: new Date(),
    });

    await savePaymentToken(
      { token: "new-secret-token-5678", actor: admin },
      database.db,
    );

    const [row] = await database.db
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.id, 1));
    expect(row?.lastTestResult).toBeNull();
    expect(row?.lastTestedAt).toBeNull();
    expect(row?.isActive).toBe(false);
  });
});
