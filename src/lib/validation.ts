import { z } from "zod";
import { isValidPersianSlug } from "./slug";
import { toEnglishDigits } from "./format";

const fullNameSchema = z
  .string()
  .trim()
  .min(3, "نام و نام خانوادگی را کامل وارد کنید.")
  .max(60, "نام و نام خانوادگی نمی‌تواند بیشتر از ۶۰ کاراکتر باشد.")
  .refine((value) => value.includes(" "), {
    message: "نام و نام خانوادگی را با فاصله وارد کنید.",
  });

const emailSchema = z
  .string()
  .trim()
  .min(1, "ایمیل را وارد کنید.")
  .email("ایمیل را درست وارد کنید.")
  .max(120, "ایمیل نمی‌تواند بیشتر از ۱۲۰ کاراکتر باشد.");

const phoneSchema = z
  .string()
  .trim()
  .min(1, "شماره موبایل را وارد کنید.")
  .refine((value) => /^09\d{9}$/.test(toEnglishDigits(value).replace(/[\s-]/g, "")), {
    message: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.",
  });

const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.")
  .max(64, "رمز عبور نمی‌تواند بیشتر از ۶۴ کاراکتر باشد.")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "رمز عبور باید شامل حرف و عدد باشد.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

export const registerSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "تکرار رمز عبور را وارد کنید."),
    acceptTerms: z
      .boolean()
      .refine((value) => value === true, {
        message: "برای ساخت حساب باید قوانین و حریم خصوصی را بپذیرید.",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "تکرار رمز عبور با رمز عبور یکسان نیست.",
    path: ["confirmPassword"],
  });

export const discountCodeSchema = z
  .string()
  .trim()
  .min(3, "کد تخفیف باید حداقل ۳ کاراکتر باشد.")
  .max(20, "کد تخفیف نمی‌تواند بیشتر از ۲۰ کاراکتر باشد.")
  .refine((value) => /^[A-Za-z0-9-]+$/.test(value), {
    message: "کد تخفیف فقط شامل حروف انگلیسی، عدد و خط تیره است.",
  });

export const checkoutSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  note: z
    .string()
    .trim()
    .max(300, "توضیحات نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد.")
    .optional()
    .or(z.literal("")),
  acceptRules: z.boolean().refine((value) => value === true, {
    message: "برای ادامه باید شرایط خرید و تحویل لایسنس را بپذیرید.",
  }),
});

export const licenseSchema = z.object({
  licenseCode: z
    .string()
    .trim()
    .min(6, "کد لایسنس باید حداقل ۶ کاراکتر باشد.")
    .max(48, "کد لایسنس نمی‌تواند بیشتر از ۴۸ کاراکتر باشد.")
    .refine((value) => /^[A-Za-z0-9-]+$/.test(value), {
      message: "کد لایسنس فقط شامل حروف انگلیسی، عدد و خط تیره است.",
    }),
});

export const adminDiscountSchema = z
  .object({
    code: discountCodeSchema,
    type: z.enum(["percent", "fixed"], {
      errorMap: () => ({ message: "نوع تخفیف را انتخاب کنید." }),
    }),
    percent: z.coerce
      .number({ invalid_type_error: "درصد تخفیف را وارد کنید." })
      .int("درصد تخفیف باید عدد صحیح باشد.")
      .min(0, "درصد تخفیف نمی‌تواند منفی باشد.")
      .max(90, "درصد تخفیف نباید بیشتر از ۹۰ باشد."),
    amountToman: z.coerce
      .number({ invalid_type_error: "مبلغ تخفیف را وارد کنید." })
      .int("مبلغ تخفیف باید عدد صحیح باشد.")
      .min(0, "مبلغ تخفیف نمی‌تواند منفی باشد.")
      .max(100_000_000, "مبلغ تخفیف بیش از حد بزرگ است."),
    maxDiscountToman: z.coerce
      .number()
      .int("سقف تخفیف باید عدد صحیح باشد.")
      .min(0, "سقف تخفیف نمی‌تواند منفی باشد.")
      .max(100_000_000, "سقف تخفیف بیش از حد بزرگ است."),
    minOrderToman: z.coerce
      .number()
      .int("حداقل مبلغ سفارش باید عدد صحیح باشد.")
      .min(0, "حداقل مبلغ سفارش نمی‌تواند منفی باشد.")
      .max(100_000_000, "حداقل مبلغ سفارش بیش از حد بزرگ است."),
    maxUses: z.coerce
      .number({ invalid_type_error: "سقف استفاده را وارد کنید." })
      .int("سقف استفاده باید عدد صحیح باشد.")
      .min(1, "سقف استفاده نباید کمتر از ۱ باشد.")
      .max(10000, "سقف استفاده نباید بیشتر از ۱۰٬۰۰۰ باشد."),
    maxUsesPerUser: z.coerce
      .number()
      .int("سقف هر کاربر باید عدد صحیح باشد.")
      .min(1, "سقف هر کاربر نباید کمتر از ۱ باشد.")
      .max(100, "سقف هر کاربر نباید بیشتر از ۱۰۰ باشد."),
    courseId: z.string().min(1, "دوره را انتخاب کنید."),
    firstPurchaseOnly: z.boolean(),
    allowFree: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === "percent" && (value.percent < 1 || value.percent > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percent"],
        message: "درصد تخفیف باید بین ۱ تا ۹۰ باشد.",
      });
    }
    if (value.type === "fixed" && value.amountToman < 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountToman"],
        message: "مبلغ تخفیف باید حداقل ۱٬۰۰۰ تومان باشد.",
      });
    }
  });

