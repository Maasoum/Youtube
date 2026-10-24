import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema.js";
import { decryptJson, encryptString, fingerprint } from "../src/lib/crypto.js";
import {
  createCourse,
  createOrder,
  createTestDb,
  createUser,
  resetTestDb,
  type TestDatabase,
} from "./helpers/db.js";
import {
  editLicense,
  fulfillOrder,
  grantGiftLicense,
  listLicenses,
  resendLicenseEmail,
  revealLicenseForAdmin,
  revealLicenseForUser,
  revokeLicense,
} from "../src/services/licenses.js";
import {
  cancelOrder,
  getCourseAccess,
  getOrderForAdmin,
  holdOrder,
  listFulfillmentQueue,
  listMyCourses,
  refundOrder,
  resumeOrder,
  sendDelayEmail,
} from "../src/services/fulfillment.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "../src/services/notifications.js";

let database: TestDatabase;

const KEY = "ABCD-1234-EFGH-5678";

beforeEach(async () => {
  if (!database) {
    database = await createTestDb();
  } else {
    await resetTestDb(database.db);
  }
});

afterAll(async () => {
  await database?.close();
});

async function seedAwaitingOrder(params?: { keySeenBy?: string }) {
  const admin = await createUser(database.db, {
    role: "admin",
    totpEnabledAt: new Date(),
  });
  const customer = await createUser(database.db);
  const course = await createCourse(database.db, { slug: `course-${Date.now()}` });

  if (params?.keySeenBy) {
    const other = await createUser(database.db);
    const otherCourse = await createCourse(database.db, { slug: `other-${Date.now()}` });
    const otherOrder = await createOrder(database.db, {
      userId: other.id,
      courseId: otherCourse.id,
      status: "fulfilled",
      paidAt: new Date(),
    });
    await database.db.insert(schema.licenses).values({
      userId: other.id,
      courseId: otherCourse.id,
      orderId: otherOrder.id,
      payloadEncrypted: encryptString(
        JSON.stringify({
          licenseKey: params.keySeenBy,
          description: null,
          providerReference: null,
        }),
      ),
      keyFingerprint: fingerprint(params.keySeenBy),
      keyLast4: params.keySeenBy.slice(-4),
    });
  }

  const order = await createOrder(database.db, {
    userId: customer.id,
    courseId: course.id,
    status: "awaiting_license",
    paidAt: new Date(),
  });

  return { admin, customer, course, order };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    licenseCode: KEY,
    description: "پنل ارائه‌دهنده",
    providerReference: "REF-1",
    notifyUser: true,
    confirmDuplicate: false,
    ...overrides,
  };
}

