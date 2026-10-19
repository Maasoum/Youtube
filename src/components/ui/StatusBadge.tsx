import { CheckCircle2, Clock3, CreditCard, XCircle } from "lucide-react";
import type { CourseLevel, OrderStatus } from "@/api";
import { courseLevelLabels, orderStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/cn";

const statusStyles: Record<OrderStatus, string> = {
  awaiting_payment: "bg-amber-50 text-amber-800",
  paid: "bg-sky-50 text-sky-800",
  delivered: "bg-emerald-50 text-emerald-800",
  canceled: "bg-red-50 text-red-700",
};

const statusIcons = {
  awaiting_payment: CreditCard,
  paid: Clock3,
  delivered: CheckCircle2,
  canceled: XCircle,
};

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
