import { useState } from "react";
import { useForm, type UseFormRegister, type UseFormWatch } from "react-hook-form";
import { Download, Layers, Sparkles } from "lucide-react";
import { adminApi, getErrorMessage, type DiscountCode } from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { FormAlert } from "@/components/auth/FormAlert";
import { DiscountFields } from "@/components/admin/DiscountFields";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { downloadCsv } from "@/lib/csv";
import { describeDiscount } from "@/lib/discount";
import { zodResolver } from "@/lib/zodResolver";
import {
  bulkDiscountSchema,
  type BulkDiscountFormValues,
  type DiscountBaseFormValues,
} from "@/lib/validation";
import { formatDate, toPersianDigits } from "@/lib/format";

function toIsoStart(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function toIsoEnd(value: string): string | undefined {
  return value ? new Date(`${value}T23:59:59`).toISOString() : undefined;
}

export function AdminBulkDiscountPage() {
  const { notify } = useToast();
  const [created, setCreated] = useState<DiscountCode[]>([]);

  const form = useForm<BulkDiscountFormValues>({
    resolver: zodResolver(bulkDiscountSchema),
    defaultValues: {
      prefix: "BRIGHT",
      count: 10,
      type: "percent",
      percent: 20,
      amountToman: 0,
      maxDiscountToman: 300000,
      minOrderToman: 500000,
      startsAt: "",
      expiresAt: "",
      maxUses: 1,
      maxUsesPerUser: 1,
      firstPurchaseOnly: true,
      allowFree: false,
      active: true,
      courseIds: [],
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const codes = await adminApi.bulkCreateDiscounts({
        prefix: values.prefix,
        count: values.count,
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
      });
      setCreated(codes);
      notify(`${toPersianDigits(codes.length)} کد تخفیف ساخته شد.`, "success");
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  const handleCsv = () => {
    downloadCsv(
      `brightpaths-discounts-${created[0]?.code.split("-")[0] ?? "bulk"}`,
      ["کد", "توضیح", "سقف استفاده", "شروع", "پایان"],
      created.map((code) => [
        code.code,
        describeDiscount(code),
        code.maxUses,
        code.startsAt ?? "",
        code.expiresAt ?? "",
      ]),
    );
    notify("فایل CSV کدها ذخیره شد.", "success");
  };

  return (
    <div>
      <PanelPageHeader
        eyebrow="کدهای تخفیف"
        title="ساخت گروهی کد"
        description="با یک پیشوند و قوانین مشترک، چند کد یک‌بارمصرف بسازید و خروجی CSV بگیرید."
        backTo={{ to: "/admin/discounts", label: "بازگشت به کدهای تخفیف" }}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <form onSubmit={onSubmit} noValidate className="space-y-4 xl:col-span-2">
          {form.formState.errors.root?.message ? (
            <FormAlert message={form.formState.errors.root.message} />
          ) : null}

          <PanelCard title="پیشوند و تعداد" description="کد نهایی به شکل PREFIX-XXXX ساخته می‌شود.">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="پیشوند کد"
                required
                dirLtr
                mono
                placeholder="BRIGHT"
                hint="۳ تا ۱۰ کاراکتر انگلیسی یا عدد؛ خط تیره در انتها حذف می‌شود."
                error={form.formState.errors.prefix?.message}
                {...form.register("prefix")}
              />
              <InputField
                label="تعداد کدها"
                type="number"
                inputMode="numeric"
                required
                hint="حداکثر ۵۰ کد در هر مرحله."
                error={form.formState.errors.count?.message}
                {...form.register("count")}
              />
            </div>
            <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-surface-soft/60 p-3 text-[10px] leading-5 text-muted">
              <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
              نمونه‌ی کد:{" "}
              <span className="font-mono text-ink" dir="ltr">
                {form.watch("prefix") || "PREFIX"}-A7K2
              </span>
            </p>
          </PanelCard>

          <PanelCard title="قوانین مشترک">
            <DiscountFields
              register={form.register as unknown as UseFormRegister<DiscountBaseFormValues>}
              errors={form.formState.errors}
              watch={form.watch as unknown as UseFormWatch<DiscountBaseFormValues>}
              courses={[]}
            />
            <p className="mt-3 text-[10px] leading-5 text-muted">
              برای محدودکردن کدها به یک دوره، از صفحه‌ی ویرایش هر کد استفاده
              کنید؛ ساخت گروهی برای همه‌ی دوره‌ها اعمال می‌شود.
            </p>
          </PanelCard>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/5 bg-white p-4">
            <p className="text-[10px] leading-5 text-muted">
              کدها بلافاصله قابل استفاده می‌شوند.
            </p>
            <div className="flex gap-2">
              <ButtonLink to="/admin/discounts" variant="ghost" size="sm">
                انصراف
              </ButtonLink>
              <Button
                type="submit"
                size="sm"
                icon={Layers}
                loading={form.formState.isSubmitting}
              >
                ساخت کدها
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          <PanelCard
            title="خروجی کدها"
            description={
              created.length > 0
                ? `${toPersianDigits(created.length)} کد ساخته شد.`
                : "پس از ساخت، کدها اینجا فهرست می‌شوند."
            }
            action={
              created.length > 0 ? (
                <button
                  type="button"
                  onClick={handleCsv}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  CSV
                </button>
              ) : null
            }
          >
            {created.length === 0 ? (
              <p className="rounded-2xl bg-surface-soft/60 p-4 text-[11px] leading-6 text-muted">
                خروجی شامل کد، توضیح تخفیف، سقف استفاده و بازه‌ی اعتبار است.
              </p>
            ) : (
              <ul className="max-h-96 space-y-1.5 overflow-y-auto">
                {created.map((code) => (
                  <li
                    key={code.code}
                    className="flex items-center justify-between gap-2 rounded-xl bg-surface-soft/50 px-3 py-2"
                  >
                    <span className="font-mono text-xs font-bold text-ink" dir="ltr">
                      {code.code}
                    </span>
                    <span className="text-[9px] text-muted">
                      {code.expiresAt
                        ? `تا ${formatDate(code.expiresAt)}`
                        : "بدون پایان"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>

          <PanelCard title="یادآوری">
            <ul className="space-y-2 text-[10px] leading-5 text-muted">
              <li>هر کد فقط تا سقف تعیین‌شده قابل استفاده است.</li>
              <li>کدها پس از ساخت از همین صفحه در فهرست کدهای تخفیف دیده می‌شوند.</li>
              <li>برای غیرفعال‌کردن سریع، از فهرست کدها استفاده کنید.</li>
            </ul>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
