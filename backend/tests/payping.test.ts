import { describe, expect, it } from "vitest";
import {
  PayPingClient,
  PayPingError,
  PAYPING_BASE_URL,
  type PayPingErrorKind,
} from "../src/services/payping.js";

interface Call {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
}

function clientWith(
  responses: Array<{ status: number; body?: unknown }>,
  calls: Call[],
): PayPingClient {
  let index = 0;
  const fetchImpl = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    const response = responses[index] ?? { status: 500, body: {} };
    index += 1;
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body:
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return new Response(
      response.body === undefined ? "" : JSON.stringify(response.body),
      {
        status: response.status,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  return new PayPingClient({ token: "secret-token-value", fetchImpl });
}

async function expectKind(
  promise: Promise<unknown>,
  kind: PayPingErrorKind,
): Promise<PayPingError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(PayPingError);
    const paypingError = error as PayPingError;
    expect(paypingError.kind).toBe(kind);
    expect(paypingError.message).not.toContain("secret-token-value");
    return paypingError;
  }
  throw new Error("expected PayPingError");
}

describe("PayPingClient (v2)", () => {
  it("ساخت پرداخت را مطابق مستندات می‌فرستد", async () => {
    const calls: Call[] = [];
    const client = clientWith([{ status: 200, body: { code: "pay-123" } }], calls);

    const result = await client.createPayment({
      amountToman: 1_000_000,
      returnUrl: "https://example.com/api/v1/payments/callback",
      clientRefId: "BP-1",
      payerIdentity: "user@example.com",
      payerName: "کاربر",
      description: "سفارش ۱",
    });

    expect(result.code).toBe("pay-123");
    expect(result.paymentUrl).toBe(
      `${PAYPING_BASE_URL}/v2/pay/gotoipg/pay-123`,
    );

    const call = calls[0];
    expect(call?.url).toBe(`${PAYPING_BASE_URL}/v2/pay`);
    expect(call?.method).toBe("POST");
    expect(call?.headers.get("Authorization")).toBe(
      "Bearer secret-token-value",
    );
    expect(call?.body).toMatchObject({
      amount: 1_000_000,
      returnUrl: "https://example.com/api/v1/payments/callback",
      clientRefId: "BP-1",
      payerIdentity: "user@example.com",
      payerName: "کاربر",
    });
  });

  it("مبلغ verify را به تومان و از سمت سرور می‌فرستد", async () => {
    const calls: Call[] = [];
    const client = clientWith(
      [
        {
          status: 200,
          body: {
            amount: 1_000_000,
            cardNumber: "6037-****-1234",
            cardHashPan: "hash",
          },
        },
      ],
      calls,
    );

    const result = await client.verifyPayment({
      refId: "R-1",
      amountToman: 1_000_000,
    });

    expect(result).toMatchObject({
      alreadyVerified: false,
      amountToman: 1_000_000,
      cardNumberMasked: "6037-****-1234",
    });
    expect(calls[0]?.url).toBe(`${PAYPING_BASE_URL}/v2/pay/verify`);
    expect(calls[0]?.body).toEqual({ refId: "R-1", amount: 1_000_000 });
  });

  it("۴۰۹ با کد ۱۱۰ را «قبلاً تاییدشده» می‌داند", async () => {
    const calls: Call[] = [];
    const client = clientWith(
      [{ status: 409, body: { metaData: { code: 110 } } }],
      calls,
    );

    const result = await client.verifyPayment({
      refId: "R-1",
      amountToman: 1_000_000,
    });
    expect(result.alreadyVerified).toBe(true);
  });

  it("۲۰۲ را «در انتظار تایید» می‌داند", async () => {
    const client = clientWith([{ status: 202, body: {} }], []);
    await expectKind(
      client.verifyPayment({ refId: "R-1", amountToman: 1_000_000 }),
      "pending_verification",
    );
  });

  it("کد خطای ۴۷ را مغایرت مبلغ می‌داند", async () => {
    const client = clientWith(
      [{ status: 400, body: { "47": "مبلغ تراکنش مغایرت دارد" } }],
      [],
    );
    await expectKind(
      client.verifyPayment({ refId: "R-1", amountToman: 1_000_000 }),
      "amount_mismatch",
    );
  });

  it("خطای ۵xx را قابل‌تلاش‌مجدد می‌داند", async () => {
    const client = clientWith([{ status: 502, body: {} }], []);
    await expectKind(
      client.verifyPayment({ refId: "R-1", amountToman: 1_000_000 }),
      "server",
    );
  });

  it("خطای شبکه را امن گزارش می‌کند", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("network down");
    }) as typeof fetch;
    const client = new PayPingClient({
      token: "secret-token-value",
      fetchImpl,
    });

    await expectKind(
      client.createPayment({
        amountToman: 1_000,
        returnUrl: "https://example.com/cb",
        clientRefId: "x",
      }),
      "network",
    );
  });

  it("گزارش تراکنش را می‌خواند و وضعیت انتظار تایید را تشخیص می‌دهد", async () => {
    const calls: Call[] = [];
    const client = clientWith(
      [
        {
          status: 200,
          body: {
            isPaid: false,
            paymentStatus: 5,
            refId: "R-9",
            amount: 1_000_000,
            clientRefId: "BP-9",
          },
        },
      ],
      calls,
    );

    const report = await client.getPaymentReport("pay-9");
    expect(report).toMatchObject({
      isPaid: false,
      awaitingVerify: true,
      refId: "R-9",
      amountToman: 1_000_000,
      clientRefId: "BP-9",
    });
    expect(calls[0]?.url).toBe(`${PAYPING_BASE_URL}/v1/report/pay-9`);
  });

  it("توکن در URL یا پیام خطا ظاهر نمی‌شود", async () => {
    const calls: Call[] = [];
    const client = clientWith(
      [{ status: 401, body: { message: "secret-token-value" } }],
      calls,
    );

    const error = await expectKind(
      client.createPayment({
        amountToman: 1_000,
        returnUrl: "https://example.com/cb",
        clientRefId: "x",
      }),
      "invalid_token",
    );

    expect(calls[0]?.url).not.toContain("secret-token-value");
    expect(error.message).not.toContain("secret-token-value");
  });
});
