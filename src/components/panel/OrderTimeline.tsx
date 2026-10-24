import type { OrderStatusEvent } from "@/api";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/format";

export function OrderTimeline({ events }: { events: OrderStatusEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-soft/60 p-4 text-xs text-muted">
        هنوز رویدادی برای این سفارش ثبت نشده است.
      </p>
    );
  }

  const ordered = [...events].reverse();

  return (
    <ol className="space-y-0">
      {ordered.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < ordered.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute start-[7px] top-4 h-full w-px bg-black/10"
            />
          ) : null}
          <span
            aria-hidden="true"
            className={
              index === 0
                ? "relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-white bg-primary shadow-[0_0_0_1px_rgba(100,70,224,0.3)]"
                : "relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-white bg-black/20"
            }
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={event.status} />
              <span className="text-[10px] text-muted">
                {formatDateTime(event.at)}
              </span>
            </div>
            {event.note ? (
              <p className="mt-1.5 text-xs leading-6 text-ink">{event.note}</p>
            ) : null}
            {event.byName ? (
              <p className="mt-0.5 text-[10px] text-muted">
                ثبت‌شده توسط {event.byName}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
