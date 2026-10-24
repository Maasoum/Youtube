import {
  Ban,
  CheckCircle2,
  Clock3,
  CreditCard,
  PauseCircle,
  RotateCcw,
  TimerOff,
  XCircle,
} from "lucide-react";
import type { CourseLevel, OrderStatus } from "@/api";
import { courseLevelLabels, orderStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/cn";

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-800",
  awaiting_license: "bg-sky-50 text-sky-800",
  fulfilled: "bg-emerald-50 text-emerald-800",
  on_hold: "bg-orange-50 text-orange-800",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-zinc-100 text-zinc-700",
  expired: "bg-surface-soft text-muted",
  refunded: "bg-purple-50 text-purple-700",
};

const statusIcons = {
  pending: CreditCard,
  awaiting_license: Clock3,
  fulfilled: CheckCircle2,
  on_hold: PauseCircle,
  failed: XCircle,
  cancelled: Ban,
  expired: TimerOff,
  refunded: RotateCcw,
} as const;

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const Icon = statusIcons[status];
  return (
    <span className={cn("chip", statusStyles[status], className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {orderStatusLabels[status]}
    </span>
  );
}

const levelStyles: Record<CourseLevel, string> = {
  beginner: "bg-primary-soft/45 text-primary",
  intermediate: "bg-sky-100 text-sky-800",
  advanced: "bg-amber-100 text-amber-800",
};

export function LevelBadge({
  level,
  className,
}: {
  level: CourseLevel;
  className?: string;
}) {
  return (
    <span className={cn("chip", levelStyles[level], className)}>
      {courseLevelLabels[level]}
    </span>
  );
}
