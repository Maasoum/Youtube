import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-5 animate-spin text-primary", className)}
      aria-hidden="true"
    />
  );
}

export function PageLoader({ label = "در حال بارگذاری…" }: { label?: string }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4" role="status">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary-soft/30">
        <Spinner className="size-6" />
      </span>
      <p className="text-sm font-bold text-muted">{label}</p>
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="card-surface overflow-hidden" aria-hidden="true">
      <div className="h-44 animate-pulse bg-surface-soft" />
      <div className="space-y-4 p-6">
        <div className="h-4 w-24 animate-pulse rounded-full bg-surface-soft" />
        <div className="h-6 w-4/5 animate-pulse rounded-full bg-surface-soft" />
        <div className="h-4 w-full animate-pulse rounded-full bg-surface-soft" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-soft" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 w-28 animate-pulse rounded-full bg-surface-soft" />
          <div className="h-10 w-24 animate-pulse rounded-full bg-surface-soft" />
        </div>
      </div>
    </div>
  );
}
