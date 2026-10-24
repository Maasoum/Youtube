import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

const store = new Map();
const localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

globalThis.window = {
  setTimeout,
  clearTimeout,
  crypto: globalThis.crypto,
  localStorage,
  location: { origin: "http://localhost:5173" },
};

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

let passed = 0;
let failed = 0;
function pass(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}
function fail(name, detail) {
  failed += 1;
  console.log(`FAIL ${name} ${detail ?? ""}`);
}

async function check(name, fn) {
  try {
    const result = await fn();
    pass(`${name}${result ? ` ${result}` : ""}`);
  } catch (error) {
    fail(name, error?.message ?? String(error));
    console.log(error?.stack);
  }
}

const api = await server.ssrLoadModule("/src/api/index.ts");
const { authApi, adminApi, ordersApi, contentApi, ApiError } = api;
const validation = await server.ssrLoadModule("/src/lib/validation.ts");
const resolverModule = await server.ssrLoadModule("/src/lib/zodResolver.ts");

await authApi.login({
  email: "admin@brightpaths.example",
  password: "admin1234",
});

await check("nested zod errors", async () => {
  const resolver = resolverModule.zodResolver(validation.generalSettingsSchema);
  const result = await resolver(
    {
      fulfillmentSlaHours: 0,
      includeLicenseKeyInEmail: false,
      taxPercent: 0,
      footer: { about: "", email: "bad", phone: "", address: "" },
      trustBadge: { enabled: true, label: "", url: "http://x", code: "" },
    },
    undefined,
    { fields: {}, shouldUseNativeValidation: false },
  );
  assert.ok(result.errors.footer?.about?.message, "footer.about missing");
  assert.ok(result.errors.trustBadge?.url?.message, "trustBadge.url missing");
  return "footer + trustBadge";
});

await check("default general settings", async () => {
  const settings = await adminApi.getGeneralSettings();
  assert.equal(settings.fulfillmentSlaHours, 24);
  assert.equal(settings.includeLicenseKeyInEmail, false);
  assert.equal(settings.taxPercent, 0);
  return "SLA 24 / key off / tax 0";
});

await check("payment requires token", async () => {
  const initial = await adminApi.getPaymentSettings();
  assert.equal(initial.hasToken, false);
  assert.equal(initial.enabled, false);
  assert.ok(initial.returnUrl.endsWith("/payment/callback"));
  let blocked = false;
  try {
    await adminApi.setPaymentEnabled(true);
  } catch (error) {
    blocked = error instanceof ApiError;
  }
  assert.equal(blocked, true);
  return "blocked";
});

await check("save payment token masks and never stores it", async () => {
  const token = "payping_test_abcd1234";
  const receipt = await adminApi.savePaymentToken({ token });
  assert.equal(receipt.hasToken, true);
  assert.equal(receipt.maskedToken, "••••1234");
  const settings = await adminApi.getPaymentSettings();
  assert.equal(settings.hasToken, true);
  assert.equal(settings.maskedToken, "••••1234");
  assert.ok(!("token" in settings));
  const raw = store.get("brightpaths.mockdb.v4") ?? "";
  assert.ok(!raw.includes(token), "full token found in storage");
  assert.ok(!raw.includes("abcd1234"), "token suffix beyond mask found in storage");
  return receipt.maskedToken;
});

await check("enable + test payment connection", async () => {
  const enabled = await adminApi.setPaymentEnabled(true);
  assert.equal(enabled.enabled, true);
  const tested = await adminApi.testPaymentConnection();
  assert.equal(tested.lastTestResult, "success");
  assert.ok(tested.lastTestedAt);
  return "success";
});

