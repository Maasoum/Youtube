import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

type StatTone = "default" | "primary" | "accent" | "danger" | "success";

const toneStyles: Record<StatTone, { icon: string; value: string }> = {
  default: { icon: "bg-surface-soft text-ink", value: "text-ink" },
  primary: { icon: "bg-primary-soft/30 text-primary", value: "text-primary" },
  accent: { icon: "bg-accent/25 text-[#8a6a05]", value: "text-ink" },
  danger: { icon: "bg-red-50 text-red-600", value: "text-red-700" },
  success: {
    icon: "bg-emerald-50 text-emerald-700",
    value: "text-emerald-700",
  },
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
  to?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  to,
}: StatCardProps) {
  const styles = toneStyles[tone];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold leading-5 text-muted">{label}</p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-2xl",
            styles.icon,
          )}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-bold tabular-nums leading-tight",
          styles.value,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[10px] leading-5 text-muted">{hint}</p>
      ) : null}
    </>
  );

  const className =
    "block rounded-3xl border border-black/5 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(17,17,17,0.4)] transition sm:p-5";

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          className,
          "hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
