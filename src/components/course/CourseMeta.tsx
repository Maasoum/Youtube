import { BookOpenCheck, CalendarDays, Users } from "lucide-react";
import type { Course } from "@/api";
import { cn } from "@/lib/cn";
import { formatAgeRange, formatSessions, formatWeeks } from "@/lib/labels";

interface CourseMetaProps {
  course: Course;
  className?: string;
  tone?: "light" | "dark";
}

export function CourseMeta({ course, className, tone = "light" }: CourseMetaProps) {
  const items = [
    {
      icon: Users,
      label: formatAgeRange(course.ageRange.min, course.ageRange.max),
    },
    { icon: CalendarDays, label: formatWeeks(course.durationWeeks) },
    { icon: BookOpenCheck, label: formatSessions(course.sessions) },
  ];

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs",
        tone === "light" ? "text-muted" : "text-white/70",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
