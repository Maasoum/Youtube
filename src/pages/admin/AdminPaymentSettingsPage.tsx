import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  PlugZap,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type PaymentSettings,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { FormAlert } from "@/components/auth/FormAlert";
import { zodResolver } from "@/lib/zodResolver";
import {
  paymentTokenSchema,
  type PaymentTokenFormValues,
} from "@/lib/validation";
import { copyText } from "@/lib/clipboard";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminPaymentSettingsPage() {
  const { notify } = useToast();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const tokenForm = useForm<PaymentTokenFormValues>({
    resolver: zodResolver(paymentTokenSchema),
    defaultValues: { token: "" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setSettings(await adminApi.getPaymentSettings());
    } catch (caught) {
      setLoadError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveToken = tokenForm.handleSubmit(async (values) => {
    try {
      const receipt = await adminApi.savePaymentToken(values);
      // توکن کامل بلافاصله از فرم و state پاک می‌شود؛ فقط ماسک می‌ماند.
      tokenForm.reset({ token: "" });
      setShowToken(false);
      setSettings((current) =>
        current
          ? {
              ...current,
              hasToken: receipt.hasToken,
              maskedToken: receipt.maskedToken,
              lastTestedAt: undefined,
              lastTestResult: undefined,
            }
          : current,
      );
      notify(receipt.message, "success");
    } catch (caught) {
      tokenForm.setError("root", { message: getErrorMessage(caught) });
    }
  });

  const toggleEnabled = async () => {
    if (!settings || !settings.hasToken) {
      notify("برای فعال‌سازی، ابتدا توکن دسترسی را ذخیره کنید.", "error");
      return;
    }
    setToggling(true);
    try {
      const updated = await adminApi.setPaymentEnabled(!settings.enabled);
      setSettings(updated);
      notify(
        updated.enabled
          ? "درگاه پرداخت فعال شد."
          : "درگاه پرداخت غیرفعال شد.",
        "success",
      );
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setToggling(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const updated = await adminApi.testPaymentConnection();
      setSettings(updated);
      notify("اتصال آزمایشی درگاه با موفقیت برقرار شد.", "success");
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setTesting(false);
    }
  };

  const copyReturnUrl = async () => {
    if (!settings) return;
    const ok = await copyText(settings.returnUrl);
    if (ok) {
      setCopiedLink(true);
      notify("آدرس بازگشت کپی شد.", "success");
      window.setTimeout(() => setCopiedLink(false), 2000);
    } else {
      notify("کپی خودکار ممکن نشد.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted" role="status">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          در حال دریافت تنظیمات درگاه…
        </div>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div>
        <PanelPageHeader title="تنظیمات درگاه پرداخت" />
        <PanelCard>
          <p className="py-8 text-center text-sm font-bold text-red-700">
            {loadError ?? "تنظیمات درگاه دریافت نشد."}
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

  return (
    <div>
      <PanelPageHeader
        eyebrow="تنظیمات"
        title="درگاه پرداخت"
        description="توکن دسترسی PayPing را یک‌بار ثبت کنید؛ پس از ذخیره فقط نسخه‌ی ماسک‌شده نمایش داده می‌شود و توکن کامل در مرورگر یا adapter باقی نمی‌ماند."
        actions={
          <span
            className={cn(
              "chip text-[10px]",
              settings.enabled
                ? "bg-emerald-50 text-emerald-800"
                : "bg-surface-soft text-muted",
            )}
          >
            <CreditCard className="size-3.5" aria-hidden="true" />
            {settings.enabled ? "درگاه فعال" : "درگاه غیرفعال"}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <PanelCard
            title="توکن دسترسی PayPing"
            description="توکن فقط برای ذخیره‌سازی به adapter ارسال می‌شود و در پاسخ تنها چهار نویسه‌ی آخر برمی‌گردد."
          >
            {settings.hasToken ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <KeyRound className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[10px] text-emerald-800">توکن ذخیره‌شده</p>
                    <code
                      dir="ltr"
                      className="mt-0.5 block font-mono text-sm tracking-[0.2em] text-emerald-900"
                    >
                      {settings.maskedToken}
                    </code>
                  </div>
                </div>
                <span className="chip bg-white text-[9px] text-emerald-700">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  امن
                </span>
              </div>
            ) : (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                هنوز توکنی ذخیره نشده است. تا ذخیره‌ی توکن، امکان فعال‌سازی
                درگاه و تست اتصال وجود ندارد.
              </div>
            )}

            <form onSubmit={saveToken} noValidate className="space-y-4">
              {tokenForm.formState.errors.root?.message ? (
                <FormAlert message={tokenForm.formState.errors.root.message} />
              ) : null}
              <InputField
                label={settings.hasToken ? "جایگزینی توکن دسترسی" : "توکن دسترسی"}
                type={showToken ? "text" : "password"}
                required
                dirLtr
                mono
                autoComplete="new-password"
                placeholder="توکن جدید را وارد کنید"
                error={tokenForm.formState.errors.token?.message}
                hint="حداقل ۱۲ نویسه و بدون فاصله. توکن کامل جایی ذخیره نمی‌شود."
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowToken((current) => !current)}
                    aria-label={showToken ? "مخفی‌کردن توکن" : "نمایش توکن"}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink"
                  >
                    {showToken ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                }
                {...tokenForm.register("token")}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-sm text-[10px] leading-5 text-muted">
                  با ذخیره‌ی توکن جدید، نتیجه‌ی تست قبلی پاک می‌شود.
                </p>
                <Button
                  type="submit"
                  size="sm"
                  loading={tokenForm.formState.isSubmitting}
                >
                  ذخیره‌ی توکن
                </Button>
              </div>
            </form>
          </PanelCard>

          <PanelCard
            title="وضعیت درگاه"
            description="فعال‌سازی فقط پس از ذخیره‌ی توکن ممکن است."
          >
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-soft/50 p-4">
              <div>
                <p className="text-xs font-bold text-ink">فعال‌سازی پرداخت آنلاین</p>
                <p className="mt-1 text-[10px] leading-5 text-muted">
                  {settings.hasToken
                    ? "پس از فعال‌سازی، پرداخت سفارش‌های تازه از درگاه انجام می‌شود."
                    : "ابتدا توکن دسترسی را ذخیره کنید."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                aria-label="فعال‌سازی درگاه پرداخت"
                disabled={!settings.hasToken || toggling}
                onClick={() => void toggleEnabled()}
                className={cn(
                  "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-40",
                  settings.enabled ? "bg-emerald-500" : "bg-black/15",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-6 rounded-full bg-white shadow transition",
                    settings.enabled ? "-translate-x-6" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={PlugZap}
                loading={testing}
                disabled={!settings.hasToken}
                onClick={() => void testConnection()}
              >
                تست اتصال
              </Button>
              {settings.lastTestedAt ? (
                <span
                  className={cn(
                    "chip text-[10px]",
                    settings.lastTestResult === "success"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-700",
                  )}
                >
                  {settings.lastTestResult === "success" ? (
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-3.5" aria-hidden="true" />
                  )}
                  آخرین تست: {formatDateTime(settings.lastTestedAt)}
                </span>
              ) : (
                <span className="text-[10px] text-muted">
                  هنوز تست اتصالی انجام نشده است.
                </span>
              )}
            </div>
          </PanelCard>

          <PanelCard
            title="آدرس بازگشت (returnUrl)"
            description="این نشانی باید در پنل PayPing ثبت شود تا کاربر پس از پرداخت به سایت برگردد."
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Link2
                  className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  readOnly
                  value={settings.returnUrl}
                  dir="ltr"
                  aria-label="آدرس بازگشت درگاه"
                  className="input-base h-11 ps-10 font-mono text-[11px] text-ink"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={copiedLink ? Check : Clipboard}
                onClick={() => void copyReturnUrl()}
              >
                {copiedLink ? "کپی شد" : "کپی"}
              </Button>
            </div>
          </PanelCard>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-primary/10 bg-primary-soft/10 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
              امنیت توکن
            </p>
            <ul className="mt-2 space-y-2 text-[11px] leading-6 text-muted">
              <li>· توکن کامل فقط در لحظه‌ی ذخیره به adapter می‌رسد.</li>
              <li>· در DB نمایشی فقط ماسک چهارنویسه‌ای ذخیره می‌شود.</li>
              <li>· پس از ذخیره، فیلد فرم بلافاصله پاک می‌شود.</li>
              <li>· توکن هرگز در localStorage یا state ماندگار قرار نمی‌گیرد.</li>
            </ul>
          </div>

          <PanelCard title="توکن را از کجا بگیرم؟">
            <ol className="space-y-3 text-[11px] leading-6 text-muted">
              <li className="flex gap-2">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft/40 text-[10px] font-bold text-primary">
                  ۱
                </span>
                وارد پنل PayPing شوید و به بخش «درگاه پرداخت» بروید.
              </li>
              <li className="flex gap-2">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft/40 text-[10px] font-bold text-primary">
                  ۲
                </span>
                در تنظیمات درگاه، «توکن دسترسی» را بسازید یا بازیابی کنید.
              </li>
              <li className="flex gap-2">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft/40 text-[10px] font-bold text-primary">
                  ۳
                </span>
                نشانی بازگشت این صفحه را در پنل PayPing ثبت کنید.
              </li>
              <li className="flex gap-2">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft/40 text-[10px] font-bold text-primary">
                  ۴
                </span>
                توکن را همین‌جا ذخیره و با «تست اتصال» بررسی کنید.
              </li>
            </ol>
            <p className="mt-3 rounded-xl bg-surface-soft/70 p-2.5 text-[9px] leading-5 text-muted">
              این متن راهنمای نمایشی است؛ در نسخه‌ی واقعی می‌تواند به مستندات
              رسمی PayPing پیوند داشته باشد.
            </p>
          </PanelCard>
        </aside>
      </div>
    </div>
  );
}
