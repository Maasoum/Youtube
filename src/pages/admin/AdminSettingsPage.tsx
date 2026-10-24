import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  Clock3,
  Loader2,
  Percent,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type GeneralSettings,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  InputField,
  TextareaField,
} from "@/components/ui/Field";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { FormAlert } from "@/components/auth/FormAlert";
import { zodResolver } from "@/lib/zodResolver";
import {
  generalSettingsSchema,
  type GeneralSettingsFormValues,
} from "@/lib/validation";
import { purchaseConfig } from "@/config/purchase";
import { brand } from "@/config/brand";
import { formatDateTime } from "@/lib/format";

const defaults: GeneralSettingsFormValues = {
  fulfillmentSlaHours: purchaseConfig.fulfillmentSlaHours,
  includeLicenseKeyInEmail: false,
  taxPercent: 0,
  footer: {
    about: brand.description,
    email: brand.supportEmail,
    phone: "02191000000",
    address: "تهران، خیابان ولیعصر، پلاک ۱۲",
  },
  trustBadge: {
    enabled: false,
    label: "نماد اعتماد الکترونیکی",
    url: "https://trust.brightpaths.example",
    code: "",
  },
};

function toValues(settings: GeneralSettings): GeneralSettingsFormValues {
  return {
    fulfillmentSlaHours: settings.fulfillmentSlaHours,
    includeLicenseKeyInEmail: settings.includeLicenseKeyInEmail,
    taxPercent: settings.taxPercent,
    footer: settings.footer,
    trustBadge: settings.trustBadge,
  };
}

