import { useEffect } from "react";
import { Clock3, Sparkles } from "lucide-react";
import { brand } from "@/config/brand";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Emphasis } from "@/components/ui/Emphasis";
import {
  ConcentricCircles,
  DotGrid,
  RotatingSeal,
  ScallopStar,
} from "@/components/ui/Decorations";

interface ComingSoonPageProps {
  section?: string;
}

export function ComingSoonPage({ section = "این بخش" }: ComingSoonPageProps) {
  useEffect(() => {
    document.title = `${section} | به‌زودی — ${brand.nameFa}`;
  }, [section]);

  return (
    <section className="relative overflow-hidden bg-surface-soft/60 py-20 sm:py-28">
      <DotGrid className="absolute start-6 top-16 h-32 w-44 opacity-40" />
      <ConcentricCircles className="absolute -end-40 -bottom-40 size-[32rem] text-primary/10" />
      <ScallopStar className="absolute end-[12%] top-16 hidden size-20 rotate-12 text-accent/70 sm:block" />

      <Container className="relative">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <RotatingSeal className="mb-8 size-28 text-primary/30" />
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-primary shadow-sm">
            <Clock3 className="size-4 text-accent" aria-hidden="true" />
            در حال آماده‌سازی
          </span>
          <h1 className="mt-6 text-balance text-3xl font-bold leading-[1.5] text-ink sm:text-5xl">
            {section} <Emphasis>به‌زودی</Emphasis> اینجاست
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-8 text-muted sm:text-base">
            تیم {brand.nameFa} در حال آماده‌کردن این بخش است. تا آن موقع
            می‌توانید دوره‌ها را ببینید یا از صفحه‌ی اصلی ادامه دهید.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/courses" arrow>
              دیدن دوره‌ها
            </ButtonLink>
            <ButtonLink to="/" variant="secondary" icon={Sparkles}>
              بازگشت به خانه
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
