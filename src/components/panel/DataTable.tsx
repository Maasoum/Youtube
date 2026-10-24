import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  caption: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchable?: boolean;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  toolbar?: ReactNode;
}

const DEFAULT_PAGE_SIZE = 8;

export function DataTable<T>({
  caption,
  rows,
  columns,
  getRowId,
  searchable = true,
  searchText,
  searchPlaceholder = "جست‌وجو…",
  pageSize = DEFAULT_PAGE_SIZE,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = "موردی پیدا نشد",
  emptyDescription = "با تغییر جست‌وجو یا فیلترها دوباره تلاش کنید.",
  emptyIcon = Inbox,
  emptyAction,
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const searchId = useId();

  const filtered = useMemo(() => {
    if (!searchable || !searchText || query.trim() === "") return rows;
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => searchText(row).toLowerCase().includes(needle));
  }, [rows, query, searchable, searchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [query, rows.length]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const start = (page - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const pageNumbers = useMemo(() => {
    const numbers: number[] = [];
    const windowSize = 5;
    let first = Math.max(1, page - Math.floor(windowSize / 2));
    const last = Math.min(pageCount, first + windowSize - 1);
    first = Math.max(1, last - windowSize + 1);
    for (let index = first; index <= last; index += 1) {
      numbers.push(index);
    }
    return numbers;
  }, [page, pageCount]);

  return (
    <div className="rounded-3xl border border-black/5 bg-white shadow-[0_18px_45px_-38px_rgba(17,17,17,0.4)]">
      {searchable || toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 p-3 sm:p-4">
          {searchable ? (
            <div className="relative w-full sm:max-w-xs">
              <label htmlFor={searchId} className="sr-only">
                جست‌وجو در {caption}
              </label>
              <Search
                className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="input-base h-10 ps-10 pe-9 text-xs"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="پاک کردن جست‌وجو"
                  className="absolute end-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          {toolbar ? (
            <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-bold text-red-700">
            دریافت اطلاعات ناموفق بود
          </p>
          <p className="mt-2 text-xs leading-6 text-muted">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/25 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary-soft/20"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              تلاش دوباره
            </button>
          ) : null}
        </div>
      ) : loading ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-16 text-xs text-muted"
          role="status"
        >
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          در حال بارگذاری…
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-start text-xs">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="border-b border-black/5 bg-surface-soft/40 text-[10px] text-muted">
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn(
                      "px-4 py-3 font-bold whitespace-nowrap",
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visible.map((row) => (
                <tr
                  key={getRowId(row)}
                  className="transition hover:bg-surface-soft/40"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "px-4 py-3 align-middle leading-6 text-ink",
                        column.cellClassName,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filtered.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-3 py-3 sm:px-4">
          <p className="text-[10px] text-muted">
            نمایش {toPersianDigits(start + 1)} تا{" "}
            {toPersianDigits(Math.min(start + pageSize, filtered.length))} از{" "}
            {toPersianDigits(filtered.length)} مورد
          </p>
          {pageCount > 1 ? (
            <nav
              aria-label={`صفحه‌بندی ${caption}`}
              className="flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                aria-label="صفحه‌ی قبل"
                className="inline-flex size-8 items-center justify-center rounded-full border border-black/5 text-muted transition hover:text-primary disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-current={number === page ? "page" : undefined}
                  aria-label={`صفحه‌ی ${toPersianDigits(number)}`}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition",
                    number === page
                      ? "bg-primary text-white"
                      : "text-muted hover:bg-surface-soft hover:text-ink",
                  )}
                >
                  {toPersianDigits(number)}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                disabled={page === pageCount}
                aria-label="صفحه‌ی بعد"
                className="inline-flex size-8 items-center justify-center rounded-full border border-black/5 text-muted transition hover:text-primary disabled:opacity-40"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