export const contactMessageSchema = z
  .object({
    name: fullNameSchema,
    email: emailSchema,
    subject: z
      .string()
      .trim()
      .min(3, "موضوع پیام را بنویسید.")
      .max(120, "موضوع نمی‌تواند بیشتر از ۱۲۰ کاراکتر باشد."),
    message: z
      .string()
      .trim()
      .min(10, "پیام شما باید حداقل ۱۰ کاراکتر باشد.")
      .max(800, "پیام شما نمی‌تواند بیشتر از ۸۰۰ کاراکتر باشد."),
    website: z.string().max(200).optional().or(z.literal("")),
  })
  .strict();

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const leadContactSchema = z
  .string()
  .trim()
  .min(1, "ایمیل یا شماره موبایل را وارد کنید.")
  .refine(
    (value) => {
      const normalized = toEnglishDigits(value).trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
      const isPhone = /^09\d{9}$/.test(normalized.replace(/[\s-]/g, ""));
      return isEmail || isPhone;
    },
    { message: "ایمیل یا شماره موبایل را درست وارد کنید." },
  );

export const membershipSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "نام را وارد کنید.")
      .max(60, "نام نمی‌تواند بیشتر از ۶۰ کاراکتر باشد."),
    contact: leadContactSchema,
    consent: z.boolean().refine((value) => value === true, {
      message:
        "برای عضویت باید تأیید کنید که والد یا سرپرست قانونی هستید.",
    }),
    website: z.string().max(200).optional().or(z.literal("")),
  })
  .strict();

export type MembershipFormValues = z.infer<typeof membershipSchema>;

export const purchaseSchema = z.object({
  acceptRules: z.boolean().refine((value) => value === true, {
    message:
      "برای ادامه باید قوانین خرید و سیاست بازگشت وجه را بپذیرید.",
  }),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
export type LicenseFormValues = z.infer<typeof licenseSchema>;
export type AdminDiscountFormValues = z.infer<typeof adminDiscountSchema>;
export type ContactMessageFormValues = z.infer<typeof contactMessageSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal(""));

export const profileSchema = z
  .object({
    fullName: fullNameSchema,
    phone: phoneSchema,
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "رمز عبور فعلی را وارد کنید."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "تکرار رمز عبور جدید را وارد کنید."),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "تکرار رمز عبور با رمز جدید یکسان نیست.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "رمز عبور جدید باید با رمز فعلی متفاوت باشد.",
    path: ["newPassword"],
  });

export const accountDeletionSchema = z
  .object({
    confirmation: z.string().trim().superRefine((value, ctx) => {
      if (value !== "حذف") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "برای تأیید، عبارت «حذف» را دقیقاً وارد کنید.",
        });
      }
    }),
    acknowledge: z.boolean().superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "برای ثبت درخواست باید بدانید دسترسی به لایسنس‌ها پس از حذف از بین می‌رود.",
        });
      }
    }),
  })
  .strict();

