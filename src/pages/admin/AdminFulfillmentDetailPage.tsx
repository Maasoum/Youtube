import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  CircleCheck,
  ExternalLink,
  Gift,
  KeyRound,
  Mail,
  PauseCircle,
  PencilLine,
  Phone,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  ordersApi,
  type Course,
  type LicenseReveal,
  type Order,
} from "@/api";
import { purchaseConfig } from "@/config/purchase";
import { useToast } from "@/context/ToastContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { FulfillmentForm } from "@/components/admin/FulfillmentForm";
import {
  EditLicenseDialog,
  GiftLicenseDialog,
} from "@/components/admin/LicenseDialogs";
import {
  CancelOrderDialog,
  HoldOrderDialog,
  RefundOrderDialog,
} from "@/components/admin/OrderManageDialogs";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { OrderTimeline } from "@/components/panel/OrderTimeline";
import {
  formatElapsed,
  formatSlaRemaining,
  hoursSince,
  isQueueOverdue,
  orderQueueAnchor,
} from "@/lib/sla";
import {
  formatDate,
  formatDateTime,
  formatToman,
  toPersianDigits,
} from "@/lib/format";
import { cn } from "@/lib/cn";

interface DialogState {
  hold: boolean;
  cancel: boolean;
  refund: boolean;
  edit: boolean;
  gift: boolean;
}

const closedDialogs: DialogState = {
  hold: false,
  cancel: false,
  refund: false,
  edit: false,
  gift: false,
};

