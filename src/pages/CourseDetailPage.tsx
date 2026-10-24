import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Compass,
  KeyRound,
  Mail,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import {
  coursesApi,
  getErrorMessage,
  type Course,
} from "@/api";
import { brand } from "@/config/brand";
import { purchaseConfig } from "@/config/purchase";
import { useCourses } from "@/hooks/useCourses";
import {
  formatNumber,
  formatPercent,
  toPersianDigits,
} from "@/lib/format";
import {
  formatAgeRange,
  formatSessions,
  formatWeeks,
} from "@/lib/labels";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Loading";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { Price } from "@/components/ui/Price";
import { LevelBadge } from "@/components/ui/StatusBadge";
import { Accordion } from "@/components/ui/Accordion";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseMeta } from "@/components/course/CourseMeta";
import {
  ConcentricCircles,
  DotGrid,
  StarBurst,
} from "@/components/ui/Decorations";

const purchaseBenefits = [
  { icon: BadgeCheck, text: "لایسنس دائمی و تک‌کاربره برای یک کودک" },
  {
    icon: Clock3,
    text: `تحویل کد لایسنس حداکثر ${toPersianDigits(
      purchaseConfig.licenseDeliveryHours,
    )} ساعت کاری`,
  },
  { icon: Mail, text: "ارسال کد به ایمیل و قرارگرفتن در داشبورد" },
  { icon: Users, text: "راهنمای همراهی والدین در طول مسیر" },
  {
    icon: RotateCcw,
    text: `ضمانت بازگشت وجه تا ${toPersianDigits(purchaseConfig.refundDays)} روز`,
  },
];

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const { courses } = useCourses();

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setCourse(null);

    coursesApi
      .getBySlug(slug ?? "")
      .then((data) => {
        if (!active) return;
        if (!data) {
          setStatus("not-found");
          return;
        }
        setCourse(data);
        setStatus("ready");
        document.title = `${data.title} | ${brand.nameFa}`;
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(getErrorMessage(reason));
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (status === "loading") {
    return <PageLoader label="در حال آماده‌سازی صفحه‌ی دوره…" />;
  }

  if (status === "not-found" || !course) {
    return (
      <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16">
        <EmptyState
          icon={Compass}
          title="این دوره پیدا نشد"
          description="ممکن است نشانی تغییر کرده باشد. فهرست دوره‌ها را ببینید و مسیر مناسب کودک‌تان را انتخاب کنید."
          action={
            <ButtonLink to="/courses" arrow>
              بازگشت به دوره‌ها
            </ButtonLink>
          }
        />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16">
        <EmptyState
          icon={AlertCircle}
          title="دریافت اطلاعات دوره ممکن نشد"
          description={error ?? "لطفاً دوباره تلاش کنید."}
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              تلاش دوباره
            </Button>
          }
        />
      </section>
    );
  }

  const discountPercent =
    course.compareAtPriceToman && course.compareAtPriceToman > course.priceToman
      ? Math.round(
          (1 - course.priceToman / course.compareAtPriceToman) * 100,
        )
      : null;

  const related = courses
    .filter((item) => item.id !== course.id)
    .slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden border-b border-black/5 bg-surface-soft/70">
        <DotGrid className="absolute -start-6 top-12 h-32 w-48 opacity-40" />
        <ConcentricCircles className="absolute -end-36 -top-36 size-[28rem] text-primary/10" />
        <StarBurst className="absolute start-[42%] top-6 hidden size-14 rotate-12 text-accent/60 lg:block" />

        <div className="container-page relative py-8 sm:py-12">
          <Breadcrumbs
            items={[
              { label: "دوره‌ها", to: "/courses" },
              { label: course.title },
            ]}
          />

          <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <LevelBadge level={course.level} />
                {course.badge ? (
                  <span className="chip bg-white text-ink shadow-sm">
                    <Star className="size-3 fill-accent text-accent" aria-hidden="true" />
                    {course.badge}
                  </span>
                ) : null}
                <span className="chip bg-white text-muted shadow-sm">
                  {formatAgeRange(course.ageRange.min, course.ageRange.max)}
                </span>
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold leading-[1.45] text-ink sm:text-4xl lg:text-[2.7rem]">
                {course.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-8 text-muted sm:text-base">
                {course.tagline}
              </p>

              <CourseMeta course={course} className="mt-5" />

              <div className="mt-7 overflow-hidden rounded-[2rem] border-[6px] border-white shadow-soft">
                <PlaceholderArt
                  imageKey={course.art}
                  className="aspect-[16/9] w-full"
                />
              </div>
            </div>

            <aside className="lg:sticky lg:top-24">
              <div className="card-surface p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-ink">این دوره شامل</p>
                  {discountPercent ? (
                    <span className="chip bg-emerald-50 text-emerald-800">
                      {formatPercent(discountPercent)} تخفیف
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 rounded-2xl bg-surface-soft/80 p-4">
                  <p className="text-[11px] text-muted">هزینه‌ی دوره با لایسنس دائمی</p>
                  <Price
                    amount={course.priceToman}
                    compareAt={course.compareAtPriceToman}
                    size="lg"
                    className="mt-1"
                  />
                  <p className="mt-2 text-[11px] text-muted">
                    یک بار پرداخت؛ بدون تمدید یا اشتراک ماهانه
                  </p>
                </div>

                <ul className="mt-5 space-y-3">
                  {purchaseBenefits.map((benefit) => (
                    <li key={benefit.text} className="flex items-start gap-2.5">
                      <benefit.icon
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span className="text-xs leading-6 text-muted">
                        {benefit.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <ButtonLink
                  to={`/checkout/${course.slug}`}
                  size="lg"
                  fullWidth
                  arrow
                  className="mt-6"
                >
                  ثبت سفارش
                </ButtonLink>

                <p className="mt-3 text-center text-[11px] leading-6 text-muted">
                  کد تخفیف، در صورت داشتن، در مرحله‌ی بعد وارد می‌شود.
                </p>

                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-primary/10 bg-primary-soft/15 p-3.5">
                  <ShieldCheck
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p className="m-0 text-[11px] leading-6 text-muted">
                    محتوای دوره در سامانه‌ی سرویس‌دهنده میزبانی می‌شود؛ این
                    سایت مرجع خرید و تحویل لایسنس است.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="container-page py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div className="space-y-14">
            <div>
              <h2 className="text-2xl font-bold text-ink">درباره‌ی این دوره</h2>
              <div className="mt-4 space-y-4">
                {course.description.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="text-sm leading-8 text-muted sm:text-[15px]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary-soft/30 text-primary">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <h2 className="text-2xl font-bold text-ink">
                  بعد از دوره، کودک شما می‌تواند…
                </h2>
              </div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((outcome) => (
                  <li
                    key={outcome}
                    className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white p-4"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span className="text-xs leading-7 text-muted">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-ink">مسیر گام‌به‌گام</h2>
                <span className="chip bg-surface-soft text-muted">
                  {formatWeeks(course.durationWeeks)} — {formatSessions(course.sessions)}
                </span>
              </div>
              <div className="mt-6 rounded-3xl border border-black/5 bg-white px-5 shadow-sm sm:px-6">
                <Accordion
                  items={course.syllabus.map((chapter, index) => ({
                    question: `جلسه ${toPersianDigits(index + 1)} — ${chapter.title}`,
                    answer: chapter.summary,
                  }))}
                  defaultOpen={0}
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-ink">سؤال‌های این دوره</h2>
              <div className="mt-5 rounded-3xl border border-black/5 bg-white px-5 sm:px-6">
                <Accordion items={course.faqs} defaultOpen={0} />
              </div>
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-soft">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent/25 text-[#8A5A00]">
                <Compass className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-base font-bold text-ink">
                مطمئن نیستید این دوره مناسب است؟
              </h2>
              <p className="mt-2 text-xs leading-7 text-muted">
                در صفحه‌ی پرسش‌ها راهنمای انتخاب سطح را ببینید یا سن و علاقه‌ی
                کودک را برای پشتیبانی بنویسید.
              </p>
              <ButtonLink
                to="/faq"
                variant="secondary"
                size="sm"
                fullWidth
                className="mt-4"
                arrow
              >
                راهنمای انتخاب دوره
              </ButtonLink>
            </div>

            <div className="rounded-3xl bg-ink p-5 text-white">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-accent">
                <KeyRound className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-base font-bold text-white">
                چطور لایسنس را دریافت می‌کنم؟
              </h2>
              <p className="mt-2 text-xs leading-7 text-white/60">
                پس از پرداخت، تیم ما کد را از سرویس‌دهنده دریافت و در پنل ثبت
                می‌کند. کد در داشبورد شما و ایمیل ثبت‌شده قرار می‌گیرد.
              </p>
              <Link
                to="/how-it-works"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-accent transition hover:text-white"
              >
                مشاهده‌ی فرایند کامل
                <span aria-hidden="true">←</span>
              </Link>
            </div>

            <div className="flex items-start gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <RotateCcw className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-emerald-900">خرید بدون نگرانی</p>
                <p className="mt-1 text-[11px] leading-6 text-emerald-800/80">
                  تا ۷ روز پس از تحویل، در صورت استفاده‌نشدن کد، امکان بازگشت
                  وجه وجود دارد.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-black/5 bg-surface-soft/60 py-14 sm:py-20" aria-label="دوره‌های دیگر">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-primary">ادامه‌ی مسیر</span>
                <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
                  شاید این دوره‌ها هم برای شما مناسب باشد
                </h2>
              </div>
              <ButtonLink to="/courses" variant="ghost" size="sm" arrow>
                همه‌ی دوره‌ها
              </ButtonLink>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <CourseCard key={item.id} course={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-page py-14 sm:py-20">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-10 text-white sm:px-10">
          <DotGrid className="absolute -start-8 -top-8 h-40 w-56 opacity-20" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold leading-[1.5] text-white sm:text-3xl">
                آماده‌اید این مسیر را شروع کنید؟
              </h2>
              <p className="mt-2 text-sm leading-8 text-white/70">
                با یک پرداخت، لایسنس دائمی این دوره برای کودک شما ثبت می‌شود.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-bold">
                {formatNumber(course.priceToman)} تومان
              </div>
              <ButtonLink to={`/checkout/${course.slug}`} variant="onDark" size="md" arrow>
                ثبت سفارش
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
