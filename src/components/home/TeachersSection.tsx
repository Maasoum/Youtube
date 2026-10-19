import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Quote,
  RefreshCw,
} from "lucide-react";
import type { Teacher } from "@/api";
import { brand } from "@/config/brand";
import { toPersianDigits } from "@/lib/format";
import { useTeachers } from "@/hooks/useHomeContent";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import {
  ConcentricCircles,
  ScallopStar,
} from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

const accentClasses: Record<Teacher["accent"], string> = {
  lavender: "bg-primary-soft text-primary-dark",
  yellow: "bg-accent text-ink",
  sky: "bg-[#BFE0FF] text-[#194E86]",
  coral: "bg-[#FFD3CB] text-[#8C3727]",
};

export function TeachersSection() {
  const { items: teachers, loading, error, reload } = useTeachers();
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const position = Math.abs(track.scrollLeft);
    setAtStart(position <= 6);
    setAtEnd(position >= maxScroll - 6);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(track);
    return () => observer.disconnect();
  }, [teachers, updateScrollState]);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-teacher-card]");
    const gap = 16;
    const amount = (card?.offsetWidth ?? 320) + gap;
    const isRtl = getComputedStyle(track).direction === "rtl";
    track.scrollBy({
      left: direction * amount * (isRtl ? -1 : 1),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByCard(1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByCard(-1);
    }
  };

  return (
    <section
      className="relative overflow-hidden bg-primary py-16 text-white sm:py-24"
      aria-labelledby="teachers-title"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.22)_1.4px,transparent_1.4px)] [background-size:20px_20px] opacity-40"
      />
      <ConcentricCircles className="absolute -end-40 -top-40 size-[34rem] text-white/10" />
      <ScallopStar className="absolute start-[6%] top-14 hidden size-20 -rotate-12 text-accent/70 md:block" />
      <span className="absolute -start-24 bottom-10 size-64 rounded-full bg-white/5 blur-2xl" />

      <Container className="relative">
        <Reveal>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-accent">
            <Quote className="size-3.5" aria-hidden="true" />
            مربیان {brand.nameFa}
          </span>
          <blockquote className="max-w-4xl">
            <p className="text-balance text-2xl font-bold leading-[1.7] text-white sm:text-4xl sm:leading-[1.6]">
              «هدف ما کمک به کودکان برای کشف{" "}
              <span className="relative inline-block text-accent">
                لذت یادگیری خلاق
                <svg
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="absolute -bottom-1 start-0 h-2.5 w-full text-accent/80"
                >
                  <path
                    d="M2 8c18-5 32 3 50-1s31 4 48 0 32 4 48-1 30 2 50-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              و رشد به‌عنوان انسان‌هایی همه‌جانبه است.»
            </p>
          </blockquote>
          <p className="mt-5 text-sm text-white/60">
            تیمی از مربیان، مهندسان و روان‌شناسان کودک که کنار هم مسیر یادگیری
            را می‌سازند.
          </p>
        </Reveal>

        <div className="mt-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <SectionTitle
              id="teachers-title"
              align="start"
              tone="dark"
              title="با مربیان ما آشنا شوید"
              highlight="مربیان"
              className="[&_h2]:text-2xl sm:[&_h2]:text-3xl"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={atStart}
                aria-label="مربیان قبلی"
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={atEnd}
                aria-label="مربیان بعدی"
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="h-64 animate-pulse rounded-3xl bg-white/10"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/15 bg-white/10 p-8 text-center">
              <AlertCircle className="size-8 text-accent" aria-hidden="true" />
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
            <div
              ref={trackRef}
              role="region"
              aria-roledescription="کاروسل"
              aria-label={`مربیان ${brand.nameFa}، با کلیدهای جهت‌دار جابه‌جا کنید`}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onScroll={updateScrollState}
              className="no-scrollbar -mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-2 pb-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              {teachers.map((teacher, index) => (
                <article
                  key={teacher.id}
                  data-teacher-card
                  aria-label={`${teacher.name} — ${teacher.role}`}
                  className="w-[84%] shrink-0 snap-start rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition hover:border-white/35 hover:bg-white/[0.14] sm:w-[47%] lg:w-[31.8%]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "relative flex size-14 items-center justify-center rounded-full text-lg font-bold ring-2 ring-white/25",
                          accentClasses[teacher.accent],
                        )}
                        aria-hidden="true"
                      >
                        {teacher.initials}
                        <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[8px] text-ink ring-2 ring-primary">
                          ✦
                        </span>
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {teacher.name}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-accent">
                          {teacher.role}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-2xl font-bold text-white/20"
                      aria-hidden="true"
                    >
                      {toPersianDigits(String(index + 1).padStart(2, "0"))}
                    </span>
                  </div>
                  <p className="mt-6 text-sm leading-8 text-white/65">
                    {teacher.bio}
                  </p>
                  <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
                    <span className="inline-flex size-2 rounded-full bg-accent" />
                    <span className="text-[11px] font-bold text-white/45">
                      همراه مسیر یادگیری
                    </span>
                    <ScallopStar className="ms-auto size-5 text-white/20" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
