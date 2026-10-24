import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function PanelCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: PanelCardProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-black/5 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(17,17,17,0.4)] sm:p-5",
        className,
      )}
    >
      {title || action ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-base font-bold text-ink">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs leading-6 text-muted">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
