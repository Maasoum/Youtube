import { z } from "zod";
import { emailSchema, fullNameSchema, phoneSchema } from "./validation.js";

const uuid = (message = "شناسه معتبر نیست.") => z.uuid({ message });
const reason = z
  .string()
  .trim()
  .min(3, { message: "دلیل را دست‌کم در ۳ نویسه بنویسید." })
  .max(500, { message: "دلیل نباید بیشتر از ۵۰۰ نویسه باشد." });

const licenseCodeSchema = z
  .string()
  .trim()
  .min(4, { message: "کلید لایسنس باید حداقل ۴ نویسه باشد." })
  .max(500, { message: "کلید لایسنس بیش از حد بلند است." })
  .refine((value) => !/[\r\n]/.test(value), {
    message: "کلید لایسنس نباید خط جدید داشته باشد.",
  });

const descriptionSchema = z
  .string()
  .trim()
  .max(1_000, { message: "توضیحات نباید بیشتر از ۱۰۰۰ نویسه باشد." })
  .optional();

const providerReferenceSchema = z
  .string()
  .trim()
  .max(200, { message: "شناسه‌ی ارجاع ارائه‌دهنده بیش از حد بلند است." })
  .optional();

export const profileUpdateSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema.optional(),
});

export const accountDeletionSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, { message: "دلیل نباید بیشتر از ۵۰۰ نویسه باشد." })
    .optional(),
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === "حذف", {
      message: "برای تأیید، عبارت «حذف» را دقیقاً وارد کنید.",
      path: ["confirmation"],
    }),
});

export const notificationReadSchema = z.object({
  id: uuid(),
});

export const licenseRevealParamsSchema = z.object({
  id: uuid("شناسه‌ی لایسنس معتبر نیست."),
});

export const adminOrderListQuerySchema = z.object({
  status: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    ),
  q: z.string().trim().max(80).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const fulfillOrderSchema = z.object({
  licenseCode: licenseCodeSchema,
  description: descriptionSchema,
  providerReference: providerReferenceSchema,
  notifyUser: z.boolean().optional().default(true),
  confirmDuplicate: z.boolean().optional().default(false),
});

export const holdOrderSchema = z.object({
  reason,
  sendDelayEmail: z.boolean().optional().default(false),
});

export const cancelOrderSchema = z.object({
  reason,
});

export const refundOrderSchema = z.object({
  reason,
  reference: z
    .string()
    .trim()
    .max(120, { message: "شماره‌ی پیگیری بازگشت وجه بیش از حد بلند است." })
    .optional(),
});

export const editLicenseSchema = z.object({
  licenseCode: licenseCodeSchema.optional(),
  description: descriptionSchema,
  providerReference: providerReferenceSchema,
  notifyUser: z.boolean().optional().default(false),
  confirmDuplicate: z.boolean().optional().default(false),
});

export const revokeLicenseSchema = z.object({
  reason,
});

export const giftLicenseSchema = z.object({
  email: emailSchema,
  courseId: uuid("شناسه‌ی دوره معتبر نیست."),
  licenseCode: licenseCodeSchema,
  description: descriptionSchema,
  providerReference: providerReferenceSchema,
  notifyUser: z.boolean().optional().default(true),
  confirmDuplicate: z.boolean().optional().default(false),
});

export const slugSchema = z
  .string()
  .trim()
  .min(2, { message: "نامک باید حداقل ۲ نویسه باشد." })
  .max(80, { message: "نامک نباید بیشتر از ۸۰ نویسه باشد." })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "نامک فقط می‌تواند شامل حروف کوچک لاتین، رقم و خط تیره باشد.",
  });

const courseText = (max: number, message: string) =>
  z.string().trim().max(max, { message });

const stringList = (maxItems: number) =>
  z.array(courseText(300, "هر آیتم نباید بیشتر از ۳۰۰ نویسه باشد.")).max(maxItems);