export const fulfillmentSchema = z.object({
  licenseCode: z
    .string()
    .trim()
    .min(6, "کد لایسنس باید حداقل ۶ کاراکتر باشد.")
    .max(64, "کد لایسنس نمی‌تواند بیشتر از ۶۴ کاراکتر باشد.")
    .refine((value) => /^[A-Za-z0-9._-]+$/.test(value), {
      message: "کد لایسنس فقط شامل حروف انگلیسی، عدد و علائم - . _ است.",
    }),
  description: optionalText(400, "توضیح تکمیلی نمی‌تواند بیشتر از ۴۰۰ کاراکتر باشد."),
  providerReference: optionalText(
    60,
    "شناسه‌ی مرجع ارائه‌دهنده نمی‌تواند بیشتر از ۶۰ کاراکتر باشد.",
  ),
  notifyUser: z.boolean(),
});

export const editLicenseSchema = z
  .object({
    licenseCode: z
      .string()
      .trim()
      .max(64, "کد لایسنس نمی‌تواند بیشتر از ۶۴ کاراکتر باشد.")
      .refine((value) => value === "" || /^[A-Za-z0-9._-]+$/.test(value), {
        message: "کد لایسنس فقط شامل حروف انگلیسی، عدد و علائم - . _ است.",
      }),
    description: optionalText(400, "توضیح تکمیلی نمی‌تواند بیشتر از ۴۰۰ کاراکتر باشد."),
    providerReference: optionalText(
      60,
      "شناسه‌ی مرجع ارائه‌دهنده نمی‌تواند بیشتر از ۶۰ کاراکتر باشد.",
    ),
    notifyUser: z.boolean(),
  })
  .strict();

const reasonSchema = z
  .string()
  .trim()
  .min(10, "دلیل را کامل‌تر بنویسید (حداقل ۱۰ کاراکتر).")
  .max(300, "دلیل نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد.");

export const holdOrderSchema = z
  .object({
    reason: reasonSchema,
    sendDelayEmail: z.boolean(),
  })
  .strict();

export const cancelOrderSchema = z
  .object({
    reason: reasonSchema,
  })
  .strict();

export const refundOrderSchema = z
  .object({
    reason: reasonSchema,
    reference: optionalText(
      60,
      "شناسه‌ی بازگشت وجه نمی‌تواند بیشتر از ۶۰ کاراکتر باشد.",
    ),
  })
  .strict();

export const giftLicenseSchema = z
  .object({
    email: emailSchema,
    courseId: z.string().min(1, "دوره را انتخاب کنید."),
    licenseCode: z
      .string()
      .trim()
      .min(6, "کد لایسنس باید حداقل ۶ کاراکتر باشد.")
      .max(64, "کد لایسنس نمی‌تواند بیشتر از ۶۴ کاراکتر باشد.")
      .refine((value) => /^[A-Za-z0-9._-]+$/.test(value), {
        message: "کد لایسنس فقط شامل حروف انگلیسی، عدد و علائم - . _ است.",
      }),
    description: optionalText(400, "توضیح تکمیلی نمی‌تواند بیشتر از ۴۰۰ کاراکتر باشد."),
    providerReference: optionalText(
      60,
      "شناسه‌ی مرجع ارائه‌دهنده نمی‌تواند بیشتر از ۶۰ کاراکتر باشد.",
    ),
    notifyUser: z.boolean(),
  })
  .strict();

const dateFieldSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}/.test(value), {
    message: "تاریخ را درست وارد کنید.",
  });

const percentField = z.coerce
  .number({ invalid_type_error: "درصد تخفیف را وارد کنید." })
  .int("درصد تخفیف باید عدد صحیح باشد.")
  .min(0, "درصد تخفیف نمی‌تواند منفی باشد.")
  .max(90, "درصد تخفیف نباید بیشتر از ۹۰ باشد.");

const amountField = z.coerce
  .number({ invalid_type_error: "مبلغ را وارد کنید." })
  .int("مبلغ باید عدد صحیح باشد.")
  .min(0, "مبلغ نمی‌تواند منفی باشد.")
  .max(500_000_000, "مبلغ بیش از حد بزرگ است.");

