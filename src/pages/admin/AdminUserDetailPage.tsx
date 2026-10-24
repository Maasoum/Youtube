import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  ShoppingBag,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type AdminLicenseListItem,
  type AdminUserDetail,
  type Order,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { StatCard } from "@/components/panel/StatCard";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatToman,
  toPersianDigits,
} from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminUserDetailPage() {
  const { userId = "" } = useParams();
  const { notify } = useToast();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await adminApi.getUserDetail(userId));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (active: boolean) => {
    if (!detail) return;
    if (!active && reason.trim().length < 5) {
      setReasonError("دلیل غیرفعال‌سازی را کوتاه بنویسید.");
      return;
    }
    setBusy(true);
    setReasonError(null);
    try {
      const user = await adminApi.setUserActive({
        userId: detail.user.id,
        active,
        reason: active ? undefined : reason,
      });
      setDetail({ ...detail, user });
      setDisableOpen(false);
      setReason("");
      notify(
        active
          ? "حساب کاربر دوباره فعال شد."
          : "حساب کاربر غیرفعال شد و دیگر نمی‌تواند وارد شود.",
        "success",
      );
    } catch (caught) {
      const message = getErrorMessage(caught);
      if (active) notify(message, "error");
      else setReasonError(message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted" role="status">
          <RefreshCw className="size-4 animate-spin text-primary" aria-hidden="true" />
          در حال دریافت پرونده‌ی کاربر…
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div>
        <PanelPageHeader
          title="کاربر پیدا نشد"
          backTo={{ to: "/admin/users", label: "بازگشت به کاربران" }}
        />
        <PanelCard>
          <p className="py-8 text-center text-sm font-bold text-red-700">
            {error ?? "کاربر پیدا نشد."}
          </p>
        </PanelCard>
      </div>
    );
  }

  const { user, orders, licenses } = detail;

  const orderColumns: DataTableColumn<Order>[] = [
    {
      id: "number",
      header: "سفارش",
      cell: (order) => (
        <Link
          to={`/admin/orders/${order.id}`}
          className="font-bold text-primary underline decoration-primary/20 underline-offset-4"
        >
          {toPersianDigits(order.number)}
        </Link>
      ),
    },
    {
      id: "course",
      header: "دوره",
      cell: (order) => <span className="font-bold text-ink">{order.course.title}</span>,
    },
    {
      id: "amount",
      header: "مبلغ",
      cell: (order) => (
        <span className="tabular-nums text-ink">{formatToman(order.totalToman)}</span>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      id: "date",
      header: "تاریخ",
      cell: (order) => (
        <span className="text-[10px] text-muted">{formatDate(order.createdAt)}</span>
      ),
    },
  ];

  const licenseColumns: DataTableColumn<AdminLicenseListItem>[] = [
    {
      id: "course",
      header: "دوره",
      cell: (license) => (
        <span className="font-bold text-ink">{license.courseTitle}</span>
      ),
    },
    {
      id: "key",
      header: "کلید",
      cell: (license) => (
        <code dir="ltr" className="font-mono text-xs tracking-[0.18em] text-ink">
          {license.maskedCode}
        </code>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (license) =>
        license.revokedAt ? (
          <span className="chip bg-red-50 text-[10px] text-red-700">لغوشده</span>
        ) : (
          <span className="chip bg-emerald-50 text-[10px] text-emerald-800">فعال</span>
        ),
    },
    {
      id: "issued",
      header: "صدور",
      cell: (license) => (
        <span className="text-[10px] text-muted">{formatDate(license.issuedAt)}</span>
      ),
    },
    {
      id: "order",
      header: "",
      cellClassName: "text-end",
      cell: (license) => (
        <Link
          to={`/admin/orders/${license.orderId}`}
          className="text-[10px] font-bold text-primary"
        >
          مشاهده‌ی سفارش
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پرونده‌ی کاربر"
        title={user.fullName}
        description="سفارش‌ها، لایسنس‌ها و وضعیت دسترسی حساب؛ تغییر وضعیت در گزارش اقدامات ثبت می‌شود."
        backTo={{ to: "/admin/users", label: "بازگشت به کاربران" }}
        actions={
          user.role === "admin" ? null : user.isActive ? (
            <Button
              variant="danger"
              size="sm"
              icon={Ban}
              onClick={() => {
                setReason("");
                setReasonError(null);
                setDisableOpen(true);
              }}
            >
              غیرفعال‌سازی حساب
            </Button>
          ) : (
            <Button
              size="sm"
              icon={CheckCircle2}
              loading={busy}
              onClick={() => void updateStatus(true)}
            >
              فعال‌سازی حساب
            </Button>
          )
        }
      />

      {user.deletionRequestedAt ? (
        <div className="mb-4 flex items-start gap-2 rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-[11px] leading-6 text-amber-900">
            این کاربر در {formatDateTime(user.deletionRequestedAt)} درخواست حذف
            حساب ثبت کرده است. پیش از هر اقدام، درخواست را با پشتیبانی هماهنگ کنید.
          </p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={ShoppingBag}
          label="سفارش‌های ثبت‌شده"
          value={toPersianDigits(user.ordersCount)}
          tone="primary"
        />
        <StatCard
          icon={KeyRound}
          label="لایسنس‌ها"
          value={toPersianDigits(user.licensesCount)}
          tone="success"
        />
        <StatCard
          icon={Wallet}
          label="مجموع خرید موفق"
          value={formatToman(user.totalSpentToman)}
          tone="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <PanelCard title="مشخصات حساب">
          <div className="flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft/30 text-lg font-bold text-primary">
              {user.fullName.slice(0, 1)}
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{user.fullName}</p>
              <span
                className={cn(
                  "chip mt-1 text-[9px]",
                  user.role === "admin"
                    ? "bg-primary-soft/30 text-primary"
                    : "bg-surface-soft text-muted",
                )}
              >
                {user.role === "admin" ? "مدیر" : "والد"}
              </span>
            </div>
          </div>
          <ul className="mt-4 space-y-3 text-xs leading-6 text-muted">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <a href={`mailto:${user.email}`} dir="ltr" className="font-mono text-[11px] text-ink">
                {user.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span dir="ltr" className="font-mono text-[11px] text-ink">
                {toPersianDigits(user.phone)}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <UserRound className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              عضویت از {formatDate(user.createdAt)}
            </li>
          </ul>
          <div
            className={cn(
              "mt-4 rounded-2xl p-3 text-[10px] leading-5",
              user.isActive
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700",
            )}
          >
            {user.isActive
              ? "حساب فعال است و کاربر می‌تواند وارد شود."
              : `حساب غیرفعال است.${user.disabledReason ? ` دلیل: ${user.disabledReason}` : ""}`}
          </div>
          {user.lastOrderAt ? (
            <p className="mt-3 text-[10px] text-muted">
              آخرین سفارش: {formatDateTime(user.lastOrderAt)}
            </p>
          ) : null}
        </PanelCard>

        <div className="space-y-4">
          <PanelCard title="سفارش‌ها" description={`${toPersianDigits(orders.length)} سفارش برای این کاربر ثبت شده است.`}>
            <DataTable
              caption={`سفارش‌های ${user.fullName}`}
              rows={orders}
              columns={orderColumns}
              getRowId={(order) => order.id}
              searchable={false}
              pageSize={6}
              emptyTitle="سفارشی ثبت نشده"
              emptyDescription="این کاربر هنوز سفارشی ثبت نکرده است."
            />
          </PanelCard>

          <PanelCard title="لایسنس‌ها" description="کلیدها همیشه ماسک‌شده نمایش داده می‌شوند.">
            <DataTable
              caption={`لایسنس‌های ${user.fullName}`}
              rows={licenses}
              columns={licenseColumns}
              getRowId={(license) => license.id}
              searchable={false}
              pageSize={6}
              emptyTitle="لایسنسی صادر نشده"
              emptyDescription="پس از تحویل سفارش، لایسنس اینجا فهرست می‌شود."
            />
          </PanelCard>
        </div>
      </div>

      <Modal
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="غیرفعال‌سازی حساب"
        description="کاربر از این پس نمی‌تواند وارد شود؛ سفارش‌ها و لایسنس‌ها حذف نمی‌شوند. این اقدام در گزارش ممیزی ثبت می‌شود."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDisableOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              onClick={() => void updateStatus(false)}
            >
              غیرفعال کن
            </Button>
          </>
        }
      >
        <div>
          <label htmlFor="disable-reason" className="label-base">
            دلیل غیرفعال‌سازی
            <span className="ms-1 text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="disable-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="input-base min-h-24"
            placeholder="مثلاً درخواست پشتیبانی یا استفاده‌ی غیرمجاز از لایسنس"
            aria-invalid={reasonError ? true : undefined}
          />
          {reasonError ? (
            <p role="alert" className="mt-2 text-xs font-bold text-red-600">
              {reasonError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
