import { z } from "zod";
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
    percent: z
      .number({ invalid_type_error: "درصد تخفیف را وارد کنید." })
      .int("درصد تخفیف باید عدد صحیح باشد.")
      .min(5, "درصد تخفیف نباید کمتر از ۵ باشد.")
      .max(90, "درصد تخفیف نباید بیشتر از ۹۰ باشد."),
    maxUses: z
      .number({ invalid_type_error: "سقف استفاده را وارد کنید." })
      .int("سقف استفاده باید عدد صحیح باشد.")
      .min(1, "سقف استفاده نباید کمتر از ۱ باشد.")
      .max(10000, "سقف استفاده نباید بیشتر از ۱۰٬۰۰۰ باشد."),
  })
  .strict();

export const contactMessageSchema = z.object({
  name: fullNameSchema,
  email: emailSchema,
  message: z
    .string()
    .trim()
    .min(10, "پیام شما باید حداقل ۱۰ کاراکتر باشد.")
    .max(800, "پیام شما نمی‌تواند بیشتر از ۸۰۰ کاراکتر باشد."),
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

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
export type LicenseFormValues = z.infer<typeof licenseSchema>;
export type AdminDiscountFormValues = z.infer<typeof adminDiscountSchema>;
export type ContactMessageFormValues = z.infer<typeof contactMessageSchema>;