const discountBaseShape = {
  type: z.enum(["percent", "fixed"], {
    errorMap: () => ({ message: "نوع تخفیف را انتخاب کنید." }),
  }),
  percent: percentField,
  amountToman: amountField,
  maxDiscountToman: amountField,
  minOrderToman: amountField,
  startsAt: dateFieldSchema,
  expiresAt: dateFieldSchema,
  maxUses: z.coerce
    .number({ invalid_type_error: "سقف استفاده را وارد کنید." })
    .int("سقف استفاده باید عدد صحیح باشد.")
    .min(1, "سقف استفاده نباید کمتر از ۱ باشد.")
    .max(10000, "سقف استفاده نباید بیشتر از ۱۰٬۰۰۰ باشد."),
  maxUsesPerUser: z.coerce
    .number()
    .int("سقف هر کاربر باید عدد صحیح باشد.")
    .min(1, "سقف هر کاربر نباید کمتر از ۱ باشد.")
    .max(100, "سقف هر کاربر نباید بیشتر از ۱۰۰ باشد."),
  firstPurchaseOnly: z.boolean(),
  allowFree: z.boolean(),
  active: z.boolean(),
  courseIds: z.array(z.string()),
} as const;

function refineDiscountWindow(
  value: { startsAt: string; expiresAt: string; type: "percent" | "fixed"; percent: number; amountToman: number },
  ctx: z.RefinementCtx,
): void {
  if (value.type === "percent" && (value.percent < 1 || value.percent > 90)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["percent"],
      message: "درصد تخفیف باید بین ۱ تا ۹۰ باشد.",
    });
  }
  if (value.type === "fixed" && value.amountToman < 1000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["amountToman"],
      message: "مبلغ تخفیف باید حداقل ۱٬۰۰۰ تومان باشد.",
    });
  }
  if (value.startsAt && value.expiresAt) {
    const start = new Date(value.startsAt).getTime();
    const end = new Date(value.expiresAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "پایان بازه باید بعد از شروع آن باشد.",
      });
    }
  }
}

export const adminDiscountFormSchema = z
  .object({
    code: discountCodeSchema,
    ...discountBaseShape,
  })
  .strict()
  .superRefine(refineDiscountWindow);

export const adminDiscountEditSchema = z
  .object(discountBaseShape)
  .strict()
  .superRefine(refineDiscountWindow);

export const bulkDiscountSchema = z
  .object({
    prefix: z
      .string()
      .trim()
      .min(3, "پیشوند باید حداقل ۳ کاراکتر باشد.")
      .max(10, "پیشوند نمی‌تواند بیشتر از ۱۰ کاراکتر باشد.")
      .refine((value) => /^[A-Za-z0-9-]+$/.test(value), {
        message: "پیشوند فقط شامل حروف انگلیسی، عدد و خط تیره است.",
      }),
    count: z.coerce
      .number({ invalid_type_error: "تعداد کدها را وارد کنید." })
      .int("تعداد کدها باید عدد صحیح باشد.")
      .min(1, "تعداد کدها نباید کمتر از ۱ باشد.")
      .max(50, "در هر مرحله حداکثر ۵۰ کد ساخته می‌شود."),
    ...discountBaseShape,
  })
  .strict()
  .superRefine(refineDiscountWindow);

const courseLevelSchema = z.enum(["beginner", "intermediate", "advanced"], {
  errorMap: () => ({ message: "سطح دوره را انتخاب کنید." }),
});

