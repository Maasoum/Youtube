import { useEffect } from "react";
import {
  AlertCircle,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  Mail,
  Sparkles,
} from "lucide-react";
import type { FaqCategory, SiteFaq } from "@/api";
import { brand } from "@/config/brand";
import { useSiteContent } from "@/hooks/useSiteContent";
import { PageIntro } from "@/components/ui/PageIntro";
import { Emphasis } from "@/components/ui/Emphasis";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import {
  ConcentricCircles,
  DotGrid,
  StarBurst,
} from "@/components/ui/Decorations";

const categories: Array<{
  id: FaqCategory;
  title: string;
  description: string;
  icon: typeof KeyRound;
}> = [
  {
    id: "license",
    title: "خرید و لایسنس",
    description: "از ثبت سفارش تا دریافت کد در داشبورد و ایمیل",
    icon: KeyRound,
  },
  {
    id: "learning",
    title: "یادگیری و محتوا",
    description: "سطح دوره، نقش والدین و محل ارائه‌ی محتوا",
    icon: GraduationCap,
  },
  {
    id: "support",
    title: "پشتیبانی و بازگشت",
    description: "پاسخ‌گویی، انتقال لایسنس و شرایط بازگشت وجه",
    icon: LifeBuoy,
  },
];

function groupByCategory(faqs: SiteFaq[], category: FaqCategory): SiteFaq[] {
  return faqs.filter((faq) => faq.category === category);
}

export function FaqPage() {
  const { faqs, loading, error, reload } = useSiteContent();

  useEffect(() => {
    document.title = `پرسش‌های پرتکرار | ${brand.nameFa}`;
  }, []);

  return (
    <>
      <PageIntro
        eyebrow="مرکز پاسخ‌ها"
        title={
          <>
            سؤال‌های شما، پاسخ‌های <Emphasis>روشن</Emphasis>
          </>
        }
        description="هر چیزی درباره‌ی خرید، لایسنس، محتوای دوره و پشتیبانی. اگر پاسخ‌تان را پیدا نکردید، مستقیم برای ما بنویسید."
      >
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="chip border border-primary/10 bg-white text-primary shadow-sm transition hover:bg-primary-soft/20"
            >
              {category.title}
            </a>
          ))}
        </div>
      </PageIntro>

      <section className="relative overflow-hidden py-14 sm:py-20">
        <DotGrid className="absolute -end-8 top-20 h-32 w-44 opacity-30" />
        <ConcentricCircles className="absolute -start-40 bottom-0 size-[30rem] text-primary/[0.07]" />
        <StarBurst className="absolute end-[8%] top-12 hidden size-20 rotate-12 text-accent/60 lg:block" />

        <div className="container-page relative">
          {loading ? (
            <div className="space-y-4" role="status" aria-label="در حال دریافت پرسش‌ها">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-3xl bg-surface-soft"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50 px-6 py-12 text-center">
              <AlertCircle className="size-9 text-red-500" aria-hidden="true" />
              <p className="text-sm font-bold text-red-800">{error}</p>
              <Button variant="secondary" size="sm" onClick={reload}>
                تلاش دوباره
              </Button>
            </div>
          ) : (
            <div className="space-y-14">
              {categories.map((category, categoryIndex) => {
                const items = groupByCategory(faqs, category.id);
                if (items.length === 0) return null;

                return (
                  <Reveal key={category.id} delay={categoryIndex * 0.05}>
                    <section
                      id={category.id}
                      className="scroll-mt-28"
                      aria-labelledby={`${category.id}-title`}
                    >
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft/30 text-primary">
                            <category.icon className="size-5" aria-hidden="true" />
                          </span>
                          <div>
                            <h2
                              id={`${category.id}-title`}
                              className="text-xl font-bold text-ink sm:text-2xl"
                            >
                              {category.title}
                            </h2>
                            <p className="mt-1 text-xs text-muted">
                              {category.description}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted">
                          {items.length.toLocaleString("fa-IR")} پرسش
                        </span>
                      </div>

                      <div className="rounded-3xl border border-black/5 bg-white px-5 shadow-soft sm:px-7">
                        <Accordion
                          items={items.map((item) => ({
                            question: item.question,
                            answer: item.answer,
                          }))}
                          defaultOpen={categoryIndex === 0 ? 0 : null}
                        />
                      </div>
                    </section>
                  </Reveal>
                );
              })}
            </div>
          )}

          <Reveal delay={0.08}>
            <div className="mt-14 overflow-hidden rounded-[2rem] bg-ink p-6 text-white sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl">
                  <p className="inline-flex items-center gap-2 text-xs font-bold text-accent">
                    <Sparkles className="size-4" aria-hidden="true" />
                    هنوز سؤالی دارید؟
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-white">
                    پاسخ سؤال‌تان را پیدا نکردید؟
                  </h2>
                  <p className="mt-2 text-sm leading-8 text-white/60">
                    اگر درباره‌ی سطح کودک، سفارش یا لایسنس سؤالی دارید، برای
                    پشتیبانی بنویسید. شماره‌ی سفارش را هم ذکر کنید تا سریع‌تر
                    بررسی کنیم.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2.5">
                    <Mail className="size-4 text-accent" aria-hidden="true" />
                    <span dir="ltr" className="ltr-inline font-mono text-xs text-white/80">
                      {brand.supportEmail}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/45">{brand.supportHours}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
