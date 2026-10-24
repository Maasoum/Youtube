import { authenticator } from "otplib";

authenticator.options = {
  window: 1,
  step: 30,
};

const TOTP_ISSUER = "BrightPaths";

export function generateTotpSecret(): string {
  return authenticator.generateSecret(20);
}

export function buildTotpUri(secret: string, email: string): string {
  return authenticator.keyuri(email, TOTP_ISSUER, secret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    return authenticator.verify({ secret, token: code });
  } catch {
    return false;
  }
}
