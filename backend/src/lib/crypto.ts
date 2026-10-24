import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "../config/env.js";

const masterKey = Buffer.from(env.ENCRYPTION_KEY, "base64");

/**
 * کلید AES از کلید اصلی مشتق می‌شود تا استفاده‌های مختلف، کلید یکسانی نداشته
 * باشند. شناسه‌ی نسخه داخل ciphertext ذخیره می‌شود و در AAD هم قرار می‌گیرد.
 */
const aesKey = createHmac("sha256", masterKey)
  .update("brightpaths:aes-256-gcm:v1")
  .digest();

const fingerprintKey = createHmac("sha256", masterKey)
  .update("brightpaths:license-fingerprint:v1")
  .digest();

const IV_BYTES = 12;
const TAG_BYTES = 16;

function toBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function encryptString(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv, {
    authTagLength: TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(env.ENCRYPTION_KEY_ID, "utf8"));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    env.ENCRYPTION_KEY_ID,
    toBase64Url(iv),
    toBase64Url(tag),
    toBase64Url(ciphertext),
  ].join(".");
}

export function decryptString(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4) {
    throw new Error("ساختار داده‌ی رمزنگاری‌شده معتبر نیست.");
  }

  const [keyId, ivPart, tagPart, cipherPart] = parts;
  if (!keyId || !ivPart || !tagPart || !cipherPart) {
    throw new Error("ساختار داده‌ی رمزنگاری‌شده معتبر نیست.");
  }

  if (keyId !== env.ENCRYPTION_KEY_ID) {
    throw new Error("نسخه‌ی کلید رمزنگاری پشتیبانی نمی‌شود.");
  }

  const iv = fromBase64Url(ivPart);
  const tag = fromBase64Url(tagPart);
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("داده‌ی رمزنگاری‌شده معتبر نیست.");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", aesKey, iv, {
      authTagLength: TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(keyId, "utf8"));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(fromBase64Url(cipherPart)),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    // پیام خطای رمزنگاری نباید جزئیات محرمانه را افشا کند.
    throw new Error("رمزگشایی داده ممکن نشد.");
  }
}

export function encryptJson(value: unknown): string {
  return encryptString(JSON.stringify(value));
}

export function decryptJson<T>(payload: string): T {
  return JSON.parse(decryptString(payload)) as T;
}

/** اثر انگشت یک‌طرفه برای تشخیص کلید تکراری، بدون ذخیره‌ی کلید خام. */
export function fingerprint(value: string): string {
  return createHmac("sha256", fingerprintKey)
    .update(value.normalize("NFKC").trim().toUpperCase(), "utf8")
    .digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** توکن‌های تصادفی با آنتروپی بالا برای ذخیره‌سازی فقط هش SHA-256 می‌شوند. */
export function tokenHash(token: string): string {
  return createHmac("sha256", masterKey)
    .update(`token-hash:${token}`, "utf8")
    .digest("hex");
}
