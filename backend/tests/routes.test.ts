import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type {
  FastifyInstance,
  InjectOptions,
  LightMyRequestResponse,
} from "fastify";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import * as schema from "../src/db/schema.js";
import { encryptString, fingerprint, tokenHash } from "../src/lib/crypto.js";
import { hashIp } from "../src/lib/ip.js";
import { hashPassword } from "../src/lib/password.js";
import {
  createCourse,
  createOrder,
  createTestDb,
  createUser,
  resetTestDb,
  type TestDatabase,
} from "./helpers/db.js";

/**
 * آزمون لایه‌ی HTTP روی همان buildApp تولیدی. فقط ماژول اتصال node-postgres
 * با پایگاه داده‌ی درون‌حافظه‌ای جایگزین می‌شود؛ مسیرها، میان‌افزارها و
 * سرویس‌ها بدون تغییر اجرا می‌شوند.
 */
const holder: { database: TestDatabase["db"] | null } = { database: null };

vi.mock("../src/db/client.js", () => ({
  db: new Proxy(
    {},
    {
      get(_target, property) {
        const database = holder.database;
        if (!database) throw new Error("پایگاه داده‌ی آزمون آماده نیست.");
        const value = (database as unknown as Record<string | symbol, unknown>)[
          property
        ];
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(database)
          : value;
      },
    },
  ),
  pool: { end: async () => undefined },
  closeDatabase: async () => undefined,
}));

import { buildApp } from "../src/app.js";

let database: TestDatabase;
let app: FastifyInstance;
let cookieHeader = "";
let csrfToken = "";

beforeAll(async () => {
  database = await createTestDb();
  holder.database = database.db;
  app = await buildApp();
  await app.ready();

  const response = await app.inject({ method: "GET", url: "/api/v1/auth/csrf" });
  const cookie = response.cookies.find((item) => item.name === "bp_csrf");
  cookieHeader = `${cookie?.name ?? "bp_csrf"}=${cookie?.value ?? ""}`;
  csrfToken = (response.json() as { csrfToken: string }).csrfToken;
});

afterAll(async () => {
  await app.close();
  await database.close();
});

beforeEach(async () => {
  await resetTestDb(database.db);
});

function post(
  url: string,
  payload: object,
  headers: Record<string, string> = {},
): Promise<LightMyRequestResponse> {
  const session = headers.cookie;
  const options: InjectOptions = {
    method: "POST",
    url,
    payload,
    headers: {
      ...headers,
      cookie: session ? `${session}; ${cookieHeader}` : cookieHeader,
      "x-csrf-token": csrfToken,
    },
  };
  return app.inject(options);
}

async function sessionCookieFor(
  userId: string,
  totpVerified = true,
): Promise<string> {
  const token = `routes-test-${userId}`;
  await database.db.insert(schema.sessions).values({
    userId,
    tokenHash: tokenHash(token),
    totpVerified,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  return `bp_session=${token}`;
}

async function seedLicense(params: {
  user: { id: string };
  courseId: string;
}) {
  const order = await createOrder(database.db, {
    userId: params.user.id,
    courseId: params.courseId,
    status: "fulfilled",
    paidAt: new Date(),
    fulfilledAt: new Date(),
  });

  const code = "ABCD-1234-EFGH-5678";
  const [license] = await database.db
    .insert(schema.licenses)
    .values({
      userId: params.user.id,
      courseId: params.courseId,
      orderId: order.id,
      payloadEncrypted: encryptString(
        JSON.stringify({
          licenseKey: code,
          description: null,
          providerReference: null,
        }),
      ),
      keyFingerprint: fingerprint(code),
      keyLast4: code.slice(-4),
      emailSentAt: new Date(),
    })
    .returning();

  if (!license) throw new Error("failed to create license");
  return { order, license, code };
}

describe("مسیرهای عمومی", () => {
  it("فهرست دوره‌ها فقط نسخه‌های منتشرشده را برمی‌گرداند", async () => {
    await createCourse(database.db, { slug: "published", title: "منتشرشده" });
    await createCourse(database.db, {
      slug: "draft",
      title: "پیش‌نویس",
      isPublished: false,
    });

    const response = await app.inject({ url: "/api/v1/courses" });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { courses: { slug: string }[] };
    expect(body.courses.map((course) => course.slug)).toEqual(["published"]);
  });

  it("برای دوره‌ی ناشناخته ۴۰۴ با کد مشخص می‌دهد", async () => {
    const response = await app.inject({ url: "/api/v1/courses/unknown" });
    expect(response.statusCode).toBe(404);
    expect((response.json() as { error: { code: string } }).error.code).toBe(
      "course_not_found",
    );
  });

  it("تنظیمات عمومی فقط فیلدهای مجاز را نشان می‌دهد", async () => {
    const response = await app.inject({ url: "/api/v1/site-settings" });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { settings: Record<string, unknown> };
    expect(body.settings).toHaveProperty("fulfillmentSlaHours");
    expect(body.settings).not.toHaveProperty("smtp");
    expect(body.settings).not.toHaveProperty("paypingToken");
  });

  it("فرم تماس بدون توکن CSRF رد می‌شود", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/leads",
      payload: { fullName: "مریم احمدی", contact: "۰۹۱۲۳۴۵۶۷۸۹", consent: true },
    });
    expect(response.statusCode).toBe(403);
  });

  it("تله‌ی ربات در فرم تماس چیزی ذخیره نمی‌کند", async () => {
    const response = await post("/api/v1/leads", {
      fullName: "ربات",
      contact: "۰۹۱۲۰۰۰۰۰۰۰",
      consent: true,
      website: "https://spam.example",
    });
    expect(response.statusCode).toBe(201);

    const rows = await database.db.select().from(schema.leads);
    expect(rows).toHaveLength(0);
  });
});

