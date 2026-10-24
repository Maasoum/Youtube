import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Clock3,
  Gift,
  Inbox,
  MessageSquare,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type AdminStats,
  type AuditLogEntry,
  type Order,
} from "@/api";
import { purchaseConfig } from "@/config/purchase";
import { useToast } from "@/context/ToastContext";
import { ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { GiftLicenseDialog } from "@/components/admin/LicenseDialogs";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { StatCard } from "@/components/panel/StatCard";
import { RevenueChart } from "@/components/panel/charts/RevenueChart";
import { StatusDonut, type DonutSlice } from "@/components/panel/charts/StatusDonut";
import { auditActionLabel } from "@/lib/labels";
import {
  formatElapsed,
  formatSlaRemaining,
  hoursSince,
  isQueueOverdue,
  orderQueueAnchor,
} from "@/lib/sla";
import {
  formatNumber,
  formatRelativeTime,
  formatToman,
  toPersianDigits,
} from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminDashboardPage() {
  const { notify } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [queue, setQueue] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [slaHours, setSlaHours] = useState<number>(purchaseConfig.fulfillmentSlaHours);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, queueData, ordersData, logsData, settingsData] =
        await Promise.all([
          adminApi.getStats(),
          adminApi.getFulfillmentQueue(),
          adminApi.listOrders(),
          adminApi.listAuditLogs(6),
          adminApi.getGeneralSettings(),
        ]);
      setStats(statsData);
      setQueue(queueData);
      setAllOrders(ordersData);
      setLogs(logsData);
      setSlaHours(settingsData.fulfillmentSlaHours);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slices = useMemo<DonutSlice[]>(() => {
    const count = (status: Order["status"]) =>
      allOrders.filter((order) => order.status === status).length;
    return [
      { label: "در انتظار لایسنس", value: count("awaiting_license"), color: "#6446E0" },
      { label: "تحویل‌شده", value: count("fulfilled"), color: "#10B981" },
      { label: "در حال بررسی", value: count("on_hold"), color: "#F7C948" },
      { label: "بازگشت وجه", value: count("refunded"), color: "#8B5CF6" },
      {
        label: "سایر",
        value: allOrders.length -
          count("awaiting_license") -
          count("fulfilled") -
          count("on_hold") -
          count("refunded"),
        color: "#C7C4D4",
      },
    ];
  }, [allOrders]);

  const oldestQueue = queue.slice(0, 5);

  if (loading) {
    return (
      <div aria-busy="true">
        <div className="mb-6 h-10 w-64 animate-pulse rounded-full bg-white/80" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
        <div className="mt-4 h-72 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <PanelCard>
        <div className="py-10 text-center">
          <TriangleAlert className="mx-auto size-9 text-red-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ink">داشبورد بارگذاری نشد</p>
          <p className="mt-2 text-xs leading-6 text-muted">
            {error ?? "اطلاعات مدیریت در دسترس نیست."}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/25 px-4 py-2 text-xs font-bold text-primary"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            تلاش دوباره
          </button>
        </div>
      </PanelCard>
    );
  }

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="داشبورد"
        description={`وضعیت امروز فروش و صف تحویل؛ SLA تحویل ${toPersianDigits(slaHours)} ساعت کاری است.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setGiftOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-white px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary-soft/20"
            >
              <Gift className="size-3.5" aria-hidden="true" />
              لایسنس هدیه
            </button>
            <ButtonLink to="/admin/fulfillment" size="sm" arrow>
              صف تحویل
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={Clock3}
          label="در صف تحویل"
          value={toPersianDigits(stats.pendingLicenses)}
          hint={
            stats.overdueFulfillments > 0
              ? `${toPersianDigits(stats.overdueFulfillments)} سفارش از SLA گذشته`
              : "همه‌ی سفارش‌ها در بازه‌ی SLA"
          }
          tone={stats.overdueFulfillments > 0 ? "danger" : "primary"}
          to="/admin/fulfillment"
        />
        <StatCard
          icon={Wallet}
          label="درآمد کل"
          value={formatToman(stats.totalRevenueToman)}
          hint={`${toPersianDigits(stats.todayOrders)} سفارش امروز`}
          tone="success"
        />
        <StatCard
          icon={ReceiptText}
          label="سفارش‌ها"
          value={toPersianDigits(stats.totalOrders)}
          hint={`${toPersianDigits(stats.customers)} مشتری`}
          to="/admin/orders"
        />
        <StatCard
          icon={ShieldCheck}
          label="لایسنس صادرشده"
          value={toPersianDigits(stats.deliveredLicenses)}
          hint="تحویل موفق به کاربر"
        />
        <StatCard
          icon={MessageSquare}
          label="پیام‌های تازه"
          value={toPersianDigits(stats.newMessages)}
          hint="هفت روز گذشته"
          tone={stats.newMessages > 0 ? "accent" : "default"}
          to="/admin/inbox"
        />
      </div>

      {stats.overdueFulfillments > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-start gap-2 text-xs font-bold leading-6 text-red-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {toPersianDigits(stats.overdueFulfillments)} سفارش از SLA تحویل
            گذشته است. این موارد را ابتدا بررسی کنید.
          </p>
          <Link
            to="/admin/fulfillment"
            className="rounded-full bg-white px-3.5 py-2 text-[11px] font-bold text-red-700 shadow-sm transition hover:bg-red-100"
          >
            رفتن به صف
          </Link>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <PanelCard
          className="lg:col-span-3"
          title="روند درآمد"
          description="مجموع پرداخت‌های موفق هفت روز گذشته (بدون بازگشت وجه‌ها)."
        >
          <RevenueChart data={stats.revenueSeries} />
        </PanelCard>
        <PanelCard
          className="lg:col-span-2"
          title="ترکیب سفارش‌ها"
          description="بر اساس آخرین وضعیت ثبت‌شده."
        >
          <StatusDonut slices={slices} totalLabel="سفارش" />
        </PanelCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <PanelCard
          className="lg:col-span-3"
          title="قدیمی‌ترین سفارش‌های صف"
          description="اولویت با سفارش‌هایی است که بیشتر منتظر مانده‌اند."
          action={
            <Link
              to="/admin/fulfillment"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary"
            >
              همه‌ی صف
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {oldestQueue.length === 0 ? (
            <p className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
              صف تحویل خالی است؛ همه‌ی لایسنس‌ها صادر شده‌اند.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {oldestQueue.map((order) => {
                const elapsed = hoursSince(orderQueueAnchor(order));
                const overdue = isQueueOverdue(order, Date.now(), slaHours);
                return (
                  <li key={order.id}>
                    <Link
                      to={`/admin/fulfillment/${order.id}`}
                      className="flex items-center gap-3 py-3 transition hover:opacity-80"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft/30 text-xs font-bold text-primary">
                        {order.customer.fullName.trim().charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink">
                          {order.customer.fullName} — {order.course.title}
                        </p>
                        <p className="mt-1 text-[10px] text-muted">
                          سفارش {toPersianDigits(order.number)} ·{" "}
                          {formatElapsed(elapsed)} در صف
                        </p>
                        {overdue ? (
                          <p className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">
                            {formatSlaRemaining(order, Date.now(), slaHours)}
                          </p>
                        ) : null}
                      </div>
                      <OrderStatusBadge status={order.status} className="hidden sm:inline-flex" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          className="lg:col-span-2"
          title="آخرین اقدام‌ها"
          description="هر اقدام حساس با نام مدیر ثبت می‌شود."
          action={
            <Link to="/admin/audit" className="text-[11px] font-bold text-primary">
              گزارش کامل
            </Link>
          }
        >
          {logs.length === 0 ? (
            <p className="rounded-2xl bg-surface-soft/60 p-4 text-xs text-muted">
              هنوز اقدامی ثبت نشده است.
            </p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="flex gap-2.5">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-ink">
                      {auditActionLabel(log.action)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-5 text-muted">
                      {log.summary}
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted/80">
                      {log.actorName} · {formatRelativeTime(log.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <p className={cn("mt-4 flex items-center justify-center gap-1 text-[10px] text-muted")}>
        <Inbox className="size-3.5" aria-hidden="true" />
        {formatNumber(allOrders.length)} سفارش در سامانه ثبت شده است.
      </p>

      <GiftLicenseDialog
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        onCreated={() => {
          notify("لایسنس هدیه ثبت شد.", "success");
          void load();
        }}
      />
    </div>
  );
}
