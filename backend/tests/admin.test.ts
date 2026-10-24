import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema.js";
import {
  createCourse,
  createOrder,
  createTestDb,
  createUser,
  resetTestDb,
  type TestDatabase,
} from "./helpers/db.js";
import {
  createCourse as createCourseAdmin,
  deleteCourse,
  listAllFaqs,
  setCoursePublished,
  updateCourse,
} from "../src/services/catalog-admin.js";
import {
  bulkCreateDiscounts,
  createDiscount,
  deleteDiscount,
  getDiscountUsage,
  listDiscounts,
  toggleDiscount,
} from "../src/services/discounts-admin.js";
import {
  getUserDetail,
  listUsers,
  setUserActive,
} from "../src/services/users-admin.js";
import {
  deleteLead,
  listAuditLogs,
  listEmailLogs,
  listMessages,
  listLeads,
  updateMessageStatus,
} from "../src/services/admin-support.js";
import {
  getGeneralSettings,
  getPublicSiteSettings,
  updateGeneralSettings,
} from "../src/services/settings.js";
import { requestAccountDeletion, updateProfile } from "../src/services/account.js";
import { sendFulfillmentReminders } from "../src/services/reminders.js";

let database: TestDatabase;

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

async function adminUser() {
  return createUser(database.db, {
    role: "admin",
    totpEnabledAt: new Date(),
  });
}

function courseInput(overrides: Record<string, unknown> = {}) {
  return {
    slug: "new-course",
    title: "دوره‌ی تازه",
    tagline: "یک خط توضیح",
    description: "پاراگراف اول\n\nپاراگراف دوم",
    level: "beginner" as const,
    ageMin: 7,
    ageMax: 12,
    durationWeeks: 8,
    sessions: 16,
    priceToman: 1_200_000,
    outcomes: ["مهارت اول"],
    syllabus: [{ title: "جلسه‌ی اول", summary: "شروع" }],
    faqs: [{ question: "برای چه کسی است؟", answer: "برای کودکان" }],
    popular: false,
    featured: false,
    providerName: "ارائه‌دهنده",
    activationInstructions: "",
    published: true,
    ...overrides,
  };
}

describe("تنظیمات عمومی سایت", () => {
  it("ذخیره می‌شود، در audit می‌آید و نمای عمومی فقط فیلدهای مجاز دارد", async () => {
    const admin = await adminUser();

    const saved = await updateGeneralSettings(
      {
        input: {
          fulfillmentSlaHours: 36,
          includeLicenseKeyInEmail: true,
          taxPercent: 9,
          footer: {
            about: "درباره",
            email: "hello@example.com",
            phone: "۰۲۱۰۰۰۰۰۰۰۰",
            address: "تهران",
          },
          trustBadge: {
            enabled: true,
            label: "نماد",
            url: "https://trust.example",
            code: "",
          },
        },
        actor: admin,
      },
      database.db,
    );
    expect(saved.fulfillmentSlaHours).toBe(36);

    expect(await getGeneralSettings(database.db)).toMatchObject({
      fulfillmentSlaHours: 36,
      includeLicenseKeyInEmail: true,
      taxPercent: 9,
    });

    const publicView = await getPublicSiteSettings(database.db);
    expect(publicView).toHaveProperty("trustBadge");
    expect(JSON.stringify(publicView)).not.toContain("includeLicenseKeyInEmail");

    const logs = await listAuditLogs({ action: "settings.general_updated" }, database.db);
    expect(logs).toHaveLength(1);
  });
});

describe("مدیریت دوره‌ها", () => {
  it("دوره می‌سازد، ویرایش و جابه‌جایی انتشار را انجام می‌دهد", async () => {
    const admin = await adminUser();

    const created = await createCourseAdmin(
      { input: courseInput(), actor: admin },
      { db: database.db },
    );
    expect(created.slug).toBe("new-course");
    expect(created.description).toEqual(["پاراگراف اول", "پاراگراف دوم"]);

    await expect(
      createCourseAdmin(
        { input: courseInput(), actor: admin },
        { db: database.db },
      ),
    ).rejects.toMatchObject({ code: "slug_taken" });

    const updated = await updateCourse(
      {
        courseId: created.id,
        input: courseInput({ title: "عنوان تازه", priceToman: 1_500_000 }),
        actor: admin,
      },
      { db: database.db },
    );
    expect(updated.title).toBe("عنوان تازه");
    expect(updated.priceToman).toBe(1_500_000);

    const hidden = await setCoursePublished(
      { courseId: created.id, published: false, actor: admin },
      { db: database.db },
    );
    expect(hidden.published).toBe(false);
  });

  it("دوره‌ای که سفارش دارد حذف نمی‌شود", async () => {
    const admin = await adminUser();
    const customer = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "used-course" });
    await createOrder(database.db, {
      userId: customer.id,
      courseId: course.id,
      status: "fulfilled",
      paidAt: new Date(),
    });

    await expect(
      deleteCourse(
        { courseId: course.id, actor: admin },
        { db: database.db },
      ),
    ).rejects.toMatchObject({ code: "course_in_use" });
  });

  it("پرسش‌های متداول خالی را برمی‌گرداند", async () => {
    expect(await listAllFaqs(database.db)).toEqual([]);
  });
});

