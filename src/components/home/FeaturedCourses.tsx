import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Course } from "@/api";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseCardSkeleton } from "@/components/ui/Loading";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DotGrid, StarBurst } from "@/components/ui/Decorations";

interface FeaturedCoursesProps {
  courses: Course[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function FeaturedCourses({
  courses,
  loading,
  error,
  onRetry,
}: FeaturedCoursesProps) {
  const shown = courses.slice(0, 3);

  return (
    <section className="relative overflow-hidden py-16 sm:py-24" aria-label="دوره‌های منتخب">
      <DotGrid className="absolute end-4 top-24 h-24 w-40 opacity-30" />
      <StarBurst className="absolute -start-10 bottom-16 size-32 rotate-12 text-primary-soft/40" />
      <div className="container-page relative">
        <Reveal>
          <SectionHeading
            eyebrow="مسیرهای یادگیری"
            title="دوره‌ای که با کنجکاوی کودک شما جور باشد"
            description="از اولین آشنایی با هوش مصنوعی تا ساخت پروژه‌ی پایتون؛ هر دوره با زبان همان سن طراحی شده است. همه‌ی دوره‌ها لایسنس دائمی و تک‌کاربره دارند."
            action={
              <ButtonLink to="/courses" variant="secondary" size="sm" arrow>
                همه‌ی دوره‌ها
              </ButtonLink>
            }
          />
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }, (_, index) => (
              <CourseCardSkeleton key={index} />
            ))
          ) : error ? (
            <div className="col-span-full flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50 px-6 py-10 text-center">
              <AlertCircle className="size-8 text-red-500" aria-hidden="true" />
              <p className="text-sm font-bold text-red-800">{error}</p>
              <Button variant="secondary" size="sm" onClick={onRetry}>
                تلاش دوباره
              </Button>
            </div>
          ) : (
            shown.map((course, index) => (
              <Reveal key={course.id} delay={index * 0.08}>
                <CourseCard course={course} />
              </Reveal>
            ))
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            لایسنس دائمی برای هر کودک
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            همراهی گام‌به‌گام والدین
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            ضمانت بازگشت ۷ روزه
          </span>
        </div>
      </div>
    </section>
  );
}