export function AdminSettingsPage() {
  const { notify } = useToast();
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: defaults,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminApi.getGeneralSettings();
      setSettings(data);
      form.reset(toValues(data));
    } catch (caught) {
      setLoadError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = form.handleSubmit(async (values) => {
    try {
      const updated = await adminApi.updateGeneralSettings(values);
      setSettings(updated);
      form.reset(toValues(updated));
      notify("تنظیمات عمومی ذخیره شد.", "success");
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted" role="status">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          در حال دریافت تنظیمات…
        </div>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div>
        <PanelPageHeader title="تنظیمات عمومی" />
        <PanelCard>
          <p className="py-8 text-center text-sm font-bold text-red-700">
            {loadError ?? "تنظیمات دریافت نشد."}
          </p>
          <div className="text-center">
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              تلاش دوباره
            </Button>
          </div>
        </PanelCard>
      </div>
    );
  }

  const errors = form.formState.errors;

  return (
    <div>
      <PanelPageHeader
        eyebrow="تنظیمات"
        title="تنظیمات عمومی"
        description="مهلت تحویل، سیاست ایمیل لایسنس، مالیات و اطلاعات فوتر را از یک‌جا مدیریت کنید. تغییر SLA روی محاسبه‌ی دیرکرد صف تحویل اثر می‌گذارد."
        actions={
          <Button
            size="sm"
            icon={Save}
            type="submit"
            form="general-settings-form"
            loading={form.formState.isSubmitting}
          >
            ذخیره‌ی تنظیمات
          </Button>
        }
      />

      <form
        id="general-settings-form"
        onSubmit={save}
        noValidate
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="space-y-4">
          {errors.root?.message ? <FormAlert message={errors.root.message} /> : null}

          <PanelCard
            title="تحویل لایسنس"
            description="این مقدار مبنای هشدار دیرکرد در صف تحویل است."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="SLA تحویل (ساعت)"
                type="number"
                inputMode="numeric"
                min={1}
                max={168}
                required
                icon={Clock3}
                error={errors.fulfillmentSlaHours?.message}
                hint="عدد بین ۱ تا ۱۶۸؛ پیش‌فرض ۲۴ ساعت."
                {...form.register("fulfillmentSlaHours")}
              />
              <div className="rounded-2xl bg-surface-soft/60 p-3 text-[10px] leading-5 text-muted">
                <p className="font-bold text-ink">پیش‌فرض اولیه</p>
                <p className="mt-1">
                  {purchaseConfig.fulfillmentSlaHours} ساعت کاری. سفارش‌های
                  قدیمی‌تر از این مقدار با نشان هشدار در صف تحویل جدا می‌شوند.
                </p>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="ایمیل لایسنس"
            description="پیش‌فرض امن: کلید در ایمیل درج نمی‌شود."
          >
            <div className="space-y-4">
              <CheckboxField
                label={
                  <span>
                    کلید کامل لایسنس در ایمیل تحویل درج شود.
                    <span className="mt-1 block text-[10px] text-red-600">
                      روشن‌کردن این گزینه کلید را در صندوق ایمیل کاربر نگه
                      می‌دارد؛ پیشنهاد ما خاموش ماندن آن است.
                    </span>
                  </span>
                }
                {...form.register("includeLicenseKeyInEmail")}
              />
              {form.watch("includeLicenseKeyInEmail") ? (
                <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  با فعال‌بودن این گزینه، کلید به تاریخچه‌ی ایمیل اضافه می‌شود و
                  پاک‌کردن آن از صندوق کاربر خارج از کنترل ماست.
                </p>
              ) : null}
            </div>
          </PanelCard>

          <PanelCard
            title="مالیات"
            description="درصد مالیات بر ارزش افزوده؛ پیش‌فرض صفر است."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="درصد مالیات"
                type="number"
                inputMode="decimal"
                min={0}
                max={30}
                step="0.1"
                icon={Percent}
                error={errors.taxPercent?.message}
                hint="در محاسبه‌ی فاکتورهای آینده استفاده می‌شود."
                {...form.register("taxPercent")}
              />
              <div className="rounded-2xl bg-surface-soft/60 p-3 text-[10px] leading-5 text-muted">
                <p className="font-bold text-ink">یادآوری</p>
                <p className="mt-1">
                  این درصد روی سفارش‌های تازه اعمال می‌شود و در تسویه‌حساب،
                  رسید و جزئیات سفارش نمایش داده می‌شود؛ سفارش‌های قبلی تغییر
                  نمی‌کنند.
                </p>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="اطلاعات فوتر" description="متن معرفی و راه‌های تماس در فوتر سایت.">
            <div className="grid gap-4">
              <TextareaField
                label="معرفی کوتاه"
                rows={3}
                error={errors.footer?.about?.message}
                {...form.register("footer.about")}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="ایمیل پشتیبانی"
                  dirLtr
                  error={errors.footer?.email?.message}
                  {...form.register("footer.email")}
                />
                <InputField
                  label="شماره تماس"
                  dirLtr
                  error={errors.footer?.phone?.message}
                  {...form.register("footer.phone")}
                />
              </div>
              <InputField
                label="نشانی"
                error={errors.footer?.address?.message}
                {...form.register("footer.address")}
              />
            </div>
          </PanelCard>

          <PanelCard
            title="نماد اعتماد"
            description="در صورت فعال‌بودن، جایگاه نماد در فوتر با عنوان و پیوند شما نمایش داده می‌شود."
          >
            <div className="grid gap-4">
              <CheckboxField
                label="نماد اعتماد در فوتر نمایش داده شود."
                {...form.register("trustBadge.enabled")}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="عنوان نماد"
                  error={errors.trustBadge?.label?.message}
                  {...form.register("trustBadge.label")}
                />
                <InputField
                  label="نشانی نماد (https)"
                  dirLtr
                  error={errors.trustBadge?.url?.message}
                  {...form.register("trustBadge.url")}
                />
              </div>
              <TextareaField
                label="کد جایگزاری نماد (اختیاری)"
                dir="ltr"
                rows={3}
                className="font-mono text-xs"
                hint="این کد فقط ذخیره می‌شود و در نسخه‌ی واقعی در فوتر جای‌گذاری خواهد شد؛ در این نمایش اجرا نمی‌شود."
                error={errors.trustBadge?.code?.message}
                {...form.register("trustBadge.code")}
              />
            </div>
          </PanelCard>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-primary/10 bg-primary-soft/10 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
              تغییرهای اثرگذار
            </p>
            <ul className="mt-2 space-y-2 text-[11px] leading-6 text-muted">
              <li>· SLA روی برچسب دیرکرد صف تحویل اثر می‌گذارد.</li>
              <li>· درج کلید در ایمیل، پیش‌فرض امن سایت را تغییر می‌دهد.</li>
              <li>· درصد مالیات روی مبلغ نهایی سفارش‌های تازه اثر می‌گذارد.</li>
              <li>· اطلاعات فوتر در صفحه‌های عمومی دیده می‌شود.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-black/5 bg-white p-4 text-[10px] leading-5 text-muted shadow-sm">
            <p className="flex items-center gap-1.5 font-bold text-ink">
              <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
              آخرین ذخیره
            </p>
            <p className="mt-1">
              {settings.updatedAt ? formatDateTime(settings.updatedAt) : "هنوز ذخیره‌ای ثبت نشده"}
            </p>
            <p className="mt-3">
              هر تغییر در گزارش اقدامات با نام شما ثبت می‌شود.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
