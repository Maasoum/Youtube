import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db as defaultDb } from "../src/db/client.js";
import {
  auditLogs,
  discountRedemptions,
  discountCodes,
  emailOutbox,
  orders,
  payments,
  siteSettings,
} from "../src/db/schema.js";
import { AppError } from "../src/lib/errors.js";
import { createOrder } from "../src/services/orders.js";
import { verifyOrderPayment } from "../src/services/payments.js";
import {
  createCourse,
  createTestDb,
  createUser,
  enableGateway,
  resetTestDb,
  type TestDatabase,
} from "./helpers/db.js";
import { FakePayPing } from "./helpers/fake-payping.js";

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDb();
});

afterAll(async () => {
  await database.close();
  await defaultDb.$client.end().catch(() => undefined);
});

beforeEach(async () => {
  await resetTestDb(database.db);
});

async function setup(options: { price?: number } = {}) {
  const user = await createUser(database.db);
  const course = await createCourse(database.db, {
    priceToman: options.price ?? 1_000_000,
  });
  await enableGateway(database.db);
  const gateway = new FakePayPing();
  return { user, course, gateway };
}

describe("createOrder", () => {
  it("قیمت را از پایگاه داده می‌گیرد و کد پرداخت می‌سازد", async () => {
    const { user, course, gateway } = await setup();

    const result = await createOrder(
      { user, input: { courseId: course.id } },
      { db: database.db, gateway },
    );

    expect(result.requiresPayment).toBe(true);
    expect(result.order.status).toBe("pending");
    expect(result.order.totalToman).toBe(1_000_000);
    expect(result.paymentUrl).toContain("gotoipg");
    expect(gateway.createInputs).toHaveLength(1);
    expect(gateway.createInputs[0]?.amountToman).toBe(1_000_000);
    expect(gateway.createInputs[0]?.returnUrl).toContain(
      "/api/v1/payments/callback",
    );

    const [row] = await database.db.select().from(orders).limit(1);
    expect(row?.paymentCode).toBe("PAY-TEST-1");
    expect(row?.clientRefId).toMatch(/^BP-/);
  });

  it("مالیات را از تنظیمات می‌گیرد و روی مبلغ نهایی اعمال می‌کند", async () => {
    const { user, course, gateway } = await setup();
    await database.db.insert(siteSettings).values({
      id: 1,
      general: { taxPercent: 9.5 },
    });

    const result = await createOrder(
      { user, input: { courseId: course.id } },
      { db: database.db, gateway },
    );

    expect(result.order.taxPercent).toBe(9.5);
    expect(result.order.taxToman).toBe(95_000);
    expect(result.order.totalToman).toBe(1_095_000);
    expect(gateway.createInputs[0]?.amountToman).toBe(1_095_000);
  });

  it("به‌روزرسانی سفارش تکراری برای همان دوره را رد می‌کند", async () => {
    const { user, course, gateway } = await setup();
    await createOrder({ user, input: { courseId: course.id } }, { db: database.db, gateway });

    await expect(
      createOrder({ user, input: { courseId: course.id } }, { db: database.db, gateway }),
    ).rejects.toMatchObject({ code: "order_in_progress" });
  });

  it("در نبود توکن درگاه، خطای فعال‌نبودن درگاه می‌دهد", async () => {
    const user = await createUser(database.db);
    const course = await createCourse(database.db);

    await expect(
      createOrder({ user, input: { courseId: course.id } }, { db: database.db }),
    ).rejects.toMatchObject({ code: "payment_not_available" });

    const rows = await database.db.select().from(orders);
    expect(rows).toHaveLength(0);
  });

  it("سفارش رایگان را بدون درگاه و با وضعیت awaiting_license ثبت می‌کند", async () => {
    const { user, course } = await setup();

    const [discount] = await database.db
      .insert(discountCodes)
      .values({
        code: "FREE100",
        type: "fixed",
        amountToman: 1_000_000,
        allowFree: true,
        isActive: true,
      })
      .returning();

    const result = await createOrder(
      { user, input: { courseId: course.id, discountCode: "free100" } },
      { db: database.db, gateway: null },
    );

    expect(result.requiresPayment).toBe(false);
    expect(result.paymentUrl).toBeNull();
    expect(result.order.status).toBe("awaiting_license");
    expect(result.order.totalToman).toBe(0);

    const [saved] = await database.db.select().from(orders).limit(1);
    expect(saved?.status).toBe("awaiting_license");
    expect(saved?.paidAt).not.toBeNull();
    expect(saved?.discountCodeId).toBe(discount?.id);

    const [redemption] = await database.db
      .select()
      .from(discountRedemptions)
      .limit(1);
    expect(redemption?.status).toBe("redeemed");

    const auditRows = await database.db.select().from(auditLogs);
    expect(auditRows.some((row) => row.action === "order.created_free")).toBe(true);

    const emails = await database.db.select().from(emailOutbox);
    expect(emails.some((row) => row.template === "payment_receipt")).toBe(true);
  });

  it("مبلغ صفر بدون allow_free را رد می‌کند", async () => {
    const { user, course } = await setup();
    await database.db.insert(discountCodes).values({
      code: "NOPAY",
      type: "fixed",
      amountToman: 1_000_000,
      allowFree: false,
      isActive: true,
    });

    await expect(
      createOrder(
        { user, input: { courseId: course.id, discountCode: "NOPAY" } },
        { db: database.db, gateway: null },
      ),
    ).rejects.toMatchObject({ code: "discount_invalid" });

    expect(await database.db.select().from(orders)).toHaveLength(0);
  });

  it("ظرفیت آخر کد تخفیف را فقط یک‌بار می‌پذیرد", async () => {
    const first = await setup();
    const secondUser = await createUser(database.db);
    const secondCourse = await createCourse(database.db, {
      priceToman: 1_000_000,
    });

    await database.db.insert(discountCodes).values({
      code: "LAST1",
      type: "percent",
      percent: 10,
      maxUses: 1,
      perUserLimit: 1,
      isActive: true,
    });

    await createOrder(
      { user: first.user, input: { courseId: first.course.id, discountCode: "LAST1" } },
      { db: database.db, gateway: first.gateway },
    );

    await expect(
      createOrder(
        {
          user: secondUser,
          input: { courseId: secondCourse.id, discountCode: "LAST1" },
        },
        { db: database.db, gateway: new FakePayPing() },
      ),
    ).rejects.toMatchObject({ code: "discount_invalid" });

    const [code] = await database.db.select().from(discountCodes);
    expect(code?.usedCount).toBe(1);
    expect(await database.db.select().from(discountRedemptions)).toHaveLength(1);
  });

  it("مبلغ زیر حداقل درگاه را رد می‌کند", async () => {
    const { user, course, gateway } = await setup({ price: 500 });
    await expect(
      createOrder({ user, input: { courseId: course.id } }, { db: database.db, gateway }),
    ).rejects.toMatchObject({ code: "amount_below_gateway_minimum" });
  });
});