export function AdminFulfillmentDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { notify } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogs, setDialogs] = useState<DialogState>(closedDialogs);
  const [reveal, setReveal] = useState<LicenseReveal | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [resending, setResending] = useState(false);
  const [delaySending, setDelaySending] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [slaHours, setSlaHours] = useState<number>(purchaseConfig.fulfillmentSlaHours);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const [orderData, courses, settingsData] = await Promise.all([
        ordersApi.get(orderId),
        adminApi.listCourses(),
        adminApi.getGeneralSettings(),
      ]);
      setOrder(orderData);
      setCourse(courses.find((item) => item.id === orderData.course.id) ?? null);
      setSlaHours(settingsData.fulfillmentSlaHours);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = (key: keyof DialogState) =>
    setDialogs((current) => ({ ...current, [key]: true }));
  const closeDialog = (key: keyof DialogState) =>
    setDialogs((current) => ({ ...current, [key]: false }));

  const handleUpdated = (updated: Order) => {
    setOrder(updated);
    setReveal(null);
  };

  const handleReveal = async () => {
    if (!order?.license) return;
    setRevealing(true);
    try {
      setReveal(await ordersApi.revealLicense(order.license.id));
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setRevealing(false);
    }
  };

  const handleResend = async () => {
    if (!order) return;
    setResending(true);
    try {
      const updated = await adminApi.resendLicenseEmail(order.id);
      setOrder(updated);
      notify("ایمیل لایسنس دوباره برای کاربر ارسال شد.", "success");
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setResending(false);
    }
  };

  const handleDelayEmail = async () => {
    if (!order) return;
    setDelaySending(true);
    try {
      await adminApi.sendDelayEmail(order.id);
      notify("ایمیل اطلاع‌رسانی تأخیر ارسال شد.", "success");
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setDelaySending(false);
    }
  };

  const handleResume = async () => {
    if (!order) return;
    setResuming(true);
    try {
      const updated = await adminApi.resumeOrder(order.id);
      setOrder(updated);
      notify("سفارش به صف تحویل بازگشت.", "success");
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setResuming(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-72 animate-pulse rounded-full bg-white/80" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-48 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PanelPageHeader
          title="سفارش پیدا نشد"
          backTo={{ to: "/admin/fulfillment", label: "بازگشت به صف تحویل" }}
        />
        <PanelCard>
          <div className="py-10 text-center">
            <ShieldAlert className="mx-auto size-9 text-muted" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-ink">
              اطلاعات این سفارش در دسترس نیست.
            </p>
            <p className="mt-2 text-xs text-muted">{error}</p>
          </div>
        </PanelCard>
      </div>
    );
  }

  const overdue = isQueueOverdue(order, Date.now(), slaHours);
  const elapsed = hoursSince(orderQueueAnchor(order));
  const canFulfill =
    (order.status === "awaiting_license" || order.status === "on_hold") &&
    !order.license;
  const canHold = order.status === "awaiting_license";
  const canCancel =
    order.status === "awaiting_license" || order.status === "on_hold";
  const canRefund = Boolean(order.paidAt) && order.status !== "refunded";

  return (
    <div className="space-y-5">
      <PanelPageHeader
        eyebrow="صف تحویل"
        title={`سفارش ${toPersianDigits(order.number)}`}
        description={`${order.course.title} — ${
          order.paidAt ? `پرداخت در ${formatDateTime(order.paidAt)}` : "بدون پرداخت"
        }`}
        backTo={{ to: "/admin/fulfillment", label: "بازگشت به صف تحویل" }}
        actions={
          <>
            <ButtonLink
              to={`/admin/orders/${order.id}`}
              variant="secondary"
              size="sm"
              icon={ExternalLink}
            >
              جزئیات سفارش
            </ButtonLink>
            <Button
              variant="secondary"
              size="sm"
              icon={Gift}
              onClick={() => openDialog("gift")}
            >
              لایسنس هدیه
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} />
        {order.source === "gift" ? (
          <span className="chip bg-primary-soft/40 text-primary">هدیه</span>
        ) : null}
        <span
          className={cn(
            "chip text-[10px]",
            overdue
              ? "bg-red-50 text-red-700"
              : "bg-surface-soft text-muted",
          )}
        >
          {overdue ? <TriangleAlert className="size-3" aria-hidden="true" /> : null}
          {formatElapsed(elapsed)} در صف · {formatSlaRemaining(order, Date.now(), slaHours)}
        </span>
        <span className="text-[10px] text-muted">
          SLA: {toPersianDigits(slaHours)} ساعت کاری
        </span>
      </div>

      {order.onHoldReason ? (
        <div className="flex items-start gap-3 rounded-3xl border border-orange-200 bg-orange-50 p-4">
          <PauseCircle className="mt-0.5 size-5 shrink-0 text-orange-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-orange-900">در حال بررسی</p>
            <p className="mt-1 text-xs leading-6 text-orange-900/80">
              {order.onHoldReason}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={PlayCircle}
                loading={resuming}
                onClick={() => void handleResume()}
              >
                پایان بررسی و بازگشت به صف
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={Send}
                loading={delaySending}
                onClick={() => void handleDelayEmail()}
              >
                ارسال ایمیل تأخیر
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {canFulfill ? (
            <PanelCard
              title="ثبت لایسنس"
              description="پس از دریافت کلید از ارائه‌دهنده، آن را اینجا ثبت کنید."
            >
              <FulfillmentForm order={order} onFulfilled={handleUpdated} />
            </PanelCard>
          ) : order.license ? (
            <PanelCard
              title="لایسنس ثبت‌شده"
              description="کلید کامل در فهرست‌ها نمایش داده نمی‌شود؛ برای پشتیبانی می‌توانید آن را درخواست کنید."
            >
              <div className="rounded-2xl bg-ink p-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[10px] text-white/70">
                    <KeyRound className="size-3.5" aria-hidden="true" />
                    کد لایسنس
                  </p>
                  <span className="chip bg-white/10 text-[9px] text-white/80">
                    {order.license.source === "gift" ? "هدیه" : "ارائه‌دهنده"}
                  </span>
                </div>
                <p
                  className="mt-2 font-mono text-lg tracking-[0.18em]"
                  dir="ltr"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {reveal ? reveal.code : "•••• •••• ••••"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleReveal()}
                    disabled={revealing}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11px] font-bold text-primary disabled:opacity-60"
                  >
                    {revealing ? (
                      <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <KeyRound className="size-3.5" aria-hidden="true" />
                    )}
                    {reveal ? "کد نمایش داده شد" : "نمایش برای پشتیبانی"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDialog("edit")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-white/10"
                  >
                    <PencilLine className="size-3.5" aria-hidden="true" />
                    ویرایش لایسنس
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    disabled={resending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
                  >
                    <Mail className="size-3.5" aria-hidden="true" />
                    ارسال دوباره‌ی ایمیل
                  </button>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] text-muted">زمان صدور</dt>
                  <dd className="mt-1 text-ink">{formatDateTime(order.license.issuedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-muted">آخرین ارسال ایمیل</dt>
                  <dd className="mt-1 text-ink">
                    {order.license.emailSentAt
                      ? formatDateTime(order.license.emailSentAt)
                      : "ایمیلی ارسال نشده"}
                  </dd>
                </div>
                {order.license.providerReference ? (
                  <div>
                    <dt className="text-[10px] text-muted">شناسه‌ی مرجع</dt>
                    <dd className="mt-1 font-mono text-[11px] text-ink" dir="ltr">
                      {order.license.providerReference}
                    </dd>
                  </div>
                ) : null}
                {order.license.description ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] text-muted">توضیح برای کاربر</dt>
                    <dd className="mt-1 leading-6 text-ink">
                      {order.license.description}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </PanelCard>
          ) : (
            <PanelCard>
              <div className="py-6 text-center">
                <CircleCheck className="mx-auto size-8 text-emerald-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-ink">
                  این سفارش در وضعیت قابل تحویل نیست.
                </p>
                <p className="mt-1 text-xs text-muted">
                  وضعیت فعلی: {order.status}
                </p>
              </div>
            </PanelCard>
          )}

          <PanelCard title="تاریخچه‌ی سفارش">
            <OrderTimeline events={order.statusHistory} />
          </PanelCard>
        </div>

        <div className="space-y-4">
          <PanelCard title="خریدار">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft/30 text-sm font-bold text-primary">
                {order.customer.fullName.trim().charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {order.customer.fullName}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  سفارش {toPersianDigits(order.number)}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-[11px]">
              <li className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted" aria-hidden="true" />
                <a href={`mailto:${order.customer.email}`} className="truncate text-primary" dir="ltr">
                  {order.customer.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted" aria-hidden="true" />
                <a href={`tel:${order.customer.phone}`} className="text-ink" dir="ltr">
                  {order.customer.phone}
                </a>
              </li>
            </ul>
          </PanelCard>

          <PanelCard title="مشخصات پرداخت">
            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">مبلغ نهایی</dt>
                <dd className="font-bold tabular-nums text-ink">
                  {formatToman(order.totalToman)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">قیمت اصلی</dt>
                <dd className="tabular-nums text-ink">
                  {formatToman(order.originalPriceToman)}
                </dd>
              </div>
              {order.discount ? (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">
                    تخفیف{" "}
                    <span className="font-mono text-[10px]" dir="ltr">
                      {order.discount.code}
                    </span>
                  </dt>
                  <dd className="tabular-nums text-emerald-700">
                    −{formatToman(order.discount.amountToman)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2 border-t border-black/5 pt-2">
                <dt className="text-muted">شناسه‌ی پرداخت</dt>
                <dd className="font-mono text-[10px] text-ink" dir="ltr">
                  {order.paymentRef ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">زمان پرداخت</dt>
                <dd className="text-ink">
                  {order.paidAt ? formatDate(order.paidAt) : "—"}
                </dd>
              </div>
            </dl>
          </PanelCard>

          <PanelCard
            title="ارائه‌دهنده"
            action={
              course ? (
                <a
                  href={course.providerPanelUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"
                >
                  پنل ارائه‌دهنده
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              ) : null
            }
          >
            <p className="text-sm font-bold text-ink">
              {course?.providerName ?? "—"}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-muted">
              برای دریافت کلید یا هماهنگی لغو لایسنس از پنل ارائه‌دهنده استفاده
              کنید.
            </p>
            {order.providerReference ? (
              <p className="mt-2 text-[10px] text-muted">
                شناسه‌ی سفارش نزد ارائه‌دهنده:{" "}
                <span className="font-mono text-ink" dir="ltr">
                  {order.providerReference}
                </span>
              </p>
            ) : null}
          </PanelCard>

          <PanelCard title="اقدام‌ها">
            <div className="flex flex-col gap-2">
              {canHold ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={PauseCircle}
                  onClick={() => openDialog("hold")}
                  fullWidth
                >
                  ثبت در حال بررسی
                </Button>
              ) : null}
              {order.status === "awaiting_license" || order.status === "on_hold" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Send}
                  loading={delaySending}
                  onClick={() => void handleDelayEmail()}
                  fullWidth
                >
                  ارسال ایمیل تأخیر
                </Button>
              ) : null}
              {canRefund ? (
                <Button
                  size="sm"
                  variant="danger"
                  icon={RotateCcw}
                  onClick={() => openDialog("refund")}
                  fullWidth
                >
                  بازگشت وجه دستی
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  size="sm"
                  variant="danger"
                  icon={XCircle}
                  onClick={() => openDialog("cancel")}
                  fullWidth
                >
                  لغو سفارش
                </Button>
              ) : null}
              <Link
                to="/admin/fulfillment"
                className="mt-1 text-center text-[10px] font-bold text-primary underline decoration-primary/30 underline-offset-4"
              >
                بازگشت به صف
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>

      {order.refund ? (
        <div className="rounded-3xl border border-purple-200 bg-purple-50 p-4 text-purple-900">
          <p className="flex items-center gap-2 text-sm font-bold">
            <RotateCcw className="size-4" aria-hidden="true" />
            بازگشت وجه ثبت‌شده
          </p>
          <p className="mt-1 text-xs leading-6">
            {formatToman(order.refund.amountToman)} در{" "}
            {formatDateTime(order.refund.refundedAt)} — شناسه:{" "}
            <span className="font-mono" dir="ltr">
              {order.refund.reference ?? "—"}
            </span>
          </p>
          <p className="mt-1 text-[11px] leading-6 text-purple-900/80">
            دلیل: {order.refund.reason}
          </p>
          <p className="mt-2 rounded-2xl bg-white/70 p-3 text-[10px] leading-6">
            بازگشت پول از پنل PayPing انجام می‌شود و لغو لایسنس نزد ارائه‌دهنده
            باید جداگانه با او هماهنگ شود.
          </p>
        </div>
      ) : null}

      <HoldOrderDialog
        order={order}
        open={dialogs.hold}
        onClose={() => closeDialog("hold")}
        onUpdated={handleUpdated}
      />
      <CancelOrderDialog
        order={order}
        open={dialogs.cancel}
        onClose={() => closeDialog("cancel")}
        onUpdated={handleUpdated}
      />
      <RefundOrderDialog
        order={order}
        open={dialogs.refund}
        onClose={() => closeDialog("refund")}
        onUpdated={handleUpdated}
      />
      <EditLicenseDialog
        order={order}
        open={dialogs.edit}
        onClose={() => closeDialog("edit")}
        onUpdated={handleUpdated}
      />
      <GiftLicenseDialog
        open={dialogs.gift}
        onClose={() => closeDialog("gift")}
        onCreated={() => {
          notify("لایسنس هدیه صادر شد.", "success");
          void load();
        }}
      />
    </div>
  );
}
