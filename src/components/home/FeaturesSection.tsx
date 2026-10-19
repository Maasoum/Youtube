import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Gamepad2, Palette, Puzzle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Chip } from "@/components/ui/Chip";
import { Reveal } from "@/components/ui/Reveal";
import { ScallopStar, Squiggle } from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

interface Feature {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "lavender" | "purple" | "yellow";
}

const features: Feature[] = [
  {
    number: "۰۱",
    title: "آزمون‌های سرگرم‌کننده",
    description:
      "با آزمون‌های کوتاه و تصویری، کودک مفهوم یادگیری ماشین و دسته‌بندی را کشف می‌کند؛ بدون حفظ‌کردن و بدون استرس. هر پاسخ درست، یک قدم کوچک به جلوست.",
    icon: Puzzle,
    tone: "lavender",
  },
  {
    number: "۰۲",
    title: "فعالیت‌های خلاقانه",
    description:
      "از داستان‌سازی با هوش مصنوعی تا طراحی کاراکتر و ساخت صدا؛ هر جلسه ایده‌ی کودک به یک اثر واقعی تبدیل می‌شود و حق انتخاب همیشه با خودش است.",
    icon: Palette,
    tone: "purple",
  },
  {
    number: "۰۳",
    title: "یادگیری با بازی",
    description:
      "بازی‌های گروهی و چالش‌های بدون صفحه‌نمایش، منطق الگوریتم و تفکر محاسباتی را تمرین می‌کنند. یادگیری این‌جا شبیه یک ماجراجویی است، نه یک تکلیف.",
    icon: Gamepad2,
    tone: "yellow",
  },
];

const toneStyles = {
  lavender: {
    card: "bg-[#E9E3FB] text-ink",
    icon: "bg-white/80 text-primary",
    body: "text-ink/70",
    number: "text-primary/25",
    line: "text-primary/35",
  },
  purple: {
    card: "bg-primary text-white shadow-pop",
    icon: "bg-white/15 text-accent",
    body: "text-white/75",
    number: "text-white/20",
    line: "text-white/40",
  },
  yellow: {
    card: "bg-accent text-ink",
    icon: "bg-white/55 text-ink",
    body: "text-ink/70",
    number: "text-ink/20",
    line: "text-ink/35",
  },
} as const;

export function FeaturesSection() {
  return (
    <section
      className="relative overflow-hidden bg-white py-16 sm:py-24"
      aria-labelledby="features-title"
    >
      <div className="pointer-events-none absolute -end-24 top-24 size-64 rounded-full bg-primary-soft/20 blur-2xl" />
      <Container className="relative">
        <Reveal>
          <SectionTitle
            id="features-title"
            eyebrow="یادگیری که حس بازی دارد"
            title="ویژگی‌های تعاملی ما"
            highlight="تعاملی"
            description="سه ویژگی ساده که یادگیری هوش مصنوعی را برای بچه‌ها طبیعی، امن و پر از کشف می‌کند؛ بدون اصطلاح‌های پیچیده و بدون فشار."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => {
            const styles = toneStyles[feature.tone];
            const Icon = feature.icon;

            return (
              <Reveal key={feature.title} delay={index * 0.08} className="h-full">
                <article
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition duration-300 motion-safe:hover:-translate-y-2 hover:shadow-pop sm:p-8",
                    styles.card,
                  )}
                >
                  <DotPattern tone={feature.tone} />
                  <div className="relative flex items-start justify-between">
                    <span
                      className={cn(
                        "inline-flex size-14 items-center justify-center rounded-2xl",
                        styles.icon,
                      )}
                    >
                      <Icon className="size-7" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "text-4xl font-bold tabular-nums",
                        styles.number,
                      )}
                      aria-hidden="true"
                    >
                      {feature.number}
                    </span>
                  </div>

                  <h3 className="relative mt-6 text-xl font-bold sm:text-2xl">
                    {feature.title}
                  </h3>
                  <p
                    className={cn(
                      "relative mt-3 text-sm leading-8",
                      styles.body,
                    )}
                  >
                    {feature.description}
                  </p>

                  <div className="relative mt-6 flex items-center gap-2 pt-2">
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-full",
                        feature.tone === "purple"
                          ? "bg-white/15 text-white"
                          : "bg-white/60 text-ink",
                      )}
                      aria-hidden="true"
                    >
                      <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
                    </span>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        feature.tone === "purple" ? "text-white/70" : "text-ink/60",
                      )}
                    >
                      بخشی از هر جلسه
                    </span>
                    <ScallopStar
                      className={cn(
                        "ms-auto size-7",
                        feature.tone === "purple"
                          ? "text-accent/80"
                          : feature.tone === "yellow"
                            ? "text-white/70"
                            : "text-primary/30",
                      )}
                    />
                  </div>

                  <Squiggle
                    className={cn(
                      "absolute -bottom-1 end-6 w-16 opacity-50",
                      styles.line,
                    )}
                  />
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-10 hidden h-32 max-w-3xl sm:block">
            <svg
              viewBox="0 0 700 130"
              aria-hidden="true"
              focusable="false"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
            >
              <ellipse
                cx="350"
                cy="65"
                rx="320"
                ry="54"
                fill="none"
                stroke="#6446E0"
                strokeOpacity="0.18"
                strokeWidth="1.6"
                strokeDasharray="2 9"
              />
            </svg>
            <Chip
              tone="lavender"
              className="absolute start-[7%] top-3 -rotate-6 px-5 py-2.5 text-sm shadow-sm"
            >
              #بامزه
            </Chip>
            <div className="absolute inset-x-0 top-[4.75rem] flex justify-center">
              <Chip
                tone="yellow"
                className="rotate-3 px-5 py-2.5 text-sm shadow-sm"
              >
                #لذت
              </Chip>
            </div>
            <Chip
              tone="white"
              className="absolute end-[8%] top-2 rotate-6 px-5 py-2.5 text-sm shadow-sm ring-1 ring-primary/10"
            >
              #شادی
            </Chip>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:hidden">
            <Chip tone="lavender">#بامزه</Chip>
            <Chip tone="yellow">#لذت</Chip>
            <Chip tone="white" className="ring-1 ring-primary/10">
              #شادی
            </Chip>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function DotPattern({ tone }: { tone: Feature["tone"] }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn(
        "pointer-events-none absolute -end-4 -top-4 size-36 opacity-[0.18]",
        tone === "purple" ? "text-white" : "text-current",
      )}
    >
      <defs>
        <pattern
          id={`feature-dots-${tone}`}
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#feature-dots-${tone})`} />
    </svg>
  );
}
