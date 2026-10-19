import { HelpCircle, RefreshCw } from "lucide-react";
import { useHomeFaqs } from "@/hooks/useHomeContent";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Accordion } from "@/components/ui/Accordion";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { DotGrid, Squiggle } from "@/components/ui/Decorations";

export function HomeFaq() {
  const { items: faqs, loading, error, reload } = useHomeFaqs();

  return (
    <section
      className="relative overflow-hidden bg-surface-soft/65 py-16 sm:py-24"
      aria-labelledby="home-faq-title"
    >
      <DotGrid className="absolute -start-6 bottom-10 h-32 w-44 opacity-40" />
      <DotGrid className="absolute end-10 top-14 h-20 w-28 opacity-30" />

      <Container className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
        <Reveal className="lg:sticky lg:top-28">
          <SectionTitle
            id="home-faq-title"
            align="start"
            eyebrow="پاسخ‌های شفاف"
            title="سوالات متداول"
            highlight="متداول"
            description="قبل از خرید، هر چیزی که لازم است بدانید این‌جاست: از بازه‌ی سنی و لایسنس تا زمان تحویل و بازگشت وجه."
          />
          <Squiggle className="mt-6 w-28 text-accent" />

          <div className="mt-8 rounded-3xl border border-primary/10 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft/40 text-primary">
                <HelpCircle className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">
                  پاسخ سؤال‌تان را پیدا نکردید؟
                </p>
                <p className="mt-1.5 text-xs leading-6 text-muted">
                  تیم پشتیبانی در روزهای کاری از ۹ تا ۱۸ کنار شماست؛
                  خوشحال می‌شویم راهنمایی‌تان کنیم.
                </p>
                <ButtonLink
                  to="/faq"
                  variant="ghost"
                  size="sm"
                  className="mt-3 px-0 text-primary hover:bg-transparent"
                  arrow
                >
                  همه‌ی پرسش‌ها
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="rounded-3xl border border-black/5 bg-white px-5 py-2 shadow-soft sm:px-8 sm:py-4">
            {loading ? (
              <div className="space-y-4 py-6" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-2xl bg-surface-soft"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <p className="text-sm font-bold text-ink">{error}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={reload}
                >
                  تلاش دوباره
                </Button>
              </div>
            ) : (
              <Accordion items={faqs} defaultOpen={0} />
            )}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