describe("حفاظت مسیرهای کاربری و مدیریتی", () => {
  it("ساخت سفارش بدون ورود ۴۰۱ می‌دهد", async () => {
    const course = await createCourse(database.db, { slug: "auth-required" });
    const response = await post("/api/v1/orders", { courseId: course.id });
    expect(response.statusCode).toBe(401);
  });

  it("کاربر عادی به مسیر مدیریتی دسترسی ندارد", async () => {
    const user = await createUser(database.db);
    const cookie = await sessionCookieFor(user.id);

    const response = await app.inject({
      url: "/api/v1/admin/licenses",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(403);
    expect((response.json() as { error: { code: string } }).error.code).toBe(
      "admin_only",
    );
  });

  it("اعلان‌های کاربر فقط برای خودش خوانده می‌شود", async () => {
    const first = await createUser(database.db);
    const second = await createUser(database.db);

    const [notification] = await database.db
      .insert(schema.notifications)
      .values({
        userId: first.id,
        title: "سلام",
        body: "لایسنس شما آماده است.",
        kind: "license",
      })
      .returning();

    const otherCookie = await sessionCookieFor(second.id);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/me/notifications/${notification?.id ?? ""}/read`,
      headers: { cookie: `${otherCookie}; ${cookieHeader}`, "x-csrf-token": csrfToken },
    });

    expect(response.statusCode).toBe(404);

    const [stored] = await database.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, notification?.id ?? ""));
    expect(stored?.readAt).toBeNull();
  });
});

describe("ورود و تأیید دومرحله‌ای", () => {
  it("پس از پنج تلاش ناموفق حساب موقتاً قفل می‌شود", async () => {
    const user = await createUser(database.db, {
      passwordHash: await hashPassword("Correct-Pass-123"),
    });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await post("/api/v1/auth/login", {
        email: user.email,
        password: "Wrong-Pass-123",
      });
      expect(response.statusCode).toBe(401);
    }

    const fifth = await post("/api/v1/auth/login", {
      email: user.email,
      password: "Wrong-Pass-123",
    });
    expect(fifth.statusCode).toBe(429);
    expect((fifth.json() as { error: { code: string } }).error.code).toBe(
      "account_locked",
    );

    const correct = await post("/api/v1/auth/login", {
      email: user.email,
      password: "Correct-Pass-123",
    });
    expect(correct.statusCode).toBe(429);

    const [stored] = await database.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));
    expect(stored?.failedLoginAttempts).toBe(5);
    expect(stored?.lockedUntil).toBeInstanceOf(Date);
  });

  it("مدیر تا راه‌اندازی TOTP به پنل دسترسی ندارد", async () => {
    const admin = await createUser(database.db, { role: "admin" });
    const cookie = await sessionCookieFor(admin.id, false);

    const denied = await app.inject({
      url: "/api/v1/admin/licenses",
      headers: { cookie },
    });
    expect(denied.statusCode).toBe(403);
    expect((denied.json() as { error: { code: string } }).error.code).toBe(
      "admin_totp_setup_required",
    );

    const setup = await post("/api/v1/auth/totp/setup", {}, { cookie });
    expect(setup.statusCode).toBe(200);
    const { secret } = setup.json() as { secret: string };

    const enable = await post(
      "/api/v1/auth/totp/enable",
      { code: authenticator.generate(secret) },
      { cookie },
    );
    expect(enable.statusCode).toBe(200);

    const allowed = await app.inject({
      url: "/api/v1/admin/licenses",
      headers: { cookie },
    });
    expect(allowed.statusCode).toBe(200);
  });
});

describe("تحویل لایسنس از مسیر مدیریت", () => {
  it("کلید در فهرست نمی‌آید و فقط با افشای صریح و ثبت audit برمی‌گردد", async () => {
    const admin = await createUser(database.db, {
      role: "admin",
      totpEnabledAt: new Date(),
    });
    const customer = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "licensed" });
    const { license, code } = await seedLicense({ user: customer, courseId: course.id });
    const cookie = await sessionCookieFor(admin.id);

    const list = await app.inject({
      url: "/api/v1/admin/licenses",
      headers: { cookie },
    });
    expect(list.statusCode).toBe(200);
    expect(list.body).not.toContain(code);
    expect(list.body).toContain("5678");

    const before = await database.db.select().from(schema.auditLogs);
    expect(before).toHaveLength(0);

    const reveal = await app.inject({
      method: "POST",
      url: `/api/v1/admin/licenses/${license.id}/reveal`,
      headers: { cookie: `${cookie}; ${cookieHeader}`, "x-csrf-token": csrfToken },
    });
    expect(reveal.statusCode).toBe(200);
    expect(reveal.headers["cache-control"]).toBe("no-store");
    expect((reveal.json() as { license: { code: string } }).license.code).toBe(code);

    const audit = await database.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, "license.revealed_by_admin"));
    expect(audit).toHaveLength(1);
    expect(audit[0]?.details).toBeNull();
  });

  it("هر کاربر فقط لایسنس خودش را می‌بیند و دیگران ۴۰۴ می‌گیرند", async () => {
    const owner = await createUser(database.db);
    const stranger = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "owned" });
    const { license, code } = await seedLicense({ user: owner, courseId: course.id });

    const ownerCookie = await sessionCookieFor(owner.id);
    const own = await app.inject({
      url: `/api/v1/me/licenses/${license.id}/reveal`,
      headers: { cookie: ownerCookie },
    });
    expect(own.statusCode).toBe(200);
    expect((own.json() as { license: { code: string } }).license.code).toBe(code);

    const strangerCookie = await sessionCookieFor(stranger.id);
    const other = await app.inject({
      url: `/api/v1/me/licenses/${license.id}/reveal`,
      headers: { cookie: strangerCookie },
    });
    expect(other.statusCode).toBe(404);
    expect(other.body).not.toContain(code);
  });

  it("فهرست دوره‌های من کلید را برنمی‌گرداند", async () => {
    const customer = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "my-course" });
    const { code } = await seedLicense({ user: customer, courseId: course.id });
    const cookie = await sessionCookieFor(customer.id);

    const response = await app.inject({
      url: "/api/v1/me/courses",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain(code);
    const body = response.json() as {
      courses: { licenseId: string; status: string }[];
    };
    expect(body.courses).toHaveLength(1);
    expect(body.courses[0]?.status).toBe("active");
    expect(body.courses[0]?.licenseId).toBeTruthy();
    expect(response.body).not.toContain("licenseKey");
  });
});

describe("پنل مدیریت از مسیر HTTP", () => {
  async function adminSession() {
    const admin = await createUser(database.db, {
      role: "admin",
      totpEnabledAt: new Date(),
    });
    return { admin, cookie: await sessionCookieFor(admin.id) };
  }

  it("صف تحویل، ثبت لایسنس و CSV بدون کلید کار می‌کند", async () => {
    const { cookie } = await adminSession();
    const customer = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "http-license" });
    const order = await createOrder(database.db, {
      userId: customer.id,
      courseId: course.id,
      status: "awaiting_license",
      paidAt: new Date(),
    });

    const queue = await app.inject({
      url: "/api/v1/admin/fulfillment",
      headers: { cookie },
    });
    expect(queue.statusCode).toBe(200);
    const queueBody = queue.json() as {
      orders: { id: string; overdue: boolean }[];
      slaHours: number;
    };
    expect(queueBody.slaHours).toBe(24);
    expect(queueBody.orders.map((item) => item.id)).toContain(order.id);

    const code = "ROUTE-KEY-1234-5678";
    const fulfill = await post(
      `/api/v1/admin/orders/${order.id}/license`,
      {
        licenseCode: code,
        description: "از مسیر HTTP",
        notifyUser: true,
        confirmDuplicate: false,
      },
      { cookie },
    );
    expect(fulfill.statusCode).toBe(201);
    expect(fulfill.body).not.toContain(code);
    const fulfilled = fulfill.json() as {
      licenseId: string;
      order: { status: string; license: { maskedCode: string } | null };
    };
    expect(fulfilled.order.status).toBe("fulfilled");
    expect(fulfilled.order.license?.maskedCode).toBe("••••5678");

    const csv = await app.inject({
      url: "/api/v1/admin/orders.csv",
      headers: { cookie },
    });
    expect(csv.statusCode).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.body.startsWith("\uFEFF")).toBe(true);
    expect(csv.body).not.toContain(code);
    expect(csv.body).toContain("5678");

    const emails = await app.inject({
      url: "/api/v1/admin/emails",
      headers: { cookie },
    });
    expect(emails.statusCode).toBe(200);
    expect(emails.body).not.toContain(code);
    expect(emails.body).toContain("license_delivery");
  });

  it("تنظیمات سایت، کد تخفیف، کاربران و audit از مسیر مدیر در دسترس‌اند", async () => {
    const { cookie } = await adminSession();
    await createUser(database.db, { fullName: "مشتری تست" });

    const settings = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/site-settings",
      headers: { cookie: `${cookie}; ${cookieHeader}`, "x-csrf-token": csrfToken },
      payload: {
        fulfillmentSlaHours: 30,
        includeLicenseKeyInEmail: false,
        taxPercent: 0,
        footer: { about: "", email: "", phone: "", address: "" },
        trustBadge: { enabled: false, label: "", url: "", code: "" },
      },
    });
    expect(settings.statusCode).toBe(200);
    expect(
      (settings.json() as { settings: { fulfillmentSlaHours: number } }).settings
        .fulfillmentSlaHours,
    ).toBe(30);

    const discount = await post(
      "/api/v1/admin/discounts",
      {
        code: "HTTP20",
        type: "percent",
        percent: 20,
        minOrderToman: 0,
        maxUsesPerUser: 1,
        firstPurchaseOnly: false,
        allowFree: false,
        active: true,
      },
      { cookie },
    );
    expect(discount.statusCode).toBe(201);

    const users = await app.inject({
      url: "/api/v1/admin/users",
      headers: { cookie },
    });
    expect(users.statusCode).toBe(200);
    expect((users.json() as { users: unknown[] }).users).toHaveLength(2);

    const audit = await app.inject({
      url: "/api/v1/admin/audit-logs",
      headers: { cookie },
    });
    expect(audit.statusCode).toBe(200);
    const actions = (audit.json() as { logs: { action: string }[] }).logs.map(
      (item) => item.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining(["settings.general_updated", "discount.created"]),
    );
  });

  it("مسیرهای کاربری رسید و پروفایل را برمی‌گردانند", async () => {
    const user = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "receipt-course" });
    await createOrder(database.db, {
      userId: user.id,
      courseId: course.id,
      status: "awaiting_license",
      paidAt: new Date(),
      totalToman: 1_000_000,
    });
    const cookie = await sessionCookieFor(user.id);

    const receipts = await app.inject({
      url: "/api/v1/me/receipts",
      headers: { cookie },
    });
    expect(receipts.statusCode).toBe(200);
    const receiptBody = receipts.json() as {
      receipts: { courseTitle: string; amountToman: number }[];
    };
    expect(receiptBody.receipts).toHaveLength(1);
    expect(receiptBody.receipts[0]?.amountToman).toBe(1_000_000);

    const profile = await app.inject({
      method: "PATCH",
      url: "/api/v1/me/profile",
      headers: { cookie: `${cookie}; ${cookieHeader}`, "x-csrf-token": csrfToken },
      payload: { fullName: "نام کاربر", phone: "09121234567" },
    });
    expect(profile.statusCode).toBe(200);
    expect(
      (profile.json() as { user: { fullName: string } }).user.fullName,
    ).toBe("نام کاربر");
  });
});

describe("بازگشت از درگاه", () => {
  it("callback بدون CSRF پذیرفته و به صفحه‌ی نتیجه هدایت می‌شود", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/payments/callback",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "code=UNKNOWN&refid=0",
    });

    expect(response.statusCode).toBe(302);
    const location = response.headers.location ?? "";
    expect(location).toContain("/payment/callback");
    expect(location).toContain("state=");
  });

  it("سفارش رایگان با کد ۱۰۰٪ در انتظار لایسنس ثبت می‌شود", async () => {
    const user = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "free" });
    const cookie = await sessionCookieFor(user.id);

    await database.db.insert(schema.discountCodes).values({
      code: "FREE100",
      type: "percent",
      percent: 100,
      allowFree: true,
      perUserLimit: 1,
      isActive: true,
    });

    const response = await post(
      "/api/v1/orders",
      { courseId: course.id, discountCode: "FREE100" },
      { cookie },
    );
    expect(response.statusCode).toBe(201);

    const body = response.json() as {
      order: { status: string; paymentUrl: string | null };
    };
    expect(body.order.status).toBe("awaiting_license");
    expect(body.order.paymentUrl).toBeNull();

    const [order] = await database.db.select().from(schema.orders);
    expect(order?.status).toBe("awaiting_license");
    expect(order?.paidAt).not.toBeNull();
  });

  it("IP در گزارش‌ها فقط به شکل هش ذخیره می‌شود", async () => {
    const user = await createUser(database.db);
    const cookie = await sessionCookieFor(user.id);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/me/profile",
      headers: {
        cookie: `${cookie}; ${cookieHeader}`,
        "x-csrf-token": csrfToken,
      },
      payload: { fullName: "نام تازه", phone: "09123456789" },
    });
    expect(response.statusCode).toBe(200);

    const [audit] = await database.db.select().from(schema.auditLogs);
    expect(audit?.action).toBe("account.profile_updated");
    expect(audit?.ip).toBe(hashIp("127.0.0.1"));
    expect(audit?.ip).not.toBe("127.0.0.1");
  });
});

describe("سفارش کاربر و آمار مدیر از مسیر HTTP", () => {
  it("کاربر سفارش در انتظار را لغو می‌کند و CSRF الزامی است", async () => {
    const user = await createUser(database.db);
    const course = await createCourse(database.db, { slug: "http-cancel" });
    const order = await createOrder(database.db, {
      userId: user.id,
      courseId: course.id,
      status: "pending",
    });
    const cookie = await sessionCookieFor(user.id);

    const cancelled = await post(
      `/api/v1/orders/${order.id}/cancel`,
      {},
      { cookie },
    );
    expect(cancelled.statusCode).toBe(200);
    const body = cancelled.json() as {
      order: { status: string; cancelReason: string };
    };
    expect(body.order.status).toBe("cancelled");
    expect(body.order.cancelReason).toBe("لغو توسط کاربر");

    const withoutCsrf = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${order.id}/cancel`,
      headers: { cookie },
      payload: {},
    });
    expect(withoutCsrf.statusCode).toBe(403);
  });

  it("آمار داشبورد فقط برای مدیر است", async () => {
    const admin = await createUser(database.db, {
      role: "admin",
      totpEnabledAt: new Date(),
    });
    const adminCookie = await sessionCookieFor(admin.id);

    const ok = await app.inject({
      url: "/api/v1/admin/stats",
      headers: { cookie: adminCookie },
    });
    expect(ok.statusCode).toBe(200);
    const stats = ok.json() as {
      revenueSeries: unknown[];
      totalOrders: number;
      overdueFulfillments: number;
    };
    expect(stats.revenueSeries).toHaveLength(7);
    expect(typeof stats.totalOrders).toBe("number");
    expect(typeof stats.overdueFulfillments).toBe("number");

    const customer = await createUser(database.db);
    const customerCookie = await sessionCookieFor(customer.id);
    const denied = await app.inject({
      url: "/api/v1/admin/stats",
      headers: { cookie: customerCookie },
    });
    expect(denied.statusCode).toBe(403);
  });
});