describe("ثبت لایسنس", () => {
  it("در یک تراکنش لایسنس، وضعیت سفارش، اعلان، ایمیل و audit را ثبت می‌کند", async () => {
    const { admin, customer, course, order } = await seedAwaitingOrder();

    const result = await fulfillOrder(
      {
        orderId: order.id,
        input: input(),
        actor: admin,
        request: { ip: "hashed-ip", userAgent: "vitest" },
      },
      { db: database.db },
    );

    expect(result.emailed).toBe(true);

    const [savedOrder] = await database.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id));
    expect(savedOrder?.status).toBe("fulfilled");
    expect(savedOrder?.fulfilledAt).toBeInstanceOf(Date);

    const [license] = await database.db
      .select()
      .from(schema.licenses)
      .where(eq(schema.licenses.orderId, order.id));
    expect(license?.keyLast4).toBe("5678");
    expect(license?.payloadEncrypted).not.toContain(KEY);
    const payload = decryptJson<{ licenseKey: string }>(
      license?.payloadEncrypted ?? "",
    );
    expect(payload.licenseKey).toBe(KEY);

    const notifications = await database.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, customer.id));
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.title).toContain("لایسنس");

    const emails = await database.db.select().from(schema.emailOutbox);
    expect(emails).toHaveLength(1);
    expect(emails[0]?.template).toBe("license_delivery");
    expect(emails[0]?.toEmail).toBe(customer.email);
    expect(emails[0]?.orderId).toBe(order.id);
    // پیش‌فرض تنظیمات: کلید در ایمیل نمی‌آید.
    expect(emails[0]?.bodyText).not.toContain(KEY);
    expect(emails[0]?.bodyHtml ?? "").not.toContain(KEY);

    const audits = await database.db.select().from(schema.auditLogs);
    expect(audits.map((row) => row.action)).toEqual(
      expect.arrayContaining(["license.issued", "order.fulfilled"]),
    );
    expect(audits.every((row) => row.ip === "hashed-ip" || row.ip === null)).toBe(
      true,
    );

    const myCourses = await listMyCourses(customer.id, database.db);
    expect(myCourses).toHaveLength(1);
    expect(myCourses[0]?.course.id).toBe(course.id);
    expect(JSON.stringify(myCourses)).not.toContain(KEY);

    const list = await listLicenses({}, database.db);
    expect(list[0]?.maskedCode).toBe("••••5678");
    expect(JSON.stringify(list)).not.toContain(KEY);
  });

  it("با روشن‌بودن تنظیمات، کلید در ایمیل تحویل می‌آید", async () => {
    const { admin, order } = await seedAwaitingOrder();
    await database.db.insert(schema.siteSettings).values({
      id: 1,
      general: {
        fulfillmentSlaHours: 24,
        includeLicenseKeyInEmail: true,
        taxPercent: 0,
        footer: { about: "", email: "", phone: "", address: "" },
        trustBadge: { enabled: false, label: "", url: "", code: "" },
      },
    });

    await fulfillOrder(
      { orderId: order.id, input: input(), actor: admin },
      { db: database.db },
    );

    const [email] = await database.db.select().from(schema.emailOutbox);
    expect(email?.bodyText).toContain(KEY);
  });

  it("کلید تکراری را بدون تأیید صریح رد می‌کند و چیزی ثبت نمی‌شود", async () => {
    const { admin, order } = await seedAwaitingOrder({ keySeenBy: KEY });

    await expect(
      fulfillOrder(
        { orderId: order.id, input: input(), actor: admin },
        { db: database.db },
      ),
    ).rejects.toMatchObject({ code: "license_duplicate", statusCode: 409 });

    const [savedOrder] = await database.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id));
    expect(savedOrder?.status).toBe("awaiting_license");

    const rows = await database.db
      .select()
      .from(schema.licenses)
      .where(eq(schema.licenses.orderId, order.id));
    expect(rows).toHaveLength(0);

    const emails = await database.db.select().from(schema.emailOutbox);
    expect(emails.filter((row) => row.template === "license_delivery")).toHaveLength(
      0,
    );

    await fulfillOrder(
      {
        orderId: order.id,
        input: input({ confirmDuplicate: true }),
        actor: admin,
      },
      { db: database.db },
    );

    const [fulfilled] = await database.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id));
    expect(fulfilled?.status).toBe("fulfilled");
  });

  it("سفارش تحویل‌شده دوباره پذیرفته نمی‌شود", async () => {
    const { admin, order } = await seedAwaitingOrder();
    const deps = { db: database.db };

    await fulfillOrder({ orderId: order.id, input: input(), actor: admin }, deps);

    await expect(
      fulfillOrder(
        { orderId: order.id, input: input({ licenseCode: "NEW-0000-1111-2222" }), actor: admin },
        deps,
      ),
    ).rejects.toMatchObject({ code: "order_already_fulfilled" });
  });
});

describe("افشای صریح کلید", () => {
  it("مدیر کلید را با ثبت audit می‌بیند و کاربر فقط کلید خودش را", async () => {
    const { admin, customer, order } = await seedAwaitingOrder();
    const deps = { db: database.db };
    const fulfilled = await fulfillOrder(
      { orderId: order.id, input: input(), actor: admin },
      deps,
    );

    const revealed = await revealLicenseForAdmin(
      { licenseId: fulfilled.licenseId, actor: admin, request: { ip: "hashed" } },
      database.db,
    );
    expect(revealed.code).toBe(KEY);

    const audit = await database.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, "license.revealed_by_admin"));
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit)).not.toContain(KEY);

    const own = await revealLicenseForUser(
      { userId: customer.id, licenseId: fulfilled.licenseId, actor: customer },
      database.db,
    );
    expect(own.code).toBe(KEY);

    const stranger = await createUser(database.db);
    await expect(
      revealLicenseForUser(
        { userId: stranger.id, licenseId: fulfilled.licenseId, actor: stranger },
        database.db,
      ),
    ).rejects.toMatchObject({ code: "license_not_found" });
  });
});

