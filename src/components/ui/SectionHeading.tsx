import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  className?: string;
  action?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  className,
  action,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        centered && "sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
        {eyebrow ? (
          <span
            className={cn(
              "mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft/35 px-3.5 py-1.5 text-xs font-bold text-primary",
            )}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            {eyebrow}
          </span>
        ) : null}
        <h2
          className={cn(
            "text-balance text-3xl font-bold leading-[1.45] text-ink sm:text-4xl",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-4 text-sm leading-8 text-muted sm:text-base",
              centered && "mx-auto max-w-xl",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
