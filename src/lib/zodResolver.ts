import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * یک resolver ساده و بدون وابستگی اضافه برای اتصال Zod به react-hook-form.
 * پیام‌های خطای Zod همگی فارسی هستند و مستقیم نمایش داده می‌شوند.
 */
export function zodResolver<TFieldValues extends FieldValues>(
  schema: ZodType<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    type ErrorBag = Record<string | number, unknown>;
    const errors: ErrorBag = {};

    const assign = (path: (string | number)[], message: string, type: string) => {
      if (path.length === 0) {
        errors.root = { type, message, root: { type, message } };
        return;
      }

      let current: ErrorBag = errors;
      for (let index = 0; index < path.length; index += 1) {
        const key = path[index];
        const isLast = index === path.length - 1;

        if (isLast) {
          const existing = current[key];
          if (
            typeof existing === "object" &&
            existing !== null &&
            "message" in existing
          ) {
            return;
          }
          current[key] = {
            type,
            message,
            // برای خطاهای سطح آرایه، برخی فرم‌ها از مسیر root استفاده می‌کنند.
            root: { type, message },
          };
          return;
        }

        const nextKey = path[index + 1];
        const container: unknown = typeof nextKey === "number" ? [] : {};
        if (
          typeof current[key] !== "object" ||
          current[key] === null ||
          "message" in (current[key] as ErrorBag)
        ) {
          current[key] = container;
        }
        current = current[key] as ErrorBag;
      }
    };

    for (const issue of result.error.issues) {
      if (issue.path.length === 0) {
        assign([], issue.message, issue.code);
        continue;
      }
      assign(issue.path, issue.message, issue.code);
    }

    return { values: {}, errors: errors as FieldErrors<TFieldValues> };
  };
}
