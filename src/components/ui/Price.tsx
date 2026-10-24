import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

interface PriceProps {
  amount: number;
  compareAt?: number;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
  className?: string;
}

const amountSizes = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl sm:text-3xl",
};

export function Price({
  amount,
  compareAt,
  size = "md",
  tone = "light",
  className,
}: PriceProps) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-bold tabular-nums",
          amountSizes[size],
          tone === "light" ? "text-ink" : "text-white",
        )}
      >
        {formatNumber(amount)}
        <span
          className={cn(
            "ms-1 text-xs",
            tone === "light" ? "text-muted" : "text-white/70",
          )}
        >
          تومان
        </span>
      </span>
      {compareAt && compareAt > amount ? (
        <span
          className={cn(
            "text-xs line-through",
            tone === "light" ? "text-muted/70" : "text-white/50",
          )}
        >
          {formatNumber(compareAt)}
        </span>
      ) : null}
    </div>
  );
}
