import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  CheckCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { notificationsApi, getErrorMessage, type Notification } from "@/api";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsApi.list();
      setItems(data);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unread = items.filter((item) => !item.readAt).length;

  const handleOpenItem = async (item: Notification) => {
    setBusyId(item.id);
    try {
      if (!item.readAt) {
        const updated = await notificationsApi.markRead(item.id);
        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? updated : entry)),
        );
      }
      setOpen(false);
      window.dispatchEvent(new Event("brightpaths:notifications-changed"));
      navigate(item.href ?? "/dashboard/notifications");
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAll = async () => {
    setLoading(true);
    try {
      const updated = await notificationsApi.markAllRead();
      setItems(
        [...updated].sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        ),
      );
      window.dispatchEvent(new Event("brightpaths:notifications-changed"));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unread > 0 ? `اعلان‌ها، ${unread} اعلان خوانده‌نشده` : "اعلان‌ها"
        }
        className="relative inline-flex size-10 items-center justify-center rounded-full border border-black/5 bg-white text-muted transition hover:border-primary/20 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
      >
        {unread > 0 ? (
          <BellRing className="size-5" aria-hidden="true" />
        ) : (
          <Bell className="size-5" aria-hidden="true" />
        )}
        {unread > 0 ? (
          <span className="absolute -top-0.5 -end-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[10px] font-bold tabular-nums text-ink ring-2 ring-white">
            {unread.toLocaleString("fa-IR")}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute end-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-black/5 px-4 py-3">
            <p className="text-sm font-bold text-ink">اعلان‌ها</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-primary transition hover:bg-primary-soft/20 disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                خواندن همه
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                در حال دریافت اعلان‌ها…
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs leading-6 text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  تلاش دوباره
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto size-7 text-muted/50" aria-hidden="true" />
                <p className="mt-3 text-xs font-bold text-ink">
                  هنوز اعلانی ندارید
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  وقتی لایسنس یا سفارشی به‌روزرسانی شود، اینجا خبر می‌دهیم.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-black/5">
                {items.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void handleOpenItem(item)}
                      disabled={busyId === item.id}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-start transition hover:bg-surface-soft/70 focus-visible:bg-surface-soft focus-visible:outline-none disabled:opacity-60",
                        !item.readAt && "bg-primary-soft/10",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          item.readAt ? "bg-black/10" : "bg-primary",
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ink">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-[11px] leading-5 text-muted">
                          {item.body}
                        </span>
                        <span className="mt-1.5 block text-[10px] text-muted/80">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/dashboard/notifications");
            }}
            className="block w-full border-t border-black/5 bg-surface-soft/40 px-4 py-3 text-center text-[11px] font-bold text-primary transition hover:bg-surface-soft"
          >
            مشاهده‌ی همه‌ی اعلان‌ها
          </button>
        </div>
      ) : null}
    </div>
  );
}