await check("general settings update and SLA", async () => {
  const before = await adminApi.getStats();
  const updated = await adminApi.updateGeneralSettings({
    fulfillmentSlaHours: 12,
    includeLicenseKeyInEmail: true,
    taxPercent: 5,
    footer: {
      about: "متن آزمایشی معرفی فوتر برای بررسی ذخیره‌سازی تنظیمات.",
      email: "support@example.com",
      phone: "02112345678",
      address: "تهران، خیابان آزمایشی، پلاک ۱",
    },
    trustBadge: {
      enabled: true,
      label: "نماد اعتماد آزمایشی",
      url: "https://trust.example/sample",
      code: "<script>ignored</script>",
    },
  });
  assert.equal(updated.fulfillmentSlaHours, 12);
  assert.equal(updated.includeLicenseKeyInEmail, true);
  assert.equal(updated.taxPercent, 5);
  const after = await adminApi.getStats();
  assert.ok(after.overdueFulfillments >= before.overdueFulfillments);
  const publicSettings = await contentApi.getPublicSettings();
  assert.equal(publicSettings.footer.email, "support@example.com");
  assert.equal(publicSettings.trustBadge.enabled, true);
  assert.equal(publicSettings.fulfillmentSlaHours, 12);
  assert.equal(publicSettings.taxPercent, 5);
  return `overdue ${before.overdueFulfillments}→${after.overdueFulfillments}`;
});

await check("licenses list masked + reveal audit", async () => {
  const licenses = await adminApi.listLicenses();
  assert.ok(licenses.length >= 3);
  assert.ok(licenses.every((item) => item.maskedCode === "••••"));
  assert.ok(licenses.every((item) => !("code" in item)));
  const target = licenses.find((item) => !item.revokedAt);
  assert.ok(target);
  const reveal = await ordersApi.revealLicense(target.id);
  assert.ok(reveal.code.length >= 6);
  const logs = await adminApi.listAuditLogs(100);
  assert.ok(
    logs.some(
      (log) => log.action === "license.revealed" && log.entityId === target.id,
    ),
  );
  return `${licenses.length} licenses`;
});

await check("revoke license + audit", async () => {
  const licenses = await adminApi.listLicenses();
  const target = licenses.find((item) => !item.revokedAt);
  assert.ok(target);
  const revoked = await adminApi.revokeLicense({
    licenseId: target.id,
    reason: "درخواست بازگشت وجه و هماهنگی با ارائه‌دهنده",
  });
  assert.ok(revoked.revokedAt);
  const logs = await adminApi.listAuditLogs(100);
  assert.ok(
    logs.some(
      (log) => log.action === "license.revoked" && log.entityId === target.id,
    ),
  );
  return revoked.id;
});

await check("users list + detail", async () => {
  const users = await adminApi.listUsers();
  assert.ok(users.length >= 4);
  const detail = await adminApi.getUserDetail("user-demo");
  assert.equal(detail.user.email, "parent@example.com");
  assert.ok(detail.orders.length >= 2);
  assert.ok(detail.licenses.length >= 1);
  return `${users.length} users`;
});

await check("disable user blocks login then reactivate", async () => {
  const disabled = await adminApi.setUserActive({
    userId: "user-negar",
    active: false,
    reason: "بررسی آزمایشی غیرفعال‌سازی حساب",
  });
  assert.equal(disabled.isActive, false);
  let blocked = false;
  try {
    await authApi.login({ email: "negar@example.com", password: "demo1234" });
  } catch (error) {
    blocked = error instanceof ApiError && error.code === "account_disabled";
  }
  assert.equal(blocked, true);
  await authApi.login({
    email: "admin@brightpaths.example",
    password: "admin1234",
  });
  const enabled = await adminApi.setUserActive({
    userId: "user-negar",
    active: true,
  });
  assert.equal(enabled.isActive, true);
  return "blocked + restored";
});

