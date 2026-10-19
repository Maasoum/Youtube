import { Link } from "react-router-dom";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  linked?: boolean;
  showEnglish?: boolean;
  onDark?: boolean;
}

const markSizes = {
  sm: "size-9",
  md: "size-11",
  lg: "size-14",
} as const;

const nameSizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
} as const;

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_8px_24px_-14px_rgba(17,17,17,0.45)] ring-1 ring-black/5",
        className,
      )}
    >
      <svg viewBox="0 0 44 44" className="h-full w-full" focusable="false">
        <circle cx="11.5" cy="11" r="8.5" fill="#FF7A6B" />
        <rect x="23" y="3" width="18" height="18" rx="6.5" fill="#3F6DF6" />
        <path
          d="M3.5 27.5C3.5 23.4 6.8 20 11 20h9.5v9.5c0 4.2-3.4 7.5-7.5 7.5h-.5c-4.2 0-7.5-3.4-7.5-7.5Z"
          fill="#7CC4FF"
        />
        <path
          d="M32.4 23.4c.5-1.6 2.8-1.6 3.3 0l1.2 4 4-1.2c1.6-.5 2.8 1.3 1.7 2.5l-2.8 3 2.8 3c1.1 1.2-.1 3-1.7 2.5l-4-1.2-1.2 4c-.5 1.6-2.8 1.6-3.3 0l-1.2-4-4 1.2c-1.6.5-2.8-1.3-1.7-2.5l2.8-3-2.8-3c-1.1-1.2.1-3 1.7-2.5l4 1.2 1.2-4Z"
          fill="#F7C948"
        />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  size = "md",
  linked = true,
  showEnglish = true,
  onDark = false,
}: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markSizes[size]} />
      <span className="flex flex-col items-start">
        <span
          className={cn(
            "font-bold leading-tight",
            onDark ? "text-white" : "text-ink",
            nameSizes[size],
          )}
        >
          {brand.nameFa}
        </span>
        {showEnglish ? (
          <span
            dir="ltr"
            className={cn(
              "ltr-inline mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em]",
              onDark ? "text-white/55" : "text-muted",
            )}
          >
            {brand.nameEn}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!linked) {
    return content;
  }

  return (
    <Link
      to="/"
      aria-label={`${brand.nameFa} — صفحه‌ی اصلی`}
      className="inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
    >
      {content}
    </Link>
  );
}
