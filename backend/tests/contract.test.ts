import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  auditLogs,
  discountCodes,
  discountRedemptions,
  orders,
} from "../src/db/schema.js";
import { getAdminStats } from "../src/services/admin-stats.js";
import { fulfillOrder } from "../src/services/licenses.js";
import {
  cancelOrderForUser,
  createOrder,
  getOrderForUser,
  listOrdersForUser,
  startOrderPaymentForUser,
} from "../src/services/orders.js";
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
});

beforeEach(async () => {
  await resetTestDb(database.db);
});

async function setup(priceToman = 1_000_000) {
  const user = await createUser(database.db);
  const course = await createCourse(database.db, { priceToman });
  await enableGateway(database.db);
  const gateway = new FakePayPing();
  gateway.report.amountToman = priceToman;
  const created = await createOrder(
    { user, input: { courseId: course.id } },
    { db: database.db, gateway },
  );
  return { user, course, gateway, created };
}

describe("قرارداد سفارش با فرانت", () => {
  it("نمای سفارش همه‌ی فیلدهای مورد نیاز داشبورد را دارد", async () => {
    const { user, course } = await setup();

    const [order] = await listOrdersForUser(user.id, database.db);
    expect(order).toBeDefined();
    expect(order?.userId).toBe(user.id);
    expect(order?.course).toMatchObject({
      id: course.id,
      slug: course.slug,
      priceToman: course.priceToman,
    });
    expect(order?.customer.email).toBe(user.email);
    expect(order?.customer.phone).toBe(user.phone);
    expect(order?.originalPriceToman).toBe(course.priceToman);
    expect(order?.paymentState).toBe("pending");
    expect(order?.license).toBeNull();
    expect(order?.statusHistory).toEqual([]);
    expect(order?.updatedAt).toBeTruthy();

    const detail = await getOrderForUser(user.id, order?.id ?? "", database.db);
    expect(detail.statusHistory.length).toBeGreaterThan(0);
    expect(detail.statusHistory[0]?.status).toBe("pending");
  });

  it("کد کامل لایسنس در نمای سفارش نیست", async () => {
    const { user, created } = await setup();
    const admin = await createUser(database.db, { role: "admin" });
    await verifyOrderPayment(
      {
        orderId: created.order.id,
        userId: user.id,
        code: "PAY-TEST-1",
        refId: "R-1",
      },
      { db: database.db, gateway: new FakePayPing() },
    );

    await fulfillOrder(
      {
        orderId: created.order.id,
        input: {
          licenseCode: "AAAA-BBBB-CCCC-9876",
          notifyUser: false,
          confirmDuplicate: false,
        },
        actor: admin,
      },
      { db: database.db },
    );

    const detail = await getOrderForUser(user.id, created.order.id, database.db);
    expect(detail.status).toBe("fulfilled");
    expect(detail.license?.maskedCode).toContain("9876");
    expect(JSON.stringify(detail)).not.toContain("AAAA-BBBB-CCCC-9876");
  });

  it("پرداخت دوباره از کد موجود درگاه استفاده می‌کند", async () => {
    const { user, gateway, created } = await setup();

    const result = await startOrderPaymentForUser(user.id, created.order.id, {
      db: database.db,
      gateway,
    });

    expect(result.paymentUrl).toContain("/v2/pay/gotoipg/PAY-TEST-1");
    expect(gateway.createInputs).toHaveLength(1);
  });

  it("لغو توسط کاربر رزرو تخفیف را آزاد می‌کند", async () => {
    const { user } = await setup();
    const [discount] = await database.db
      .insert(discountCodes)
      .values({
        code: "HALF",
        type: "percent",
        percent: 50,
        perUserLimit: 1,
        maxUses: 5,
      })
      .returning();

    const course = await createCourse(database.db, { priceToman: 1_000_000 });
    const gateway = new FakePayPing();
    gateway.nextCode = "PAY-TEST-2";
    const created = await createOrder(
      {
        user,
        input: { courseId: course.id, discountCode: "HALF" },
      },
      { db: database.db, gateway },
    );

    const [reserved] = await database.db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.id, discount?.id ?? ""));
    expect(reserved?.usedCount).toBe(1);

    const cancelled = await cancelOrderForUser(user.id, created.order.id, {
      db: database.db,
    });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelReason).toBe("لغو توسط کاربر");

    const [released] = await database.db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.id, discount?.id ?? ""));
    expect(released?.usedCount).toBe(0);

    const [redemption] = await database.db.select().from(discountRedemptions);
    expect(redemption?.status).toBe("released");

    const logs = await database.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "order.cancelled_by_user"));
    expect(logs).toHaveLength(1);

    await expect(
      cancelOrderForUser(user.id, created.order.id, { db: database.db }),
    ).rejects.toMatchObject({ code: "order_not_cancellable" });
  });

  it("کاربر دیگر نمی‌تواند سفارش را لغو یا پرداخت کند", async () => {
    const { user, created } = await setup();
    const stranger = await createUser(database.db);

    await expect(
      cancelOrderForUser(stranger.id, created.order.id, { db: database.db }),
    ).rejects.toMatchObject({ code: "order_not_found" });
    await expect(
      startOrderPaymentForUser(stranger.id, created.order.id, {
        db: database.db,
      }),
    ).rejects.toMatchObject({ code: "order_not_found" });

    const [row] = await database.db
      .select()
      .from(orders)
      .where(eq(orders.id, created.order.id));
    expect(row?.status).toBe("pending");
    expect(row?.userId).toBe(user.id);
  });

  it("آمار داشبورد مجموع‌ها و سری هفت‌روزه را برمی‌گرداند", async () => {
    const { user, gateway, created } = await setup();
    await verifyOrderPayment(
      {
        orderId: created.order.id,
        userId: user.id,
        code: "PAY-TEST-1",
        refId: "R-1",
      },
      { db: database.db, gateway },
    );

    const stats = await getAdminStats({ db: database.db });
    expect(stats.pendingLicenses).toBe(1);
    expect(stats.totalRevenueToman).toBe(1_000_000);
    expect(stats.totalOrders).toBe(1);
    expect(stats.customers).toBe(1);
    expect(stats.todayOrders).toBe(1);
    expect(stats.deliveredLicenses).toBe(0);
    expect(stats.revenueSeries).toHaveLength(7);
    expect(stats.revenueSeries[6]?.amountToman).toBe(1_000_000);
  });
});
