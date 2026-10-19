import { useEffect } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Compass,
  CreditCard,
  KeyRound,
  Mail,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { brand } from "@/config/brand";
import { PageIntro } from "@/components/ui/PageIntro";
import { Emphasis } from "@/components/ui/Emphasis";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { FinalCta } from "@/components/home/FinalCta";
import {
  ConcentricCircles,
  DotGrid,
  StarBurst,
} from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

const timeline = [
  {
    icon: Compass,
    title: "انتخاب دوره",
    description:
      "سن، سطح و علاقه‌ی کودک را با سرفصل‌ها و پیش‌نیازهای هر دوره مقایسه می‌کنید.",
  },
  {
    icon: ShoppingBag,
    title: "ثبت سفارش",
    description:
      "با حساب والدین وارد می‌شوید، کد تخفیف اختیاری را وارد می‌کنید و سفارش را نهایی می‌کنید.",
  },
  {
    icon: CreditCard,
    title: "پرداخت امن",
    description:
      "مبلغ دوره به تومان از طریق درگاه بانکی پرداخت می‌شود. برای هر سفارش یک دوره ثبت می‌شود.",
  },
  {
    icon: KeyRound,
    title: "دریافت لایسنس توسط تیم",
    description:
      "پس از پرداخت، تیم ما کد لایسنس را از سرویس‌دهنده‌ی آموزشی دریافت و در پنل مدیریت ثبت می‌کند.",
  },
  {
    icon: Mail,
    title: "تحویل در داشبورد و ایمیل",
    description:
      "کد لایسنس در داشبورد شما نمایش داده می‌شود و نسخه‌ای به ایمیل ثبت‌شده ارسال می‌شود.",
  },
];

const included = [
  {
    icon: BadgeCheck,
    title: "لایسنس دائمی و تک‌کاربره",
    description: "یک لایسنس برای یک کودک؛ بدون تاریخ انقضا و بدون تمدید.",
  },
  {
    icon: MonitorSmartphone,
    title: "دسترسی به محتوای دوره",
    description:
      "محتوای آموزشی در سامانه‌ی سرویس‌دهنده‌ی دوره میزبانی می‌شود و با لایسنس باز می‌شود.",
  },
  {
    icon: Sparkles,
    title: "راهنمای والدین",
    description: "چک‌لیست همراهی، پیشنهاد گفت‌وگو و نکات امنیتی برای هر بخش.",
  },
  {
    icon: Clock3,
    title: "پشتیبانی انسانی",
    description:
      "برای سؤال درباره‌ی انتخاب سطح، سفارش یا لایسنس، در روزهای کاری پاسخ می‌دهیم.",
  },
];

