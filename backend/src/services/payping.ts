/**
 * کلاینت PayPing (نسخه‌ی ۲) مطابق مستندات رسمی https://docs.payping.ir
 *
 * - واحد همه‌ی مبالغ «تومان» است (مستندات صریحاً همین را می‌گوید).
 * - احراز هویت: هدر `Authorization: Bearer <TOKEN>`.
 * - ساخت پرداخت: `POST {base}/v2/pay` با amount/returnUrl/clientRefId/... که
 *   در پاسخ `{ code }` می‌دهد؛ هدایت به `{base}/v2/pay/gotoipg/{code}`.
 * - بازگشت از درگاه: پی‌پینگ به returnUrl به‌صورت POST با
 *   `application/x-www-form-urlencoded` و فیلدهای `code`, `refid`, `clientrefid`,
 *   `cardnumber`, `cardhashpan` اطلاعات می‌فرستد. برخی پیاده‌سازی‌ها این
 *   پارامترها را به‌صورت query هم برمی‌گردانند؛ هر دو پشتیبانی می‌شود.
 * - تایید نهایی: `POST {base}/v2/pay/verify` با `{ refId, amount }`.
 *   طبق مستندات جدید، پاسخ ۲۰۰ یعنی تایید موفق و ۲۰۲/۵۰۲ یعنی «هنوز نهایی
 *   نشده؛ دوباره verify کنید». کد ۴۰۹ یا کد داخلی ۱۱۰/۱۵ یعنی تراکنش قبلاً
 *   تایید شده است.
 * - استعلام: `GET {base}/v1/report/{code}` برای مغایرت‌گیری و بررسی وضعیت
 *   پیش از منقضی‌کردن سفارش.
 *
 * توکن فقط در حافظه‌ی این کلاس می‌ماند و در هیچ پیام خطا، لاگ یا پاسخی
 * بازتاب داده نمی‌شود.
 */

export const PAYPING_BASE_URL = "https://api.payping.ir";
export const PAYPING_MIN_AMOUNT_TOMAN = 1_000;
export const PAYPING_MAX_AMOUNT_TOMAN = 50_000_000;

export type PayPingErrorKind =
  | "invalid_token"
  | "invalid_request"
  | "invalid_ref"
  | "amount_mismatch"
  | "already_verified"
  | "not_found"
  | "pending_verification"
  | "network"
  | "server"
  | "invalid_response";

export class PayPingError extends Error {
  readonly kind: PayPingErrorKind;
  readonly httpStatus: number | null;
  readonly providerCode: number | null;

  constructor(
    kind: PayPingErrorKind,
    options: { httpStatus?: number | null; providerCode?: number | null } = {},
  ) {
    // پیام ثابت و بدون هیچ داده‌ی درگاه؛ متن خطای ارائه‌دهنده ممکن است شامل
    // جزئیات تراکنش باشد و ذخیره یا نمایش داده نمی‌شود.
    super("ارتباط با درگاه پرداخت ناموفق بود.");
    this.name = "PayPingError";
    this.kind = kind;
    this.httpStatus = options.httpStatus ?? null;
    this.providerCode = options.providerCode ?? null;
  }
}

export interface PayPingCreateInput {
  amountToman: number;
  returnUrl: string;
  clientRefId: string;
  payerIdentity?: string | null;
  payerName?: string | null;
  description?: string | null;
}

export interface PayPingCreateResult {
  code: string;
  paymentUrl: string;
}

export interface PayPingVerifyInput {
  refId: string;
  amountToman: number;
}

export interface PayPingVerifyResult {
  alreadyVerified: boolean;
  amountToman: number | null;
  cardNumberMasked: string | null;
  cardHashPan: string | null;
}

export interface PayPingReport {
  isPaid: boolean;
  awaitingVerify: boolean;
  refId: string | null;
  amountToman: number | null;
  clientRefId: string | null;
  paymentStatus: number | null;
}

export interface PayPingGateway {
  createPayment(input: PayPingCreateInput): Promise<PayPingCreateResult>;
  verifyPayment(input: PayPingVerifyInput): Promise<PayPingVerifyResult>;
  getPaymentReport(code: string): Promise<PayPingReport>;
}

export interface PayPingClientOptions {
  token: string;
  baseUrl?: string;
  /** فقط برای آزمون‌ها؛ در تولید fetch سراسری Node استفاده می‌شود. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function toText(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export class PayPingClient implements PayPingGateway {
  readonly #token: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: PayPingClientOptions) {
    this.#token = options.token;
    this.#baseUrl = (options.baseUrl ?? PAYPING_BASE_URL).replace(/\/+$/, "");
    this.#fetch = options.fetchImpl ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 12_000;
  }

  #headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.#token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async #request(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown },
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    let response: Response;
    try {
      response = await this.#fetch(`${this.#baseUrl}${path}`, {
        method: init.method,
        headers: this.#headers(),
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      throw new PayPingError("network");
    }

    const text = await response.text().catch(() => "");
    let body: Record<string, unknown> = {};
    if (text.trim() !== "") {
      try {
        const parsed: unknown = JSON.parse(text);
        if (isRecord(parsed)) body = parsed;
      } catch {
        // بدنه‌ی غیر-JSON را نگه نمی‌داریم؛ ممکن است حاوی جزئیات باشد.
      }
    }

    return { status: response.status, body };
  }

  /** کد عددی خطای پی‌پینگ، از `metaData.code` یا کلیدهای عددی بدنه. */
  #providerCode(body: Record<string, unknown>): number | null {
    const metadata = isRecord(body.metaData) ? body.metaData : null;
    const direct = toInt(metadata?.code) ?? toInt(body.code);
    if (direct !== null) return direct;

