import { useEffect } from "react";
import {
  BadgeCheck,
  Heart,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { brand } from "@/config/brand";
import { toPersianDigits } from "@/lib/format";
import { PageIntro } from "@/components/ui/PageIntro";
import { Emphasis } from "@/components/ui/Emphasis";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { FinalCta } from "@/components/home/FinalCta";
import {
  BrushBlob,
  ConcentricCircles,
  DotGrid,
  StarBurst,
} from "@/components/ui/Decorations";

const values = [
  {
    icon: Lightbulb,
    title: "کنجکاوی، نه ترس",
    description:
      "هوش مصنوعی قرار نیست جای کودک را بگیرد؛ ابزاری است برای پرسیدن سؤال‌های بهتر و ساختن ایده‌های تازه. ما با همین نگاه شروع می‌کنیم.",
    tone: "bg-accent/25 text-[#7A5800]",
  },
  {
    icon: ShieldCheck,
    title: "امنیت، پیش از سرعت",
    description:
      "حریم خصوصی، نظارت والدین و استفاده‌ی مسئولانه، بخشی از هر مسیر است؛ نه یک درس اضافه در انتهای دوره.",
    tone: "bg-emerald-50 text-emerald-800",
  },
  {
    icon: Users,
    title: "همراهی خانواده",
    description:
      "والدین در انتخاب، خرید و ادامه‌ی مسیر کنار کودک هستند. ما این همراهی را با راهنما و پشتیبانی انسانی ساده‌تر می‌کنیم.",
    tone: "bg-primary-soft/35 text-primary",
  },
];

const stats = [
  { value: "۴", label: "دوره‌ی تخصصی" },
  { value: `${toPersianDigits(2400)}+`, label: "خانواده‌ی همراه" },
  { value: "۴٫۹", label: "رضایت والدین از ۵" },
  { value: "۷ روز", label: "فرصت بازگشت" },
];

export function AboutPage() {
  useEffect(() => {
    document.title = `درباره‌ی ما | ${brand.nameFa}`;
  }, []);

  return (
    <>
      <PageIntro
        eyebrow="درباره‌ی ما"
        title={
          <>
            مسیری روشن برای اولین قدم‌های{" "}
            <Emphasis>هوش مصنوعی</Emphasis>
          </>
        }
        description={`${brand.nameFa} برای والدینی ساخته شد که می‌خواهند فرزندشان با فناوری، آگاهانه و خلاقانه آشنا شود؛ بدون هیاهو، بدون وعده‌های غیرواقعی و با مسیری که در خانه هم ادامه پیدا کند.`}
      />

      <section className="relative overflow-hidden py-14 sm:py-20">
        <DotGrid className="absolute -start-10 top-16 h-40 w-48 opacity-30" />
        <ConcentricCircles className="absolute -end-36 top-0 size-[30rem] text-primary/[0.08]" />
        <div className="container-page relative grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal>
            <div className="relative mx-auto w-full max-w-md">
              <BrushBlob className="absolute -end-12 -top-12 w-64 text-accent/40" />
              <StarBurst className="absolute -start-5 -top-6 z-10 size-16 rotate-12 text-primary" />
              <div className="relative overflow-hidden rounded-[2.5rem] border-[7px] border-white shadow-pop">
                <PlaceholderArt imageKey="about" className="aspect-[4/4.2] w-full" />
              </div>
              <div className="absolute -bottom-5 end-2 z-10 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-soft sm:-bottom-6 sm:end-3">
                <Heart className="size-4 text-[#FF7A6B]" aria-hidden="true" />
                <p className="text-xs font-bold text-ink">برای خانواده‌های ایرانی</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <span className="text-xs font-bold text-primary">چرا شروع کردیم؟</span>
            <h2 className="mt-3 text-balance text-3xl font-bold leading-[1.5] text-ink sm:text-4xl">
              فناوری نباید ترسناک باشد؛ باید قابل‌فهم باشد.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-8 text-muted sm:text-base">
              <p>
                هر روز خبر تازه‌ای از هوش مصنوعی می‌شنویم. برای بسیاری از
                والدین، سؤال اصلی «آیا کودکم عقب می‌ماند؟» نیست؛ «از کجا و
                چطور شروع کنم که امن باشد؟» است. {brand.nameFa} از همین سؤال
                متولد شد.
              </p>
              <p>
                تصمیم گرفتیم دوره‌هایی انتخاب کنیم که کودک را به مصرف‌کننده‌ی
                منفعل تبدیل نکنند. مسیرها کوتاه، پروژه‌محور و همراه با گفت‌وگو
                هستند؛ والدین دقیقاً می‌دانند کودک چه یاد می‌گیرد و چه چیزی را
                نباید به اشتراک بگذارد.
              </p>
              <p>
                ما فروشگاه و راهنمای این مسیریم. محتوای تخصصی دوره‌ها را
                سرویس‌دهنده‌های آموزشی ارائه می‌دهند و ما با شفافیت کامل،
                لایسنس دائمی و پشتیبانی انسانی، خرید و تحویل را ساده می‌کنیم.
              </p>
            </div>
            <div className="mt-7">
              <ButtonLink to="/courses" variant="secondary" arrow>
                دیدن دوره‌ها
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface-soft/70 py-14 sm:py-20" aria-label="ارزش‌های ما">
        <div className="container-page">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold text-primary">ارزش‌های ما</span>
              <h2 className="mt-3 text-3xl font-bold leading-[1.5] text-ink sm:text-4xl">
                سه چیزی که حاضر نیستیم از آن بگذریم
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {values.map((value, index) => (
              <Reveal key={value.title} delay={index * 0.08}>
                <article className="card-surface h-full p-6">
                  <span className={`inline-flex size-12 items-center justify-center rounded-2xl ${value.tone}`}>
                    <value.icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{value.title}</h3>
                  <p className="mt-2 text-sm leading-8 text-muted">{value.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="grid items-center gap-10 rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-soft sm:p-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
              معیار انتخاب دوره‌ها
            </span>
            <h2 className="mt-3 text-2xl font-bold leading-[1.5] text-ink sm:text-3xl">
              هر دوره باید از سه آزمون عبور کند
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                {
                  icon: BadgeCheck,
                  title: "تناسب با سن",
                  text: "زبان، مثال‌ها و حجم تمرین باید با رده‌ی سنی کودک جور باشد، نه بزرگسالانه و نه کودکانه‌تر از حد.",
                },
                {
                  icon: ShieldCheck,
                  title: "امنیت و نظارت",
                  text: "هیچ فعالیتی بدون راهنمای والدین و قاعده‌ی مشخص برای اشتراک‌گذاری اطلاعات انجام نمی‌شود.",
                },
                {
                  icon: Lightbulb,
                  title: "خروجی قابل لمس",
                  text: "کودک در پایان باید چیزی ساخته یا توضیح داده باشد؛ نه فقط چند ویدیو تماشا کرده باشد.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-primary">
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{item.title}</p>
                    <p className="mt-1 text-xs leading-7 text-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-surface-soft p-5 text-center even:bg-primary-soft/25"
              >
                <dd className="text-2xl font-bold text-primary">{stat.value}</dd>
                <dt className="mt-1 text-[11px] text-muted">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
