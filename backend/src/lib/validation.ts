import { z, type ZodType } from "zod";
import { badRequest } from "./errors.js";

const persianOrLatinLetter = /[\p{L}]/u;
const digit = /\d/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email({ message: "ایمیل معتبر نیست." });

export const passwordSchema = z
  .string()
  .min(12, { message: "رمز عبور باید حداقل ۱۲ نویسه باشد." })
  .max(128, { message: "رمز عبور نباید بیشتر از ۱۲۸ نویسه باشد." })
  .refine((value) => persianOrLatinLetter.test(value), {
    message: "رمز عبور باید حداقل یک حرف داشته باشد.",
  })
  .refine((value) => digit.test(value), {
    message: "رمز عبور باید حداقل یک رقم داشته باشد.",
  });

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, { message: "نام و نام خانوادگی را کامل وارد کنید." })
  .max(80, { message: "نام و نام خانوادگی بیش از حد بلند است." });

export const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => value === "" || /^09\d{9}$/.test(value), {
    message: "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.",
  })
  .optional();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  phone: phoneSchema,
  acceptTerms: z.boolean().refine((value) => value, {
    message: "پذیرش قوانین برای ثبت‌نام لازم است.",
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  totp: z
    .string()
    .regex(/^\d{6}$/, { message: "کد تأیید باید ۶ رقم باشد." })
    .optional(),
});

export const emailOnlySchema = z.object({
  email: emailSchema,
});

export const tokenSchema = z.object({
  token: z
    .string()
    .min(20, { message: "پیوند معتبر نیست." })
    .max(500, { message: "پیوند معتبر نیست." }),
});

export const verifyEmailSchema = tokenSchema;

export const resetPasswordSchema = tokenSchema.extend({
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: "کد تأیید باید ۶ رقم باشد." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TotpCodeInput = z.infer<typeof totpCodeSchema>;

/**
 * اعتبارسنجی ورودی با Zod و تبدیل خطاها به پاسخ عمومی.
 * هیچ مقدار ورودی در خطا برگردانده نمی‌شود.
 */
export function parseWith<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "root";
    if (!(key in fields)) fields[key] = issue.message;
  }

  throw badRequest(
    "اطلاعات واردشده معتبر نیست.",
    "validation_error",
    fields,
  );
}

/* -------------------------------------------------------------------------- */
/* Public content, orders and payments                                        */
/* -------------------------------------------------------------------------- */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(char);
    if (persianIndex >= 0) return String(persianIndex);
    return String(ARABIC_DIGITS.indexOf(char));
  });
}

/** ورودی تله‌ی ربات؛ کاربر واقعی این فیلد را پر نمی‌کند. */
const honeypotSchema = z.string().max(200).optional();

export const leadSchema = z.object({
  fullName: fullNameSchema,
  contact: z
    .string()
    .trim()
    .min(3, { message: "راه ارتباطی را وارد کنید." })
    .max(120, { message: "راه ارتباطی بیش از حد بلند است." })
    .refine(
      (value) => {
        const normalized = normalizeDigits(value).replace(/[\s-]/g, "");
        return (
          /^09\d{9}$/.test(normalized) ||
          /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
        );
      },
      { message: "شماره موبایل یا ایمیل معتبر وارد کنید." },
    ),
  consent: z.boolean().refine((value) => value, {
    message: "برای دریافت راهنما باید با تماس موافقت کنید.",
  }),
  website: honeypotSchema,
});

export const contactSchema = z.object({
  name: fullNameSchema,
  email: emailSchema,
  subject: z
    .string()
    .trim()
    .min(3, { message: "موضوع پیام را وارد کنید." })
    .max(120, { message: "موضوع پیام بیش از حد بلند است." }),
  message: z
    .string()
    .trim()
    .min(10, { message: "متن پیام باید حداقل ۱۰ نویسه باشد." })
    .max(2_000, { message: "متن پیام نباید بیشتر از ۲۰۰۰ نویسه باشد." }),
  website: honeypotSchema,
});

const courseIdField = z.uuid({ message: "شناسه‌ی دوره معتبر نیست." });

export const discountValidateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, { message: "کد تخفیف را وارد کنید." })
      .max(40, { message: "کد تخفیف معتبر نیست." }),
    courseId: courseIdField.optional(),
    course_id: courseIdField.optional(),
  })
  .refine((value) => Boolean(value.courseId ?? value.course_id), {
    message: "شناسه‌ی دوره الزامی است.",
    path: ["courseId"],
  })
  .transform((value) => ({
    code: value.code,
    courseId: (value.courseId ?? value.course_id) as string,
  }));

const optionalDiscountCode = z
  .string()
  .trim()
  .max(40, { message: "کد تخفیف معتبر نیست." })
  .optional();

/**
 * قرارداد فرانت‌اند camelCase است؛ برای سازگاری با کلاینت‌های snake_case
 * هر دو شکل پذیرفته می‌شود ولی خروجی یکسان است.
 */
export const createOrderSchema = z
  .object({
    courseId: courseIdField.optional(),
    course_id: courseIdField.optional(),
    discountCode: optionalDiscountCode,
    discount_code: optionalDiscountCode,
  })
  .refine((value) => Boolean(value.courseId ?? value.course_id), {
    message: "شناسه‌ی دوره الزامی است.",
    path: ["courseId"],
  })
  .transform((value) => ({
    courseId: (value.courseId ?? value.course_id) as string,
    discountCode: value.discountCode ?? value.discount_code,
  }));

const orderIdField = z.uuid({ message: "شناسه‌ی سفارش معتبر نیست." });

export const verifyPaymentSchema = z
  .object({
    orderId: orderIdField.optional(),
    order_id: orderIdField.optional(),
    refId: z.string().trim().min(1).max(80).optional(),
    refid: z.string().trim().min(1).max(80).optional(),
    code: z.string().trim().min(1).max(120).optional(),
    clientRefId: z.string().trim().min(1).max(120).optional(),
    clientrefid: z.string().trim().min(1).max(120).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.orderId ??
          value.order_id ??
          value.code ??
          value.clientRefId ??
          value.clientrefid,
      ),
    {
      message: "شناسه‌ی سفارش یا اطلاعات پرداخت الزامی است.",
      path: ["orderId"],
    },
  )
  .transform((value) => ({
    orderId: (value.orderId ?? value.order_id) as string | undefined,
    refId: value.refId ?? value.refid,
    code: value.code,
    clientRefId: value.clientRefId ?? value.clientrefid,
  }));

export const paymentCallbackSchema = z.object({
  code: z.string().trim().max(120).optional(),
  refId: z.string().trim().max(80).optional(),
  clientRefId: z.string().trim().max(120).optional(),
  order: z.uuid().optional(),
});

export const paymentTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(12, { message: "توکن دسترسی باید حداقل ۱۲ نویسه باشد." })
    .max(300, { message: "توکن دسترسی بیش از حد بلند است." })
    .refine((value) => !/\s/.test(value), {
      message: "توکن دسترسی نباید فاصله داشته باشد.",
    }),
});

export const paymentEnabledSchema = z.object({
  enabled: z.boolean(),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(5_000).default(0),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type PaymentCallbackInput = z.infer<typeof paymentCallbackSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