    for (const key of Object.keys(body)) {
      const parsed = toInt(key);
      if (parsed !== null) return parsed;
    }
    return null;
  }

  #error(status: number, body: Record<string, unknown>): PayPingError {
    const providerCode = this.#providerCode(body);

    if (providerCode === 15 || providerCode === 110) {
      return new PayPingError("already_verified", { httpStatus: status, providerCode });
    }
    if (providerCode === 47) {
      return new PayPingError("amount_mismatch", { httpStatus: status, providerCode });
    }
    if (providerCode === 44) {
      return new PayPingError("invalid_ref", { httpStatus: status, providerCode });
    }
    if (providerCode === 26) {
      return new PayPingError("not_found", { httpStatus: status, providerCode });
    }
    if (providerCode === 16) {
      return new PayPingError("pending_verification", {
        httpStatus: status,
        providerCode,
      });
    }

    if (status === 401 || status === 403) {
      return new PayPingError("invalid_token", { httpStatus: status, providerCode });
    }
    if (status === 404) {
      return new PayPingError("not_found", { httpStatus: status, providerCode });
    }
    if (status === 400) {
      return new PayPingError("invalid_request", { httpStatus: status, providerCode });
    }
    if (status >= 500) {
      return new PayPingError("server", { httpStatus: status, providerCode });
    }
    return new PayPingError("invalid_response", { httpStatus: status, providerCode });
  }

  #paymentUrl(code: string): string {
    return `${this.#baseUrl}/v2/pay/gotoipg/${encodeURIComponent(code)}`;
  }

  async createPayment(input: PayPingCreateInput): Promise<PayPingCreateResult> {
    const { status, body } = await this.#request("/v2/pay", {
      method: "POST",
      body: {
        amount: input.amountToman,
        returnUrl: input.returnUrl,
        clientRefId: input.clientRefId,
        ...(input.payerIdentity ? { payerIdentity: input.payerIdentity } : {}),
        ...(input.payerName ? { payerName: input.payerName } : {}),
        ...(input.description ? { description: input.description } : {}),
      },
    });

    if (status !== 200 && status !== 201) {
      throw this.#error(status, body);
    }

    const code = toText(body.code);
    if (!code) {
      throw new PayPingError("invalid_response", { httpStatus: status });
    }

    return { code, paymentUrl: this.#paymentUrl(code) };
  }

  async verifyPayment(input: PayPingVerifyInput): Promise<PayPingVerifyResult> {
    const { status, body } = await this.#request("/v2/pay/verify", {
      method: "POST",
      body: { refId: input.refId, amount: input.amountToman },
    });

    if (status === 202) {
      // طبق مستندات جدید یعنی نتیجه هنوز نهایی نشده است.
      throw new PayPingError("pending_verification", { httpStatus: status });
    }

    if (status === 409 && this.#providerCode(body) === 110) {
      return {
        alreadyVerified: true,
        amountToman: null,
        cardNumberMasked: null,
        cardHashPan: null,
      };
    }

    if (status !== 200) {
      const error = this.#error(status, body);
      if (error.kind === "already_verified") {
        return {
          alreadyVerified: true,
          amountToman: toInt(body.amount),
          cardNumberMasked: toText(body.cardNumber),
          cardHashPan: toText(body.cardHashPan),
        };
      }
      throw error;
    }

    return {
      alreadyVerified: false,
      amountToman: toInt(body.amount),
      cardNumberMasked: toText(body.cardNumber),
      cardHashPan: toText(body.cardHashPan),
    };
  }

  async getPaymentReport(code: string): Promise<PayPingReport> {
    const { status, body } = await this.#request(
      `/v1/report/${encodeURIComponent(code)}`,
      { method: "GET" },
    );

    if (status !== 200) {
      throw this.#error(status, body);
    }

    const paymentStatus = toInt(body.paymentStatus);
    return {
      isPaid: toBoolean(body.isPaid),
      // ۵ یعنی «کاربر از درگاه برگشته و منتظر تایید پذیرنده است».
      awaitingVerify: paymentStatus === 5,
      refId: toText(body.refId),
      amountToman: toInt(body.amount),
      clientRefId: toText(body.clientRefId),
      paymentStatus,
    };
  }
}
