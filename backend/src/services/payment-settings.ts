import { eq } from "drizzle-orm";
import { env, paymentCallbackUrl } from "../config/env.js";
import { db } from "../db/client.js";
import { paymentSettings, type UserRow } from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { decryptString, encryptString, randomToken } from "../lib/crypto.js";
import { AppError, badRequest } from "../lib/errors.js";
import { writeAudit } from "./audit.js";
import {
  PayPingClient,
  PayPingError,
  PAYPING_MIN_AMOUNT_TOMAN,
  type PayPingGateway,
} from "./payping.js";

export interface PaymentSettingsView {
  hasToken: boolean;
  /** فقط بخش ماسک‌شده؛ توکن کامل هرگز در پاسخ نمی‌آید. */
  maskedToken: string;
  enabled: boolean;
  returnUrl: string;
  lastTestedAt: string | null;
  lastTestResult: "success" | "failed" | null;
}

export interface PaymentTokenReceipt {
  message: string;
  maskedToken: string;
  hasToken: boolean;
}

interface SettingsRow {
  tokenEncrypted: string | null;
  tokenLast4: string | null;
  isActive: boolean;
  lastTestedAt: Date | null;
  lastTestResult: string | null;
}

async function loadSettings(executor: AppDb): Promise<SettingsRow | null> {
  const [row] = await executor
    .select({
      tokenEncrypted: paymentSettings.tokenEncrypted,
      tokenLast4: paymentSettings.tokenLast4,
      isActive: paymentSettings.isActive,
      lastTestedAt: paymentSettings.lastTestedAt,
      lastTestResult: paymentSettings.lastTestResult,
    })
    .from(paymentSettings)
    .where(eq(paymentSettings.id, 1))
    .limit(1);

  return row ?? null;
}

function maskToken(row: SettingsRow | null): string {
  if (!row?.tokenEncrypted) return "";
  if (row.tokenLast4) return `••••${row.tokenLast4}`;

  // ردیف‌های قدیمی ممکن است last4 نداشته باشند؛ فقط برای ماسک، آخرین چهار
  // نویسه در حافظه استخراج می‌شود و بازگردانده نمی‌شود.
  try {
    const token = decryptString(row.tokenEncrypted);
    return token.length >= 4 ? `••••${token.slice(-4)}` : "••••";
  } catch {
    return "••••";
  }
}

export function toPaymentSettingsView(row: SettingsRow | null): PaymentSettingsView {
  return {
    hasToken: Boolean(row?.tokenEncrypted),
    maskedToken: maskToken(row),
    enabled: row?.isActive ?? false,
    returnUrl: paymentCallbackUrl,
    lastTestedAt: row?.lastTestedAt?.toISOString() ?? null,
    lastTestResult:
      row?.lastTestResult === "success" || row?.lastTestResult === "failed"
        ? row.lastTestResult
        : null,
  };
}

export async function getPaymentSettingsView(
  executor: AppDb = db,
): Promise<PaymentSettingsView> {
  return toPaymentSettingsView(await loadSettings(executor));
}

function actorOf(user: UserRow): { id: string; name: string } {
  return { id: user.id, name: user.fullName };
}

export async function savePaymentToken(
  params: {
    token: string;
    actor: UserRow;
  },
  executor: AppDb = db,
): Promise<PaymentTokenReceipt> {
  const token = params.token.trim();
  if (token.length < 12 || /\s/.test(token)) {
    throw badRequest(
      "توکن دسترسی باید حداقل ۱۲ نویسه و بدون فاصله باشد.",
      "validation_error",
      { token: "توکن دسترسی باید حداقل ۱۲ نویسه و بدون فاصله باشد." },
    );
  }

  const tokenEncrypted = encryptString(token);
  const tokenLast4 = token.slice(-4);

  await executor
    .insert(paymentSettings)
    .values({
      id: 1,
      tokenEncrypted,
      tokenLast4,
      updatedBy: params.actor.id,
      lastTestedAt: null,
      lastTestResult: null,
    })
    .onConflictDoUpdate({
      target: paymentSettings.id,
      set: {
        tokenEncrypted,
        tokenLast4,
        updatedBy: params.actor.id,
        lastTestedAt: null,
        lastTestResult: null,
      },
    });

  await writeAudit(
    {
      actor: actorOf(params.actor),
      action: "payment.token_saved",
      entityType: "settings",
      entityId: "payment",
      summary: "توکن درگاه پرداخت ذخیره شد (مقدار توکن ثبت نشد).",
    },
    executor,
  );

  return {
    message: "توکن با موفقیت ذخیره شد.",
    maskedToken: `••••${tokenLast4}`,
    hasToken: true,
  };
}

