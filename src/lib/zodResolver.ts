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

    const errors: FieldErrors<TFieldValues> = {};

    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key !== "string") continue;
      if (key in errors) continue;
      Object.assign(errors, {
        [key]: { type: issue.code, message: issue.message },
      });
    }

    return { values: {}, errors };
  };
}
