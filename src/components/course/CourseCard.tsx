import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { Course } from "@/api";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { LevelBadge } from "@/components/ui/StatusBadge";
import { Price } from "@/components/ui/Price";
import { ButtonLink } from "@/components/ui/Button";
import { formatAgeRange } from "@/lib/labels";
import { CourseMeta } from "./CourseMeta";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="group card-surface flex h-full flex-col overflow-hidden transition duration-300 motion-safe:hover:-translate-y-1 hover:shadow-pop">
      <Link
        to={`/courses/${course.slug}`}
        className="relative block aspect-[16/10] overflow-hidden focus-visible:outline-none"
        aria-label={`مشاهده‌ی دوره‌ی ${course.title}`}
        tabIndex={-1}
      >
        <PlaceholderArt
          imageKey={course.art}
          className="h-full w-full transition duration-500 motion-safe:group-hover:scale-[1.03]"
        />
        <span className="absolute start-4 top-4 flex flex-wrap gap-2">
          {course.badge ? (
            <span className="chip bg-white/95 text-ink shadow-sm backdrop-blur">
              <Star className="size-3.5 fill-accent text-[#A77B00]" aria-hidden="true" />
              {course.badge}
            </span>
          ) : null}
          {course.popular ? (
            <span className="chip bg-primary text-white">محبوب والدین</span>
          ) : null}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <LevelBadge level={course.level} />
          <span className="text-xs text-muted">
            {formatAgeRange(course.ageRange.min, course.ageRange.max)}
          </span>
        </div>

        <h3 className="text-lg font-bold leading-8 text-ink sm:text-xl">
          <Link
            to={`/courses/${course.slug}`}
            className="transition hover:text-primary focus-visible:outline-none"
          >
            {course.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">
          {course.tagline}
        </p>

        <CourseMeta course={course} className="mt-4" />

        <div className="mt-auto border-t border-black/5 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Price
              amount={course.priceToman}
              compareAt={course.compareAtPriceToman}
              size="md"
            />
            <ButtonLink
              to={`/courses/${course.slug}`}
              variant="secondary"
              size="sm"
              arrow
            >
              جزئیات دوره
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}
