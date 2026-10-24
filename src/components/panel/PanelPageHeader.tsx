import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface PanelPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  backTo?: { to: string; label: string };
}

export function PanelPageHeader({
  title,
  description,
  eyebrow,
  actions,
  backTo,
}: PanelPageHeaderProps) {
  return (
    <div className="mb-6">
      {backTo ? (
        <Link
          to={backTo.to}
          className="mb-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-muted transition hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          <ChevronRightIcon />
          {backTo.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-xs leading-7 text-muted sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return <ChevronLeft className="size-3.5 rotate-180" aria-hidden="true" />;
}
