import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Loader2, ReceiptText } from "lucide-react";
import {
  getErrorMessage,
  ordersApi,
  paymentsApi,
  type Order,
  type OrderStatus,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { formatDate, formatToman, toPersianDigits } from "@/lib/format";
import { orderStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/cn";

const filters: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "همه" },
  { value: "pending", label: orderStatusLabels.pending },
  { value: "awaiting_license", label: orderStatusLabels.awaiting_license },
  { value: "on_hold", label: orderStatusLabels.on_hold },
  { value: "fulfilled", label: orderStatusLabels.fulfilled },
  { value: "refunded", label: orderStatusLabels.refunded },
  { value: "cancelled", label: orderStatusLabels.cancelled },
  { value: "failed", label: orderStatusLabels.failed },
];

export function DashboardOrdersPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | "all">("all");
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await ordersApi.listMine());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      activeFilter === "all"
        ? orders
        : orders.filter((order) => order.status === activeFilter),
    [orders, activeFilter],
  );

  const handlePay = async (order: Order) => {
    setPayingId(order.id);
    try {
      await paymentsApi.start(order.id);
      navigate(`/payment/callback?order=${order.id}&state=success`);
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setPayingId(null);
    }
  };

  const columns: DataTableColumn<Order>[] = [
    {
      id: "number",
      header: "سفارش",
      cell: (order) => (
        <div>
          <p className="font-bold tabular-nums">
            {toPersianDigits(order.number)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            {order.source === "gift" ? "هدیه" : "خرید"} ·{" "}
            {formatDate(order.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: "course",
      header: "دوره",
      cell: (order) => (
        <span className="block max-w-48 truncate">{order.course.title}</span>
      ),
    },
    {
      id: "amount",
      header: "مبلغ",
      cell: (order) => (
        <span className="font-bold tabular-nums">
          {formatToman(order.totalToman)}
        </span>
      ),
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/dashboard/orders/${order.id}`}
            className="text-[11px] font-bold text-primary underline decoration-primary/30 underline-offset-4"
          >
            جزئیات
          </Link>
          {order.paidAt ? (
            <Link
              to={`/dashboard/orders/${order.id}/receipt`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-muted transition hover:text-ink"
            >
              <ReceiptText className="size-3.5" aria-hidden="true" />
              رسید
            </Link>
          ) : null}
          {order.status === "pending" ? (
            <button
              type="button"
              onClick={() => void handlePay(order)}
              disabled={payingId === order.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {payingId === order.id ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <CreditCard className="size-3" aria-hidden="true" />
              )}
              پرداخت
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل کاربری"
        title="سفارش‌ها و رسیدها"
        description="سابقه‌ی خریدها، وضعیت پرداخت و رسید قابل چاپ هر سفارش."
        actions={
          <ButtonLink to="/courses" variant="secondary" size="sm">
            خرید دوره‌ی جدید
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="فیلتر وضعیت سفارش">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            aria-pressed={activeFilter === filter.value}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              activeFilter === filter.value
                ? "bg-primary text-white"
                : "border border-black/5 bg-white text-muted hover:text-ink",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <DataTable
        caption="سفارش‌های من"
        rows={filtered}
        columns={columns}
        getRowId={(order) => order.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        searchText={(order) =>
          `${order.number} ${order.course.title} ${order.status} ${order.customer.email}`
        }
        searchPlaceholder="جست‌وجو در سفارش‌ها…"
        emptyTitle="سفارشی با این فیلتر پیدا نشد"
        emptyDescription="فیلتر را تغییر دهید یا یک دوره‌ی تازه انتخاب کنید."
        emptyIcon={ReceiptText}
        emptyAction={<ButtonLink to="/courses" size="sm">دیدن دوره‌ها</ButtonLink>}
      />
    </div>
  );
}
