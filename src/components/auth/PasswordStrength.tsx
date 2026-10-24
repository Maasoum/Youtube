import { CheckCircle2, Circle } from "lucide-react";
import { evaluatePasswordStrength } from "@/lib/password";
import { cn } from "@/lib/cn";

const barColors = {
  empty: "bg-black/10",
  weak: "bg-red-500",
  fair: "bg-amber-400",
  good: "bg-sky-500",
  strong: "bg-emerald-500",
} as const;

const textColors = {
  empty: "text-muted",
  weak: "text-red-600",
  fair: "text-amber-700",
  good: "text-sky-700",
  strong: "text-emerald-700",
} as const;

export function PasswordStrength({ value }: { value: string }) {
  const result = evaluatePasswordStrength(value);
  const filled = result.score;

  return (
    <div aria-live="polite" className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index < filled ? barColors[result.level] : "bg-black/10",
              )}
            />
          ))}
        </div>
        <span className={cn("text-[11px] font-bold", textColors[result.level])}>
          {result.label}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
        <li className="flex items-center gap-1">
          {value.length >= 8 ? (
            <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
          ) : (
            <Circle className="size-3" aria-hidden="true" />
          )}
          حداقل ۸ کاراکتر
        </li>
        <li className="flex items-center gap-1">
          {/[A-Za-z]/.test(value) && /\d/.test(value) ? (
            <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
          ) : (
            <Circle className="size-3" aria-hidden="true" />
          )}
          حرف و عدد
        </li>
        <li className="flex items-center gap-1">
          {value.length >= 12 ? (
            <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
          ) : (
            <Circle className="size-3" aria-hidden="true" />
          )}
          ۱۲ کاراکتر یا بیشتر
        </li>
      </ul>
    </div>
  );
}
