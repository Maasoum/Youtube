import { AlertCircle } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseCardSkeleton } from "@/components/ui/Loading";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function PopularCourses() {
  const { courses, loading, error, reload } = useCourses();
  const shown = courses.slice(0, 3);

  return (
    <section
      className="bg-[#FAF8FF] py-16 sm:py-24"
      aria-labelledby="popular-courses-title"
    >
      <Container>
        <Reveal>
          <SectionTitle
            id="popular-courses-title"
            align="start"
            eyebrow="محبوب در میان خانواده‌ها"
            title="دوره‌های محبوب"
            highlight="محبوب"
            description="هر دوره یک مسیر مستقل با لایسنس دائمی و تک‌کاربره است؛ مسیر مناسب کودک‌تان را انتخاب کنید."
            action={
              <ButtonLink
                to="/courses"
                variant="secondary"
                size="sm"
                arrow
                className="border-primary/25 text-ink hover:border-primary/45 hover:bg-primary-soft/10"
              >
                همه‌ی دوره‌ها
              </ButtonLink>
            }
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
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-[2rem] bg-white p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertCircle className="size-6" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-ink">{error}</p>
              <Button variant="secondary" size="sm" onClick={reload}>
                تلاش دوباره
              </Button>
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-[2rem] bg-white p-8 text-center text-sm text-muted">
              هنوز دوره‌ای برای نمایش آماده نیست؛
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
      </Container>
    </section>
  );
}
