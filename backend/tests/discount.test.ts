import { describe, expect, it } from "vitest";
import {
  computeDiscountAmount,
  DISCOUNT_GENERIC_ERROR,
  evaluateDiscount,
  normalizeDiscountCode,
  type DiscountContext,
  type DiscountRule,
} from "../src/lib/discount.js";

const NOW = new Date("2026-10-19T12:00:00.000Z");

function rule(overrides: Partial<DiscountRule> = {}): DiscountRule {
  return {
    code: "BRIGHT20",
    type: "percent",
    percent: 20,
    amountToman: null,
    maxDiscountToman: null,
    minOrderToman: 0,
    active: true,
    startsAt: null,
    endsAt: null,
    maxUses: 100,
    usedCount: 0,
    perUserLimit: 1,
    courseIds: null,
    firstPurchaseOnly: false,
    allowFree: false,
    ...overrides,
  };
}

function context(overrides: Partial<DiscountContext> = {}): DiscountContext {
  return {
    priceToman: 1_000_000,
    courseId: "course-1",
    userUsageCount: 0,
    isFirstPurchase: true,
    now: NOW,
    ...overrides,
  };
}

describe("discount engine", () => {
  it("درصدی را روی قیمت سفارش حساب می‌کند", () => {
    const result = evaluateDiscount(rule(), context());
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.amountToman).toBe(200_000);
    expect(result.finalToman).toBe(800_000);
  });

  it("سقف تخفیف کد درصدی را اعمال می‌کند", () => {
    expect(
      computeDiscountAmount(
        { type: "percent", percent: 50, maxDiscountToman: 150_000 },
        1_000_000,
      ),
    ).toBe(150_000);
  });

  it("تخفیف ثابت را تا سقف قیمت محدود می‌کند", () => {
    const result = evaluateDiscount(
      rule({ type: "fixed", percent: null, amountToman: 2_000_000, allowFree: true }),
      context(),
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.finalToman).toBe(0);
  });

  it("تخفیف صفر را رد می‌کند", () => {
    const result = evaluateDiscount(
      rule({ type: "fixed", percent: null, amountToman: 0 }),
      context(),
    );
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.reason).toBe("zero_amount");
  });

  it("سفارش زیر حداقل مبلغ را رد می‌کند", () => {
    const result = evaluateDiscount(rule({ minOrderToman: 2_000_000 }), context());
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.reason).toBe("min_order");
    expect(result.message).toBe(DISCOUNT_GENERIC_ERROR);
  });

  it("سقف کل مصرف را در نظر می‌گیرد", () => {
    const result = evaluateDiscount(rule({ maxUses: 5, usedCount: 5 }), context());
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.reason).toBe("usage_limit");
  });

  it("سقف مصرف هر کاربر را در نظر می‌گیرد", () => {
    const result = evaluateDiscount(rule({ perUserLimit: 1 }), context({ userUsageCount: 1 }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.reason).toBe("per_user_limit");
  });

  it("کد محدود به دوره‌ی دیگر را رد می‌کند", () => {
    const result = evaluateDiscount(
      rule({ courseIds: ["other-course"] }),
      context(),
    );
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.reason).toBe("course_mismatch");
  });

  it("کد غیرفعال یا خارج از بازه را رد می‌کند", () => {
    expect(evaluateDiscount(rule({ active: false }), context()).valid).toBe(false);
    expect(
      evaluateDiscount(rule({ endsAt: new Date("2026-10-18T00:00:00Z") }), context())
        .valid,
    ).toBe(false);
    expect(
      evaluateDiscount(rule({ startsAt: new Date("2026-10-20T00:00:00Z") }), context())
        .valid,
    ).toBe(false);
  });

  it("کد فقط برای اولین خرید را برای خرید بعدی رد می‌کند", () => {
    const result = evaluateDiscount(
      rule({ firstPurchaseOnly: true }),
      context({ isFirstPurchase: false }),
    );
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.reason).toBe("first_purchase_only");
  });

  it("مبلغ صفر فقط با allow_free مجاز است", () => {
    const blocked = evaluateDiscount(
      rule({ type: "fixed", percent: null, amountToman: 1_000_000 }),
      context(),
    );
    expect(blocked.valid).toBe(false);
    if (blocked.valid) return;
    expect(blocked.reason).toBe("free_not_allowed");

    const allowed = evaluateDiscount(
      rule({ type: "fixed", percent: null, amountToman: 1_000_000, allowFree: true }),
      context(),
    );
    expect(allowed.valid).toBe(true);
    if (!allowed.valid) return;
    expect(allowed.finalToman).toBe(0);
  });

  it("کد ناموجود را عمومی رد می‌کند", () => {
    const result = evaluateDiscount(null, context());
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.reason).toBe("not_found");
    expect(result.message).toBe(DISCOUNT_GENERIC_ERROR);
  });

  it("کد را نرمال‌سازی می‌کند", () => {
    expect(normalizeDiscountCode("  bright ۲۰ ")).toBe("BRIGHT20");
    expect(normalizeDiscountCode("نوروز١٠")).toBe("نوروز10");
  });
});