describe("verifyOrderPayment", () => {
  async function createPendingOrder() {
    const { user, course, gateway } = await setup();
    const created = await createOrder(
      { user, input: { courseId: course.id } },
      { db: database.db, gateway },
    );
    gateway.report = {
      isPaid: false,
      awaitingVerify: true,
      refId: "R-TEST-1",
      amountToman: created.order.totalToman,
      clientRefId: (
        await database.db.select().from(orders).limit(1)
      )[0]?.clientRefId ?? null,
      paymentStatus: 5,
    };
    gateway.verifyResult = {
      alreadyVerified: false,
      amountToman: created.order.totalToman,
      cardNumberMasked: "6037-****-****-1234",
      cardHashPan: "hash-pan",
    };
    return { user, course, gateway, created };
  }

  it("مبلغ را از سفارش می‌گیرد، نه از ورودی", async () => {
    const { user, gateway, created } = await createPendingOrder();

    const result = await verifyOrderPayment(
      {
        orderId: created.order.id,
        userId: user.id,
        code: "PAY-TEST-1",
        refId: "R-TEST-1",
      },
      { db: database.db, gateway },
    );

    expect(result.state).toBe("success");
    expect(gateway.verifyInputs[0]?.amountToman).toBe(1_000_000);

    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("awaiting_license");
    expect(order?.paidAt).not.toBeNull();
    expect(await database.db.select().from(payments)).toHaveLength(1);
  });

  it("تکرار verify اثر اضافه ندارد و ایمیل تکراری نمی‌فرستد", async () => {
    const { user, gateway, created } = await createPendingOrder();
    const input = {
      orderId: created.order.id,
      userId: user.id,
      code: "PAY-TEST-1",
      refId: "R-TEST-1",
    };

    await verifyOrderPayment(input, { db: database.db, gateway });
    const second = await verifyOrderPayment(input, { db: database.db, gateway });

    expect(second.alreadyVerified).toBe(true);
    expect(await database.db.select().from(payments)).toHaveLength(1);

    const emails = await database.db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.template, "payment_receipt"));
    expect(emails).toHaveLength(1);

    const audits = await database.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "order.payment_verified"));
    expect(audits).toHaveLength(1);
  });

  it("مبلغ ناهمخوان درگاه را رد می‌کند و سفارش را pending نگه می‌دارد", async () => {
    const { user, gateway, created } = await createPendingOrder();
    gateway.verifyResult = {
      alreadyVerified: false,
      amountToman: 1_000_001,
      cardNumberMasked: null,
      cardHashPan: null,
    };

    await expect(
      verifyOrderPayment(
        {
          orderId: created.order.id,
          userId: user.id,
          code: "PAY-TEST-1",
          refId: "R-TEST-1",
        },
        { db: database.db, gateway },
      ),
    ).rejects.toMatchObject({ code: "payment_amount_mismatch" });

    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("pending");
    expect(await database.db.select().from(payments)).toHaveLength(0);
  });

  it("پرداخت سفارش منقضی را می‌پذیرد", async () => {
    const { user, gateway, created } = await createPendingOrder();

    await database.db
      .update(orders)
      .set({ status: "expired", expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(orders.id, created.order.id));

    const result = await verifyOrderPayment(
      {
        orderId: created.order.id,
        userId: user.id,
        code: "PAY-TEST-1",
        refId: "R-TEST-1",
      },
      { db: database.db, gateway },
    );

    expect(result.state).toBe("success");
    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("awaiting_license");
  });

  it("refId متعلق به سفارش دیگر را رد می‌کند", async () => {
    const { user, gateway, created } = await createPendingOrder();
    await verifyOrderPayment(
      {
        orderId: created.order.id,
        userId: user.id,
        code: "PAY-TEST-1",
        refId: "R-TEST-1",
      },
      { db: database.db, gateway },
    );

    const otherUser = await createUser(database.db);
    const otherCourse = await createCourse(database.db);
    gateway.nextCode = "PAY-TEST-2";
    const other = await createOrder(
      { user: otherUser, input: { courseId: otherCourse.id } },
      { db: database.db, gateway },
    );

    await expect(
      verifyOrderPayment(
        {
          orderId: other.order.id,
          userId: otherUser.id,
          code: "PAY-TEST-2",
          refId: "R-TEST-1",
        },
        { db: database.db, gateway },
      ),
    ).rejects.toMatchObject({ code: "payment_reference_conflict" });
  });

  it("سفارش کاربر دیگر را ۴۰۴ می‌دهد", async () => {
    const { gateway, created } = await createPendingOrder();
    const stranger = await createUser(database.db);

    await expect(
      verifyOrderPayment(
        { orderId: created.order.id, userId: stranger.id },
        { db: database.db, gateway },
      ),
    ).rejects.toMatchObject({ code: "order_not_found" });
  });
});

