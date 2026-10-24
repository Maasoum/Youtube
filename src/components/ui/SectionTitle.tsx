import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Emphasis } from "./Emphasis";

type SectionTone = "light" | "dark";
type EmphasisTone = "primary" | "accent" | "onDark";

interface SectionTitleProps {
  title: string;
  /** کلمه‌ای از عنوان که با رنگ و خط موج‌دار برجسته می‌شود. */
  highlight?: string;
  eyebrow?: string;
  description?: ReactNode;
  align?: "center" | "start";
  tone?: SectionTone;
  emphasisTone?: EmphasisTone;
  action?: ReactNode;
  className?: string;
  id?: string;
}

export function SectionTitle({
  title,
  highlight,
  eyebrow,
  description,
  align = "center",
  tone = "light",
  emphasisTone,
  action,
  className,
  id,
}: SectionTitleProps) {
  const highlightIndex = highlight ? title.indexOf(highlight) : -1;
  const before = highlightIndex >= 0 ? title.slice(0, highlightIndex) : title;
  const highlighted =
    highlightIndex >= 0 && highlight
      ? title.slice(highlightIndex, highlightIndex + highlight.length)
      : "";
  const after =
    highlightIndex >= 0 && highlight
      ? title.slice(highlightIndex + highlight.length)
      : "";

  const resolvedEmphasisTone: EmphasisTone =
    emphasisTone ?? (tone === "dark" ? "onDark" : "primary");

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        align === "center"
          ? "items-center text-center"
          : "items-start text-start sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <span
            className={cn(
              "mb-3 inline-flex items-center gap-2 text-xs font-bold",
              tone === "dark" ? "text-accent" : "text-primary/75",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-block size-1.5 rounded-full",
                tone === "dark" ? "bg-accent" : "bg-primary",
              )}
            />
            {eyebrow}
          </span>
        ) : null}
        <h2
          id={id}
          className={cn(
            "text-balance text-[1.9rem] font-bold leading-[1.55] sm:text-[2.35rem] lg:text-[2.7rem]",
            tone === "dark" ? "text-white" : "text-ink",
          )}
        >
          {highlightIndex >= 0 ? (
            <>
              {before}
              <Emphasis tone={resolvedEmphasisTone}>{highlighted}</Emphasis>
              {after}
            </>
          ) : (
            title
          )}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-4 max-w-xl text-sm leading-8 sm:text-[15px]",
              tone === "dark" ? "text-white/65" : "text-muted",
              align === "center" && "mx-auto",
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
