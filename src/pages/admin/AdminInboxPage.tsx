import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  ChevronDown,
  Mail,
  MailOpen,
  RefreshCw,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type InboxMessage,
  type MessageStatus,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { formatDateTime, formatRelativeTime, toPersianDigits } from "@/lib/format";
import {
  messageStatusLabels,
  messageStatusStyles,
} from "@/lib/labels";
import { cn } from "@/lib/cn";

type MessageFilter = "all" | MessageStatus;

const statusOf = (message: InboxMessage): MessageStatus =>
  message.status ?? "new";

export function AdminInboxPage() {
  const { notify } = useToast();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MessageFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMessages(await adminApi.listInbox());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: messages.length,
      new: messages.filter((message) => statusOf(message) === "new").length,
      read: messages.filter((message) => statusOf(message) === "read").length,
      done: messages.filter((message) => statusOf(message) === "done").length,
    }),
    [messages],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return messages.filter((message) => {
      const matchesStatus = filter === "all" || statusOf(message) === filter;
      if (!matchesStatus) return false;
      if (!needle) return true;
      return `${message.name} ${message.email} ${message.subject} ${message.message}`
        .toLowerCase()
        .includes(needle);
    });
  }, [filter, messages, query]);

  const changeStatus = async (message: InboxMessage, status: MessageStatus) => {
    if (statusOf(message) === status) return;
    setUpdatingId(message.id);
    try {
      const updated = await adminApi.updateInboxStatus(message.id, status);
      setMessages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify(`وضعیت پیام به «${messageStatusLabels[status]}» تغییر کرد.`, "success");
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <PanelPageHeader
        eyebrow="ارتباط با خانواده‌ها"
        title="پیام‌های تماس"
        description={`${toPersianDigits(counts.new)} پیام تازه در انتظار بررسی است. وضعیت هر پیام را بین تازه، خوانده‌شده و انجام‌شده جابه‌جا کنید.`}
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all", label: "همه" },
            { id: "new", label: "تازه" },
            { id: "read", label: "خوانده‌شده" },
            { id: "done", label: "انجام‌شده" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              filter === item.id
                ? "border-primary bg-primary text-white"
                : "border-black/5 bg-white text-muted hover:text-primary",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] tabular-nums",
                filter === item.id ? "bg-white/20" : "bg-surface-soft",
              )}
            >
              {toPersianDigits(counts[item.id])}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <label htmlFor="inbox-search" className="sr-only">
          جست‌وجو در پیام‌ها
        </label>
        <input
          id="inbox-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جست‌وجو بر اساس نام، ایمیل یا متن…"
          className="input-base h-10 text-xs"
        />
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-36 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      ) : error ? (
        <PanelCard>
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-red-700">پیام‌ها دریافت نشد</p>
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="پیامی پیدا نشد"
          description={
            messages.length === 0
              ? "پیام‌های فرم تماس در این صفحه جمع می‌شوند."
              : "فیلتر وضعیت یا عبارت جست‌وجو را تغییر دهید."
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((message) => {
            const status = statusOf(message);
            return (
              <li
                key={message.id}
                className={cn(
                  "rounded-3xl border bg-white p-4 shadow-[0_18px_45px_-38px_rgba(17,17,17,0.4)]",
                  status === "new" ? "border-primary/20" : "border-black/5",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-ink">{message.subject}</p>
                      <span
                        className={cn(
                          "chip text-[9px]",
                          messageStatusStyles[status],
                        )}
                      >
                        {messageStatusLabels[status]}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted">
                      {message.name} ·{" "}
                      <a
                        href={`mailto:${message.email}`}
                        className="text-primary"
                        dir="ltr"
                      >
                        {message.email}
                      </a>
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-[9px] text-muted">
                      {formatRelativeTime(message.createdAt)} ·{" "}
                      {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-xs leading-7 text-ink/80">
                  {message.message}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(`پاسخ به پیام: ${message.subject}`)}`}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-3 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary-soft/20"
                  >
                    <Mail className="size-3.5" aria-hidden="true" />
                    پاسخ با ایمیل
                  </a>

                  {status === "new" ? (
                    <button
                      type="button"
                      onClick={() => void changeStatus(message, "read")}
                      disabled={updatingId === message.id}
                      className="inline-flex items-center gap-1 rounded-full border border-black/5 px-3 py-1.5 text-[10px] font-bold text-muted transition hover:text-primary disabled:opacity-40"
                    >
                      <MailOpen className="size-3.5" aria-hidden="true" />
                      خوانده شد
                    </button>
                  ) : null}

                  {status !== "done" ? (
                    <button
                      type="button"
                      onClick={() => void changeStatus(message, "done")}
                      disabled={updatingId === message.id}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-40"
                    >
                      <CheckCheck className="size-3.5" aria-hidden="true" />
                      انجام شد
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void changeStatus(message, "read")}
                      disabled={updatingId === message.id}
                      className="inline-flex items-center gap-1 rounded-full border border-black/5 px-3 py-1.5 text-[10px] font-bold text-muted transition hover:text-primary disabled:opacity-40"
                    >
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                      بازگشت به خوانده‌شده
                    </button>
                  )}

                  {status !== "new" ? (
                    <button
                      type="button"
                      onClick={() => void changeStatus(message, "new")}
                      disabled={updatingId === message.id}
                      className="ms-auto text-[10px] font-bold text-muted underline decoration-black/15 underline-offset-4 transition hover:text-primary disabled:opacity-40"
                    >
                      علامت‌گذاری به‌عنوان تازه
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