describe("ویرایش، ارسال مجدد و لغو", () => {
  it("ویرایش کلید جدید را رمزنگاری می‌کند و ایمیل به‌روزرسانی می‌فرستد", async () => {
    const { admin, order } = await seedAwaitingOrder();
    const deps = { db: database.db };
    const { licenseId, orderId } = await fulfillOrder(
      { orderId: order.id, input: input(), actor: admin },
      deps,
    );

    const edited = await editLicense(
      {
        licenseId,
        input: {
          licenseCode: "WXYZ-9999-0000-1111",
          description: "نسخه‌ی دوم",
          providerReference: "REF-2",
          notifyUser: true,
          confirmDuplicate: false,
        },
        actor: admin,
      },
      deps,
    );
    expect(edited.emailed).toBe(true);

    const [row] = await database.db
      .select()
      .from(schema.licenses)
      .where(eq(schema.licenses.id, licenseId));
    const payload = decryptJson<{ licenseKey: string; description: string }>(
      row?.payloadEncrypted ?? "",
    );
    expect(payload.licenseKey).toBe("WXYZ-9999-0000-1111");
    expect(payload.description).toBe("نسخه‌ی دوم");
    expect(row?.keyLast4).toBe("1111");

    const emails = await database.db.select().from(schema.emailOutbox);
    expect(emails.some((item) => item.template === "license_updated")).toBe(true);
    expect(emails.find((item) => item.template === "license_updated")?.bodyText).not.toContain(
      "WXYZ-9999-0000-1111",
    );

    const receipt = await resendLicenseEmail(
      { orderId, actor: admin },
      deps,
    );
    expect(receipt.includesKey).toBe(false);

    const resent = await database.db
      .select()
      .from(schema.emailOutbox)
      .where(eq(schema.emailOutbox.template, "license_delivery"));
    expect(resent).toHaveLength(2);
  });

  it("لغو لایسنس وضعیت را revoked می‌کند و دلیل را نگه می‌دارد", async () => {
    const { admin, order } = await seedAwaitingOrder();
    const deps = { db: database.db };
    const { licenseId } = await fulfillOrder(
      { orderId: order.id, input: input(), actor: admin },
      deps,
    );

    await revokeLicense(
      { licenseId, reason: "کلید توسط ارائه‌دهنده باطل شد.", actor: admin },
      deps,
    );

    const [row] = await database.db
      .select()
      .from(schema.licenses)
      .where(eq(schema.licenses.id, licenseId));
    expect(row?.status).toBe("revoked");
    expect(row?.revokedAt).toBeInstanceOf(Date);
    expect(row?.revokedReason).toContain("باطل");

    await expect(
      editLicense(
        {
          licenseId,
          input: {
            description: "تغییر",
            notifyUser: false,
            confirmDuplicate: false,
          },
          actor: admin,
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "license_revoked" });
  });
});

describe("هدیه و اقدام‌های سفارش", () => {
  it("اعطای دستی سفارش هدیه و لایسنس admin_gift می‌سازد", async () => {
    const admin = await createUser(database.db, {
      role: "admin",
      totpEnabledAt: new Date(),
    });
    const customer = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "gift-course" });

    const result = await grantGiftLicense(
      {
        input: {
          email: customer.email,
          courseId: course.id,
          licenseCode: "GIFT-0000-1111-2222",
          notifyUser: true,
          confirmDuplicate: false,
        },
        actor: admin,
      },
      { db: database.db },
    );

    const [order] = await database.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, result.orderId));
    expect(order?.status).toBe("fulfilled");
    expect(order?.source).toBe("gift");
    expect(order?.totalToman).toBe(0);

    const [license] = await database.db
      .select()
      .from(schema.licenses)
      .where(eq(schema.licenses.id, result.licenseId));
    expect(license?.source).toBe("admin_gift");
    expect(license?.status).toBe("active");

    const emails = await database.db.select().from(schema.emailOutbox);
    expect(emails[0]?.template).toBe("gift_license");

    const audits = await database.db.select().from(schema.auditLogs);
    expect(audits.map((row) => row.action)).toEqual(
      expect.arrayContaining(["license.gifted", "order.gifted"]),
    );
  });

  it("hold، ایمیل تأخیر، resume و صف با پرچم overdue را مدیریت می‌کند", async () => {
    const { admin, order } = await seedAwaitingOrder();
    const deps = { db: database.db };

    await holdOrder(
      {
        orderId: order.id,
        reason: "منتظر پاسخ ارائه‌دهنده",
        sendDelayEmail: true,
        actor: admin,
      },
      deps,
    );

    const [held] = await database.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id));
    expect(held?.status).toBe("on_hold");
    expect(held?.onHoldReason).toContain("ارائه‌دهنده");

    const emails = await database.db.select().from(schema.emailOutbox);
    expect(emails.some((item) => item.template === "delay_notice")).toBe(true);

    const queue = await listFulfillmentQueue({ db: database.db });
    expect(queue.slaHours).toBe(24);
    expect(queue.orders[0]?.overdue).toBe(false);
    expect(queue.orders[0]?.status).toBe("on_hold");

    await sendDelayEmail({ orderId: order.id, actor: admin }, deps);
    await resumeOrder({ orderId: order.id, actor: admin }, deps);

    const [resumed] = await database.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id));
    expect(resumed?.status).toBe("awaiting_license");
    expect(resumed?.onHoldReason).toBeNull();
  });

  it("استرداد دستی سفارش را refunded و لایسنس را revoked می‌کند", async () => {
    const { admin, order } = await seedAwaitingOrder();
    const deps = { db: database.db };
    const { licenseId } = await fulfillOrder(
      { orderId: order.id, input: input(), actor: admin },
      deps,
    );

    await refundOrder(
      {
        orderId: order.id,
        reason: "درخواست مشتری",
        reference: "REFUND-1",
        actor: admin,
      },
      deps,
    );

    const detail = await getOrderForAdmin(order.id, { db: database.db });
    expect(detail.status).toBe("refunded");
    expect(detail.refund?.reason).toContain("مشتری");

    const [license] = await database.db
      .select()
      .from(schema.licenses)
      .where(eq(schema.licenses.id, licenseId));
    expect(license?.status).toBe("revoked");

    const emails = await database.db.select().from(schema.emailOutbox);
    expect(emails.some((item) => item.template === "refund_notice")).toBe(true);
  });

  it("لغو سفارش در انتظار لایسنس وضعیت را cancelled می‌کند", async () => {
    const { admin, order } = await seedAwaitingOrder();

    await cancelOrder(
      { orderId: order.id, reason: "انصراف مشتری", actor: admin },
      { db: database.db },
    );

    const [row] = await database.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id));
    expect(row?.status).toBe("cancelled");
    expect(row?.cancelReason).toContain("انصراف");
  });
});