export function HowItWorksPage() {
  useEffect(() => {
    document.title = `چطور کار می‌کند؟ | ${brand.nameFa}`;
  }, []);

  return (
    <>
      <PageIntro
        eyebrow="راهنمای خرید و تحویل"
        title={
          <>
            یک مسیر شفاف، از انتخاب تا{" "}
            <Emphasis>اولین درس</Emphasis>
          </>
        }
        description="این سایت ویترین و محل خرید دوره‌هاست. می‌خواهیم دقیقاً بدانید پرداخت، لایسنس و دسترسی به محتوا چطور انجام می‌شود؛ بدون ابهام."
      >
        <div className="flex flex-wrap gap-2">
          {["لایسنس دائمی", "تحویل تا یک روز کاری", "پشتیبانی والدین"].map((item) => (
            <span
              key={item}
              className="chip border border-primary/10 bg-white text-primary shadow-sm"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </PageIntro>

      <section className="container-page py-14 sm:py-20">
        <div className="grid gap-10 overflow-hidden lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16">
          <Reveal>
            <span className="text-xs font-bold text-primary">فرایند دقیق</span>
            <h2 className="mt-3 text-balance text-3xl font-bold leading-[1.5] text-ink sm:text-4xl">
              بعد از پرداخت دقیقاً چه اتفاقی می‌افتد؟
            </h2>
            <p className="mt-4 text-sm leading-8 text-muted sm:text-base">
              لایسنس‌ها را خودکار تولید نمی‌کنیم. برای هر سفارش، کد اختصاصی از
              سرویس‌دهنده دریافت می‌شود و یک عضو تیم آن را در پنل مدیریت ثبت
              می‌کند. به همین دلیل ممکن است تحویل چند ساعت زمان ببرد.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/15 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#8A5A00]" aria-hidden="true" />
              <p className="m-0 text-xs leading-7 text-ink/75">
                اگر سفارش شما بیش از یک روز کاری در انتظار لایسنس ماند، با
                پشتیبانی تماس بگیرید. وضعیت دقیق همه‌ی سفارش‌ها در داشبورد شما
                قابل مشاهده است.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-md">
              <span
                aria-hidden="true"
                className="absolute end-0 -top-4 size-28 rotate-12 rounded-[2rem] bg-primary-soft/60 sm:-end-4 sm:size-32"
              />
              <StarBurst className="absolute -start-4 -bottom-4 z-10 size-20 rotate-12 text-accent" />
              <div className="relative overflow-hidden rounded-[2.5rem] border-[7px] border-white shadow-pop">
                <PlaceholderArt imageKey="dashboard" className="aspect-[4/3.6] w-full" />
              </div>
              <div className="absolute -bottom-6 end-4 rounded-2xl bg-white px-4 py-3 shadow-soft">
                <p className="flex items-center gap-2 text-xs font-bold text-ink">
                  <KeyRound className="size-4 text-primary" aria-hidden="true" />
                  کد در داشبورد شما
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <ol className="mt-14 space-y-0">
          {timeline.map((step, index) => {
            const isLast = index === timeline.length - 1;
            return (
              <li key={step.title}>
                <Reveal delay={Math.min(index * 0.06, 0.24)}>
                  <div className="flex gap-4 sm:gap-6">
                    <div className="flex flex-col items-center">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-soft ring-4 ring-white sm:size-11">
                        <step.icon className="size-5" aria-hidden="true" />
                      </span>
                      {!isLast ? (
                        <span
                          aria-hidden="true"
                          className="w-px flex-1 border-s border-dashed border-primary/25"
                        />
                      ) : null}
                    </div>
                    <div className={cn("min-w-0 flex-1", !isLast && "pb-6")}>
                      <span className="mb-1.5 block text-[11px] font-bold text-primary">
                        گام {["۰۱", "۰۲", "۰۳", "۰۴", "۰۵"][index]}
                      </span>
                      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
                        <h3 className="text-base font-bold text-ink">{step.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="relative overflow-hidden bg-surface-soft/70 py-14 sm:py-20">
        <DotGrid className="absolute end-0 top-10 h-40 w-40 opacity-40" />
        <ConcentricCircles className="absolute -start-40 -bottom-48 size-[30rem] text-primary/10" />
        <div className="container-page relative">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold text-primary">در این مسیر چه چیزی دارید؟</span>
              <h2 className="mt-3 text-3xl font-bold leading-[1.5] text-ink sm:text-4xl">
                بیشتر از یک کد؛ یک تجربه‌ی همراه
              </h2>
              <p className="mt-4 text-sm leading-8 text-muted">
                لایسنس، شروع دسترسی است. همراهی و شفافیت، بخشی از تجربه‌ای است
                که برای خانواده‌ها طراحی کرده‌ایم.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {included.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.07}>
                <div className="card-surface h-full p-5">
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-soft/30 text-primary">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <ButtonLink to="/faq" variant="secondary" size="sm" arrow>
              پاسخ سؤال‌های رایج
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft sm:p-8">
            <span className="chip bg-emerald-50 text-emerald-800">در این سایت</span>
            <h2 className="mt-4 text-xl font-bold text-ink">چه کارهایی انجام می‌شود؟</h2>
            <ul className="mt-4 space-y-3">
              {[
                "معرفی و مقایسه‌ی دوره‌ها",
                "ثبت سفارش و پرداخت آنلاین",
                "ثبت دستی لایسنس توسط تیم",
                "نمایش کد و وضعیت سفارش در داشبورد",
                "ارسال ایمیل تحویل لایسنس",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-black/5 bg-ink p-6 text-white sm:p-8">
            <span className="chip bg-white/10 text-accent">در سرویس‌دهنده</span>
            <h2 className="mt-4 text-xl font-bold text-white">محتوای دوره کجاست؟</h2>
            <p className="mt-4 text-sm leading-8 text-white/60">
              محتوای آموزشی در سامانه‌ی سرویس‌دهنده‌ی دوره میزبانی می‌شود و با
              همان لایسنس در دسترس قرار می‌گیرد. این سایت ویدیو یا پخش‌کننده‌ای
              ندارد و فقط ویترین و مرجع فروش است.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
              <KeyRound className="size-4 text-accent" aria-hidden="true" />
              کد لایسنس، کلید ورود شما به محتوای دوره است.
            </div>
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
