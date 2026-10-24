import { useEffect, useState } from "react";
import {
  useForm,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { Save, Tag } from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type Course,
  type CreateDiscountInput,
  type DiscountCode,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { FormAlert } from "@/components/auth/FormAlert";
import { zodResolver } from "@/lib/zodResolver";
import {
  adminDiscountFormSchema,
  type AdminDiscountFormSchemaValues,
  type DiscountBaseFormValues,
} from "@/lib/validation";
import { DiscountFields } from "./DiscountFields";

interface DiscountFormProps {
  discount?: DiscountCode;
  onSaved: (discount: DiscountCode) => void;
}

function toDateInput(value?: string): string {
  return value ? value.slice(0, 10) : "";
}

function toIsoStart(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`).toISOString();
}

function toIsoEnd(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T23:59:59`).toISOString();
}

export function DiscountForm({ discount, onSaved }: DiscountFormProps) {
  const { notify } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  const form = useForm<AdminDiscountFormSchemaValues>({
    resolver: zodResolver(adminDiscountFormSchema),
    defaultValues: {
      code: discount?.code ?? "",
      type: discount?.type ?? "percent",
      percent: discount?.percent ?? 20,
      amountToman: discount?.amountToman ?? 0,
      maxDiscountToman: discount?.maxDiscountToman ?? 0,
      minOrderToman: discount?.minOrderToman ?? 0,
      startsAt: toDateInput(discount?.startsAt),
      expiresAt: toDateInput(discount?.expiresAt),
      maxUses: discount?.maxUses ?? 100,
      maxUsesPerUser: discount?.maxUsesPerUser ?? 1,
      firstPurchaseOnly: discount?.firstPurchaseOnly ?? false,
      allowFree: discount?.allowFree ?? false,
      active: discount?.active ?? true,
      courseIds: discount?.courseIds ?? [],
    },
  });

  useEffect(() => {
    let active = true;
    adminApi
      .listCourses()
      .then((items) => {
        if (active) setCourses(items);
      })
      .catch((caught) => {
        if (active) setCourseError(getErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    const input: CreateDiscountInput = {
      code: values.code,
      type: values.type,
      percent: values.type === "percent" ? values.percent : undefined,
      amountToman: values.type === "fixed" ? values.amountToman : undefined,
      maxDiscountToman:
        values.type === "percent" ? values.maxDiscountToman : undefined,
      minOrderToman: values.minOrderToman,
      maxUses: values.maxUses,
      maxUsesPerUser: values.maxUsesPerUser,
      courseIds: values.courseIds.length > 0 ? values.courseIds : undefined,
      firstPurchaseOnly: values.firstPurchaseOnly,
      allowFree: values.allowFree,
      active: values.active,
      startsAt: toIsoStart(values.startsAt),
      expiresAt: toIsoEnd(values.expiresAt),
    };

    try {
      const saved = discount
        ? await adminApi.updateDiscount({ ...input, code: discount.code })
        : await adminApi.createDiscount(input);
      notify(
        discount ? "کد تخفیف ویرایش شد." : "کد تخفیف ساخته شد.",
        "success",
      );
      onSaved(saved);
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {form.formState.errors.root?.message ? (
        <FormAlert message={form.formState.errors.root.message} />
      ) : null}
      {courseError ? <FormAlert message={courseError} /> : null}

      <section className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary-soft/30 text-primary">
            <Tag className="size-4" aria-hidden="true" />
          </span>
          مشخصات کد
        </h2>
        <div className="mt-4 max-w-sm">
          {discount ? (
            <div>
              <p className="label-base">کد تخفیف</p>
              <p className="rounded-2xl bg-surface-soft/60 px-4 py-3 font-mono text-sm tracking-wider text-ink" dir="ltr">
                {discount.code}
              </p>
              <input type="hidden" {...form.register("code")} />
              <p className="mt-1.5 text-[10px] text-muted">
                کد پس از ساخت قابل تغییر نیست.
              </p>
            </div>
          ) : (
            <InputField
              label="کد تخفیف"
              required
              dirLtr
              mono
              placeholder="BRIGHT30"
              hint="فقط حروف انگلیسی، عدد و خط تیره؛ بین ۳ تا ۲۰ کاراکتر."
              error={form.formState.errors.code?.message}
              {...form.register("code")}
            />
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-bold text-ink">قوانین تخفیف</h2>
        {loadingCourses ? (
          <p className="mb-3 text-[10px] text-muted">در حال دریافت دوره‌ها…</p>
        ) : null}
        <DiscountFields
          register={form.register as unknown as UseFormRegister<DiscountBaseFormValues>}
          errors={form.formState.errors}
          watch={form.watch as unknown as UseFormWatch<DiscountBaseFormValues>}
          courses={courses}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/5 bg-white p-4">
        <p className="text-[10px] leading-5 text-muted">
          تغییرات در گزارش اقدامات ثبت می‌شود.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/admin/discounts" variant="ghost" size="sm">
            انصراف
          </ButtonLink>
          <Button
            type="submit"
            size="sm"
            icon={Save}
            loading={form.formState.isSubmitting}
          >
            {discount ? "ذخیره‌ی تغییرات" : "ساخت کد تخفیف"}
          </Button>
        </div>
      </div>
    </form>
  );
}
