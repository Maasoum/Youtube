import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Squiggle } from "./Decorations";

type EmphasisTone = "primary" | "accent" | "onDark";
type UnderlineWeight = "normal" | "bold";

interface EmphasisProps {
  children: ReactNode;
  tone?: EmphasisTone;
  /** ضخامت خط زیر واژه؛ «bold» برای تیترهای بزرگ مثل H1. */
  underline?: UnderlineWeight;
  className?: string;
}

/**
 * رنگ واژه و خط زیر آن. خط دقیقاً هم‌رنگ خود واژه است ولی با شفافیت کمتر
 * کشیده می‌شود تا مثل ماژیک زیر کلمه بنشیند و متن را خفه نکند.
 */
const toneStyles: Record<EmphasisTone, { text: string; underline: string }> = {
  primary: {
    text: "text-primary",
    underline: "text-primary/45",
  },
  accent: {
    text: "text-accent",
    underline: "text-accent/55",
  },
  onDark: {
    text: "text-accent",
    underline: "text-white/60",
  },
};

/**
 * جای خط زیر واژه، بر حسب `em` و بر پایه‌ی کادر `leading-none`:
 * فونت پِیدا بالای خط پایه ۰.۹em و پایین آن ۰.۵em ارتفاع دارد؛ با line-height: 1
 * کادر متن از خط پایه تا ۰.۳em پایین‌تر تمام می‌شود. خط دقیقاً زیر دنباله‌ی
 * حروف (حدود ۰.۲۶em) می‌نشیند. چون همه‌چیز em است، در H1 و در تیترهای کوچک
 * و با هر line-height یکسان دیده می‌شود.
 */
const underlineStyles: Record<
  UnderlineWeight,
  { stroke: number; box: string }
> = {
  normal: { stroke: 5.5, box: "h-[0.16em] bottom-[-0.15em]" },
  bold: { stroke: 5.5, box: "h-[0.22em] bottom-[-0.20em]" },
};

export function Emphasis({
  children,
  tone = "primary",
  underline = "normal",
  className,
}: EmphasisProps) {
  const toneStyle = toneStyles[tone];
  const underlineStyle = underlineStyles[underline];

  return (
    <span
      className={cn(
        "relative inline-block whitespace-nowrap font-bold leading-none",
        toneStyle.text,
        className,
      )}
    >
      <span className="relative z-10">{children}</span>
      <Squiggle
        strokeWidth={underlineStyle.stroke}
        className={cn(
          "absolute start-0 w-full",
          underlineStyle.box,
          toneStyle.underline,
        )}
      />
    </span>
  );
}
