import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ChipTone = "lavender" | "purple" | "yellow" | "white" | "ink";

interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}

const toneClasses: Record<ChipTone, string> = {
  lavender: "bg-primary-soft/70 text-primary-dark",
  purple: "bg-primary text-white",
  yellow: "bg-accent text-ink",
  white: "bg-white text-primary shadow-sm",
  ink: "bg-ink text-white",
};

export function Chip({ children, tone = "white", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
