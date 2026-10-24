import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { Reveal } from "@/components/ui/Reveal";
import { ScallopStar } from "@/components/ui/Decorations";

export function MaterialsSection() {
  return (
    <section
      className="bg-white py-16 sm:py-24"
      aria-labelledby="materials-title"
    >
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <SectionTitle
            id="materials-title"
            align="start"
            eyebrow="فراتر از ویدیو و تماشا"
            title="مواد آموزشی ما لذت‌بخش است"
            highlight="لذت‌بخش"
            description="کودک فقط تماشا نمی‌کند؛ می‌سازد، آزمایش می‌کند و درباره‌ی ایده‌هایش حرف می‌زند. هر بسته شامل داستان، بازی و یک پروژه‌ی کوچک است."
          />

          <div className="mt-8">
            <ButtonLink
              to="/about"
              variant="secondary"
              arrow
              className="border-primary/25 text-ink hover:border-primary/45 hover:bg-primary-soft/10"
            >
              بیشتر بدانید
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative mx-auto aspect-[5/4] w-full max-w-lg">
            <ScallopStar className="absolute -top-3 end-6 z-10 size-14 text-accent sm:size-16" />

            <div className="absolute end-0 top-0 h-[58%] w-[64%] overflow-hidden rounded-[2.5rem] bg-primary-soft">
              <PlaceholderArt imageKey="creative" className="h-full w-full" />
            </div>

            <div className="absolute start-0 top-[38%] h-[34%] w-[60%] overflow-hidden rounded-full bg-primary">
              <PlaceholderArt imageKey="foundations" className="h-full w-full" />
            </div>

            <div className="absolute bottom-0 end-[6%] h-[34%] w-[62%] overflow-hidden rounded-[2rem] bg-accent">
              <PlaceholderArt imageKey="python" className="h-full w-full" />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
