import "dotenv/config";
import { z } from "zod";

const booleanEnv = (defaultValue: boolean) =>
  z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => {
      if (value === undefined) return defaultValue;
      return value === "true" || value === "1";
    });

const encryptionKey = z.string().refine(
  (value) => {
    try {
      return Buffer.from(value, "base64").length === 32;
    } catch {
      return false;
    }
  },
  { message: "ENCRYPTION_KEY باید دقیقاً ۳۲ بایت base64 باشد." },
);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3_000),
    HOST: z.string().min(1).default("0.0.0.0"),
    APP_URL: z
      .string()
      .url()
      .transform((value) => value.replace(/\/+$/, "")),
    /**
     * نشانی عمومی خود API برای ساخت returnUrl درگاه. اگر API و فرانت روی یک
     * دامنه باشند، همان APP_URL کافی است.
     */
    PUBLIC_API_URL: z
      .string()
      .url()
      .transform((value) => value.replace(/\/+$/, ""))
      .optional(),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine(
        (value) =>
          value.startsWith("postgres://") ||
          value.startsWith("postgresql://"),
        { message: "DATABASE_URL باید نشانی PostgreSQL باشد." },
      ),
    SESSION_SECRET: z
      .string()
      .min(32, { message: "SESSION_SECRET باید حداقل ۳۲ نویسه باشد." }),
    ENCRYPTION_KEY: encryptionKey,
    ENCRYPTION_KEY_ID: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,16}$/)
      .default("v1"),
    ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
    ADMIN_ALERT_EMAIL: z.string().trim().toLowerCase().email(),
    /** فقط برای seed؛ پس از ساخت ادمین می‌توانید از env حذف کنید. */
    ADMIN_PASSWORD: z.string().min(12).max(128).optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
    SMTP_SECURE: booleanEnv(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().min(3).optional(),
    PAYPING_TOKEN: z.string().min(1).optional(),
    TRUST_PROXY: booleanEnv(false),
    COOKIE_SECURE: booleanEnv(
      (process.env.NODE_ENV ?? "development") === "production",
    ),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(336),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .superRefine((value, context) => {
    if (value.SMTP_HOST && !value.SMTP_FROM) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_FROM"],
        message: "وقتی SMTP_HOST تنظیم شده است، SMTP_FROM الزامی است.",
      });
    }
    if (value.NODE_ENV === "production" && !value.COOKIE_SECURE) {
      context.addIssue({
        code: "custom",
        path: ["COOKIE_SECURE"],
        message: "در محیط production کوکی نشست باید Secure باشد.",
      });
    }
  });

/**
 * در فایل .env.example همه‌ی کلیدها بدون مقدار هستند؛ پس رشته‌ی خالی باید
 * مثل «تنظیم‌نشده» رفتار کند تا مقدارهای پیش‌فرض اعمال شوند.
 */
const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, raw]) => [
      key,
      typeof raw === "string" && raw.trim() === "" ? undefined : raw,
    ]),
  );
};

const parsed = z.preprocess(emptyToUndefined, envSchema).safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  // فقط نام متغیرها و پیام اعتبارسنجی؛ هیچ مقدار محیطی چاپ نمی‌شود.
  process.stderr.write(`پیکربندی محیط نامعتبر است:\n${details}\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const appOrigin = new URL(env.APP_URL).origin;
export const publicApiUrl = env.PUBLIC_API_URL ?? env.APP_URL;
export const paymentCallbackUrl = `${publicApiUrl}/api/v1/payments/callback`;
export const sessionTtlMs = env.SESSION_TTL_HOURS * 60 * 60 * 1000;