export const courseFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "عنوان دوره باید حداقل ۵ کاراکتر باشد.")
      .max(90, "عنوان دوره نمی‌تواند بیشتر از ۹۰ کاراکتر باشد."),
    slug: z
      .string()
      .trim()
      .min(3, "نشانی دوره را وارد کنید.")
      .max(60, "نشانی دوره نمی‌تواند بیشتر از ۶۰ کاراکتر باشد.")
      .refine((value) => /^[a-z0-9-]+$/.test(value), {
        message: "نشانی فقط شامل حروف کوچک انگلیسی، عدد و خط تیره است.",
      }),
    tagline: z
      .string()
      .trim()
      .min(10, "یک جمله‌ی کوتاه درباره‌ی دوره بنویسید.")
      .max(140, "جمله‌ی معرفی نمی‌تواند بیشتر از ۱۴۰ کاراکتر باشد."),
    descriptionText: z
      .string()
      .trim()
      .min(40, "توضیحات دوره باید حداقل ۴۰ کاراکتر باشد.")
      .max(2000, "توضیحات دوره نمی‌تواند بیشتر از ۲٬۰۰۰ کاراکتر باشد."),
    outcomesText: z
      .string()
      .trim()
      .min(10, "حداقل یک دستاورد برای دوره بنویسید.")
      .max(1500, "دستاوردها نمی‌توانند بیشتر از ۱٬۵۰۰ کاراکتر باشند."),
    level: courseLevelSchema,
    ageMin: z.coerce
      .number({ invalid_type_error: "حداقل سن را وارد کنید." })
      .int("حداقل سن باید عدد صحیح باشد.")
      .min(4, "حداقل سن نباید کمتر از ۴ باشد.")
      .max(18, "حداقل سن نباید بیشتر از ۱۸ باشد."),
    ageMax: z.coerce
      .number({ invalid_type_error: "حداکثر سن را وارد کنید." })
      .int("حداکثر سن باید عدد صحیح باشد.")
      .min(4, "حداکثر سن نباید کمتر از ۴ باشد.")
      .max(18, "حداکثر سن نباید بیشتر از ۱۸ باشد."),
    durationWeeks: z.coerce
      .number({ invalid_type_error: "مدت دوره را وارد کنید." })
      .int("مدت دوره باید عدد صحیح باشد.")
      .min(1, "مدت دوره نباید کمتر از یک هفته باشد.")
      .max(52, "مدت دوره نباید بیشتر از ۵۲ هفته باشد."),
    sessions: z.coerce
      .number({ invalid_type_error: "تعداد جلسه را وارد کنید." })
      .int("تعداد جلسه باید عدد صحیح باشد.")
      .min(1, "تعداد جلسه نباید کمتر از ۱ باشد.")
      .max(200, "تعداد جلسه نباید بیشتر از ۲۰۰ باشد."),
    priceToman: z.coerce
      .number({ invalid_type_error: "قیمت دوره را وارد کنید." })
      .int("قیمت دوره باید عدد صحیح باشد.")
      .min(0, "قیمت دوره نمی‌تواند منفی باشد.")
      .max(500_000_000, "قیمت دوره بیش از حد بزرگ است."),
    compareAtPriceToman: z.coerce
      .number({ invalid_type_error: "قیمت پیش از تخفیف را وارد کنید." })
      .int("قیمت پیش از تخفیف باید عدد صحیح باشد.")
      .min(0, "قیمت پیش از تخفیف نمی‌تواند منفی باشد.")
      .max(500_000_000, "قیمت پیش از تخفیف بیش از حد بزرگ است."),
    providerName: z
      .string()
      .trim()
      .min(3, "نام ارائه‌دهنده را وارد کنید.")
      .max(80, "نام ارائه‌دهنده نمی‌تواند بیشتر از ۸۰ کاراکتر باشد."),
    providerPanelUrl: z
      .string()
      .trim()
      .url("نشانی پنل ارائه‌دهنده را درست وارد کنید."),
    activationUrl: z
      .string()
      .trim()
      .url("نشانی سایت دوره را درست وارد کنید."),
    activationInstructions: z
      .string()
      .trim()
      .min(20, "راهنمای فعال‌سازی را کامل بنویسید.")
      .max(1200, "راهنمای فعال‌سازی نمی‌تواند بیشتر از ۱٬۲۰۰ کاراکتر باشد."),
    art: z.enum(["foundations", "studio", "creative", "python", "safety"], {
      errorMap: () => ({ message: "تصویر دوره را انتخاب کنید." }),
    }),
    badge: optionalText(30, "برچسب نمی‌تواند بیشتر از ۳۰ کاراکتر باشد."),
    popular: z.boolean(),
    featured: z.boolean(),
    published: z.boolean(),
    syllabus: z
      .array(
        z.object({
          title: z.string().trim().min(2, "عنوان سرفصل را وارد کنید."),
          summary: z.string().trim().min(5, "توضیح سرفصل را وارد کنید."),
        }),
      )
      .min(1, "حداقل یک سرفصل اضافه کنید."),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.ageMax < value.ageMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ageMax"],
        message: "حداکثر سن باید بزرگ‌تر یا مساوی حداقل سن باشد.",
      });
    }
    if (
      value.compareAtPriceToman > 0 &&
      value.compareAtPriceToman <= value.priceToman
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["compareAtPriceToman"],
        message: "قیمت پیش از تخفیف باید بیشتر از قیمت فروش باشد.",
      });
    }
  });

