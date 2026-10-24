import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import { paymentCallbackUrl, publicApiUrl } from "../src/config/env.js";
import { hashIp } from "../src/lib/ip.js";
import { requestMeta } from "../src/services/auth.js";

describe("privacy helpers", () => {
  it("IP را فقط به‌صورت هش پایدار برمی‌گرداند", () => {
    const ip = "192.168.10.24";
    const hashed = hashIp(ip);

    expect(hashed).toHaveLength(32);
    expect(hashed).not.toContain(ip);
    expect(hashed).not.toContain("192");
    expect(hashIp(ip)).toBe(hashed);
    expect(hashIp("10.0.0.1")).not.toBe(hashed);
  });

  it("متادیتای نشست و گزارش مدیر فقط هش IP را نگه می‌دارد", () => {
    const request = {
      ip: "198.51.100.7",
      headers: { "user-agent": "vitest" },
    } as unknown as FastifyRequest;

    const meta = requestMeta(request);
    expect(meta.ip).toBe(hashIp("198.51.100.7"));
    expect(meta.ip).not.toContain("198.51.100.7");
    expect(meta.ip).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("آدرس بازگشت درگاه از PUBLIC_API_URL ساخته می‌شود", () => {
    expect(publicApiUrl).toBe("http://localhost:3000");
    expect(paymentCallbackUrl).toBe(
      "http://localhost:3000/api/v1/payments/callback",
    );
  });
});