export const courseInputSchema = z.object({
  slug: slugSchema,
  title: courseText(160, "عنوان دوره بیش از حد بلند است.").min(3, {
    message: "عنوان دوره را کامل بنویسید.",
  }),
  tagline: courseText(200, "شعار دوره بیش از حد بلند است.").optional().default(""),
  description: z.union([
    z.string().trim().min(10, { message: "توضیحات دوره را کامل بنویسید." }).max(8_000),
    z.array(z.string().trim().min(1)).min(1).max(20),
  ]),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  ageMin: z.coerce.number().int().min(3).max(99),
  ageMax: z.coerce.number().int().min(3).max(99),
  durationWeeks: z.coerce.number().int().min(1).max(52).default(6),
  sessions: z.coerce.number().int().min(1).max(200).default(12),
  priceToman: z.coerce.number().int().min(0).max(1_000_000_000),
  compareAtPriceToman: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_000_000_000)
    .nullable()
    .optional(),
  outcomes: stringList(20).optional().default([]),
  syllabus: z
    .array(
      z.object({
        title: courseText(160, "عنوان سرفصل بیش از حد بلند است.").min(1),
        summary: courseText(500, "توضیح سرفصل بیش از حد بلند است.").min(1),
      }),
    )
    .max(40)
    .optional()
    .default([]),
  faqs: z
    .array(
      z.object({
        question: courseText(300, "پرسش بیش از حد بلند است.").min(3),
        answer: courseText(2_000, "پاسخ بیش از حد بلند است.").min(3),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  art: courseText(80, "شناسه‌ی تصویر معتبر نیست.").optional().nullable(),
  badge: courseText(60, "برچسب دوره بیش از حد بلند است.").optional().nullable(),
  popular: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  providerName: courseText(120, "نام ارائه‌دهنده بیش از حد بلند است.").min(2),
  providerPanelUrl: z
    .string()
    .trim()
    .url({ message: "نشانی پنل ارائه‌دهنده معتبر نیست." })
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  activationUrl: z
    .string()
    .trim()
    .url({ message: "نشانی فعال‌سازی معتبر نیست." })
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  activationInstructions: courseText(
    3_000,
    "راهنمای فعال‌سازی بیش از حد بلند است.",
  )
    .optional()
    .default(""),
  published: z.boolean().optional().default(false),
}).refine((value) => value.ageMin <= value.ageMax, {
  message: "بازه‌ی سنی معتبر نیست.",
  path: ["ageMax"],
});

export const coursePublishSchema = z.object({
  published: z.boolean(),
});

const discountTypeSchema = z.enum(["percent", "fixed"]);

const discountBase = {
  type: discountTypeSchema,
  percent: z.coerce.number().int().min(1).max(100).optional(),
  amountToman: z.coerce.number().int().min(1).max(1_000_000_000).optional(),
  maxDiscountToman: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000_000)
    .optional(),
  minOrderToman: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  maxUses: z.coerce.number().int().min(1).max(1_000_000).optional(),
  maxUsesPerUser: z.coerce.number().int().min(1).max(100).default(1),
  courseIds: z.array(uuid()).max(100).optional(),
  firstPurchaseOnly: z.boolean().optional().default(false),
  allowFree: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  startsAt: z.iso.datetime({ offset: true }).optional().nullable(),
  endsAt: z.iso.datetime({ offset: true }).optional().nullable(),
};

function refineDiscountValues(
  value: {
    type: "percent" | "fixed";
    percent?: number;
    amountToman?: number;
    startsAt?: string | null;
    endsAt?: string | null;
  },
  ctx: z.RefinementCtx,
): void {
  if (value.type === "percent" && value.percent === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["percent"],
      message: "درصد تخفیف را وارد کنید.",
    });
  }
  if (value.type === "fixed" && value.amountToman === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["amountToman"],
      message: "مبلغ تخفیف را وارد کنید.",
    });
  }
  if (
    value.startsAt &&
    value.endsAt &&
    new Date(value.startsAt).getTime() >= new Date(value.endsAt).getTime()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "پایان بازه باید بعد از شروع آن باشد.",
    });
  }
}

export const createDiscountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, { message: "کد تخفیف را وارد کنید." })
      .max(40, { message: "کد تخفیف بیش از حد بلند است." })
      .regex(/^[A-Za-z0-9_-]+$/, {
        message: "کد تخفیف فقط می‌تواند شامل حروف، رقم، خط تیره و زیرخط باشد.",
      }),
    ...discountBase,
  })
  .superRefine(refineDiscountValues);

