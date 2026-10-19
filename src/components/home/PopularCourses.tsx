import { AlertCircle } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseCardSkeleton } from "@/components/ui/Loading";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { DotGrid, ScallopStar } from "@/components/ui/Decorations";

export function PopularCourses() {
  const { courses, loading, error, reload } = useCourses();
  const shown = courses.slice(0, 3);

  return (
    <section
      className="relative overflow-hidden bg-surface-soft/60 py-16 sm:py-24"
      aria-labelledby="popular-courses-title"
    >
      <DotGrid className="absolute start-4 top-16 h-24 w-36 opacity-40" />
      <ScallopStar className="absolute -end-10 bottom-24 hidden size-36 rotate-12 text-primary-soft/60 md:block" />

      <Container className="relative">
        <Reveal>
          <SectionTitle
            id="popular-courses-title"
            eyebrow="محبوب در میان خانواده‌ها"
            title="دوره‌های محبوب"
            highlight="محبوب"
            description="هر دوره یک مسیر مستقل با لایسنس دائمی و تک‌کاربره است. یک نگاه به سطح و بازه‌ی سنی بیندازید و مسیر مناسب کودک‌تان را انتخاب کنید."
          />
        </Reveal>

        <div className="mt-12">
          {loading ? (
            <div className="grid gap-5 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <CourseCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border border-red-100 bg-white p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertCircle className="size-6" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-ink">{error}</p>
              <Button variant="secondary" size="sm" onClick={reload}>
                تلاش دوباره
              </Button>
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-3xl bg-white p-8 text-center text-sm text-muted">
              هنوز دوره‌ای برای نمایش آماده نیست.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {shown.map((course, index) => (
                <Reveal key={course.id} delay={index * 0.07} className="h-full">
                  <CourseCard course={course} />
                </Reveal>
              ))}
            </div>
          )}
        </div>

        <Reveal delay={0.12}>
          <div className="mt-9 flex justify-center">
            <ButtonLink to="/courses" variant="secondary" arrow>
              همه‌ی دوره‌ها
            </ButtonLink>
          </div>
          <p className="mt-6 text-center text-xs leading-7 text-muted">
            قیمت‌ها به تومان و برای یک لایسنس دائمی و تک‌کاربره است. پس از
            پرداخت، لایسنس حداکثر تا یک روز کاری در داشبورد قرار می‌گیرد.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