describe("مدیریت کدهای تخفیف", () => {
  it("کد را می‌سازد، غیرفعال می‌کند و در فهرست نشان می‌دهد", async () => {
    const admin = await adminUser();

    const created = await createDiscount(
      {
        input: {
          code: "off20",
          type: "percent",
          percent: 20,
          minOrderToman: 0,
          maxUsesPerUser: 1,
          firstPurchaseOnly: false,
          allowFree: false,
          active: true,
        },
        actor: admin,
      },
      database.db,
    );
    expect(created.code).toBe("OFF20");

    await expect(
      createDiscount(
        {
          input: {
            code: "OFF20",
            type: "percent",
            percent: 10,
            minOrderToman: 0,
            maxUsesPerUser: 1,
            firstPurchaseOnly: false,
            allowFree: false,
            active: true,
          },
          actor: admin,
        },
        database.db,
      ),
    ).rejects.toMatchObject({ code: "discount_code_taken" });

    const toggled = await toggleDiscount(
      { code: "OFF20", actor: admin },
      database.db,
    );
    expect(toggled.active).toBe(false);

    const list = await listDiscounts({}, database.db);
    expect(list).toHaveLength(1);
    expect(list[0]?.code).toBe("OFF20");
  });

  it("ساخت انبوه تعداد درخواستی کد یکتا می‌سازد", async () => {
    const admin = await adminUser();
    const created = await bulkCreateDiscounts(
      {
        input: {
          prefix: "AUTUMN",
          count: 5,
          type: "fixed",
          amountToman: 100_000,
          minOrderToman: 0,
          maxUsesPerUser: 1,
          firstPurchaseOnly: false,
          allowFree: false,
          active: true,
        },
        actor: admin,
      },
      database.db,
    );

    expect(created).toHaveLength(5);
    expect(new Set(created.map((item) => item.code)).size).toBe(5);
  });

  it("گزارش مصرف فقط رزروهای نهایی‌شده را می‌شمارد", async () => {
    const admin = await adminUser();
    const customer = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "discount-course" });
    const created = await createDiscount(
      {
        input: {
          code: "REPORT10",
          type: "percent",
          percent: 10,
          minOrderToman: 0,
          maxUsesPerUser: 1,
          firstPurchaseOnly: false,
          allowFree: false,
          active: true,
          courseIds: [course.id],
        },
        actor: admin,
      },
      database.db,
    );

    const [discountRow] = await database.db
      .select()
      .from(schema.discountCodes)
      .where(eq(schema.discountCodes.code, "REPORT10"));
    const order = await createOrder(database.db, {
      userId: customer.id,
      courseId: course.id,
      status: "fulfilled",
      paidAt: new Date(),
      discountCodeId: discountRow?.id,
      discountToman: 120_000,
      totalToman: 1_080_000,
    });
    await database.db.insert(schema.discountRedemptions).values({
      discountCodeId: discountRow?.id ?? "",
      userId: customer.id,
      orderId: order.id,
      status: "redeemed",
      reservedAt: new Date(),
      redeemedAt: new Date(),
    });
    await database.db.update(schema.discountCodes).set({ usedCount: 1 });

    const usage = await getDiscountUsage("REPORT10", database.db);
    expect(usage.code).toBe("REPORT10");
    expect(usage.totalUses).toBe(1);
    expect(usage.totalDiscountToman).toBe(120_000);
    expect(usage.orders[0]?.orderId).toBe(order.id);
    expect(created.courseIds).toEqual([course.id]);

    await expect(
      deleteDiscount({ code: "REPORT10", actor: admin }, database.db),
    ).rejects.toMatchObject({ code: "discount_in_use" });
  });
});

describe("مدیریت کاربران", () => {
  it("فهرست و جزئیات کاربر را با شمار سفارش‌ها می‌دهد", async () => {
    const customer = await createUser(database.db, { fullName: "سارا محمدی" });
    const course = await createCourse(database.db, { slug: "user-course" });
    await createOrder(database.db, {
      userId: customer.id,
      courseId: course.id,
      status: "fulfilled",
      paidAt: new Date(),
    });

    const users = await listUsers({ q: "سارا" }, database.db);
    expect(users).toHaveLength(1);

    const detail = await getUserDetail(customer.id, database.db);
    expect(detail.orders).toHaveLength(1);
    expect(detail.user.email).toBe(customer.email);
  });

  it("غیرفعال‌سازی دلیل می‌خواهد و نشست‌ها را می‌بندد", async () => {
    const admin = await adminUser();
    const target = await createUser(database.db);

    await database.db.insert(schema.sessions).values({
      userId: target.id,
      tokenHash: "disable-target-token",
      totpVerified: true,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      setUserActive(
        { userId: target.id, active: false, actor: admin },
        database.db,
      ),
    ).rejects.toMatchObject({ code: "reason_required" });

    const disabled = await setUserActive(
      {
        userId: target.id,
        active: false,
        reason: "نقض قوانین استفاده",
        actor: admin,
      },
      database.db,
    );
    expect(disabled.isActive).toBe(false);

    const sessions = await database.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, target.id));
    expect(sessions[0]?.revokedAt).toBeInstanceOf(Date);

    await expect(
      setUserActive(
        { userId: admin.id, active: false, reason: "تست", actor: admin },
        database.db,
      ),
    ).rejects.toMatchObject({ code: "self_disable_forbidden" });
  });
});