export const updateDiscountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/),
    ...discountBase,
  })
  .superRefine(refineDiscountValues);

export const bulkDiscountSchema = z
  .object({
    prefix: z
      .string()
      .trim()
      .min(2, { message: "پیشوند کد را وارد کنید." })
      .max(24, { message: "پیشوند کد بیش از حد بلند است." })
      .regex(/^[A-Za-z0-9_-]+$/, { message: "پیشوند معتبر نیست." }),
    count: z.coerce.number().int().min(1).max(200),
    ...discountBase,
  })
  .superRefine(refineDiscountValues);

export const blogInputSchema = z.object({
  title: courseText(200, "عنوان نوشته بیش از حد بلند است.").min(3),
  slug: slugSchema,
  excerpt: courseText(500, "خلاصه بیش از حد بلند است.").min(10),
  category: courseText(80, "دسته‌بندی بیش از حد بلند است.").min(1),
  author: courseText(120, "نام نویسنده بیش از حد بلند است.").min(2),
  readMinutes: z.coerce.number().int().min(1).max(90).default(5),
  art: courseText(80, "شناسه‌ی تصویر معتبر نیست.").optional().nullable(),
  body: z
    .string()
    .trim()
    .min(20, { message: "متن نوشته را کامل بنویسید." })
    .max(40_000),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const postStatusSchema = z.object({
  status: z.enum(["draft", "published"]),
});

export const faqInputSchema = z.object({
  question: courseText(300, "پرسش بیش از حد بلند است.").min(3),
  answer: courseText(3_000, "پاسخ بیش از حد بلند است.").min(3),
  isActive: z.boolean().optional().default(true),
});

export const teacherInputSchema = z.object({
  name: fullNameSchema,
  role: courseText(120, "عنوان نقش بیش از حد بلند است.").min(2),
  bio: courseText(2_000, "معرفی بیش از حد بلند است.").min(10),
  initials: z
    .string()
    .trim()
    .min(1, { message: "حروف اختصار را وارد کنید." })
    .max(4, { message: "حروف اختصار بیش از حد بلند است." }),
  accent: z.enum(["lavender", "yellow", "sky", "coral"]).default("lavender"),
  isActive: z.boolean().optional().default(true),
});

export const moveSchema = z.object({
  direction: z.enum(["up", "down"]),
});

export const messageStatusSchema = z.object({
  status: z.enum(["new", "read", "done"]),
});

export const setUserActiveSchema = z.object({
  active: z.boolean(),
  reason: z
    .string()
    .trim()
    .max(500, { message: "دلیل نباید بیشتر از ۵۰۰ نویسه باشد." })
    .optional(),
});

export const footerSettingsSchema = z.object({
  about: z.string().trim().max(1_000).default(""),
  email: z.union([z.literal(""), emailSchema]).default(""),
  phone: z.string().trim().max(30).default(""),
  address: z.string().trim().max(300).default(""),
});

export const trustBadgeSchema = z.object({
  enabled: z.boolean().default(false),
  label: z.string().trim().max(80).default(""),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || value.startsWith("https://"), {
      message: "نشانی نماد باید با https شروع شود.",
    })
    .default(""),
  code: z.string().trim().max(2_000).default(""),
});

export const generalSettingsSchema = z.object({
  fulfillmentSlaHours: z.coerce.number().int().min(1).max(168),
  includeLicenseKeyInEmail: z.boolean().optional().default(false),
  taxPercent: z.coerce
    .number()
    .min(0, { message: "درصد مالیات نمی‌تواند منفی باشد." })
    .max(30, { message: "درصد مالیات نمی‌تواند بیشتر از ۳۰ باشد." })
    .transform((value) => Math.round(value * 10) / 10)
    .default(0),
  footer: footerSettingsSchema,
  trustBadge: trustBadgeSchema,
});

export const auditListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const adminEmailListQuerySchema = z.object({
  status: z.enum(["pending", "sending", "sent", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const orderStatusValues = [
  "pending",
  "awaiting_license",
  "fulfilled",
  "on_hold",
  "failed",
  "cancelled",
  "expired",
  "refunded",
] as const;

export const orderStatusSchema = z.enum(orderStatusValues);
