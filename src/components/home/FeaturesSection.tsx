import type { LucideIcon } from "lucide-react";
import { Gamepad2, Palette, Puzzle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Reveal } from "@/components/ui/Reveal";
import { ScallopStar } from "@/components/ui/Decorations";
import { assetUrl } from "@/lib/asset";
import { cn } from "@/lib/cn";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "lavender" | "purple" | "green";
}

const features: Feature[] = [
  {
    title: "آزمون‌های سرگرم‌کننده",
    description:
      "آزمون‌های کوتاه و تصویری که مفهوم یادگیری ماشین را بدون حفظ‌کردن و بدون استرس آموزش می‌دهند.",
    icon: Puzzle,
    tone: "lavender",
  },
  {
    title: "فعالیت‌های خلاقانه",
    description:
      "از داستان‌سازی با هوش مصنوعی تا طراحی کاراکتر؛ هر جلسه به یک اثر واقعی می‌رسد.",
    icon: Palette,
    tone: "purple",
  },
  {
    title: "یادگیری با بازی",
    description:
      "بازی‌های گروهی و چالش‌های بدون صفحه‌نمایش برای تمرین منطق، الگوریتم و تفکر محاسباتی.",
    icon: Gamepad2,
    tone: "green",
  },
];

const toneStyles = {
  lavender: {
    card: "bg-[#EAE4FB] text-ink",
    badge: "text-white",
    icon: "text-primary",
    body: "text-ink/65",
  },
  purple: {
    card: "bg-primary text-white",
    badge: "text-white/15",
    icon: "text-white",
    body: "text-white/70",
  },
  green: {
    card: "bg-accent text-ink",
    badge: "text-white/70",
    icon: "text-ink",
    body: "text-ink/65",
  },
} as const;

/** بافت‌های اختصاصیِ سه تایل؛ همگی از فایل‌های محلی و صرفاً تزئینی هستند. */
const featureDecorations: Record<
  Feature["tone"],
  { file: string; width: number; height: number }
> = {
  lavender: {
    file: "brand/tile-blue-light.png",
    width: 168,
    height: 165,
  },
  purple: {
    file: "brand/tile-blue.png",
    width: 168,
    height: 165,
  },
  green: {
    file: "brand/tile-green.png",
    width: 168,
    height: 165,
  },
};

/** استیکرهای کلمات کلیدی؛ همه تزئینی و خارج از درخت دسترس‌پذیری. */
const keywords = [
  {
    label: "#ai",
    tone: "bg-accent text-ink",
    rotate: "-rotate-6",
    slot: "absolute start-2 top-2",
  },
  {
    label: "#content",
    tone: "bg-primary-soft text-primary-dark",
    rotate: "rotate-3",
    slot: "absolute end-2 top-7",
  },
  {
    label: "#growth",
    tone: "bg-primary text-white",
    rotate: "-rotate-2",
    slot: "absolute inset-x-0 bottom-5 mx-auto w-fit",
  },
] as const;

function KeywordStickers() {
  return (
    <div aria-hidden="true" className="relative hidden h-32 w-64 sm:block">
      <svg
        viewBox="0 0 260 130"
        fill="none"
        focusable="false"
        className="absolute inset-0 h-full w-full text-primary/20"
      >
        <ellipse
          cx="130"
          cy="65"
          rx="118"
          ry="50"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 8"
        />
      </svg>

      {keywords.map((keyword) => (
        <span
          key={keyword.label}
          dir="ltr"
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-bold shadow-sm",
            keyword.tone,
            keyword.rotate,
            keyword.slot,
          )}
        >
          {keyword.label}
        </span>
      ))}

      <ScallopStar className="absolute -bottom-1 end-1 size-6 text-accent/70" />
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section
      className="bg-white py-16 sm:py-24"
      aria-labelledby="features-title"
    >
      <Container>
        <Reveal>
          <SectionTitle
            id="features-title"
            align="start"
            eyebrow="یادگیری که حس بازی دارد"
            title="ویژگی‌های تعاملی ما"
            highlight="تعاملی"
            description="سه ویژگی ساده که یادگیری هوش مصنوعی را برای بچه‌ها طبیعی، امن و پر از کشف می‌کند."
            action={<KeywordStickers />}
          />
        </Reveal>

        <div
          aria-hidden="true"
          className="mt-5 flex flex-wrap gap-2 sm:hidden"
        >
          {keywords.map((keyword) => (
            <span
              key={keyword.label}
              dir="ltr"
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold",
                keyword.tone,
                keyword.rotate,
              )}
            >
              {keyword.label}
            </span>
          ))}
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => {
            const styles = toneStyles[feature.tone];
            const Icon = feature.icon;

            return (
              <Reveal key={feature.title} delay={index * 0.08} className="h-full">
                <article
                  className={cn(
                    "group relative flex h-full min-h-[19rem] flex-col overflow-hidden rounded-[2rem] p-7 transition duration-300 motion-safe:hover:-translate-y-1.5 sm:min-h-[21rem] sm:p-8",
                    styles.card,
                  )}
                >
                  <FeatureDecoration tone={feature.tone} />

                  <span className="relative flex size-16 items-center justify-center">
                    <ScallopStar
                      className={cn("absolute inset-0 size-16", styles.badge)}
                    />
                    <Icon
                      className={cn("relative size-6", styles.icon)}
                      aria-hidden="true"
                    />
                  </span>

                  <div className="relative mt-auto pt-12">
                    <h3 className="text-xl font-bold sm:text-2xl">
                      {feature.title}
                    </h3>
                    <p className={cn("mt-2.5 text-sm leading-7", styles.body)}>
                      {feature.description}
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function FeatureDecoration({ tone }: { tone: Feature["tone"] }) {
  const decoration = featureDecorations[tone];

  return (
    <img
      src={assetUrl(decoration.file)}
      alt=""
      aria-hidden="true"
      width={decoration.width}
      height={decoration.height}
      draggable={false}
      className="pointer-events-none absolute -end-8 -top-8 w-36 select-none object-contain opacity-80 sm:w-40"
    />
  );
}
