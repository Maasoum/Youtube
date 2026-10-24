import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { MemoryRouter, Route, Routes } from "react-router-dom";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

const api = await server.ssrLoadModule("/src/api/index.ts");
const { authApi, adminApi } = api;
const toastModule = await server.ssrLoadModule("/src/context/ToastContext.tsx");

await authApi.login({
  email: "admin@brightpaths.example",
  password: "admin1234",
});

function textOf(node) {
  let output = "";
  const visit = (item) => {
    if (item == null) return;
    if (typeof item === "string" || typeof item === "number") {
      output += ` ${item}`;
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item.children) item.children.forEach(visit);
  };
  visit(node);
  return output.replace(/\s+/g, " ");
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mount(Page, path = "/", pattern = "*") {
  let tree;
  await act(async () => {
    tree = TestRenderer.create(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          toastModule.ToastProvider,
          null,
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: pattern,
              element: React.createElement(Page),
            }),
          ),
        ),
      ),
    );
  });
  await act(async () => {
    await wait(1200);
  });
  return tree;
}

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    const detail = await fn();
    passed += 1;
    console.log(`PASS ${name}${detail ? ` ${detail}` : ""}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} ${error?.message ?? String(error)}`);
    console.log(error?.stack);
  }
}

const checks = [
  [
    "licenses data",
    "/src/pages/admin/AdminLicensesPage.tsx",
    "AdminLicensesPage",
    "/admin/licenses",
    ["لایسنس‌ها", "نمایش کلید", "parent@example.com"],
  ],
  [
    "users data",
    "/src/pages/admin/AdminUsersPage.tsx",
    "AdminUsersPage",
    "/admin/users",
    ["کاربران", "parent@example.com", "جزئیات"],
  ],
  [
    "user detail data",
    "/src/pages/admin/AdminUserDetailPage.tsx",
    "AdminUserDetailPage",
    "/admin/users/user-demo",
    ["سارا محمدی", "سفارش‌ها", "لایسنس‌ها"],
    "/admin/users/:userId",
  ],
  [
    "blog data",
    "/src/pages/admin/AdminBlogPage.tsx",
    "AdminBlogPage",
    "/admin/blog",
    ["وبلاگ", "مقاله‌ی تازه", "چطور با کودک"],
  ],
  [
    "blog editor new",
    "/src/pages/admin/AdminBlogEditorPage.tsx",
    "AdminBlogEditorPage",
    "/admin/blog/new",
    ["نوشتن مقاله", "تنظیمات انتشار", "پیش‌نمایش"],
  ],
  [
    "faqs data",
    "/src/pages/admin/AdminFaqsPage.tsx",
    "AdminFaqsPage",
    "/admin/faqs",
    ["پرسش‌های متداول", "تفاوت"],
  ],
  [
    "teachers data",
    "/src/pages/admin/AdminTeachersPage.tsx",
    "AdminTeachersPage",
    "/admin/teachers",
    ["مربیان", "مربی تازه"],
  ],
  [
    "leads data",
    "/src/pages/admin/AdminLeadsPage.tsx",
    "AdminLeadsPage",
    "/admin/leads",
    ["لیدها", "سمیرا توکلی", "خروجی CSV"],
  ],
  [
    "settings data",
    "/src/pages/admin/AdminSettingsPage.tsx",
    "AdminSettingsPage",
    "/admin/settings",
    ["تنظیمات عمومی", "SLA تحویل", "ذخیره‌ی تنظیمات"],
  ],
  [
    "payment data",
    "/src/pages/admin/AdminPaymentSettingsPage.tsx",
    "AdminPaymentSettingsPage",
    "/admin/settings/payment",
    ["درگاه پرداخت", "تست اتصال", "returnUrl"],
  ],
  [
    "audit data",
    "/src/pages/admin/AdminAuditPage.tsx",
    "AdminAuditPage",
    "/admin/audit",
    ["گزارش اقدامات", "فیلتر"],
  ],
  [
    "inbox data",
    "/src/pages/admin/AdminInboxPage.tsx",
    "AdminInboxPage",
    "/admin/inbox",
    ["پیام‌های تماس", "تازه", "انجام شد"],
  ],
];

for (const [name, path, exportName, route, expected, pattern] of checks) {
  await check(name, async () => {
    const module = await server.ssrLoadModule(path);
    const tree = await mount(module[exportName], route, pattern);
    const body = textOf(tree.toJSON());
    for (const needle of expected) {
      assert.ok(body.includes(needle), `missing «${needle}» in ${body.slice(0, 300)}`);
    }
    tree.unmount();
    return `${body.length} chars`;
  });
}

await check("blog editor edit loads existing post", async () => {
  const module = await server.ssrLoadModule(
    "/src/pages/admin/AdminBlogEditorPage.tsx",
  );
  const tree = await mount(
    module.AdminBlogEditorPage,
    "/admin/blog/post-talk",
    "/admin/blog/:postId",
  );
  const body = textOf(tree.toJSON());
  assert.ok(body.includes("چطور با کودک"), "existing title missing");
  assert.ok(body.includes("تنظیمات انتشار"), "editor sidebar missing");
  tree.unmount();
  return "loaded";
});

await check("settings nested validation message", async () => {
  const module = await server.ssrLoadModule("/src/pages/admin/AdminSettingsPage.tsx");
  const tree = await mount(module.AdminSettingsPage, "/admin/settings");
  const emailInput = tree.root
    .findAllByType("input")
    .find((input) => input.props.name === "footer.email");
  assert.ok(emailInput, "footer email input missing");
  await act(async () => {
    emailInput.props.onChange({
      target: { value: "not-an-email", name: "footer.email" },
      type: "change",
    });
  });
  const form = tree.root
    .findAllByType("form")
    .find((item) => item.props.id === "general-settings-form");
  assert.ok(form, "settings form missing");
  await act(async () => {
    form.props.onSubmit({ preventDefault() {} });
    await wait(700);
  });
  const body = textOf(tree.toJSON());
  assert.ok(body.includes("ایمیل فوتر را درست وارد کنید."), "nested error not shown");
  tree.unmount();
  return "nested footer email";
});

await check("payment token field clears after save", async () => {
  const module = await server.ssrLoadModule(
    "/src/pages/admin/AdminPaymentSettingsPage.tsx",
  );
  const tree = await mount(module.AdminPaymentSettingsPage, "/admin/settings/payment");
  const input = tree.root
    .findAllByType("input")
    .find((item) => item.props.name === "token");
  assert.ok(input, "token input missing");
  await act(async () => {
    input.props.onChange({
      target: { value: "newtoken_abcd9999", name: "token" },
      type: "change",
    });
  });
  const form = tree.root.findAllByType("form")[0];
  assert.ok(form, "token form missing");
  await act(async () => {
    form.props.onSubmit({ preventDefault() {} });
    await wait(900);
  });
  let body = textOf(tree.toJSON());
  assert.ok(body.includes("••••9999"), "new mask not shown");
  // اگر فیلد پس از ذخیره پاک نشده باشد، ارسال دوباره همان توکن را می‌فرستد
  // و خطای اعتبارسنجی نمایش داده نمی‌شود.
  await act(async () => {
    form.props.onSubmit({ preventDefault() {} });
    await wait(500);
  });
  body = textOf(tree.toJSON());
  assert.ok(
    body.includes("توکن دسترسی باید حداقل ۱۲ نویسه باشد."),
    "token field was not cleared after save",
  );
  tree.unmount();
  return "cleared + masked";
});


console.log(`\n${passed} PASS / ${failed} FAIL`);
await server.close();
process.exit(failed > 0 ? 1 : 0);