export const blogPostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "عنوان مقاله باید حداقل ۵ کاراکتر باشد.")
      .max(140, "عنوان مقاله نمی‌تواند بیشتر از ۱۴۰ کاراکتر باشد."),
    slug: z
      .string()
      .trim()
      .min(3, "نشانی مقاله باید حداقل ۳ کاراکتر باشد.")
      .max(80, "نشانی مقاله نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.")
      .refine(isValidPersianSlug, {
        message: "نشانی فقط می‌تواند شامل حروف فارسی، عدد و خط تیره باشد.",
      }),
    excerpt: z
      .string()
      .trim()
      .min(20, "خلاصه‌ی مقاله باید حداقل ۲۰ کاراکتر باشد.")
      .max(300, "خلاصه‌ی مقاله نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد."),
    category: z
      .string()
      .trim()
      .min(2, "دسته‌بندی را وارد کنید.")
      .max(40, "دسته‌بندی نمی‌تواند بیشتر از ۴۰ کاراکتر باشد."),
    author: z
      .string()
      .trim()
      .min(2, "نام نویسنده را وارد کنید.")
      .max(60, "نام نویسنده نمی‌تواند بیشتر از ۶۰ کاراکتر باشد."),
    readMinutes: z.coerce
      .number({ invalid_type_error: "زمان مطالعه را وارد کنید." })
      .int("زمان مطالعه باید عدد صحیح باشد.")
      .min(1, "زمان مطالعه حداقل ۱ دقیقه است.")
      .max(90, "زمان مطالعه نمی‌تواند بیشتر از ۹۰ دقیقه باشد."),
    art: z.enum(
      ["foundations", "creative", "python", "safety", "hero", "about"],
      { errorMap: () => ({ message: "تصویر مقاله را انتخاب کنید." }) },
    ),
    body: z
      .string()
      .trim()
      .min(30, "متن مقاله باید حداقل ۳۰ کاراکتر باشد.")
      .max(20_000, "متن مقاله بیش از حد طولانی است."),
    status: z.enum(["draft", "published"], {
      errorMap: () => ({ message: "وضعیت انتشار معتبر نیست." }),
    }),
  })
  .strict();

export const adminFaqSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(10, "پرسش باید حداقل ۱۰ کاراکتر باشد.")
      .max(250, "پرسش نمی‌تواند بیشتر از ۲۵۰ کاراکتر باشد."),
    answer: z
      .string()
      .trim()
      .min(20, "پاسخ باید حداقل ۲۰ کاراکتر باشد.")
      .max(1500, "پاسخ نمی‌تواند بیشتر از ۱۵۰۰ کاراکتر باشد."),
    isActive: z.boolean(),
  })
  .strict();

export const adminTeacherSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "نام مربی را کامل وارد کنید.")
      .max(60, "نام مربی نمی‌تواند بیشتر از ۶۰ کاراکتر باشد."),
    role: z
      .string()
      .trim()
      .min(3, "عنوان نقش مربی را وارد کنید.")
      .max(60, "عنوان نقش نمی‌تواند بیشتر از ۶۰ کاراکتر باشد."),
    bio: z
      .string()
      .trim()
      .min(20, "معرفی مربی باید حداقل ۲۰ کاراکتر باشد.")
      .max(600, "معرفی مربی نمی‌تواند بیشتر از ۶۰۰ کاراکتر باشد."),
    initials: z
      .string()
      .trim()
      .min(1, "کوته‌نوشت را وارد کنید.")
      .max(3, "کوته‌نوشت حداکثر ۳ نویسه است."),
    accent: z.enum(["lavender", "yellow", "sky", "coral"], {
      errorMap: () => ({ message: "رنگ کارت را انتخاب کنید." }),
    }),
    isActive: z.boolean(),
  })
  .strict();

