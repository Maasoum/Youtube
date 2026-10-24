import type { FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import { CalendarDays, Percent, Sparkles } from "lucide-react";
import type { Course } from "@/api";
import { CheckboxField, InputField } from "@/components/ui/Field";
import { formatDate, formatNumber } from "@/lib/format";
import type { DiscountBaseFormValues } from "@/lib/validation";

interface DiscountFieldsProps {
  register: UseFormRegister<DiscountBaseFormValues>;
  errors: FieldErrors<DiscountBaseFormValues>;
  watch: UseFormWatch<DiscountBaseFormValues>;
  courses: Course[];
}

export function DiscountFields({
  register,
  errors,
  watch,
  courses,
}: DiscountFieldsProps) {
  const type = watch("type");
  const percent = Number(watch("percent") ?? 0);
  const amount = Number(watch("amountToman") ?? 0);
  const startsAt = watch("startsAt");
  const expiresAt = watch("expiresAt");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="discount-type" className="label-base">
            نوع تخفیف
            <span className="ms-1 text-red-500" aria-hidden="true">*</span>
          </label>
          <select id="discount-type" className="input-base" {...register("type")}>
            <option value="percent">درصدی</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
        </div>

        {type === "percent" ? (
          <InputField
            label="درصد تخفیف"
            type="number"
            inputMode="numeric"
            required
            hint={
              percent > 0
                ? `نمونه: ۱۰٪ روی ۱٬۰۰۰٬۰۰۰ تومان = ${formatNumber(Math.round(percent * 1000))} تومان`
                : "بین ۱ تا ۹۰ درصد."
            }
            error={errors.percent?.message}
            {...register("percent")}
          />
        ) : (
          <InputField
            label="مبلغ ثابت تخفیف (تومان)"
            type="number"
            inputMode="numeric"
            required
            hint={
              amount > 0
                ? `معادل ${formatNumber(amount)} تومان`
                : "حداقل ۱٬۰۰۰ تومان."
            }
            error={errors.amountToman?.message}
            {...register("amountToman")}
          />
        )}

        {type === "percent" ? (
          <InputField
            label="سقف تخفیف (تومان)"
            type="number"
            inputMode="numeric"
            required
            hint="صفر یعنی بدون سقف؛ مبلغ نهایی هرگز کمتر از صفر نمی‌شود."
            error={errors.maxDiscountToman?.message}
            {...register("maxDiscountToman")}
          />
        ) : null}

        <InputField
          label="حداقل مبلغ سفارش (تومان)"
          type="number"
          inputMode="numeric"
          required
          hint="صفر یعنی بدون حداقل."
          error={errors.minOrderToman?.message}
          {...register("minOrderToman")}
        />

        <InputField
          label="سقف استفاده‌ی کل"
          type="number"
          inputMode="numeric"
          required
          error={errors.maxUses?.message}
          {...register("maxUses")}
        />
        <InputField
          label="سقف استفاده برای هر کاربر"
          type="number"
          inputMode="numeric"
          required
          error={errors.maxUsesPerUser?.message}
          {...register("maxUsesPerUser")}
        />
      </div>

      <fieldset className="rounded-2xl border border-black/5 bg-surface-soft/30 p-3.5">
        <legend className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-ink">
          <CalendarDays className="size-3.5 text-primary" aria-hidden="true" />
          بازه‌ی اعتبار (اختیاری)
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <InputField
            label="تاریخ شروع"
            type="date"
            lang="fa"
            dirLtr
            hint={startsAt ? `شروع: ${formatDate(startsAt)}` : "خالی یعنی از همین حالا."}
            error={errors.startsAt?.message}
            {...register("startsAt")}
          />
          <InputField
            label="تاریخ پایان"
            type="date"
            lang="fa"
            dirLtr
            hint={expiresAt ? `پایان: ${formatDate(expiresAt)}` : "خالی یعنی بدون پایان."}
            error={errors.expiresAt?.message}
            {...register("expiresAt")}
          />
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-black/5 bg-surface-soft/30 p-3.5">
        <legend className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-ink">
          <Percent className="size-3.5 text-primary" aria-hidden="true" />
          محدودیت دوره
        </legend>
        <p className="mt-2 text-[10px] leading-5 text-muted">
          اگر هیچ دوره‌ای انتخاب نشود، کد برای همه‌ی دوره‌ها معتبر است.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {courses.map((course) => (
            <label
              key={course.id}
              className="flex items-start gap-2 rounded-xl bg-white p-2.5 text-[11px] leading-5 text-ink"
            >
              <input
                type="checkbox"
                value={course.id}
                className="mt-1 size-4 shrink-0 rounded border-black/20 accent-primary"
                {...register("courseIds")}
              />
              <span>
                {course.title}
                {!course.published ? (
                  <span className="ms-1 text-[9px] text-muted">(پیش‌نویس)</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <CheckboxField
          label="فقط برای اولین خرید هر کاربر معتبر باشد."
          {...register("firstPurchaseOnly")}
        />
        <CheckboxField
          label="امکان رایگان‌شدن کامل سفارش وجود داشته باشد (allow_free)."
          {...register("allowFree")}
        />
        <CheckboxField
          label="کد در حال حاضر فعال باشد."
          {...register("active")}
        />
        <p className="flex items-start gap-1.5 text-[10px] leading-5 text-muted">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
          بدون allow_free، مبلغ نهایی هرگز صفر نمی‌شود.
        </p>
      </div>
    </div>
  );
}
