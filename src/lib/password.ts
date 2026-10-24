import { toPersianDigits } from "./format";

export type PasswordLevel = "empty" | "weak" | "fair" | "good" | "strong";

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  level: PasswordLevel;
  label: string;
  hint: string;
}

const labels: Record<PasswordLevel, string> = {
  empty: "رمز عبور را وارد کنید",
  weak: "ضعیف",
  fair: "متوسط",
  good: "خوب",
  strong: "قوی",
};

/** ارزیابی ساده و قابل‌پیش‌بینی قدرت رمز؛ فقط برای راهنمایی کاربر. */
export function evaluatePasswordStrength(value: string): PasswordStrength {
  if (!value) {
    return {
      score: 0,
      level: "empty",
      label: labels.empty,
      hint: `حداقل ۸ کاراکتر، شامل حرف و عدد.`,
    };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || (/[a-z]/.test(value) && /[A-Z]/.test(value))) {
    score += 1;
  }

  const levels: PasswordLevel[] = ["weak", "weak", "fair", "good", "strong"];
  const level = levels[Math.max(0, Math.min(4, score))] ?? "weak";

  return {
    score: Math.min(4, score) as PasswordStrength["score"],
    level,
    label: labels[level],
    hint:
      level === "strong"
        ? "ترکیب خوبی است؛ همین را نگه دارید."
        : `برای امنیت بیشتر، ${toPersianDigits(12)} کاراکتر یا بیشتر با علامت‌های ویژه استفاده کنید.`,
  };
}
