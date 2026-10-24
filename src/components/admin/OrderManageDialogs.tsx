import { useForm } from "react-hook-form";
import { AlertTriangle, Ban, PauseCircle, RotateCcw } from "lucide-react";
import { adminApi, getErrorMessage, type Order } from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { CheckboxField, InputField, TextareaField } from "@/components/ui/Field";
import { FormAlert } from "@/components/auth/FormAlert";
import { Modal } from "@/components/ui/Modal";
import { zodResolver } from "@/lib/zodResolver";
import { formatToman, toPersianDigits } from "@/lib/format";
import {
  cancelOrderSchema,
  holdOrderSchema,
  refundOrderSchema,
  type CancelOrderFormValues,
  type HoldOrderFormValues,
  type RefundOrderFormValues,
} from "@/lib/validation";

interface DialogProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onUpdated: (order: Order) => void;
}

export function HoldOrderDialog({ order, open, onClose, onUpdated }: DialogProps) {
  const { notify } = useToast();
  const form = useForm<HoldOrderFormValues>({
    resolver: zodResolver(holdOrderSchema),
    defaultValues: { reason: order.onHoldReason ?? "", sendDelayEmail: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await adminApi.holdOrder({ orderId: order.id, ...values });
      notify(
        values.sendDelayEmail
          ? "سفارش در حال بررسی ثبت شد و ایمیل تأخیر ارسال شد."
          : "سفارش در حال بررسی ثبت شد.",
        "success",
      );
      onUpdated(updated);
      onClose();
      form.reset();
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت وضعیت در حال بررسی"
      description="این وضعیت برای وقتی است که اطلاعات خریدار یا لایسنس باید با ارائه‌دهنده هماهنگ شود."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            انصراف
          </Button>
          <Button
            type="submit"
            form="hold-order-form"
            size="sm"
            variant="secondary"
            loading={form.formState.isSubmitting}
            icon={PauseCircle}
          >
            ثبت در حال بررسی
          </Button>
        </>
      }
    >
      <form id="hold-order-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {form.formState.errors.root?.message ? (
          <FormAlert message={form.formState.errors.root.message} />
        ) : null}
        <TextareaField
          label="دلیل توقف و بررسی"
          required
          rows={3}
          placeholder="مثلاً: ایمیل خریدار با ایمیل ثبت‌شده در پنل ارائه‌دهنده یکسان نیست."
          hint="این متن برای همکاران و تاریخچه‌ی سفارش ذخیره می‌شود."
          error={form.formState.errors.reason?.message}
          {...form.register("reason")}
        />
        <CheckboxField
          label="ایمیل اطلاع‌رسانی تأخیر برای کاربر ارسال شود."
          {...form.register("sendDelayEmail")}
        />
      </form>
    </Modal>
  );
}

export function CancelOrderDialog({
  order,
  open,
  onClose,
  onUpdated,
}: DialogProps) {
  const { notify } = useToast();
  const form = useForm<CancelOrderFormValues>({
    resolver: zodResolver(cancelOrderSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await adminApi.cancelOrder({
        orderId: order.id,
        reason: values.reason,
      });
      notify("سفارش لغو شد و ایمیل اطلاع‌رسانی ارسال شد.", "success");
      onUpdated(updated);
      onClose();
      form.reset();
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`لغو سفارش ${toPersianDigits(order.number)}`}
      description="لغو سفارش برگشت‌پذیر نیست؛ برای بازگشت پول از مسیر بازگشت وجه استفاده کنید."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            انصراف
          </Button>
          <Button
            type="submit"
            form="cancel-order-form"
            size="sm"
            variant="danger"
            loading={form.formState.isSubmitting}
            icon={Ban}
          >
            لغو قطعی سفارش
          </Button>
        </>
      }
    >
      <form id="cancel-order-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {form.formState.errors.root?.message ? (
          <FormAlert message={form.formState.errors.root.message} />
        ) : null}
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-6 text-amber-900">
          سفارش {toPersianDigits(order.number)} برای «{order.course.title}» لغو
          می‌شود. اگر پرداختی انجام شده باشد، باید بازگشت وجه به‌صورت جداگانه
          ثبت شود.
        </p>
        <TextareaField
          label="دلیل لغو"
          required
          rows={3}
          placeholder="دلیل لغو برای تاریخچه و پیام به کاربر"
          error={form.formState.errors.reason?.message}
          {...form.register("reason")}
        />
      </form>
    </Modal>
  );
}

export function RefundOrderDialog({
  order,
  open,
  onClose,
  onUpdated,
}: DialogProps) {
  const { notify } = useToast();
  const form = useForm<RefundOrderFormValues>({
    resolver: zodResolver(refundOrderSchema),
    defaultValues: { reason: "", reference: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await adminApi.refundOrder({
        orderId: order.id,
        reason: values.reason,
        reference: values.reference || undefined,
      });
      notify("بازگشت وجه ثبت و به کاربر اطلاع داده شد.", "success");
      onUpdated(updated);
      onClose();
      form.reset();
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت بازگشت وجه دستی"
      description="این عملیات فقط دفتر ثبت داخلی را به‌روزرسانی می‌کند؛ انتقال پول در درگاه انجام می‌شود."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            انصراف
          </Button>
          <Button
            type="submit"
            form="refund-order-form"
            size="sm"
            variant="danger"
            loading={form.formState.isSubmitting}
            icon={RotateCcw}
          >
            ثبت بازگشت وجه
          </Button>
        </>
      }
    >
      <form id="refund-order-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {form.formState.errors.root?.message ? (
          <FormAlert message={form.formState.errors.root.message} />
        ) : null}

        <div className="rounded-2xl bg-surface-soft/70 p-3 text-xs">
          <p className="text-muted">مبلغ قابل بازگشت</p>
          <p className="mt-1 text-base font-bold tabular-nums text-ink">
            {formatToman(order.totalToman)}
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-red-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-[11px] font-bold leading-6">
            بازگشت پول از پنل PayPing انجام می‌شود و لغو لایسنس نزد ارائه‌دهنده
            باید جداگانه با او هماهنگ شود.
          </p>
        </div>

        <TextareaField
          label="دلیل بازگشت وجه"
          required
          rows={3}
          placeholder="دلیل بازگشت وجه برای تاریخچه‌ی سفارش"
          error={form.formState.errors.reason?.message}
          {...form.register("reason")}
        />
        <InputField
          label="شناسه‌ی بازگشت وجه (اختیاری)"
          dirLtr
          mono
          placeholder="PAYPING-REF-1006"
          hint="اگر خالی بماند، شناسه‌ی پیش‌فرض ثبت می‌شود."
          error={form.formState.errors.reference?.message}
          {...form.register("reference")}
        />
        <p className="text-[10px] leading-5 text-muted">
          این متن در گفت‌وگو با کاربر و گزارش اقدامات ثبت می‌شود.
        </p>
      </form>
    </Modal>
  );
}
