import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  Gift,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type Course,
  type Order,
} from "@/api";
import { purchaseConfig } from "@/config/purchase";
import { useToast } from "@/context/ToastContext";
import { ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { GiftLicenseDialog } from "@/components/admin/LicenseDialogs";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import {
  formatElapsed,
  formatSlaRemaining,
  hoursSince,
  isQueueOverdue,
  orderQueueAnchor,
} from "@/lib/sla";
import { formatDateTime, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

type QueueFilter = "all" | "awaiting_license" | "on_hold" | "overdue";

export function AdminFulfillmentPage() {
  const { notify } = useToast();
  const [queue, setQueue] = useState<Order[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [giftOpen, setGiftOpen] = useState(false);
  const [slaHours, setSlaHours] = useState<number>(purchaseConfig.fulfillmentSlaHours);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [queueData, coursesData, settingsData] = await Promise.all([
        adminApi.getFulfillmentQueue(),
        adminApi.listCourses(),
        adminApi.getGeneralSettings(),
      ]);
      setQueue(queueData);
      setCourses(coursesData);
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

  const providerMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((course) => map.set(course.id, course));
    return map;
  }, [courses]);

  const overdueCount = queue.filter((order) => isQueueOverdue(order, Date.now(), slaHours)).length;
  const holdCount = queue.filter((order) => order.status === "on_hold").length;
  const awaitingCount = queue.filter(
    (order) => order.status === "awaiting_license",
  ).length;

  const filtered = useMemo(() => {
    switch (filter) {
      case "awaiting_license":
        return queue.filter((order) => order.status === "awaiting_license");
      case "on_hold":
        return queue.filter((order) => order.status === "on_hold");
      case "overdue":
        return queue.filter((order) => isQueueOverdue(order, Date.now(), slaHours));
      default:
        return queue;
    }
  }, [queue, filter]);

  const filters: Array<{ value: QueueFilter; label: string; count: number }> = [
    { value: "all", label: "همه", count: queue.length },
    { value: "awaiting_license", label: "در انتظار لایسنس", count: awaitingCount },
    { value: "on_hold", label: "در حال بررسی", count: holdCount },
    { value: "overdue", label: "از SLA گذشته", count: overdueCount },
  ];

  const columns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "سفارش",
      cell: (order) => (
        <div>
          <p className="font-bold tabular-nums text-ink">
            {toPersianDigits(order.number)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            {order.paidAt ? formatDateTime(order.paidAt) : formatDateTime(order.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "خریدار",
      cell: (order) => (
        <div>
          <p className="max-w-40 truncate font-bold text-ink">
            {order.customer.fullName}
          </p>
          <p className="mt-0.5 max-w-44 truncate text-[10px] text-muted" dir="ltr">
            {order.customer.email}
          </p>
        </div>
      ),
    },
    {
      id: "course",
      header: "دوره و ارائه‌دهنده",
      cell: (order) => {
        const course = providerMap.get(order.course.id);
        return (
          <div>
            <p className="max-w-48 truncate text-ink">{order.course.title}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {course?.providerName ?? "—"}
            </p>
          </div>
        );
      },
    },
    {
      id: "sla",
      header: `زمان در صف (SLA ${toPersianDigits(slaHours)} ساعت)`,
      cell: (order) => {
        const elapsed = hoursSince(orderQueueAnchor(order));
        const overdue = isQueueOverdue(order, Date.now(), slaHours);
        return (
          <div>
            <p className="text-ink">{formatElapsed(elapsed)}</p>
            <p
              className={cn(
                "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold",
                overdue
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700",
              )}
            >
              {overdue ? (
                <TriangleAlert className="size-3" aria-hidden="true" />
              ) : null}
              {formatSlaRemaining(order, Date.now(), slaHours)}
            </p>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      id: "actions",
      header: "اقدام",
      cell: (order) => (
        <Link
          to={`/admin/fulfillment/${order.id}`}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-primary-dark"
        >
          ثبت لایسنس
          <ArrowLeft className="size-3" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="صف تحویل لایسنس"
        description="سفارش‌های پرداخت‌شده که هنوز لایسنس ندارند؛ قدیمی‌ترین‌ها اولویت دارند."
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
            <ButtonLink to="/admin" variant="secondary" size="sm">
              داشبورد
            </ButtonLink>
          </>
        }
      />

      {overdueCount > 0 ? (
        <div className="mb-4 flex items-start gap-2 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-xs font-bold leading-6">
            {toPersianDigits(overdueCount)} سفارش بیش از{" "}
            {toPersianDigits(slaHours)} ساعت در صف
            مانده است. لطفاً ابتدا این موارد را پیگیری کنید.
          </p>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="فیلتر صف تحویل">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition",
              filter === item.value
                ? "bg-primary text-white"
                : "border border-black/5 bg-white text-muted hover:text-ink",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] tabular-nums",
                filter === item.value
                  ? "bg-white/20 text-white"
                  : "bg-surface-soft text-muted",
              )}
            >
              {toPersianDigits(item.count)}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <PanelCard>
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-red-700">صف تحویل دریافت نشد</p>
            <p className="mt-2 text-xs text-muted">{error}</p>
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
      ) : (
        <DataTable
          caption="صف تحویل لایسنس"
          rows={filtered}
          columns={columns}
          getRowId={(order) => order.id}
          loading={loading}
          searchText={(order) =>
            `${order.number} ${order.customer.fullName} ${order.customer.email} ${order.course.title} ${providerMap.get(order.course.id)?.providerName ?? ""}`
          }
          searchPlaceholder="جست‌وجو در صف…"
          emptyTitle="صف تحویل خالی است"
          emptyDescription="برای فیلتر انتخاب‌شده سفارشی در انتظار تحویل وجود ندارد."
          emptyIcon={ClipboardList}
          emptyAction={
            <ButtonLink to="/admin/orders" size="sm" variant="secondary">
              مشاهده‌ی همه‌ی سفارش‌ها
            </ButtonLink>
          }
        />
      )}

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
