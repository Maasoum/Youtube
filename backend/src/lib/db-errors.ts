/**
 * خطاهای لایه‌ی پایگاه داده (node-postgres / PGlite) ممکن است مستقیم باشند
 * یا داخل `cause` بسته‌بندی شوند (Drizzle 0.45+). این فایل تنها جای خواندن
 * کد خطا و نام constraint است تا هر سرویس رفتار یکسان داشته باشد.
 */
interface PgErrorLike {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
}

function unwrap(error: unknown, depth = 0): PgErrorLike | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as PgErrorLike;
  if (typeof candidate.code === "string") return candidate;
  if (depth < 4 && candidate.cause !== undefined) {
    return unwrap(candidate.cause, depth + 1);
  }
  return candidate;
}

export function isUniqueViolation(error: unknown): boolean {
  return unwrap(error)?.code === "23505";
}

/** نام constraint یکتای نقض‌شده یا null اگر خطا از نوع دیگری است. */
export function uniqueConstraint(error: unknown): string | null {
  const found = unwrap(error);
  if (!found || found.code !== "23505") return null;
  return typeof found.constraint === "string" ? found.constraint : "";
}
