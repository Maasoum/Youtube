import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border border-dashed border-primary/20 bg-surface-soft/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-7 text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
