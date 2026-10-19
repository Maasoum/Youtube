import { HelpCircle } from "lucide-react";
import type { SiteFaq } from "@/api";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DotGrid } from "@/components/ui/Decorations";

interface FaqPreviewProps {
  faqs: SiteFaq[];
  loading: boolean;
}

export function FaqPreview({ faqs, loading }: FaqPreviewProps) {
  const items = faqs.slice(0, 5).map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }));

  return (
    <section className="relative overflow-hidden py-16 sm:py-24" aria-label="پرسش‌های پرتکرار">
      <DotGrid className="absolute -start-8 bottom-10 h-32 w-48 opacity-30" />
      <div className="container-page relative grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
        <Reveal className="lg:sticky lg:top-28">
          <SectionHeading
            eyebrow="سؤال‌های پرتکرار"
            title="قبل از شروع، این‌ها را بدانید"
            description="اگر پاسخ سؤال‌تان را پیدا نکردید، خوشحال می‌شویم مستقیم از شما بشنویم. پشتیبانی انسانی ما کنار شماست."
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to="/faq" variant="secondary" size="sm" arrow>
              همه‌ی پرسش‌ها
            </ButtonLink>
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-surface-soft p-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary">
              <HelpCircle className="size-5" aria-hidden="true" />
            </span>
            <p className="m-0 text-xs leading-7 text-muted">
              سؤال تازه‌ای دارید؟ در صفحه‌ی پرسش‌ها دسته‌بندی کامل‌تری از پاسخ‌ها
              وجود دارد؛ از جمله شرایط بازگشت و نحوه‌ی تحویل لایسنس.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="card-surface px-5 py-3 sm:px-7">
            {loading ? (
              <div className="space-y-4 py-4" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-2xl bg-surface-soft" />
                ))}
              </div>
            ) : (
              <Accordion items={items} defaultOpen={0} />
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
