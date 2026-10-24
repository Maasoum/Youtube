import argon2 from "argon2";
import { randomToken } from "./crypto.js";

const argonOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argonOptions);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * برای جلوگیری از افشای وجود ایمیل از طریق زمان پاسخ، وقتی کاربر پیدا نشد هم
 * یک بررسی Argon2 انجام می‌شود.
 */
const dummyHashPromise = hashPassword(randomToken(24));

export async function verifyDummyPassword(password: string): Promise<void> {
  const hash = await dummyHashPromise;
  await verifyPassword(hash, password);
}

export async function passwordNeedsRehash(hash: string): Promise<boolean> {
  try {
    return argon2.needsRehash(hash, argonOptions);
  } catch {
    return true;
  }
}
