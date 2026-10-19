import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Emphasis } from "./Emphasis";

type SectionTone = "light" | "dark";
type EmphasisTone = "primary" | "accent" | "onDark";

interface SectionTitleProps {
  title: string;
  /** کلمه‌ای از عنوان که با رنگ، وزن و خط موج‌دار برجسته می‌شود. */
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
        "flex flex-col gap-5",
        align === "center"
          ? "items-center text-center"
          : "items-start text-start sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-3xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <span
            className={cn(
              "mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold",
              tone === "dark"
                ? "bg-white/10 text-accent"
                : "bg-primary-soft/35 text-primary",
            )}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            {eyebrow}
          </span>
        ) : null}
        <h2
          id={id}
          className={cn(
            "text-balance text-3xl font-bold leading-[1.5] sm:text-4xl lg:text-[2.7rem]",
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
              "mt-4 text-sm leading-8 sm:text-base",
              tone === "dark" ? "text-white/70" : "text-muted",
              align === "center" && "mx-auto max-w-xl",
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
