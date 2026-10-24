import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ReceiptText, RefreshCw } from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type Course,
  type Order,
  type OrderStatus,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatToman, toPersianDigits } from "@/lib/format";
import { orderStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/cn";

type DateRange = "all" | "today" | "7" | "30";

const dateRanges: Array<{ value: DateRange; label: string }> = [
  { value: "all", label: "همه‌ی زمان‌ها" },
  { value: "today", label: "امروز" },
  { value: "7", label: "۷ روز گذشته" },
  { value: "30", label: "۳۰ روز گذشته" },
];

const statusOptions: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "همه‌ی وضعیت‌ها" },
  ...(
    Object.entries(orderStatusLabels) as Array<[OrderStatus, string]>
  ).map(([value, label]) => ({ value, label })),
];

export function AdminOrdersPage() {
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [range, setRange] = useState<DateRange>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersData, coursesData] = await Promise.all([
        adminApi.listOrders(),
        adminApi.listCourses(),
      ]);
      setOrders(ordersData);
      setCourses(coursesData);
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

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const minTime =
      range === "all"
        ? 0
        : range === "today"
          ? startOfToday
          : now.getTime() - Number(range) * 24 * 60 * 60 * 1000;

    return orders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (minTime > 0) {
        const created = new Date(order.createdAt).getTime();
        if (created < minTime) return false;
      }
      return true;
    });
  }, [orders, status, range]);

  const paidTotal = filtered
    .filter(
      (order) =>
        order.status !== "refunded" &&
        (order.status === "fulfilled" ||
          order.status === "awaiting_license" ||
          order.status === "on_hold"),
    )
    .reduce((sum, order) => sum + order.totalToman, 0);

  const handleExport = () => {
    downloadCsv(
      "brightpaths-orders",
      [
        "شماره سفارش",
        "نام خریدار",
        "ایمیل",
        "موبایل",
        "دوره",
        "ارائه‌دهنده",
        "قیمت اصلی",
        "کد تخفیف",
        "مبلغ تخفیف",
        "مبلغ نهایی",
        "وضعیت",
        "تاریخ ثبت",
        "تاریخ پرداخت",
        "شناسه پرداخت",
      ],
      filtered.map((order) => [
        order.number,
        order.customer.fullName,
        order.customer.email,
        order.customer.phone,
        order.course.title,
        providerMap.get(order.course.id)?.providerName ?? "",
        order.originalPriceToman,
        order.discount?.code ?? "",
        order.discount?.amountToman ?? 0,
        order.totalToman,
        orderStatusLabels[order.status],
        order.createdAt,
        order.paidAt ?? "",
        order.paymentRef ?? "",
      ]),
    );
    notify(`${toPersianDigits(filtered.length)} سفارش در فایل CSV ذخیره شد.`, "success");
  };

  const columns: DataTableColumn<Order>[] = [
    {
      id: "number",
      header: "سفارش",
      cell: (order) => (
        <div>
          <Link
            to={`/admin/orders/${order.id}`}
            className="font-bold tabular-nums text-primary underline decoration-primary/25 underline-offset-4"
          >
            {toPersianDigits(order.number)}
          </Link>
          <p className="mt-0.5 text-[10px] text-muted">
            {formatDate(order.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "خریدار",
      cell: (order) => (
        <div>
          <p className="max-w-40 truncate text-ink">{order.customer.fullName}</p>
          <p className="mt-0.5 max-w-44 truncate text-[10px] text-muted" dir="ltr">
            {order.customer.email}
          </p>
        </div>
      ),
    },
    {
      id: "course",
      header: "دوره",
      cell: (order) => (
        <div>
          <p className="max-w-44 truncate text-ink">{order.course.title}</p>
          <p className="mt-0.5 text-[10px] text-muted">
            {providerMap.get(order.course.id)?.providerName ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "مبلغ",
      cell: (order) => (
        <div>
          <p className="font-bold tabular-nums text-ink">
            {formatToman(order.totalToman)}
          </p>
          {order.discount ? (
            <p className="mt-0.5 font-mono text-[10px] text-muted" dir="ltr">
              {order.discount.code}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      id: "paidAt",
      header: "پرداخت",
      cell: (order) => (
        <span className="text-[10px] text-muted">
          {order.paidAt ? formatDate(order.paidAt) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "جزئیات",
      cell: (order) => (
        <Link
          to={`/admin/orders/${order.id}`}
          className="text-[11px] font-bold text-primary underline decoration-primary/25 underline-offset-4"
        >
          مشاهده
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="سفارش‌ها"
        description="فیلتر بر اساس وضعیت و بازه‌ی زمانی، مشاهده‌ی جزئیات و خروجی CSV."
        actions={
          <ButtonLink to="/admin/fulfillment" size="sm">
            صف تحویل
          </ButtonLink>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-3">
          <p className="text-[10px] text-muted">سفارش‌های نمایش‌داده‌شده</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink">
            {toPersianDigits(filtered.length)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-3">
          <p className="text-[10px] text-muted">جمع پرداخت‌های موفق</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">
            {formatToman(paidTotal)}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-black/5 bg-white p-3 sm:col-span-1">
          <p className="text-[10px] text-muted">بازگشت وجه</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-purple-700">
            {toPersianDigits(filtered.filter((order) => order.status === "refunded").length)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10px] text-muted">
          وضعیت
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus | "all")}
            className="input-base h-9 w-40 text-[11px]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1" role="group" aria-label="بازه‌ی زمانی">
          {dateRanges.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRange(item.value)}
              aria-pressed={range === item.value}
              className={cn(
                "rounded-full px-3 py-1.5 text-[10px] font-bold transition",
                range === item.value
                  ? "bg-ink text-white"
                  : "border border-black/5 bg-white text-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-white px-3.5 py-2 text-[11px] font-bold text-primary transition hover:bg-primary-soft/20 disabled:opacity-50"
        >
          <Download className="size-3.5" aria-hidden="true" />
          خروجی CSV
        </button>
      </div>

      {error ? (
        <PanelCard>
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-red-700">سفارش‌ها دریافت نشد</p>
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
          caption="همه‌ی سفارش‌ها"
          rows={filtered}
          columns={columns}
          getRowId={(order) => order.id}
          loading={loading}
          searchText={(order) =>
            `${order.number} ${order.customer.fullName} ${order.customer.email} ${order.course.title} ${order.paymentRef ?? ""}`
          }
          searchPlaceholder="جست‌وجو در سفارش‌ها…"
          emptyTitle="سفارشی با این فیلتر پیدا نشد"
          emptyDescription="وضعیت یا بازه‌ی زمانی را تغییر دهید."
          emptyIcon={ReceiptText}
        />
      )}
    </div>
  );
}