describe("پشتیبانی، لیدها و گزارش‌ها", () => {
  it("وضعیت پیام تغییر می‌کند و لید حذف می‌شود", async () => {
    const admin = await adminUser();
    const [message] = await database.db
      .insert(schema.contactMessages)
      .values({
        name: "مهدی",
        email: "mahdi@example.com",
        subject: "سؤال",
        message: "متن پیام",
      })
      .returning();

    const updated = await updateMessageStatus(
      {
        messageId: message?.id ?? "",
        status: "read",
        actor: admin,
      },
      database.db,
    );
    expect(updated.status).toBe("read");

    const [lead] = await database.db
      .insert(schema.leads)
      .values({ fullName: "لید تست", contact: "09120000000", source: "site" })
      .returning();

    expect(await listLeads({}, database.db)).toHaveLength(1);
    await deleteLead(
      { leadId: lead?.id ?? "", actor: admin },
      database.db,
    );
    expect(await listLeads({}, database.db)).toHaveLength(0);

    const messages = await listMessages({ status: "read" }, database.db);
    expect(messages).toHaveLength(1);
  });

  it("فهرست ایمیل‌ها فقط فراداده برمی‌گرداند و بدنه را لو نمی‌دهد", async () => {
    const secret = "SUPER-SECRET-LICENSE-KEY";
    await database.db.insert(schema.emailOutbox).values({
      toEmail: "user@example.com",
      subject: "لایسنس شما آماده است",
      template: "license_delivery",
      bodyText: `کلید: ${secret}`,
      bodyHtml: `<p>${secret}</p>`,
    });

    const emails = await listEmailLogs({}, database.db);
    expect(emails).toHaveLength(1);
    expect(JSON.stringify(emails)).not.toContain(secret);
    expect(emails[0]?.to).toBe("user@example.com");
  });
});

describe("حساب کاربری", () => {
  it("پروفایل را به‌روزرسانی می‌کند و درخواست حذف را یک‌بار ثبت می‌کند", async () => {
    const user = await createUser(database.db);

    const updated = await updateProfile(
      {
        userId: user.id,
        fullName: "نام تازه",
        phone: "09120000000",
        meta: { ip: "hashed" },
      },
      database.db,
    );
    expect(updated.fullName).toBe("نام تازه");

    const [fresh] = await database.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));

    const first = await requestAccountDeletion(
      { user: fresh!, reason: "مهاجرت", meta: { ip: "hashed" } },
      database.db,
    );
    expect(first.message).not.toContain("قبلاً");

    const [afterFirst] = await database.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));

    const second = await requestAccountDeletion(
      { user: afterFirst!, reason: "مهاجرت", meta: { ip: "hashed" } },
      database.db,
    );
    expect(second.message).toContain("قبلاً");

    const emails = await database.db.select().from(schema.emailOutbox);
    expect(
      emails.filter((row) => row.template === "account_deletion_request"),
    ).toHaveLength(1);
  });
});

describe("یادآوری SLA", () => {
  it("برای سفارش گذشته از مهلت یک ایمیل می‌سازد و تکرار همان روز را رد می‌کند", async () => {
    const customer = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "late-course" });
    const now = new Date("2025-05-10T12:00:00.000Z");
    await createOrder(database.db, {
      userId: customer.id,
      courseId: course.id,
      status: "awaiting_license",
      paidAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
    });

    const first = await sendFulfillmentReminders(database.db, now);
    expect(first.checked).toBe(1);
    expect(first.sent).toBe(1);

    const emails = await database.db.select().from(schema.emailOutbox);
    expect(emails).toHaveLength(1);
    expect(emails[0]?.template).toBe("fulfillment_reminder");
    expect(emails[0]?.toEmail).toBe("alerts@example.com");

    const second = await sendFulfillmentReminders(database.db, now);
    expect(second.sent).toBe(0);
    expect(second.skipped).toBe(1);
  });

  it("سفارش تازه‌تر از SLA را یادآوری نمی‌کند", async () => {
    const customer = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "fresh-course" });
    const now = new Date("2025-05-10T12:00:00.000Z");
    await createOrder(database.db, {
      userId: customer.id,
      courseId: course.id,
      status: "awaiting_license",
      paidAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });

    const result = await sendFulfillmentReminders(database.db, now);
    expect(result.checked).toBe(0);
    expect(result.sent).toBe(0);
  });
});
