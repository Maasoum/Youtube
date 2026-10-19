import {
  BadgeCheck,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { brand } from "@/config/brand";
import { toPersianDigits } from "@/lib/format";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  BrushBlob,
  ConcentricCircles,
  StarBurst,
} from "@/components/ui/Decorations";

const features = [
  {
    icon: Sparkles,
    title: "محتوای متناسب با سن",
    description:
      "هر دوره با زبان، ریتم و مثال‌های همان رده‌ی سنی طراحی شده؛ نه کوچک‌تر از سن کودک و نه بزرگ‌تر از دنیای او.",
  },
  {
    icon: Users,
    title: "همراهی والدین",
    description:
      "راهنمای کوتاه والدین در هر بخش، چک‌لیست امنیتی و پیشنهاد گفت‌وگو برای ادامه‌ی یادگیری در خانه.",
  },
  {
    icon: BadgeCheck,
    title: "لایسنس دائمی",
    description:
      "یک بار خرید، دسترسی دائمی برای یک کودک. هیچ اشتراک ماهانه یا تمدید اجباری وجود ندارد.",
  },
  {
    icon: HeartHandshake,
    title: "پشتیبانی انسانی",
    description:
      "پاسخ‌گویی واقعی برای سؤال درباره‌ی سطح، سفارش و لایسنس؛ نه ربات و نه پاسخ‌های آماده.",
  },
];

export function WhyUs() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24" aria-label="چرا ما">
      <ConcentricCircles className="absolute -end-48 top-10 size-[30rem] text-primary/[0.07]" />
      <div className="container-page relative">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <Reveal className="order-2 lg:order-1">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <span
                aria-hidden="true"
                className="absolute -start-5 -top-5 size-40 rotate-6 rounded-[2rem] bg-accent/50 sm:size-48"
              />
              <StarBurst className="absolute -end-5 -top-6 z-10 size-20 rotate-12 text-primary" />
              <div className="relative overflow-hidden rounded-[2.5rem] border-[7px] border-white shadow-pop">
                <PlaceholderArt
                  imageKey="about"
                  className="aspect-[4/3.4] w-full"
                />
              </div>
              <div className="absolute -bottom-6 -start-3 z-10 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-soft sm:-start-8">
                <p className="text-[11px] text-muted">خانواده‌های همراه</p>
                <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-ink">
                  {toPersianDigits(2400)}+
                  <Users className="size-4 text-primary" aria-hidden="true" />
                </p>
              </div>
              <div className="absolute -end-3 bottom-12 z-10 rounded-2xl bg-primary px-4 py-3 text-white shadow-pop sm:-end-8">
                <p className="flex items-center gap-1.5 text-xs font-bold">
                  <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
                  پرداخت امن
                </p>
                <p className="mt-1 text-[10px] text-white/60">ضمانت بازگشت ۷ روزه</p>
              </div>
              <BrushBlob className="absolute -start-16 bottom-0 -z-10 w-64 text-primary-soft/35" />
            </div>
          </Reveal>

          <div className="order-1 lg:order-2">
            <Reveal>
              <SectionHeading
                eyebrow="چرا این مسیر؟"
                title={`چرا والدین ${brand.nameFa} را انتخاب می‌کنند؟`}
                description="ما فقط فروشنده‌ی دوره نیستیم؛ می‌خواهیم خانواده‌ها با خیال راحت و مسیر روشن، اولین قدم‌های دنیای هوش مصنوعی را بردارند."
              />
            </Reveal>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {features.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 0.08}>
                  <div className="flex h-full gap-3.5 rounded-2xl border border-black/5 bg-white p-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft/30 text-primary">
                      <feature.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-ink">{feature.title}</h3>
                      <p className="mt-1.5 text-xs leading-6 text-muted">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        <Reveal delay={0.1}>
          <dl className="mt-14 grid grid-cols-1 gap-6 rounded-3xl bg-primary px-6 py-7 text-white sm:grid-cols-3 sm:gap-0 sm:px-8">
            <div className="text-center sm:border-e sm:border-white/15">
              <dt className="text-xs text-white/60">دوره‌های تخصصی</dt>
              <dd className="mt-2 text-2xl font-bold text-white">۴ دوره</dd>
            </div>
            <div className="text-center sm:border-e sm:border-white/15">
              <dt className="text-xs text-white/60">خانواده‌های همراه</dt>
              <dd className="mt-2 text-2xl font-bold text-white">
                {toPersianDigits(2400)}+
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs text-white/60">رضایت والدین</dt>
              <dd className="mt-2 text-2xl font-bold text-accent">۴٫۹ از ۵</dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
