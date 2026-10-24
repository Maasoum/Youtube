import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronLeft,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import {
  getErrorMessage,
  notificationsApi,
  type Notification,
} from "@/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { formatRelativeTime, formatDateTime, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

const kindMeta: Record<
  Notification["kind"],
  { icon: typeof Bell; className: string; label: string }
> = {
  license: {
    icon: ShieldCheck,
    className: "bg-emerald-50 text-emerald-700",
    label: "لایسنس",
  },
  order: {
    icon: ShoppingBag,
    className: "bg-sky-50 text-sky-700",
    label: "سفارش",
  },
  system: {
    icon: Bell,
    className: "bg-surface-soft text-muted",
    label: "سیستم",
  },
};

export function DashboardNotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await notificationsApi.list());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = items.filter((item) => !item.readAt).length;
  const visible = useMemo(
    () => (onlyUnread ? items.filter((item) => !item.readAt) : items),
    [items, onlyUnread],
  );

  const handleOpen = async (item: Notification) => {
    if (!item.readAt) {
      try {
        const updated = await notificationsApi.markRead(item.id);
        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? updated : entry)),
        );
      } catch {
        // خواندن اعلان نباید مانع رفتن به مقصد شود.
      }
    }
    if (item.href) navigate(item.href);
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      const updated = await notificationsApi.markAllRead();
      setItems(
        [...updated].sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        ),
      );
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل کاربری"
        title="اعلان‌ها"
        description="خبرهای لایسنس، سفارش و پیام‌های سیستمی؛ همه در یک جا."
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary-soft/20 disabled:opacity-60"
            >
              {markingAll ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="size-3.5" aria-hidden="true" />
              )}
              خواندن همه
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5" role="group" aria-label="فیلتر اعلان‌ها">
          <button
            type="button"
            onClick={() => setOnlyUnread(false)}
            aria-pressed={!onlyUnread}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11px] font-bold transition",
              !onlyUnread
                ? "bg-primary text-white"
                : "border border-black/5 bg-white text-muted hover:text-ink",
            )}
          >
            همه ({toPersianDigits(items.length)})
          </button>
          <button
            type="button"
            onClick={() => setOnlyUnread(true)}
            aria-pressed={onlyUnread}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11px] font-bold transition",
              onlyUnread
                ? "bg-primary text-white"
                : "border border-black/5 bg-white text-muted hover:text-ink",
            )}
          >
            خوانده‌نشده ({toPersianDigits(unreadCount)})
          </button>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-muted transition hover:text-primary"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          به‌روزرسانی
        </button>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      ) : error ? (
        <PanelCard>
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-red-700">
              اعلان‌ها دریافت نشد
            </p>
            <p className="mt-2 text-xs text-muted">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-full border border-primary/25 px-4 py-2 text-xs font-bold text-primary"
            >
              تلاش دوباره
            </button>
          </div>
        </PanelCard>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={onlyUnread ? BellOff : Bell}
          title={onlyUnread ? "اعلان خوانده‌نشده‌ای ندارید" : "هنوز اعلانی ندارید"}
          description={
            onlyUnread
              ? "همه‌ی اعلان‌ها را خوانده‌اید. خبرهای تازه اینجا نمایش داده می‌شوند."
              : "با ثبت سفارش یا آماده‌شدن لایسنس، اولین اعلان شما اینجا ظاهر می‌شود."
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => {
            const meta = kindMeta[item.kind];
            const Icon = meta.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void handleOpen(item)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-3xl border p-4 text-start transition hover:border-primary/20 hover:shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                    item.readAt
                      ? "border-black/5 bg-white"
                      : "border-primary/15 bg-primary-soft/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                      meta.className,
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-ink">
                        {item.title}
                      </span>
                      {!item.readAt ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-ink">
                          جدید
                        </span>
                      ) : null}
                      <span className="text-[10px] text-muted">
                        {meta.label}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-6 text-muted">
                      {item.body}
                    </span>
                    <span className="mt-1.5 block text-[10px] text-muted/80">
                      {formatRelativeTime(item.createdAt)} ·{" "}
                      {formatDateTime(item.createdAt)}
                    </span>
                  </span>
                  {item.href ? (
                    <ChevronLeft
                      className="mt-2 size-4 shrink-0 text-muted"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
