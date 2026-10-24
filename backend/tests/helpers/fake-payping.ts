import type {
  PayPingCreateInput,
  PayPingCreateResult,
  PayPingGateway,
  PayPingReport,
  PayPingVerifyInput,
  PayPingVerifyResult,
} from "../../src/services/payping.js";

/**
 * درگاه ساختگی برای آزمون؛ هیچ درخواست شبکه‌ای انجام نمی‌شود و می‌توان
 * خروجی/خطای هر مرحله را از پیش تعیین کرد.
 */
export class FakePayPing implements PayPingGateway {
  createInputs: PayPingCreateInput[] = [];
  verifyInputs: PayPingVerifyInput[] = [];
  reportCodes: string[] = [];

  nextCode = "PAY-TEST-1";
  report: PayPingReport = {
    isPaid: false,
    awaitingVerify: false,
    refId: "R-TEST-1",
    amountToman: 1_000_000,
    clientRefId: null,
    paymentStatus: 5,
  };
  verifyResult: PayPingVerifyResult = {
    alreadyVerified: false,
    amountToman: null,
    cardNumberMasked: "6037-****-****-1234",
    cardHashPan: "hash-pan",
  };

  createError: Error | null = null;
  verifyError: Error | null = null;
  reportError: Error | null = null;

  async createPayment(input: PayPingCreateInput): Promise<PayPingCreateResult> {
    this.createInputs.push(input);
    if (this.createError) throw this.createError;
    return {
      code: this.nextCode,
      paymentUrl: `https://api.payping.test/v2/pay/gotoipg/${this.nextCode}`,
    };
  }

  async verifyPayment(input: PayPingVerifyInput): Promise<PayPingVerifyResult> {
    this.verifyInputs.push(input);
    if (this.verifyError) throw this.verifyError;
    return this.verifyResult;
  }

  async getPaymentReport(code: string): Promise<PayPingReport> {
    this.reportCodes.push(code);
    if (this.reportError) throw this.reportError;
    return this.report;
  }
}