describe("audit and schema guards", () => {
  it("پیام خطای تخفیف عمومی است", async () => {
    const { user, course, gateway } = await setup();
    await database.db.insert(discountCodes).values({
      code: "OFF",
      type: "percent",
      percent: 10,
      isActive: false,
    });

    try {
      await createOrder(
        { user, input: { courseId: course.id, discountCode: "OFF" } },
        { db: database.db, gateway },
      );
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("discount_invalid");
      expect((error as AppError).message).not.toContain("OFF");
    }
  });

  it("ایندکس یکتای پرداخت برای هر سفارش وجود دارد", async () => {
    const indexes = await database.db.execute(
      // eslint-disable-next-line
      (await import("drizzle-orm")).sql`select indexname from pg_indexes where tablename = 'payments'`,
    );
    const names = (indexes.rows as { indexname: string }[]).map((row) => row.indexname);
    expect(names).toContain("payments_order_uq");
    expect(names).toContain("payments_ref_id_uq");
  });

  it("سفارش‌های در جریان برای هر کاربر/دوره یکتا هستند", async () => {
    const rows = await database.db.execute(
      (await import("drizzle-orm")).sql`select indexname from pg_indexes where tablename = 'orders'`,
    );
    const names = (rows.rows as { indexname: string }[]).map((row) => row.indexname);
    expect(names).toContain("orders_active_user_course_uq");
    expect(names).toContain("orders_payment_code_uq");
  });

  it("سقف مصرف کد پس از آزادسازی برمی‌گردد", async () => {
    const { user, course, gateway } = await setup();
    await database.db.insert(discountCodes).values({
      code: "BACK",
      type: "percent",
      percent: 10,
      maxUses: 1,
      isActive: true,
    });

    const created = await createOrder(
      { user, input: { courseId: course.id, discountCode: "BACK" } },
      { db: database.db, gateway },
    );

    await database.db
      .update(orders)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(orders.id, created.order.id));

    gateway.report = {
      isPaid: false,
      awaitingVerify: false,
      refId: null,
      amountToman: null,
      clientRefId: null,
      paymentStatus: null,
    };

    const { expirePendingOrders } = await import("../src/services/payments.js");
    const summary = await expirePendingOrders(
      {
        db: database.db,
        gateway,
        now: () => new Date(Date.now() + 60_000),
      },
      10,
    );

    expect(summary.expired).toBe(1);
    const [code] = await database.db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, "BACK"));
    expect(code?.usedCount).toBe(0);

    const [redemption] = await database.db
      .select()
      .from(discountRedemptions)
      .where(
        and(
          eq(discountRedemptions.orderId, created.order.id),
          eq(discountRedemptions.status, "released"),
        ),
      );
    expect(redemption).toBeDefined();
  });
});
