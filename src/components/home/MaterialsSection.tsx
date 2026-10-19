import { Check, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { Reveal } from "@/components/ui/Reveal";
import {
  BrushStroke,
  DotGrid,
  ScallopStar,
  Squiggle,
} from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

const highlights = [
  "کاربرگ‌های کوتاه و رنگی برای هر جلسه",
  "پروژه‌های خانگی با وسایل ساده‌ی خانه",
  "راهنمای قدم‌به‌قدم برای والدین",
];

const capsules = [
  {
    imageKey: "creative",
    frame: "bg-primary",
    rotate: "rotate-[-7deg]",
    height: "h-56 sm:h-72 lg:h-80",
    label: "کارگاه خلاقیت",
  },
  {
    imageKey: "foundations",
    frame: "bg-accent",
    rotate: "rotate-[3deg]",
    height: "h-64 sm:h-80 lg:h-96",
    label: "اولین قدم‌ها",
  },
  {
    imageKey: "python",
    frame: "bg-primary-soft",
    rotate: "rotate-[-2deg]",
    height: "h-52 sm:h-64 lg:h-72",
    label: "ساختن و کدنویسی",
  },
] as const;

export function MaterialsSection() {
  return (
    <section
      className="relative overflow-hidden bg-white py-16 sm:py-24"
      aria-labelledby="materials-title"
    >
      <DotGrid className="absolute end-4 top-20 h-28 w-40 opacity-30" />
      <BrushStroke className="absolute -start-24 bottom-10 w-80 text-primary-soft/30" />

      <Container className="relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <SectionTitle
            id="materials-title"
            align="start"
            eyebrow="فراتر از ویدیو و تماشا"
            title="مواد آموزشی ما لذت‌بخش است"
            highlight="لذت‌بخش"
            description="کودک فقط تماشا نمی‌کند؛ می‌سازد، آزمایش می‌کند و درباره‌ی ایده‌هایش حرف می‌زند. هر بسته‌ی آموزشی شامل داستان، بازی و یک پروژه‌ی کوچک است که با وسایل ساده‌ی خانه اجرا می‌شود."
          />

          <ul className="mt-7 space-y-3">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm font-bold text-ink/80"
              >
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft/50 text-primary">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink to="/about" variant="secondary" arrow>
              بیشتر بدانید
            </ButtonLink>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
              تازه‌شده برای پاییز ۱۴۰۵
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative mx-auto max-w-xl">
            <ScallopStar className="absolute -start-4 -top-6 z-10 size-16 rotate-12 text-accent sm:size-20" />
            <Squiggle className="absolute -end-2 top-1/3 w-20 rotate-90 text-primary/30" />
            <div className="grid grid-cols-3 items-end gap-3 sm:gap-4">
              {capsules.map((capsule) => (
                <div
                  key={capsule.imageKey}
                  className={cn(
                    "group relative flex flex-col items-center",
                    capsule.rotate,
                  )}
                >
                  <div
                    className={cn(
                      "w-full rounded-full p-1.5 shadow-soft transition duration-300 motion-safe:hover:-translate-y-1.5 sm:p-2",
                      capsule.frame,
                    )}
                  >
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-full bg-surface-soft",
                        capsule.height,
                      )}
                    >
                      <PlaceholderArt
                        imageKey={capsule.imageKey}
                        className="h-full w-full transition duration-500 motion-safe:group-hover:scale-105"
                      />
                      <span className="absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[88%] rounded-full bg-white/90 px-2.5 py-1 text-center text-[9px] font-bold text-ink shadow-sm backdrop-blur sm:text-[10px]">
                        {capsule.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-muted">
              <span className="inline-block size-2 rounded-full bg-primary" />
              <span className="inline-block size-2 rounded-full bg-accent" />
              <span className="inline-block size-2 rounded-full bg-primary-soft" />
              تصویرها نمونه‌اند و با عکس واقعی جایگزین می‌شوند
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