await check("blog draft hidden, publish, update, delete", async () => {
  const created = await adminApi.createPost({
    title: "مقاله‌ی آزمایشی پنل مدیریت",
    slug: "مقاله-آزمایشی-پنل",
    excerpt: "این خلاصه برای بررسی چرخه‌ی پیش‌نویس و انتشار در پنل است.",
    category: "راهنمای والدین",
    author: "تیم آزمایش",
    readMinutes: 4,
    art: "foundations",
    body: "## بخش اول\n\nمتن کافی برای تبدیل شدن به بخش مقاله در سایت.\n\n## بخش دوم\n\nپاراگراف دوم با **متن درشت** و `کد`.",
    status: "draft",
  });
  assert.equal(created.status, "draft");
  assert.ok(!(await api.listPosts()).some((post) => post.id === created.id));
  await adminApi.setPostStatus(created.id, "published");
  assert.ok((await api.listPosts()).some((post) => post.id === created.id));
  const updated = await adminApi.updatePost(created.id, {
    title: "مقاله‌ی آزمایشی ویرایش‌شده",
    slug: "مقاله-آزمایشی-پنل",
    excerpt: "خلاصه‌ی ویرایش‌شده برای بررسی ذخیره‌سازی مقاله.",
    category: "راهنمای والدین",
    author: "تیم آزمایش",
    readMinutes: 5,
    art: "creative",
    body: "## تیتر تازه\n\nمتن ویرایش‌شده‌ی مقاله برای بررسی ذخیره‌سازی.",
    status: "published",
  });
  assert.equal(updated.title, "مقاله‌ی آزمایشی ویرایش‌شده");
  assert.ok(updated.sections.length >= 1);
  await adminApi.deletePost(created.id);
  assert.ok(!(await adminApi.adminListPosts()).some((post) => post.id === created.id));
  return "draft→publish→update→delete";
});

await check("faq CRUD, reorder, public visibility", async () => {
  const created = await adminApi.createFaq({
    question: "پرسش آزمایشی درباره‌ی تحویل لایسنس چیست؟",
    answer: "پاسخ آزمایشی کوتاه برای بررسی چرخه‌ی ساخت و حذف پرسش متداول.",
    isActive: false,
  });
  assert.ok(!(await api.listFaqs()).some((faq) => faq.id === created.id));
  const moved = await adminApi.moveFaq(created.id, "up");
  assert.equal(moved.length >= 6, true);
  await adminApi.updateFaq(created.id, {
    question: "پرسش آزمایشی فعال درباره‌ی تحویل لایسنس؟",
    answer: "پاسخ آزمایشی کوتاه برای بررسی چرخه‌ی ساخت و حذف پرسش متداول.",
    isActive: true,
  });
  assert.ok((await api.listFaqs()).some((faq) => faq.id === created.id));
  await adminApi.deleteFaq(created.id);
  assert.ok(!(await adminApi.adminListFaqs()).some((faq) => faq.id === created.id));
  return "inactive→active→delete";
});

await check("teacher CRUD, reorder, public visibility", async () => {
  const created = await adminApi.createTeacher({
    name: "مربی آزمایشی",
    role: "مدرس نمونه",
    bio: "معرفی کوتاه آزمایشی برای بررسی ذخیره‌سازی کارت مربی در پنل.",
    initials: "م",
    accent: "sky",
    isActive: false,
  });
  assert.ok(!(await api.listTeachers()).some((item) => item.id === created.id));
  await adminApi.moveTeacher(created.id, "up");
  await adminApi.updateTeacher(created.id, {
    name: "مربی آزمایشی فعال",
    role: "مدرس نمونه",
    bio: "معرفی کوتاه آزمایشی برای بررسی ذخیره‌سازی کارت مربی در پنل.",
    initials: "م",
    accent: "coral",
    isActive: true,
  });
  assert.ok((await api.listTeachers()).some((item) => item.id === created.id));
  await adminApi.deleteTeacher(created.id);
  return "inactive→active→delete";
});

await check("inbox status new/read/done", async () => {
  const messages = await adminApi.listInbox();
  assert.ok(messages.length >= 3);
  const target = messages[0];
  const read = await adminApi.updateInboxStatus(target.id, "read");
  assert.equal(read.status, "read");
  const done = await adminApi.updateInboxStatus(target.id, "done");
  assert.equal(done.status, "done");
  const logs = await adminApi.listAuditLogs(100);
  assert.ok(logs.some((log) => log.action === "message.status_changed"));
  return `${messages.length} messages`;
});

await check("leads list, CSV source, delete", async () => {
  const leads = await adminApi.listLeads();
  assert.ok(leads.length >= 3);
  await adminApi.deleteLead(leads[0].id);
  const after = await adminApi.listLeads();
  assert.equal(after.length, leads.length - 1);
  return `${leads.length}→${after.length}`;
});

