import { AlertCircle, Quote, RefreshCw } from "lucide-react";
import type { Teacher } from "@/api";
import { brand } from "@/config/brand";
import { useTeachers } from "@/hooks/useHomeContent";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

const accentClasses: Record<Teacher["accent"], string> = {
  lavender: "bg-primary-soft text-primary-dark",
  yellow: "bg-accent text-ink",
  sky: "bg-[#BFE0FF] text-[#194E86]",
  coral: "bg-[#FFD3CB] text-[#8C3727]",
};

export function TeachersSection() {
  const { items: teachers, loading, error, reload } = useTeachers();

  return (
    <section
      className="bg-primary py-16 text-white sm:py-24"
      aria-label={`مربیان ${brand.nameFa}`}
    >
      <Container className="text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-accent">
            <Quote className="size-3.5" aria-hidden="true" />
            مربیان {brand.nameFa}
          </span>

          <blockquote className="mx-auto mt-6 max-w-3xl">
            <p className="text-balance text-[1.4rem] font-bold leading-[1.75] sm:text-[2rem] sm:leading-[1.65]">
              «هدف ما کمک به کودکان برای کشف{" "}
              <span className="text-accent">لذت یادگیری خلاق</span> و رشد
              به‌عنوان انسان‌هایی همه‌جانبه است.»
            </p>
          </blockquote>

          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/60">
            تیمی از مربیان، مهندسان و روان‌شناسان کودک که کنار هم مسیر یادگیری
            را می‌سازند.
          </p>
        </Reveal>

        <div className="mt-14">
          {loading ? (
            <div
              className="flex flex-wrap justify-center gap-x-10 gap-y-10"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex w-28 flex-col items-center gap-4">
                  <span className="size-24 animate-pulse rounded-full bg-white/15 sm:size-28" />
                  <span className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-[2rem] bg-white/10 p-8">
              <AlertCircle className="size-7 text-accent" aria-hidden="true" />
              <p className="text-sm font-bold text-white">{error}</p>
              <Button
                variant="onDark"
                size="sm"
                icon={RefreshCw}
                onClick={reload}
              >
                تلاش دوباره
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-10 sm:gap-x-16">
              {teachers.map((teacher, index) => (
                <Reveal key={teacher.id} delay={index * 0.06}>
                  <div className="flex w-28 flex-col items-center sm:w-32">
                    <span
                      className={cn(
                        "flex size-24 items-center justify-center rounded-full text-2xl font-bold ring-4 ring-white/15 sm:size-28",
                        accentClasses[teacher.accent],
                      )}
                      aria-hidden="true"
                    >
                      {teacher.initials}
                    </span>
                    <p className="mt-4 text-sm font-bold text-white">
                      {teacher.name}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-white/55">
                      {teacher.role}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
