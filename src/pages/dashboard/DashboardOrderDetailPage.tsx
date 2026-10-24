import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CreditCard,
  FileText,
  Info,
  PauseCircle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import {
  getErrorMessage,
  ordersApi,
  paymentsApi,
  type Order,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { LicenseCard } from "@/components/dashboard/LicenseCard";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { OrderTimeline } from "@/components/panel/OrderTimeline";
import { formatDate, formatDateTime, formatToman, toPersianDigits } from "@/lib/format";

export function DashboardOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      setOrder(await ordersApi.get(orderId));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      await paymentsApi.start(order.id);
      navigate(`/payment/callback?order=${order.id}&state=success`);
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await ordersApi.cancel(order.id);
      setOrder(updated);
      setCancelOpen(false);
      notify("سفارش لغو شد.", "success");
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-full bg-white/80" />
        <div className="h-48 animate-pulse rounded-3xl bg-white/70" />
        <div className="h-64 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PanelPageHeader
          title="سفارش پیدا نشد"
          backTo={{ to: "/dashboard/orders", label: "بازگشت به سفارش‌ها" }}
        />
        <PanelCard>
          <div className="py-10 text-center">
            <ShieldAlert className="mx-auto size-9 text-muted" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-ink">
              این سفارش در دسترس نیست.
            </p>
            <p className="mt-1 text-xs leading-6 text-muted">
              {error ?? "ممکن است سفارش حذف شده باشد یا به حساب دیگری تعلق داشته باشد."}
            </p>
            <ButtonLink to="/dashboard/orders" className="mt-5" size="sm">
              فهرست سفارش‌ها
            </ButtonLink>
          </div>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PanelPageHeader
        eyebrow="جزئیات سفارش"
        title={order.course.title}
        description={`سفارش ${toPersianDigits(order.number)} — ثبت‌شده در ${formatDate(order.createdAt)}`}
        backTo={{ to: "/dashboard/orders", label: "بازگشت به سفارش‌ها" }}
        actions={
          <>
            {order.paidAt ? (
              <ButtonLink
                to={`/dashboard/orders/${order.id}/receipt`}
                variant="secondary"
                size="sm"
                icon={FileText}
              >
                رسید قابل چاپ
              </ButtonLink>
            ) : null}
            {order.status === "pending" ? (
              <>
                <Button
                  size="sm"
                  icon={CreditCard}
                  loading={paying}
                  onClick={() => void handlePay()}
                >
                  پرداخت سفارش
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setCancelOpen(true)}
                >
                  لغو سفارش
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            {order.source === "gift" ? (
              <span className="chip bg-primary-soft/40 text-primary">هدیه</span>
            ) : null}
          </div>
          <div className="text-end">
            <p className="text-[10px] text-muted">مبلغ سفارش</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-ink">
              {formatToman(order.totalToman)}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 border-t border-black/5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[10px] text-muted">دوره</dt>
            <dd className="mt-1 text-xs font-bold text-ink">
              {order.course.title}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted">تحویل‌گیرنده</dt>
            <dd className="mt-1 text-xs text-ink">
              {order.customer.fullName} · {order.customer.email}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted">زمان پرداخت</dt>
            <dd className="mt-1 text-xs text-ink">
              {order.paidAt ? formatDateTime(order.paidAt) : "پرداخت نشده"}
            </dd>
          </div>
          {order.paymentRef ? (
            <div>
              <dt className="text-[10px] text-muted">شناسه‌ی پرداخت</dt>
              <dd className="mt-1 font-mono text-[11px] text-ink" dir="ltr">
                {order.paymentRef}
              </dd>
            </div>
          ) : null}
          {order.discount ? (
            <div>
              <dt className="text-[10px] text-muted">کد تخفیف</dt>
              <dd className="mt-1 text-xs text-ink">
                <span className="font-mono" dir="ltr">
                  {order.discount.code}
                </span>{" "}
                — {formatToman(order.discount.amountToman)} تخفیف
              </dd>
            </div>
          ) : null}
          {order.taxToman ? (
            <div>
              <dt className="text-[10px] text-muted">مالیات بر ارزش افزوده</dt>
              <dd className="mt-1 text-xs text-ink">
                {formatToman(order.taxToman)}
                {order.taxPercent
                  ? ` (${toPersianDigits(order.taxPercent)}٪)`
                  : ""}
              </dd>
            </div>
          ) : null}
          {order.providerReference ? (
            <div>
              <dt className="text-[10px] text-muted">شناسه‌ی ارائه‌دهنده</dt>
              <dd className="mt-1 font-mono text-[11px] text-ink" dir="ltr">
                {order.providerReference}
              </dd>
            </div>
          ) : null}
        </dl>

        {order.note ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-soft/70 p-3 text-[11px] leading-6 text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            یادداشت شما: {order.note}
          </p>
        ) : null}
      </PanelCard>

      {order.status === "on_hold" ? (
        <div className="flex items-start gap-3 rounded-3xl border border-orange-200 bg-orange-50 p-4">
          <PauseCircle className="mt-0.5 size-5 shrink-0 text-orange-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-orange-900">در حال بررسی</p>
            <p className="mt-1 text-xs leading-6 text-orange-900/80">
              {order.onHoldReason ??
                "سفارش شما برای بررسی بیشتر موقتاً متوقف شده است."}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-orange-900/70">
              نیازی به ثبت سفارش دوباره نیست؛ در صورت نیاز با شما تماس می‌گیریم.
            </p>
          </div>
        </div>
      ) : null}

      {order.refund ? (
        <div className="flex items-start gap-3 rounded-3xl border border-purple-200 bg-purple-50 p-4">
          <RotateCcw className="mt-0.5 size-5 shrink-0 text-purple-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-purple-900">بازگشت وجه ثبت شد</p>
            <p className="mt-1 text-xs leading-6 text-purple-900/80">
              مبلغ {formatToman(order.refund.amountToman)} در{" "}
              {formatDate(order.refund.refundedAt)} بازگردانده شد.
            </p>
            <p className="mt-1 text-[10px] leading-5 text-purple-900/70">
              دلیل: {order.refund.reason}
            </p>
          </div>
        </div>
      ) : null}

      {order.status === "fulfilled" && order.license ? (
        <LicenseCard order={order} />
      ) : null}

      <PanelCard title="تاریخچه‌ی وضعیت" description="همه‌ی تغییرهای این سفارش، از ثبت تا امروز.">
        <OrderTimeline events={order.statusHistory} />
      </PanelCard>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="لغو سفارش"
        description="اگر سفارش را لغو کنید، امکان پرداخت این سفارش از بین می‌رود."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>
              بازگشت
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancelling}
              onClick={() => void handleCancel()}
            >
              بله، لغو کن
            </Button>
          </>
        }
      >
        <p className="text-xs leading-7 text-muted">
          سفارش {toPersianDigits(order.number)} برای دوره‌ی «
          {order.course.title}» لغو می‌شود. بعد از لغو می‌توانید دوباره از صفحه‌ی
          دوره اقدام کنید.
        </p>
      </Modal>
    </div>
  );
}