export const generalSettingsSchema = z
  .object({
    fulfillmentSlaHours: z.coerce
      .number({ invalid_type_error: "SLA تحویل را وارد کنید." })
      .int("SLA باید عدد صحیح باشد.")
      .min(1, "SLA حداقل ۱ ساعت است.")
      .max(168, "SLA نمی‌تواند بیشتر از ۱۶۸ ساعت باشد."),
    includeLicenseKeyInEmail: z.boolean(),
    taxPercent: z.coerce
      .number({ invalid_type_error: "درصد مالیات را وارد کنید." })
      .min(0, "درصد مالیات نمی‌تواند منفی باشد.")
      .max(30, "درصد مالیات نمی‌تواند بیشتر از ۳۰ باشد."),
    footer: z
      .object({
        about: z
          .string()
          .trim()
          .min(20, "متن معرفی فوتر باید حداقل ۲۰ کاراکتر باشد.")
          .max(500, "متن معرفی فوتر نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد."),
        email: z
          .string()
          .trim()
          .max(120, "ایمیل فوتر نمی‌تواند بیشتر از ۱۲۰ کاراکتر باشد.")
          .refine(
            (value) =>
              value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
            "ایمیل فوتر را درست وارد کنید.",
          ),
        phone: z
          .string()
          .trim()
          .min(5, "شماره تماس فوتر را وارد کنید.")
          .max(20, "شماره تماس بیش از حد طولانی است."),
        address: z
          .string()
          .trim()
          .min(5, "نشانی فوتر را کامل‌تر بنویسید.")
          .max(200, "نشانی فوتر بیش از حد طولانی است."),
      })
      .strict(),
    trustBadge: z
      .object({
        enabled: z.boolean(),
        label: z
          .string()
          .trim()
          .min(3, "عنوان نماد اعتماد را وارد کنید.")
          .max(80, "عنوان نماد بیش از حد طولانی است."),
        url: z.string().trim().max(200, "نشانی نماد بیش از حد طولانی است."),
        code: z
          .string()
          .trim()
          .max(2000, "کد نماد بیش از حد طولانی است."),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.trustBadge.enabled && !/^https:\/\//.test(value.trustBadge.url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trustBadge", "url"],
        message: "نشانی نماد اعتماد باید با https:// شروع شود.",
      });
    }
  });

export const paymentTokenSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(12, "توکن دسترسی باید حداقل ۱۲ نویسه باشد.")
      .max(200, "توکن دسترسی بیش از حد طولانی است.")
      .refine((value) => !/\s/.test(value), {
        message: "توکن دسترسی نباید فاصله داشته باشد.",
      }),
  })
  .strict();

export const revokeLicenseSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(10, "دلیل لغو را کامل‌تر بنویسید (حداقل ۱۰ کاراکتر).")
      .max(300, "دلیل نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد."),
  })
  .strict();

export const disableUserSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(5, "دلیل غیرفعال‌سازی را بنویسید.")
      .max(300, "دلیل نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد."),
  })
  .strict();

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type AccountDeletionFormValues = z.infer<typeof accountDeletionSchema>;
export type FulfillmentFormValues = z.infer<typeof fulfillmentSchema>;
export type EditLicenseFormValues = z.infer<typeof editLicenseSchema>;
export type HoldOrderFormValues = z.infer<typeof holdOrderSchema>;
export type CancelOrderFormValues = z.infer<typeof cancelOrderSchema>;
export type RefundOrderFormValues = z.infer<typeof refundOrderSchema>;
export type GiftLicenseFormValues = z.infer<typeof giftLicenseSchema>;
export type AdminDiscountFormSchemaValues = z.infer<typeof adminDiscountFormSchema>;
export type BulkDiscountFormValues = z.infer<typeof bulkDiscountSchema>;
export type CourseFormValues = z.infer<typeof courseFormSchema>;

export type DiscountBaseFormValues = z.infer<typeof adminDiscountEditSchema>;
export type BlogPostFormValues = z.infer<typeof blogPostSchema>;
export type AdminFaqFormValues = z.infer<typeof adminFaqSchema>;
export type AdminTeacherFormValues = z.infer<typeof adminTeacherSchema>;
export type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;
export type PaymentTokenFormValues = z.infer<typeof paymentTokenSchema>;
export type RevokeLicenseFormValues = z.infer<typeof revokeLicenseSchema>;
export type DisableUserFormValues = z.infer<typeof disableUserSchema>;
