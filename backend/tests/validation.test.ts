import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  discountValidateSchema,
  leadSchema,
  verifyPaymentSchema,
} from "../src/lib/validation.js";

const COURSE_ID = "6f1b5a1e-3c1f-4f4b-9a4d-8a1b2c3d4e5f";

describe("request schemas", () => {
  it("ورودی سفارش را در هر دو شکل camelCase و snake_case می‌پذیرد", () => {
    expect(
      createOrderSchema.parse({ course_id: COURSE_ID, discount_code: "off10" }),
    ).toEqual({ courseId: COURSE_ID, discountCode: "off10" });

    expect(createOrderSchema.parse({ courseId: COURSE_ID })).toEqual({
      courseId: COURSE_ID,
      discountCode: undefined,
    });
  });

  it("سفارش بدون شناسه‌ی دوره را رد می‌کند", () => {
    expect(createOrderSchema.safeParse({ discountCode: "X" }).success).toBe(false);
    expect(createOrderSchema.safeParse({ courseId: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  it("اعتبارسنجی تخفیف را با course_id هم می‌پذیرد", () => {
    expect(discountValidateSchema.parse({ code: "OFF", course_id: COURSE_ID })).toEqual({
      code: "OFF",
      courseId: COURSE_ID,
    });
  });

  it("verify را با order_id یا کد پرداخت می‌پذیرد", () => {
    expect(verifyPaymentSchema.parse({ order_id: COURSE_ID })).toMatchObject({
      orderId: COURSE_ID,
    });
    expect(verifyPaymentSchema.parse({ code: "PAY-1" })).toMatchObject({
      code: "PAY-1",
    });
    expect(verifyPaymentSchema.safeParse({}).success).toBe(false);
  });

  it("شماره موبایل فارسی را در فرم دریافت راهنما می‌پذیرد", () => {
    const parsed = leadSchema.parse({
      fullName: "مریم احمدی",
      contact: "۰۹۱۲۳۴۵۶۷۸۹",
      consent: true,
    });
    expect(parsed.fullName).toBe("مریم احمدی");
  });
});
