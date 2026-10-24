import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Eye,
  Gift,
  KeyRound,
  RefreshCw,
  Send,
  ShieldOff,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type AdminLicenseListItem,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { GiftLicenseDialog } from "@/components/admin/LicenseDialogs";
import { RevealLicenseDialog } from "@/components/admin/RevealLicenseDialog";
import {
  formatDate,
  formatDateTime,
  toPersianDigits,
} from "@/lib/format";
import { cn } from "@/lib/cn";

type LicenseFilter = "all" | "active" | "revoked";

export function AdminLicensesPage() {
  const { notify } = useToast();
  const [licenses, setLicenses] = useState<AdminLicenseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LicenseFilter>("all");
  const [revealTarget, setRevealTarget] =
    useState<AdminLicenseListItem | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] =
    useState<AdminLicenseListItem | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLicenses(await adminApi.listLicenses());
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
      licenses.filter((license) =>
        filter === "all"
          ? true
          : filter === "revoked"
            ? Boolean(license.revokedAt)
            : !license.revokedAt,
      ),
    [licenses, filter],
  );

  const activeCount = licenses.filter((license) => !license.revokedAt).length;
  const revokedCount = licenses.length - activeCount;

  const handleResend = async (license: AdminLicenseListItem) => {
    setResendingId(license.orderId);
    try {
      await adminApi.resendLicenseEmail(license.orderId);
      notify("ایمیل لایسنس دوباره برای کاربر ارسال شد.", "success");
      await load();
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setResendingId(null);
    }
  };

  const openRevoke = (license: AdminLicenseListItem) => {
    setRevokeTarget(license);
    setRevokeReason("");
    setRevokeError(null);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    if (revokeReason.trim().length < 10) {
      setRevokeError("دلیل لغو را کامل‌تر بنویسید (حداقل ۱۰ کاراکتر).");
      return;
    }
    setRevoking(true);
    setRevokeError(null);
    try {
      const updated = await adminApi.revokeLicense({
        licenseId: revokeTarget.id,
        reason: revokeReason,
      });
      setLicenses((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify("لایسنس لغو شد و در گزارش اقدامات ثبت شد.", "success");
      setRevokeTarget(null);
    } catch (caught) {
      setRevokeError(getErrorMessage(caught));
    } finally {
      setRevoking(false);
    }
  };

  const columns: DataTableColumn<AdminLicenseListItem>[] = [
    {
      id: "course",
      header: "دوره و خریدار",
      cell: (license) => (
        <div className="min-w-44">
          <p className="font-bold text-ink">{license.courseTitle}</p>
          <p className="mt-1 text-[10px] text-muted">{license.customerName}</p>
          <a
            href={`mailto:${license.customerEmail}`}
            dir="ltr"
            className="mt-0.5 block font-mono text-[10px] text-primary"
          >
            {license.customerEmail}
          </a>
        </div>
      ),
    },
    {
      id: "order",
      header: "سفارش",
      cell: (license) => (
        <Link
          to={`/admin/orders/${license.orderId}`}
          className="font-bold text-primary underline decoration-primary/20 underline-offset-4"
        >
          سفارش {toPersianDigits(license.orderNumber)}
        </Link>
      ),
    },
    {
      id: "key",
      header: "کلید",
      cell: (license) => (
        <div>
          <code
            dir="ltr"
            className="block font-mono text-xs tracking-[0.2em] text-ink"
          >
            {license.maskedCode}
          </code>
          <span className="mt-1 inline-flex text-[9px] text-muted">
            {license.source === "gift" ? "هدیه‌ی دستی" : "ارائه‌دهنده"}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (license) =>
        license.revokedAt ? (
          <span className="chip bg-red-50 text-[10px] text-red-700">
            <ShieldOff className="size-3.5" aria-hidden="true" />
            لغوشده
          </span>
        ) : (
          <span className="chip bg-emerald-50 text-[10px] text-emerald-800">
            <Award className="size-3.5" aria-hidden="true" />
            فعال
          </span>
        ),
    },
    {
      id: "dates",
      header: "تاریخ‌ها",
      cell: (license) => (
        <div className="space-y-1 text-[10px] leading-5 text-muted">
          <p>صدور: {formatDate(license.issuedAt)}</p>
          <p>
            ایمیل:{" "}
            {license.emailSentAt
              ? formatDateTime(license.emailSentAt)
              : "ارسال نشده"}
          </p>
          {license.revokedAt ? (
            <p className="text-red-600">لغو: {formatDate(license.revokedAt)}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "اقدام‌ها",
      headerClassName: "text-end",
      cellClassName: "text-end",
      cell: (license) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setRevealTarget(license)}
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-2.5 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary-soft/20"
            aria-label={`نمایش کلید سفارش ${license.orderNumber}`}
          >
            <Eye className="size-3.5" aria-hidden="true" />
            نمایش کلید
          </button>
          <button
            type="button"
            onClick={() => void handleResend(license)}
            disabled={resendingId === license.orderId || Boolean(license.revokedAt)}
            className="inline-flex items-center gap-1 rounded-full border border-black/5 px-2.5 py-1.5 text-[10px] font-bold text-muted transition hover:text-primary disabled:opacity-40"
          >
            <Send className="size-3.5" aria-hidden="true" />
            {resendingId === license.orderId ? "در حال ارسال" : "ارسال ایمیل"}
          </button>
          <button
            type="button"
            onClick={() => openRevoke(license)}
            disabled={Boolean(license.revokedAt)}
            className="inline-flex items-center gap-1 rounded-full border border-red-100 px-2.5 py-1.5 text-[10px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
          >
            <ShieldOff className="size-3.5" aria-hidden="true" />
            لغو
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="لایسنس‌ها"
        description="جست‌وجو با ایمیل خریدار یا شناسه‌ی سفارش، اعطای لایسنس هدیه، ارسال دوباره‌ی ایمیل و لغو کلید؛ کلید کامل فقط با دکمه‌ی «نمایش کلید» و با ثبت در گزارش اقدامات باز می‌شود."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-bold text-muted transition hover:text-primary"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              به‌روزرسانی
            </button>
            <Button
              size="sm"
              icon={Gift}
              onClick={() => setGrantOpen(true)}
            >
              اعطای لایسنس
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          { id: "all", label: "همه‌ی لایسنس‌ها", value: licenses.length },
          { id: "active", label: "فعال", value: activeCount },
          { id: "revoked", label: "لغوشده", value: revokedCount },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id as LicenseFilter)}
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
        caption="لایسنس‌های صادرشده"
        rows={filtered}
        columns={columns}
        getRowId={(license) => license.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        searchText={(license) =>
          `${license.customerName} ${license.customerEmail} ${license.orderId} ${license.orderNumber} ${toPersianDigits(license.orderNumber)} ${license.courseTitle} ${license.maskedCode}`
        }
        searchPlaceholder="جست‌وجو با ایمیل، نام یا شناسه‌ی سفارش…"
        emptyTitle="لایسنس‌ای پیدا نشد"
        emptyDescription={
          licenses.length === 0
            ? "پس از تحویل اولین سفارش، لایسنس‌ها اینجا فهرست می‌شوند."
            : "فیلتر یا عبارت جست‌وجو را تغییر دهید."
        }
        emptyIcon={KeyRound}
        pageSize={10}
      />

      <GiftLicenseDialog
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        onCreated={() => {
          void load();
        }}
      />

      <RevealLicenseDialog
        license={revealTarget}
        onClose={() => setRevealTarget(null)}
      />

      <Modal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="لغو لایسنس"
        description="کلید برای کاربر غیرفعال می‌شود اما سابقه‌ی سفارش و لایسنس برای حسابرسی باقی می‌ماند. این اقدام در گزارش ممیزی ثبت می‌شود."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevokeTarget(null)}
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={revoking}
              onClick={() => void handleRevoke()}
            >
              لغو لایسنس
            </Button>
          </>
        }
      >
        {revokeTarget ? (
          <div className="space-y-4">
            <p className="rounded-2xl bg-surface-soft/60 p-3 text-[11px] leading-6 text-muted">
              {revokeTarget.courseTitle} · سفارش{" "}
              {toPersianDigits(revokeTarget.orderNumber)} ·{" "}
              {revokeTarget.customerName}
            </p>
            <div>
              <label htmlFor="revoke-reason" className="label-base">
                دلیل لغو
                <span className="ms-1 text-red-500" aria-hidden="true">*</span>
              </label>
              <textarea
                id="revoke-reason"
                rows={3}
                value={revokeReason}
                onChange={(event) => setRevokeReason(event.target.value)}
                className="input-base min-h-24"
                placeholder="مثلاً درخواست ارائه‌دهنده یا بازگشت وجه دستی"
                aria-invalid={revokeError ? true : undefined}
              />
              {revokeError ? (
                <p role="alert" className="mt-2 text-xs font-bold text-red-600">
                  {revokeError}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