export async function setPaymentEnabled(
  params: {
    enabled: boolean;
    actor: UserRow;
  },
  executor: AppDb = db,
): Promise<PaymentSettingsView> {
  const row = await loadSettings(executor);

  if (params.enabled && !row?.tokenEncrypted) {
    throw badRequest(
      "برای فعال‌سازی درگاه، ابتدا توکن دسترسی را ذخیره کنید.",
      "payment_token_missing",
    );
  }

  if (!row) {
    await executor
      .insert(paymentSettings)
      .values({ id: 1, isActive: false, updatedBy: params.actor.id })
      .onConflictDoNothing();
  }

  await executor
    .update(paymentSettings)
    .set({ isActive: params.enabled, updatedBy: params.actor.id })
    .where(eq(paymentSettings.id, 1));

  await writeAudit(
    {
      actor: actorOf(params.actor),
      action: params.enabled ? "payment.enabled" : "payment.disabled",
      entityType: "settings",
      entityId: "payment",
      summary: params.enabled
        ? "درگاه پرداخت فعال شد."
        : "درگاه پرداخت غیرفعال شد.",
    },
    executor,
  );

  return getPaymentSettingsView(executor);
}

/**
 * تست اتصال فقط یک «کد پرداخت» حداقلی می‌سازد و هیچ تراکنشی را تایید یا
 * تکمیل نمی‌کند؛ کاربر به درگاه هدایت نمی‌شود.
 */
export async function testPaymentConnection(
  params: {
    actor: UserRow;
  },
  executor: AppDb = db,
): Promise<PaymentSettingsView> {
  const row = await loadSettings(executor);
  if (!row?.tokenEncrypted) {
    throw badRequest(
      "برای تست اتصال، ابتدا توکن دسترسی را ذخیره کنید.",
      "payment_token_missing",
    );
  }

  let token: string;
  try {
    token = decryptString(row.tokenEncrypted);
  } catch {
    throw new AppError(
      500,
      "payment_token_unreadable",
      "توکن ذخیره‌شده قابل خواندن نیست؛ آن را دوباره ذخیره کنید.",
    );
  }

  const client = new PayPingClient({ token });

  try {
    await client.createPayment({
      amountToman: PAYPING_MIN_AMOUNT_TOMAN,
      returnUrl: paymentCallbackUrl,
      clientRefId: `test-${randomToken(10)}`,
      payerName: "آزمایش اتصال",
      description: "تست اتصال درگاه؛ بدون تکمیل تراکنش",
    });
  } catch (error) {
    await executor
      .update(paymentSettings)
      .set({ lastTestedAt: new Date(), lastTestResult: "failed" })
      .where(eq(paymentSettings.id, 1));

    await writeAudit(
      {
        actor: actorOf(params.actor),
        action: "payment.test_failed",
        entityType: "settings",
        entityId: "payment",
        summary: "تست اتصال درگاه پرداخت ناموفق بود.",
      },
      executor,
    );

    if (error instanceof PayPingError && error.kind === "invalid_token") {
      throw new AppError(
        422,
        "payment_token_invalid",
        "توکن درگاه پذیرفته نشد؛ توکن را بررسی کنید.",
      );
    }

    throw new AppError(
      502,
      "payment_gateway_unavailable",
      "ارتباط با درگاه برقرار نشد؛ کمی بعد دوباره تلاش کنید.",
    );
  }

  await executor
    .update(paymentSettings)
    .set({ lastTestedAt: new Date(), lastTestResult: "success" })
    .where(eq(paymentSettings.id, 1));

  await writeAudit(
    {
      actor: actorOf(params.actor),
      action: "payment.test_succeeded",
      entityType: "settings",
      entityId: "payment",
      summary: "تست اتصال درگاه پرداخت موفق بود (بدون تکمیل تراکنش).",
    },
    executor,
  );

  return getPaymentSettingsView(executor);
}

/**
 * توکن عملیاتی درگاه: اول payment_settings و در نبود آن env. برای verify
 * لازم نیست درگاه «فعال» باشد؛ پولی که گرفته شده باید قابل تایید بماند.
 */
export async function resolveGatewayToken(
  options: { requireActive: boolean },
  executor: AppDb = db,
): Promise<{ token: string; source: "settings" | "env" } | null> {
  const row = await loadSettings(executor);

  if (options.requireActive && row?.isActive !== true) return null;

  if (row?.tokenEncrypted) {
    try {
      return { token: decryptString(row.tokenEncrypted), source: "settings" };
    } catch {
      return null;
    }
  }

  if (env.PAYPING_TOKEN) {
    return { token: env.PAYPING_TOKEN, source: "env" };
  }

  return null;
}

export async function createPayPingGateway(
  options: { requireActive: boolean },
  executor: AppDb = db,
): Promise<PayPingGateway | null> {
  const resolved = await resolveGatewayToken(options, executor);
  if (!resolved) return null;
  return new PayPingClient({ token: resolved.token });
}

export function paymentUnavailableError(): AppError {
  return new AppError(
    503,
    "payment_not_available",
    "درگاه پرداخت هنوز فعال نشده است؛ به‌زودی فعال می‌شود.",
  );
}
