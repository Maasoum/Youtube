import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle, KeyRound, ShieldAlert } from "lucide-react";
import {
  ApiError,
  adminApi,
  getErrorMessage,
  type Order,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  InputField,
  TextareaField,
} from "@/components/ui/Field";
import { FormAlert } from "@/components/auth/FormAlert";
import { zodResolver } from "@/lib/zodResolver";
import {
  fulfillmentSchema,
  type FulfillmentFormValues,
} from "@/lib/validation";
import { toPersianDigits } from "@/lib/format";

interface FulfillmentFormProps {
  order: Order;
  onFulfilled: (order: Order) => void;
}

export function FulfillmentForm({ order, onFulfilled }: FulfillmentFormProps) {
  const { notify } = useToast();
  const [duplicate, setDuplicate] = useState<{
    message: string;
    values: FulfillmentFormValues;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FulfillmentFormValues>({
    resolver: zodResolver(fulfillmentSchema),
    defaultValues: {
      licenseCode: "",
      description: "",
      providerReference: order.providerReference ?? "",
      notifyUser: true,
    },
  });

  const submit = async (
    values: FulfillmentFormValues,
    confirmDuplicate: boolean,
  ) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await adminApi.fulfillLicense({
        orderId: order.id,
        licenseCode: values.licenseCode,
        description: values.description || undefined,
        providerReference: values.providerReference || undefined,
        notifyUser: values.notifyUser,
        confirmDuplicate,
      });
      setDuplicate(null);
      form.reset();
      notify(
        values.notifyUser
          ? "لایسنس ثبت و ایمیل اطلاع‌رسانی برای کاربر ارسال شد."
          : "لایسنس ثبت شد؛ ایمیل اطلاع‌رسانی ارسال نشد.",
        "success",
      );
      onFulfilled(updated);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "license_duplicate") {
        setDuplicate({ message: caught.message, values });
        return;
      }
      setErrorMessage(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = form.handleSubmit((values) => submit(values, false));

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-primary/10 bg-primary-soft/10 p-3.5">
        <p className="text-[11px] leading-6 text-ink">
          کد لایسنس را دقیقاً همان‌طور که از پنل ارائه‌دهنده دریافت کرده‌اید
          وارد کنید. پس از ثبت، وضعیت سفارش {toPersianDigits(order.number)} به
          «تحویل‌شده» تغییر می‌کند.
        </p>
      </div>

      <form id="fulfillment-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {errorMessage ? <FormAlert message={errorMessage} /> : null}

        <InputField
          label="کد لایسنس"
          icon={KeyRound}
          required
          dirLtr
          mono
          placeholder="BP-XXXX-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          error={form.formState.errors.licenseCode?.message}
          hint="کلید کامل فقط یک‌بار برای کاربر نمایش داده می‌شود؛ آن را با دقت بررسی کنید."
          {...form.register("licenseCode")}
        />

        <TextareaField
          label="توضیح تکمیلی برای کاربر (اختیاری)"
          rows={3}
          placeholder="مثلاً: نام کاربری کودک را پیش از فعال‌سازی بسازید."
          error={form.formState.errors.description?.message}
          {...form.register("description")}
        />

        <InputField
          label="شناسه‌ی مرجع ارائه‌دهنده (اختیاری)"
          dirLtr
          mono
          placeholder="PRV-1002-8842"
          error={form.formState.errors.providerReference?.message}
          hint="برای پیگیری بعدی نزد ارائه‌دهنده‌ی محتوا."
          {...form.register("providerReference")}
        />

        <CheckboxField
          label="ایمیل و اعلان «لایسنس شما آماده است» برای کاربر ارسال شود."
          {...form.register("notifyUser")}
        />

        {duplicate ? (
          <div
            role="alert"
            className="rounded-2xl border border-amber-300 bg-amber-50 p-4"
          >
            <p className="flex items-start gap-2 text-xs font-bold leading-6 text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              هشدار: کلید تکراری
            </p>
            <p className="mt-1.5 text-[11px] leading-6 text-amber-900/90">
              {duplicate.message} پیش از تأیید، کد را با پنل ارائه‌دهنده مقایسه
              کنید. ثبت کلید تکراری می‌تواند باعث شود دو خریدار یک کد را دریافت
              کنند.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void submit(duplicate.values, true)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-900 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-amber-800 disabled:opacity-60"
              >
                <ShieldAlert className="size-3.5" aria-hidden="true" />
                با وجود تکراری بودن، ثبت کن
              </button>
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="rounded-full border border-amber-300 bg-white px-4 py-2 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100"
              >
                اصلاح کد
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
          <p className="text-[10px] leading-5 text-muted">
            ثبت این اقدام در گزارش اقدامات پنل ذخیره می‌شود.
          </p>
          <Button
            type="submit"
            size="sm"
            loading={submitting}
            disabled={Boolean(duplicate)}
            icon={KeyRound}
          >
            {form.watch("notifyUser")
              ? "ثبت و اطلاع‌رسانی به کاربر"
              : "ثبت لایسنس"}
          </Button>
        </div>
      </form>
    </div>
  );
}
