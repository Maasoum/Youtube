import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BarChart3, Download, ReceiptText, RefreshCw } from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type DiscountCode,
  type DiscountUsageReport,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { downloadCsv } from "@/lib/csv";
import { describeDiscount } from "@/lib/discount";
import { formatDate, formatDateTime, formatToman, toPersianDigits } from "@/lib/format";

type UsageRow = DiscountUsageReport["orders"][number];

export function AdminDiscountUsagePage() {
  const { code } = useParams<{ code: string }>();
  const { notify } = useToast();
  const [discount, setDiscount] = useState<DiscountCode | null>(null);
  const [report, setReport] = useState<DiscountUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const normalized = decodeURIComponent(code);
      const [discounts, usage] = await Promise.all([
        adminApi.listDiscounts(),
        adminApi.getDiscountUsage(normalized),
      ]);
      setDiscount(discounts.find((item) => item.code === normalized) ?? null);
      setReport(usage);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCsv = () => {
    if (!report) return;
    downloadCsv(
      `brightpaths-discount-${report.code}`,
      ["شماره سفارش", "خریدار", "تاریخ استفاده", "مبلغ تخفیف"],
      report.orders.map((row) => [
        row.orderNumber,
        row.customerName,
        row.usedAt,
        row.discountToman,
      ]),
    );
    notify("فایل CSV گزارش ذخیره شد.", "success");
  };

  const columns: DataTableColumn<UsageRow>[] = [
    {
      id: "order",
      header: "سفارش",
      cell: (row) => (
        <Link
          to={`/admin/orders/${row.orderId}`}
          className="font-bold tabular-nums text-primary underline decoration-primary/20 underline-offset-4"
        >
          {toPersianDigits(row.orderNumber)}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "خریدار",
      cell: (row) => <span className="text-ink">{row.customerName}</span>,
    },
    {
      id: "date",
      header: "تاریخ استفاده",
      cell: (row) => (
        <span className="text-[10px] text-muted">{formatDateTime(row.usedAt)}</span>
      ),
    },
    {
      id: "amount",
      header: "تخفیف",
      cell: (row) => (
        <span className="font-bold tabular-nums text-emerald-700">
          {formatToman(row.discountToman)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded-full bg-white/80" />
        <div className="h-48 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <PanelPageHeader
          title="گزارش پیدا نشد"
          backTo={{ to: "/admin/discounts", label: "بازگشت به کدها" }}
        />
        <PanelCard>
          <p className="py-8 text-center text-xs text-muted">{error}</p>
        </PanelCard>
      </div>
    );
  }

  const usagePercent = discount
    ? Math.min(100, Math.round((discount.usedCount / discount.maxUses) * 100))
    : 0;

  return (
    <div>
      <PanelPageHeader
        eyebrow="گزارش مصرف"
        title={`کد ${report.code}`}
        description={discount ? describeDiscount(discount) : "گزارش استفاده‌ی این کد"}
        backTo={{ to: "/admin/discounts", label: "بازگشت به کدهای تخفیف" }}
        actions={
          <>
            <button
              type="button"
              onClick={handleCsv}
              disabled={report.orders.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-white px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary-soft/20 disabled:opacity-50"
            >
              <Download className="size-3.5" aria-hidden="true" />
              خروجی CSV
            </button>
            <ButtonLink to={`/admin/discounts/${encodeURIComponent(report.code)}`} size="sm" variant="secondary">
              ویرایش کد
            </ButtonLink>
          </>
        }
      />

      {error ? (
        <PanelCard>
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-red-700">گزارش دریافت نشد</p>
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
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-4">
          <p className="text-[10px] text-muted">تعداد استفاده</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink">
            {toPersianDigits(report.totalUses)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-4">
          <p className="text-[10px] text-muted">مجموع تخفیف</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">
            {formatToman(report.totalDiscountToman)}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-black/5 bg-white p-4 sm:col-span-1">
          <p className="text-[10px] text-muted">ظرفیت مصرف</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-ink">
            {discount
              ? `${toPersianDigits(discount.usedCount)} از ${toPersianDigits(discount.maxUses)}`
              : "—"}
          </p>
          {discount ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-soft">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {discount ? (
        <p className="mb-4 text-[10px] leading-5 text-muted">
          بازه: {discount.startsAt ? formatDate(discount.startsAt) : "همیشه"} تا{" "}
          {discount.expiresAt ? formatDate(discount.expiresAt) : "بدون پایان"} ·
          سقف هر کاربر: {toPersianDigits(discount.maxUsesPerUser)} بار
        </p>
      ) : null}

      <DataTable
        caption={`گزارش استفاده از ${report.code}`}
        rows={report.orders}
        columns={columns}
        getRowId={(row) => row.orderId}
        searchText={(row) => `${row.orderNumber} ${row.customerName}`}
        searchPlaceholder="جست‌وجو در سفارش‌ها…"
        emptyTitle="هنوز از این کد استفاده نشده"
        emptyDescription="با اولین خرید موفق، ردیف مصرف اینجا ثبت می‌شود."
        emptyIcon={ReceiptText}
        pageSize={6}
        toolbar={
          <span className="inline-flex items-center gap-1 text-[10px] text-muted">
            <BarChart3 className="size-3.5" aria-hidden="true" />
            گزارش از دفتر سفارش‌های نمایشی
          </span>
        }
      />
    </div>
  );
}
