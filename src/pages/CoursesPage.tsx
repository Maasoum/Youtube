import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, SlidersHorizontal } from "lucide-react";
import type { CourseLevel } from "@/api";
import { brand } from "@/config/brand";
import { useCourses } from "@/hooks/useCourses";
import { PageIntro } from "@/components/ui/PageIntro";
import { Emphasis } from "@/components/ui/Emphasis";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseCardSkeleton } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { courseLevelLabels } from "@/lib/labels";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

type LevelFilter = CourseLevel | "all";

const filters: Array<{ value: LevelFilter; label: string }> = [
  { value: "all", label: "همه‌ی دوره‌ها" },
  { value: "beginner", label: courseLevelLabels.beginner },
  { value: "intermediate", label: courseLevelLabels.intermediate },
  { value: "advanced", label: courseLevelLabels.advanced },
];

export function CoursesPage() {
  const { courses, loading, error, reload } = useCourses();
  const [level, setLevel] = useState<LevelFilter>("all");

  useEffect(() => {
    document.title = `دوره‌ها | ${brand.nameFa}`;
  }, []);

  const visibleCourses = useMemo(
    () => (level === "all" ? courses : courses.filter((course) => course.level === level)),
    [courses, level],
  );

  return (
    <>
      <PageIntro
        eyebrow="مسیرهای یادگیری"
        title={
          <>
            دوره‌ای برای هر سن، هر سطح و هر{" "}
            <Emphasis>کنجکاوی</Emphasis>
          </>
        }
        description="چهار مسیر طراحی‌شده برای کودکان ۸ تا ۱۴ سال. همه‌ی دوره‌ها لایسنس دائمی و تک‌کاربره دارند و با راهنمای والدین همراه هستند."
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            بدون اشتراک ماهانه
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            تحویل لایسنس تا یک روز کاری
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            ضمانت بازگشت ۷ روزه
          </span>
        </div>
      </PageIntro>

      <section className="container-page py-12 sm:py-16" aria-label="فهرست دوره‌ها">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span>
              {loading
                ? "در حال دریافت دوره‌ها…"
                : `${toPersianDigits(visibleCourses.length)} دوره`}
            </span>
          </div>

          <div
            role="group"
            aria-label="فیلتر سطح دوره"
            className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          >
            {filters.map((filter) => {
              const isActive = level === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setLevel(filter.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition",
                    isActive
                      ? "border-primary bg-primary text-white"
                      : "border-black/10 bg-white text-muted hover:border-primary/30 hover:text-primary",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <CourseCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50 px-6 py-12 text-center">
            <AlertCircle className="size-9 text-red-500" aria-hidden="true" />
            <h2 className="text-lg font-bold text-red-900">دریافت دوره‌ها ممکن نشد</h2>
            <p className="max-w-md text-sm leading-7 text-red-800/80">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              تلاش دوباره
            </Button>
          </div>
        ) : visibleCourses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="در این سطح فعلاً دوره‌ای نداریم"
            description="به‌زودی دوره‌های تازه اضافه می‌شوند. در این مدت می‌توانید همه‌ی مسیرهای یادگیری را ببینید."
            action={
              <Button variant="secondary" size="sm" onClick={() => setLevel("all")}>
                نمایش همه‌ی دوره‌ها
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {visibleCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}

        <div className="mt-12 grid gap-4 rounded-3xl border border-primary/10 bg-surface-soft/70 p-6 sm:grid-cols-[1.4fr_1fr] sm:items-center sm:p-8">
          <div>
            <h2 className="text-lg font-bold text-ink">در انتخاب دوره شک دارید؟</h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              سن، علاقه و سطح کودک را برای ما بنویسید؛ در صفحه‌ی پرسش‌ها
              راهنمای انتخاب سطح آمده است یا می‌توانید با پشتیبانی در تماس
              باشید.
            </p>
          </div>
          <div className="flex sm:justify-end">
            <a
              href={`mailto:${brand.supportEmail}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-primary shadow-sm transition hover:bg-primary-soft/20"
            >
              <span dir="ltr" className="ltr-inline truncate font-mono">
                {brand.supportEmail}
              </span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
