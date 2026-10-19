import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ConcentricCircles, DotGrid, StarBurst } from "./Decorations";

interface PageIntroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  className,
}: PageIntroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-black/5 bg-surface-soft/70",
        className,
      )}
    >
      <DotGrid className="absolute -start-6 top-10 h-32 w-48 opacity-50" />
      <ConcentricCircles className="absolute -end-28 -top-28 size-[22rem] text-primary/10 sm:-end-20 sm:size-[26rem]" />
      <StarBurst className="absolute -bottom-8 start-[18%] size-24 rotate-12 text-accent/70" />
      <div className="container-page relative py-10 sm:py-16">
        {eyebrow ? (
          <span className="mb-4 inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-primary shadow-sm">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="max-w-3xl text-balance text-3xl font-bold leading-[1.45] text-ink sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-sm leading-8 text-muted sm:text-base">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-7">{children}</div> : null}
      </div>
    </section>
  );
}