describe("دسترسی و اعلان‌ها", () => {
  it("دسترسی خرید را بر اساس لایسنس و سفارش در جریان تعیین می‌کند", async () => {
    const { customer, course, order } = await seedAwaitingOrder();

    const before = await getCourseAccess(customer.id, course.id, database.db);
    expect(before.allowed).toBe(false);
    expect(before.reason).toBe("in-progress");
    expect(before.orderId).toBe(order.id);

    const otherCourse = await createCourse(database.db, { slug: "free-access" });
    const free = await getCourseAccess(customer.id, otherCourse.id, database.db);
    expect(free.allowed).toBe(true);
  });

  it("اعلان‌ها فقط برای صاحب حساب خوانده می‌شوند", async () => {
    const { admin, customer, order } = await seedAwaitingOrder();
    await fulfillOrder(
      { orderId: order.id, input: input(), actor: admin },
      { db: database.db },
    );

    const list = await listNotifications(customer.id, {}, database.db);
    expect(list).toHaveLength(1);
    expect(await unreadNotificationCount(customer.id, database.db)).toBe(1);

    await markNotificationRead(customer.id, list[0]?.id ?? "", database.db);
    expect(await unreadNotificationCount(customer.id, database.db)).toBe(0);

    await markAllNotificationsRead(customer.id, database.db);
    const [row] = await database.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, list[0]?.id ?? ""));
    expect(row?.readAt).toBeInstanceOf(Date);

    const stranger = await createUser(database.db);
    await expect(
      markNotificationRead(stranger.id, list[0]?.id ?? "", database.db),
    ).rejects.toMatchObject({ code: "notification_not_found" });
  });
});
