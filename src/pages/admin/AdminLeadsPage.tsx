import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Mail,
  Phone,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { adminApi, getErrorMessage, type LeadRecord } from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatDateTime, toPersianDigits } from "@/lib/format";

const isEmail = (value: string): boolean => /@/.test(value);

export function AdminLeadsPage() {
  const { notify } = useToast();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLeads(await adminApi.listLeads());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    downloadCsv(
      "brightpaths-leads",
      ["نام", "راه تماس", "تاریخ عضویت", "نوع تماس"],
      leads.map((lead) => [
        lead.fullName,
        lead.contact,
        formatDateTime(lead.createdAt),
        isEmail(lead.contact) ? "ایمیل" : "موبایل",
      ]),
    );
    notify("خروجی CSV لیدها ساخته شد.", "success");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteLead(deleteTarget.id);
      setLeads((current) => current.filter((item) => item.id !== deleteTarget.id));
      notify("لید حذف شد.", "success");
      setDeleteTarget(null);
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<LeadRecord>[] = [
    {
      id: "name",
      header: "نام",
      cell: (lead) => (
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary-soft/30 text-xs font-bold text-primary">
            {lead.fullName.slice(0, 1)}
          </span>
          <span className="font-bold text-ink">{lead.fullName}</span>
        </div>
      ),
    },
    {
      id: "contact",
      header: "راه تماس",
      cell: (lead) => (
        <div>
          <span
            dir="ltr"
            className="font-mono text-[11px] text-ink"
          >
            {lead.contact}
          </span>
          <p className="mt-0.5 flex items-center gap-1 text-[9px] text-muted">
            {isEmail(lead.contact) ? (
              <Mail className="size-3" aria-hidden="true" />
            ) : (
              <Phone className="size-3" aria-hidden="true" />
            )}
            {isEmail(lead.contact) ? "ایمیل" : "موبایل"}
          </p>
        </div>
      ),
    },
    {
      id: "date",
      header: "تاریخ عضویت",
      cell: (lead) => (
        <div className="text-[10px] leading-5 text-muted">
          <p>{formatDate(lead.createdAt)}</p>
          <p>{formatDateTime(lead.createdAt)}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cellClassName: "text-end",
      cell: (lead) => (
        <button
          type="button"
          onClick={() => setDeleteTarget(lead)}
          className="inline-flex items-center gap-1 rounded-full border border-red-100 px-2.5 py-1.5 text-[10px] font-bold text-red-600 transition hover:bg-red-50"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          حذف
        </button>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="بازاریابی"
        title="لیدها"
        description="عضوهای فرم خبرنامه و راهنمای دوره؛ خروجی CSV را در مرورگر بگیرید یا رکوردهای نامعتبر را حذف کنید."
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
              icon={Download}
              onClick={exportCsv}
              disabled={leads.length === 0}
            >
              خروجی CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 rounded-3xl border border-primary/10 bg-primary-soft/10 p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-primary">
          <UserPlus className="size-4" aria-hidden="true" />
          {toPersianDigits(leads.length)} لید ثبت شده است
        </p>
        <p className="mt-1 text-[10px] leading-5 text-muted">
          خروجی شامل نام، راه تماس، تاریخ عضویت و نوع تماس است و به‌صورت
          کاملاً سمت مرورگر ساخته می‌شود.
        </p>
      </div>

      <DataTable
        caption="لیدهای خبرنامه"
        rows={leads}
        columns={columns}
        getRowId={(lead) => lead.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        searchText={(lead) => `${lead.fullName} ${lead.contact}`}
        searchPlaceholder="جست‌وجو با نام یا راه تماس…"
        emptyTitle="لیدی ثبت نشده"
        emptyDescription="عضویت‌های فرم خبرنامه و دریافت راهنما اینجا جمع می‌شوند."
        emptyIcon={UserPlus}
        pageSize={10}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف لید"
        description="این رکورد از فهرست لیدها حذف می‌شود و در خروجی CSV بعدی نخواهد بود."
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
            >
              حذف لید
            </Button>
          </>
        }
      >
        <p className="rounded-2xl bg-surface-soft/60 p-3 text-xs leading-7 text-ink">
          {deleteTarget?.fullName} — <span dir="ltr">{deleteTarget?.contact}</span>
        </p>
      </Modal>
    </div>
  );
}
