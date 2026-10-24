import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Layers,
  PencilLine,
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type DiscountCode,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { describeDiscount } from "@/lib/discount";
import { formatDate, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

type DiscountFilter = "all" | "active" | "inactive";

function discountState(discount: DiscountCode): {
  label: string;
  className: string;
} {
  const now = Date.now();
  if (!discount.active) {
    return { label: "غیرفعال", className: "bg-surface-soft text-muted" };
  }
  if (discount.startsAt && new Date(discount.startsAt).getTime() > now) {
    return { label: "شروع نشده", className: "bg-sky-50 text-sky-800" };
  }
  if (discount.expiresAt && new Date(discount.expiresAt).getTime() < now) {
    return { label: "منقضی", className: "bg-amber-50 text-amber-800" };
  }
  return { label: "فعال", className: "bg-emerald-50 text-emerald-800" };
}

export function AdminDiscountsPage() {
  const { notify } = useToast();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DiscountFilter>("all");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDiscounts(await adminApi.listDiscounts());
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
      discounts.filter((discount) =>
        filter === "all"
          ? true
          : filter === "active"
            ? discount.active
            : !discount.active,
      ),
    [discounts, filter],
  );

  const handleToggle = async (discount: DiscountCode) => {
    setBusyCode(discount.code);
    try {
      const updated = await adminApi.toggleDiscount(discount.code);
      setDiscounts((current) =>
        current.map((item) => (item.code === updated.code ? updated : item)),
      );
      notify(
        updated.active ? "کد تخفیف فعال شد." : "کد تخفیف غیرفعال شد.",
        "success",
      );
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setBusyCode(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteDiscount(deleteTarget.code);
      setDiscounts((current) =>
        current.filter((discount) => discount.code !== deleteTarget.code),
      );
      notify("کد تخفیف حذف شد.", "success");
      setDeleteTarget(null);
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<DiscountCode>[] = [
    {
      id: "code",
      header: "کد",
      cell: (discount) => (
        <div>
          <p className="font-mono text-xs font-bold tracking-wider text-ink" dir="ltr">
            {discount.code}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            {discount.firstPurchaseOnly ? "اولین خرید" : "همه‌ی خریدها"}
            {discount.allowFree ? " · مجاز به رایگان" : ""}
          </p>
        </div>
      ),
    },
    {
      id: "value",
      header: "مقدار",
      cell: (discount) => (
        <span className="text-[11px] text-ink">{describeDiscount(discount)}</span>
      ),
    },
    {
      id: "usage",
      header: "استفاده",
      cell: (discount) => (
        <div>
          <p className="tabular-nums text-ink">
            {toPersianDigits(discount.usedCount)} /{" "}
            {toPersianDigits(discount.maxUses)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            هر کاربر {toPersianDigits(discount.maxUsesPerUser)} بار
          </p>
        </div>
      ),
    },
    {
      id: "window",
      header: "بازه",
      cell: (discount) => (
        <span className="text-[10px] leading-5 text-muted">
          {discount.startsAt ? formatDate(discount.startsAt) : "همیشه"}
          <br />
          تا {discount.expiresAt ? formatDate(discount.expiresAt) : "بدون پایان"}
        </span>
      ),
    },
    {
      id: "state",
      header: "وضعیت",
      cell: (discount) => {
        const state = discountState(discount);
        return (
          <span className={cn("chip text-[10px]", state.className)}>
            {state.label}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "اقدام",
      cell: (discount) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/admin/discounts/${discount.code}`}
            aria-label={`ویرایش ${discount.code}`}
            className="inline-flex size-8 items-center justify-center rounded-full text-primary transition hover:bg-primary-soft/20"
          >
            <PencilLine className="size-4" aria-hidden="true" />
          </Link>
          <Link
            to={`/admin/discounts/${discount.code}/usage`}
            aria-label={`گزارش استفاده ${discount.code}`}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink"
          >
            <BarChart3 className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => void handleToggle(discount)}
            disabled={busyCode === discount.code}
            aria-label={discount.active ? `غیرفعال کردن ${discount.code}` : `فعال کردن ${discount.code}`}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink disabled:opacity-50"
          >
            {discount.active ? (
              <ToggleRight className="size-5 text-emerald-600" aria-hidden="true" />
            ) : (
              <ToggleLeft className="size-5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(discount)}
            aria-label={`حذف ${discount.code}`}
            className="inline-flex size-8 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="کدهای تخفیف"
        description="ساخت کد تکی یا گروهی، مدیریت بازه و سقف استفاده، و گزارش مصرف."
        actions={
          <>
            <ButtonLink
              to="/admin/discounts/bulk"
              variant="secondary"
              size="sm"
              icon={Layers}
            >
              ساخت گروهی
            </ButtonLink>
            <ButtonLink to="/admin/discounts/new" size="sm" icon={Plus}>
              کد تخفیف جدید
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="فیلتر وضعیت کد">
        {(
          [
            { value: "all", label: "همه", count: discounts.length },
            {
              value: "active",
              label: "فعال",
              count: discounts.filter((discount) => discount.active).length,
            },
            {
              value: "inactive",
              label: "غیرفعال",
              count: discounts.filter((discount) => !discount.active).length,
            },
          ] as Array<{ value: DiscountFilter; label: string; count: number }>
        ).map((item) => (
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
            <p className="text-sm font-bold text-red-700">کدهای تخفیف دریافت نشد</p>
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
          caption="کدهای تخفیف"
          rows={filtered}
          columns={columns}
          getRowId={(discount) => discount.code}
          loading={loading}
          searchText={(discount) =>
            `${discount.code} ${discount.type} ${discount.usedCount}`
          }
          searchPlaceholder="جست‌وجو در کدها…"
          emptyTitle="کد تخفیفی با این فیلتر نیست"
          emptyDescription="یک کد تازه بسازید یا فیلتر را تغییر دهید."
          emptyIcon={Percent}
          emptyAction={
            <ButtonLink to="/admin/discounts/new" size="sm" icon={Plus}>
              کد تخفیف جدید
            </ButtonLink>
          }
        />
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف کد تخفیف"
        description="کدی که در سفارشی استفاده شده باشد قابل حذف نیست؛ آن را غیرفعال کنید."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={() => void handleDelete()}
              icon={Trash2}
            >
              حذف قطعی
            </Button>
          </>
        }
      >
        <p className="text-xs leading-7 text-muted">
          کد{" "}
          <span className="font-mono text-ink" dir="ltr">
            {deleteTarget?.code}
          </span>{" "}
          برای همیشه حذف می‌شود.
        </p>
      </Modal>
    </div>
  );
}
