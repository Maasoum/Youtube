import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import {
  ApiError,
  getErrorMessage,
  ordersApi,
  type Order,
} from "@/api";
import { formatNumber, toPersianDigits } from "@/lib/format";
import { zodResolver } from "@/lib/zodResolver";
import { licenseSchema, type LicenseFormValues } from "@/lib/validation";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/auth/FormAlert";

interface LicenseModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export function LicenseModal({ order, onClose, onSuccess }: LicenseModalProps) {
  const { notify } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: { licenseCode: "" },
  });

  useEffect(() => {
    if (order) {
      reset({ licenseCode: "" });
      setFormError(null);
    }
  }, [order, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!order) return;
    setFormError(null);
    try {
      const updated = await ordersApi.addLicense({
        orderId: order.id,
        licenseCode: values.licenseCode,
      });
      notify("لایسنس ثبت شد و ایمیل برای مشتری ارسال شد.", "success");
      onSuccess(updated);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.field === "licenseCode") {
        setError("licenseCode", { message: error.message });
      } else {
        setFormError(getErrorMessage(error));
      }
    }
  });

  return (
    <Modal
      open={order !== null}
      onClose={onClose}
      title="ثبت لایسنس سفارش"
      description="کد را از سرویس‌دهنده دریافت کنید و اینجا ثبت کنید. با ثبت کد، ایمیل تحویل به‌صورت خودکار برای مشتری ارسال می‌شود."
    >
      {order ? (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="rounded-2xl bg-surface-soft/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-primary">
                سفارش {toPersianDigits(order.number)}
              </span>
              <span className="text-[11px] text-muted">
                {formatNumber(order.totalToman)} تومان
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-ink">{order.course.title}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
              <span>{order.customer.fullName}</span>
              <span dir="ltr" className="ltr-inline font-mono">
                {order.customer.email}
              </span>
            </div>
          </div>

          {formError ? <FormAlert message={formError} /> : null}

          <InputField
            label="کد لایسنس دریافتی"
            placeholder="مثلاً BP-XXXX-XXXX"
            error={errors.licenseCode?.message}
            hint="فقط حروف انگلیسی، عدد و خط تیره؛ بین ۶ تا ۴۸ کاراکتر."
            dirLtr
            mono
            required
            autoFocus
            {...register("licenseCode")}
          />

          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <p className="m-0 text-[11px] leading-6 text-emerald-900/80">
              پس از ثبت، وضعیت سفارش به «لایسنس تحویل شد» تغییر می‌کند و کد در
              داشبورد کاربر نمایش داده می‌شود.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-black/5 bg-white p-3.5 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <KeyRound className="size-4 text-primary" aria-hidden="true" />
              لایسنس دائمی، تک‌کاربره
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Mail className="size-4 text-primary" aria-hidden="true" />
              ارسال به {order.customer.email}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              انصراف
            </Button>
            <Button type="submit" loading={isSubmitting} arrow>
              {isSubmitting ? "در حال ثبت…" : "ثبت لایسنس و ارسال ایمیل"}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
