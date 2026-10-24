import { RefreshCw } from "lucide-react";
import { useHomeFaqs } from "@/hooks/useHomeContent";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Accordion } from "@/components/ui/Accordion";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function HomeFaq() {
  const { items: faqs, loading, error, reload } = useHomeFaqs();

  return (
    <section
      className="bg-[#FAF8FF] py-16 sm:py-24"
      aria-labelledby="home-faq-title"
    >
      <Container className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
        <Reveal>
          <SectionTitle
            id="home-faq-title"
            align="start"
            eyebrow="پاسخ‌های شفاف"
            title="سوالات متداول"
            highlight="متداول"
            description="از بازه‌ی سنی و لایسنس تا زمان تحویل و بازگشت وجه؛ هر چیزی که قبل از خرید لازم است بدانید."
          />

          <ButtonLink
            to="/faq"
            variant="ghost"
            size="sm"
            arrow
            className="mt-6 px-0 text-primary hover:bg-transparent"
          >
            همه‌ی پرسش‌ها
          </ButtonLink>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="rounded-[2rem] bg-white px-6 py-2 sm:px-8 sm:py-3">
            {loading ? (
              <div className="space-y-4 py-6" aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-full bg-surface-soft"
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