await check("audit filter data available", async () => {
  const logs = await adminApi.listAuditLogs(300);
  assert.ok(logs.some((log) => log.action === "payment.token_saved"));
  assert.ok(logs.some((log) => log.action === "settings.updated"));
  assert.ok(logs.some((log) => log.action === "user.disabled"));
  return `${logs.length} rows`;
});

await check("license email follows include-key setting", async () => {
  const users = await adminApi.listUsers();
  const target = users.find((user) => user.email === "parent@example.com");
  assert.ok(target, "demo user missing");
  const courses = await adminApi.listCourses();
  assert.ok(courses.length > 0, "no course");
  const order = await adminApi.grantGiftLicense({
    email: target.email,
    courseId: courses[0].id,
    licenseCode: "GIFT-EMAIL-SETTING-71",
    notifyUser: true,
  });
  const emails = await adminApi.listEmails();
  const email = emails.find(
    (item) => item.orderId === order.id && item.template === "gift-license",
  );
  assert.ok(email, "gift email missing");
  assert.equal(email.includesLicenseKey, true);
  assert.ok(email.body?.includes("در همین ایمیل درج شده"));
  assert.ok(!JSON.stringify(email).includes("GIFT-EMAIL-SETTING-71"));
  return "included without leaking key";
});

await check("checkout total includes settings tax", async () => {
  const orders = await adminApi.listOrders();
  const courses = await adminApi.listCourses();
  const taken = new Set(
    orders.filter((item) => item.userId === "user-negar").map((item) => item.course.id),
  );
  const course = courses.find((item) => !taken.has(item.id));
  assert.ok(course, "no free course for tax test");
  await authApi.login({ email: "negar@example.com", password: "demo1234" });
  const order = await ordersApi.create({ courseId: course.id });
  assert.equal(order.taxPercent, 5);
  const expectedTax = Math.round((course.priceToman * 5) / 100);
  assert.equal(order.taxToman, expectedTax);
  assert.equal(order.totalToman, course.priceToman + expectedTax);
  await authApi.login({
    email: "admin@brightpaths.example",
    password: "admin1234",
  });
  return `tax ${expectedTax}`;
});

const pages = [
  ["AdminLicensesPage", "/src/pages/admin/AdminLicensesPage.tsx"],
  ["AdminUsersPage", "/src/pages/admin/AdminUsersPage.tsx"],
  ["AdminUserDetailPage", "/src/pages/admin/AdminUserDetailPage.tsx"],
  ["AdminBlogPage", "/src/pages/admin/AdminBlogPage.tsx"],
  ["AdminBlogEditorPage", "/src/pages/admin/AdminBlogEditorPage.tsx"],
  ["AdminFaqsPage", "/src/pages/admin/AdminFaqsPage.tsx"],
  ["AdminTeachersPage", "/src/pages/admin/AdminTeachersPage.tsx"],
  ["AdminLeadsPage", "/src/pages/admin/AdminLeadsPage.tsx"],
  ["AdminSettingsPage", "/src/pages/admin/AdminSettingsPage.tsx"],
  ["AdminPaymentSettingsPage", "/src/pages/admin/AdminPaymentSettingsPage.tsx"],
  ["AdminAuditPage", "/src/pages/admin/AdminAuditPage.tsx"],
  ["AdminInboxPage", "/src/pages/admin/AdminInboxPage.tsx"],
];

const toastModule = await server.ssrLoadModule("/src/context/ToastContext.tsx");

for (const [name, path] of pages) {
  await check(`SSR ${name}`, async () => {
    const module = await server.ssrLoadModule(path);
    const Page = module[name];
    assert.equal(typeof Page, "function");
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          toastModule.ToastProvider,
          null,
          React.createElement(Page),
        ),
      ),
    );
    assert.ok(html.length > 200, `render too short: ${html.length}`);
    return `${html.length} chars`;
  });
}

console.log(`\n${passed} PASS / ${failed} FAIL`);
await server.close();
process.exit(failed > 0 ? 1 : 0);
