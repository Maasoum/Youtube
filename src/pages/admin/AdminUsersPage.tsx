import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban,
  CheckCircle2,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { adminApi, getErrorMessage, type AdminUserSummary } from "@/api";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { formatDate, formatToman, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

type UserFilter = "all" | "active" | "disabled";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<UserFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await adminApi.listUsers());
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
      users.filter((user) =>
        filter === "all"
          ? true
          : filter === "active"
            ? user.isActive
            : !user.isActive,
      ),
    [users, filter],
  );

  const parents = users.filter((user) => user.role === "parent");
  const disabledCount = users.filter((user) => !user.isActive).length;

  const columns: DataTableColumn<AdminUserSummary>[] = [
    {
      id: "user",
      header: "کاربر",
      cell: (user) => (
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              user.role === "admin"
                ? "bg-primary text-white"
                : "bg-primary-soft/35 text-primary",
            )}
            aria-hidden="true"
          >
            {user.fullName.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <Link
              to={`/admin/users/${user.id}`}
              className="block truncate font-bold text-primary underline decoration-primary/20 underline-offset-4"
            >
              {user.fullName}
            </Link>
            <a
              href={`mailto:${user.email}`}
              dir="ltr"
              className="mt-0.5 block font-mono text-[10px] text-muted"
            >
              {user.email}
            </a>
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      header: "موبایل",
      cell: (user) => (
        <span dir="ltr" className="font-mono text-[11px] text-ink">
          {toPersianDigits(user.phone)}
        </span>
      ),
    },
    {
      id: "joined",
      header: "عضویت",
      cell: (user) => (
        <span className="text-[10px] text-muted">{formatDate(user.createdAt)}</span>
      ),
    },
    {
      id: "orders",
      header: "سفارش‌ها",
      cell: (user) => (
        <div>
          <p className="font-bold tabular-nums text-ink">
            {toPersianDigits(user.ordersCount)}
          </p>
          <p className="text-[9px] text-muted">
            {toPersianDigits(user.licensesCount)} لایسنس
          </p>
        </div>
      ),
    },
    {
      id: "spent",
      header: "خرید موفق",
      cell: (user) => (
        <span className="text-[11px] font-bold tabular-nums text-ink">
          {formatToman(user.totalSpentToman)}
        </span>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (user) =>
        user.isActive ? (
          <span className="chip bg-emerald-50 text-[10px] text-emerald-800">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            فعال
          </span>
        ) : (
          <span className="chip bg-red-50 text-[10px] text-red-700">
            <Ban className="size-3.5" aria-hidden="true" />
            غیرفعال
          </span>
        ),
    },
    {
      id: "actions",
      header: "",
      cellClassName: "text-end",
      cell: (user) => (
        <Link
          to={`/admin/users/${user.id}`}
          className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-3 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary-soft/20"
        >
          <Search className="size-3.5" aria-hidden="true" />
          جزئیات
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="کاربران"
        description="جست‌وجوی والدین، مشاهده‌ی سفارش‌ها و لایسنس‌ها و غیرفعال‌سازی حساب در صورت تخلف یا درخواست پشتیبانی."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-bold text-muted transition hover:text-primary"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            به‌روزرسانی
          </button>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          { id: "all", label: "همه‌ی کاربران", value: users.length },
          { id: "active", label: "حساب‌های فعال", value: parents.filter((user) => user.isActive).length },
          { id: "disabled", label: "حساب‌های غیرفعال", value: disabledCount },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id as UserFilter)}
            aria-pressed={filter === item.id}
            className={cn(
              "rounded-2xl border px-4 py-3 text-start transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              filter === item.id
                ? "border-primary/25 bg-primary-soft/20"
                : "border-black/5 bg-white hover:border-primary/15",
            )}
          >
            <p className="text-[10px] text-muted">{item.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-ink">
              {toPersianDigits(item.value)}
            </p>
          </button>
        ))}
      </div>

      <DataTable
        caption="کاربران سایت"
        rows={filtered}
        columns={columns}
        getRowId={(user) => user.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        searchText={(user) =>
          `${user.fullName} ${user.email} ${user.phone} ${toPersianDigits(user.phone)}`
        }
        searchPlaceholder="جست‌وجو با نام، ایمیل یا موبایل…"
        emptyTitle="کاربری پیدا نشد"
        emptyDescription="با تغییر فیلتر یا عبارت جست‌وجو دوباره تلاش کنید."
        emptyIcon={UsersRound}
        pageSize={10}
      />
    </div>
  );
}
