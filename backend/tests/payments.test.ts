import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { emailOutbox, orders, payments } from "../src/db/schema.js";
import { createOrder, ORDER_TTL_MS } from "../src/services/orders.js";
import {
  expirePendingOrders,
  handlePaymentCallback,
  verifyOrderPayment,
} from "../src/services/payments.js";
import { PayPingError } from "../src/services/payping.js";
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
});

beforeEach(async () => {
  await resetTestDb(database.db);
});

async function pendingOrder() {
  const user = await createUser(database.db);
  const course = await createCourse(database.db);
  await enableGateway(database.db);
  const gateway = new FakePayPing();
  const created = await createOrder(
    { user, input: { courseId: course.id } },
    { db: database.db, gateway },
  );

  const [row] = await database.db.select().from(orders).limit(1);
  const clientRefId = row?.clientRefId ?? "";

  gateway.report = {
    isPaid: false,
    awaitingVerify: true,
    refId: "R-1",
    amountToman: created.order.totalToman,
    clientRefId,
    paymentStatus: 5,
  };
  gateway.verifyResult = {
    alreadyVerified: false,
    amountToman: created.order.totalToman,
    cardNumberMasked: "6037-****-1234",
    cardHashPan: "hash",
  };

  return { user, course, gateway, created, clientRefId };
}

describe("payment callback", () => {
  it("پرداخت معتبر را تایید می‌کند", async () => {
    const { gateway, created, clientRefId } = await pendingOrder();

    const result = await handlePaymentCallback(
      { code: "PAY-TEST-1", refId: "R-1", clientRefId },
      { db: database.db, gateway },
    );

    expect(result).toEqual({ orderId: created.order.id, state: "success" });

    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("awaiting_license");
    expect(order?.paidAt).not.toBeNull();
    expect(await database.db.select().from(payments)).toHaveLength(1);
  });

  it("refId جعلی را نادیده می‌گیرد و از گزارش رسمی تایید می‌کند", async () => {
    const { gateway, clientRefId } = await pendingOrder();

    await handlePaymentCallback(
      { code: "PAY-TEST-1", refId: "R-FORGED", clientRefId },
      { db: database.db, gateway },
    );

    expect(gateway.verifyInputs[0]?.refId).toBe("R-1");
  });

  it("کد پرداخت ناشناس را خطا اعلام می‌کند", async () => {
    const { gateway } = await pendingOrder();
    const result = await handlePaymentCallback(
      { code: "UNKNOWN", refId: "R-X" },
      { db: database.db, gateway },
    );
    expect(result).toEqual({ orderId: null, state: "error" });
  });

  it("شناسه‌ی ارجاع پذیرنده‌ی ناهمخوان را رد می‌کند", async () => {
    const { gateway } = await pendingOrder();
    const result = await handlePaymentCallback(
      { code: "PAY-TEST-1", refId: "R-1", clientRefId: "BP-FORGED" },
      { db: database.db, gateway },
    );
    expect(result.state).toBe("failed");
    expect(await database.db.select().from(payments)).toHaveLength(0);
  });

  it("مبلغ ناهمخوان گزارش را نمی‌پذیرد", async () => {
    const { gateway, created, clientRefId } = await pendingOrder();
    gateway.report.amountToman = created.order.totalToman + 1;

    const result = await handlePaymentCallback(
      { code: "PAY-TEST-1", refId: "R-1", clientRefId },
      { db: database.db, gateway },
    );

    expect(result.state).toBe("failed");
    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("pending");
  });

  it("خطای شبکه‌ی درگاه را pending نگه می‌دارد", async () => {
    const { gateway, clientRefId } = await pendingOrder();
    gateway.verifyError = new PayPingError("network");

    const result = await handlePaymentCallback(
      { code: "PAY-TEST-1", refId: "R-1", clientRefId },
      { db: database.db, gateway },
    );

    expect(result.state).toBe("pending");
    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("pending");
  });

  it("بدون شناسه‌ی سفارش، با کد پرداخت سفارش را پیدا می‌کند", async () => {
    const { gateway, user } = await pendingOrder();

    const result = await verifyOrderPayment(
      {
        userId: user.id,
        code: "PAY-TEST-1",
        refId: "R-1",
      },
      { db: database.db, gateway },
    );

    expect(result.state).toBe("success");
    expect(await database.db.select().from(payments)).toHaveLength(1);
  });

  it("کد پرداخت سفارش دیگر را برای کاربر افشا نمی‌کند", async () => {
    const { gateway } = await pendingOrder();
    const stranger = await createUser(database.db);

    await expect(
      verifyOrderPayment(
        { userId: stranger.id, code: "PAY-TEST-1" },
        { db: database.db, gateway },
      ),
    ).rejects.toMatchObject({ code: "order_not_found" });
  });

  it("پاسخ «قبلاً تاییدشده» درگاه را موفق می‌داند", async () => {
    const { gateway, user, created, clientRefId } = await pendingOrder();
    gateway.verifyResult = {
      alreadyVerified: true,
      amountToman: null,
      cardNumberMasked: null,
      cardHashPan: null,
    };

    const result = await verifyOrderPayment(
      {
        orderId: created.order.id,
        userId: user.id,
        code: "PAY-TEST-1",
        refId: "R-1",
        clientRefId,
      },
      { db: database.db, gateway },
    );

    expect(result.state).toBe("success");
    expect(await database.db.select().from(payments)).toHaveLength(1);
  });
});

