import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, SlidersHorizontal } from "lucide-react";
import type { CourseLevel } from "@/api";
import { brand } from "@/config/brand";
import { purchaseConfig } from "@/config/purchase";
import { useCourses } from "@/hooks/useCourses";
import { PageIntro } from "@/components/ui/PageIntro";
import { Emphasis } from "@/components/ui/Emphasis";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseCardSkeleton } from "@/components/ui/Loading";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { courseLevelLabels } from "@/lib/labels";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

type LevelFilter = CourseLevel | "all";
type AgeFilter = "all" | "8-10" | "10-12" | "12-14";

const levelFilters: Array<{ value: LevelFilter; label: string }> = [
  { value: "all", label: "همه‌ی سطح‌ها" },
  { value: "beginner", label: courseLevelLabels.beginner },
  { value: "intermediate", label: courseLevelLabels.intermediate },
  { value: "advanced", label: courseLevelLabels.advanced },
];

const ageFilters: Array<{
  value: AgeFilter;
  label: string;
  min?: number;
  max?: number;
}> = [
  { value: "all", label: "همه‌ی سن‌ها" },
  { value: "8-10", label: "۸ تا ۱۰ سال", min: 8, max: 10 },
  { value: "10-12", label: "۱۰ تا ۱۲ سال", min: 10, max: 12 },
  { value: "12-14", label: "۱۲ تا ۱۴ سال", min: 12, max: 14 },
];

export function CoursesPage() {
  const { courses, loading, error, reload } = useCourses();
  const [level, setLevel] = useState<LevelFilter>("all");
  const [age, setAge] = useState<AgeFilter>("all");

  useEffect(() => {
    document.title = `دوره‌ها | ${brand.nameFa}`;
  }, []);

  const visibleCourses = useMemo(() => {
    const ageFilter = ageFilters.find((item) => item.value === age);

    return courses.filter((course) => {
      const matchesLevel = level === "all" || course.level === level;
      const matchesAge =
        !ageFilter ||
        ageFilter.value === "all" ||
        (typeof ageFilter.min === "number" &&
          typeof ageFilter.max === "number" &&
          course.ageRange.min <= ageFilter.max &&
          course.ageRange.max >= ageFilter.min);

      return matchesLevel && matchesAge;
    });
  }, [courses, level, age]);

  const hasActiveFilter = level !== "all" || age !== "all";

  const resetFilters = () => {
    setLevel("all");
    setAge("all");
  };

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
            تحویل لایسنس حداکثر {toPersianDigits(purchaseConfig.licenseDeliveryHours)} ساعت کاری
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            ضمانت بازگشت {toPersianDigits(purchaseConfig.refundDays)} روزه
          </span>
        </div>
      </PageIntro>

      <section className="container-page py-12 sm:py-16" aria-label="فهرست دوره‌ها">
        <div className="mb-8 space-y-5 rounded-3xl border border-black/5 bg-white p-4 shadow-soft sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
              <span>فیلتر دوره‌ها</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted" aria-live="polite">
                {loading
                  ? "در حال دریافت دوره‌ها…"
                  : `${toPersianDigits(visibleCourses.length)} دوره`}
              </span>
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-[10px] font-bold text-muted transition hover:border-primary/30 hover:text-primary"
                >
                  پاک‌کردن فیلترها
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold text-muted">بازه‌ی سنی</p>
            <div
              role="group"
              aria-label="فیلتر بازه‌ی سنی"
              className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            >
              {ageFilters.map((filter) => {
                const isActive = age === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setAge(filter.value)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                      isActive
                        ? "border-primary bg-primary text-white"
                        : "border-black/10 bg-surface-soft/60 text-muted hover:border-primary/30 hover:text-primary",
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-black/5 pt-4">
            <p className="mb-2 text-[11px] font-bold text-muted">سطح دوره</p>
            <div
              role="group"
              aria-label="فیلتر سطح دوره"
              className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            >
              {levelFilters.map((filter) => {
                const isActive = level === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setLevel(filter.value)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
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
            title="با این فیلتر دوره‌ای نداریم"
            description="برای دیدن همه‌ی مسیرها، فیلترها را پاک کنید. دوره‌های تازه هم به‌زودی اضافه می‌شوند."
            action={
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                پاک‌کردن فیلترها
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
            <ButtonLink to="/contact" variant="onDark" size="sm" arrow>
              تماس با ما
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
