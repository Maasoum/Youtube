import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterX, RefreshCw, ScrollText, ShieldCheck } from "lucide-react";
import { adminApi, getErrorMessage, type AuditLogEntry } from "@/api";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { auditActionLabel } from "@/lib/labels";
import { formatDateTime, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLogs(await adminApi.listAuditLogs(300));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );
  const entities = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entityType))).sort(),
    [logs],
  );

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        if (actionFilter !== "all" && log.action !== actionFilter) return false;
        if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
        return true;
      }),
    [actionFilter, entityFilter, logs],
  );

  const hasFilter = actionFilter !== "all" || entityFilter !== "all";

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      id: "at",
      header: "زمان",
      cell: (log) => (
        <span className="text-[10px] leading-5 text-muted">
          {formatDateTime(log.at)}
        </span>
      ),
    },
    {
      id: "action",
      header: "اقدام",
      cell: (log) => (
        <span className="chip bg-primary-soft/25 text-[10px] text-primary">
          {auditActionLabel(log.action)}
        </span>
      ),
    },
    {
      id: "actor",
      header: "مدیر",
      cell: (log) => (
        <span className="text-[11px] font-bold text-ink">{log.actorName}</span>
      ),
    },
    {
      id: "entity",
      header: "موجودیت",
      cell: (log) => (
        <span className="font-mono text-[10px] text-muted" dir="ltr">
          {log.entityType}
          {log.entityId ? `:${log.entityId}` : ""}
        </span>
      ),
    },
    {
      id: "summary",
      header: "شرح",
      cell: (log) => (
        <span className="block max-w-md text-[11px] leading-6 text-ink">
          {log.summary}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="گزارش اقدامات"
        description="هر اقدام حساس با نام مدیر، زمان و شرح ثبت می‌شود؛ این گزارش فقط خواندنی است."
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

      <div className="mb-4 flex items-start gap-2 rounded-3xl border border-primary/10 bg-primary-soft/10 p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-[11px] leading-6 text-ink">
          {toPersianDigits(logs.length)} ردیف ثبت شده است؛{" "}
          {toPersianDigits(filtered.length)} ردیف با فیلتر فعلی نمایش داده
          می‌شود. ثبت لاگ در نسخه‌ی واقعی روی سرور و غیرقابل‌تغییر خواهد بود.
        </p>
      </div>

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
      ) : (
        <DataTable
          caption="گزارش اقدامات"
          rows={filtered}
          columns={columns}
          getRowId={(log) => log.id}
          loading={loading}
          searchText={(log) =>
            `${log.action} ${log.actorName} ${log.entityType} ${log.entityId ?? ""} ${log.summary} ${auditActionLabel(log.action)}`
          }
          searchPlaceholder="جست‌وجو در شرح، مدیر یا شناسه…"
          emptyTitle="اقدامی با این فیلتر پیدا نشد"
          emptyDescription="فیلتر اقدام یا نوع موجودیت را تغییر دهید."
          emptyIcon={ScrollText}
          pageSize={12}
          toolbar={
            <>
              <div>
                <label htmlFor="audit-action" className="sr-only">
                  فیلتر اقدام
                </label>
                <select
                  id="audit-action"
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  className="input-base h-10 min-w-40 text-xs"
                >
                  <option value="all">همه‌ی اقدام‌ها</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {auditActionLabel(action)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="audit-entity" className="sr-only">
                  فیلتر نوع موجودیت
                </label>
                <select
                  id="audit-entity"
                  value={entityFilter}
                  onChange={(event) => setEntityFilter(event.target.value)}
                  className="input-base h-10 min-w-32 text-xs"
                >
                  <option value="all">همه‌ی موجودیت‌ها</option>
                  {entities.map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </select>
              </div>
              {hasFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionFilter("all");
                    setEntityFilter("all");
                  }}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-full border border-black/5 px-3 text-[10px] font-bold text-muted transition hover:text-primary",
                  )}
                >
                  <FilterX className="size-3.5" aria-hidden="true" />
                  پاک کردن فیلتر
                </button>
              ) : null}
            </>
          }
        />
      )}
    </div>
  );
}