describe("expiry sweep", () => {
  const future = () => new Date(Date.now() + ORDER_TTL_MS + 60_000);

  it("سفارش دارای پرداخت را به‌جای انقضا تایید می‌کند", async () => {
    const { gateway, created } = await pendingOrder();
    await database.db
      .update(orders)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(orders.id, created.order.id));

    const summary = await expirePendingOrders({
      db: database.db,
      gateway,
      now: future,
    });

    expect(summary).toMatchObject({ verified: 1, expired: 0 });

    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("awaiting_license");
    const emails = await database.db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.template, "payment_receipt"));
    expect(emails).toHaveLength(1);
  });

  it("در خطای درگاه سفارش را منقضی نمی‌کند", async () => {
    const { gateway, created } = await pendingOrder();
    await database.db
      .update(orders)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(orders.id, created.order.id));
    gateway.reportError = new PayPingError("network");

    const summary = await expirePendingOrders({
      db: database.db,
      gateway,
      now: future,
    });

    expect(summary).toMatchObject({ expired: 0, skipped: 1 });
    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("pending");
  });

  it("اگر تایید خودکار ناموفق باشد سفارش را منقضی نمی‌کند", async () => {
    const { gateway, user } = await pendingOrder();
    await database.db
      .update(orders)
      .set({ expiresAt: new Date(Date.now() - 60_000) });

    gateway.report = {
      isPaid: true,
      awaitingVerify: true,
      refId: "R-TEST-1",
      amountToman: 1_000_000,
      clientRefId: null,
      paymentStatus: 5,
    };
    gateway.verifyError = new PayPingError("invalid_ref");

    const summary = await expirePendingOrders({ db: database.db, gateway });
    expect(summary.expired).toBe(0);
    expect(summary.skipped).toBe(1);

    const [order] = await database.db
      .select()
      .from(orders)
      .where(eq(orders.userId, user.id));
    expect(order?.status).toBe("pending");
  });

  it("سفارش بدون کد پرداخت را بدون درگاه منقضی می‌کند", async () => {
    const { created } = await pendingOrder();
    await database.db
      .update(orders)
      .set({
        paymentCode: null,
        expiresAt: new Date(Date.now() - 60_000),
      })
      .where(eq(orders.id, created.order.id));

    const summary = await expirePendingOrders({
      db: database.db,
      gateway: null,
      now: future,
    });

    expect(summary.expired).toBe(1);
    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.status).toBe("expired");
  });

  it("سفارش تازه را دست نمی‌زند", async () => {
    const { gateway, created } = await pendingOrder();
    const summary = await expirePendingOrders({
      db: database.db,
      gateway,
      now: () => new Date(),
    });
    expect(summary.expired).toBe(0);
    const [order] = await database.db.select().from(orders).limit(1);
    expect(order?.id).toBe(created.order.id);
    expect(order?.status).toBe("pending");
  });
});
