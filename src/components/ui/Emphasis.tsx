import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Squiggle } from "./Decorations";

interface EmphasisProps {
  children: ReactNode;
  tone?: "primary" | "accent" | "onDark";
  className?: string;
}

export function Emphasis({
  children,
  tone = "primary",
  className,
}: EmphasisProps) {
  return (
    <span
      className={cn(
        "relative inline-block whitespace-nowrap font-bold",
        tone === "primary"
          ? "text-primary"
          : tone === "accent"
            ? "text-[#B07F00]"
            : "text-accent",
        className,
      )}
    >
      <span className="relative z-10">{children}</span>
      <Squiggle
        className={cn(
          "absolute -bottom-1 start-0 w-full",
          tone === "onDark" ? "text-white/70" : "text-accent",
        )}
      />
    </span>
  );
}
