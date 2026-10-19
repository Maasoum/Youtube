import { Compass, CreditCard, KeyRound, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BrushBlob, DotsTrail, StarBurst } from "@/components/ui/Decorations";

const steps = [
  {
    number: "۰۱",
    icon: Compass,
    title: "دوره را انتخاب کنید",
    description:
      "سن، علاقه و سطح کودک را در نظر بگیرید. در صفحه‌ی هر دوره، سرفصل‌ها، نتیجه‌ی یادگیری و پیش‌نیازها را شفاف می‌بینید.",
    color: "bg-primary-soft/40 text-primary",
  },
  {
    number: "۰۲",
    icon: CreditCard,
    title: "سفارش را ثبت و پرداخت کنید",
    description:
      "با ایمیل خود وارد شوید، در صورت داشتن کد تخفیف آن را وارد کنید و پرداخت امن را کامل کنید. هر سفارش فقط یک دوره و یک کد تخفیف دارد.",
    color: "bg-accent/30 text-[#7A5800]",
  },
  {
    number: "۰۳",
    icon: KeyRound,
    title: "لایسنس را در داشبورد بگیرید",
    description:
      "تیم ما کد لایسنس را از سرویس‌دهنده دریافت و در پنل ثبت می‌کند. کد در داشبورد شما قرار می‌گیرد و به ایمیل‌تان هم ارسال می‌شود.",
    color: "bg-sky-100 text-sky-800",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden bg-surface-soft/60 py-16 sm:py-24" aria-label="مراحل خرید">
      <BrushBlob className="absolute -end-20 -top-20 w-80 text-white/70" />
      <DotsTrail className="absolute start-[7%] top-16 hidden w-28 -rotate-12 text-primary/25 lg:block" />
      <StarBurst className="absolute -bottom-8 end-[10%] size-28 -rotate-12 text-accent/60" />

      <div className="container-page relative">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="مسیر خرید، ساده و شفاف"
            title="از انتخاب تا شروع، فقط سه قدم"
            description="می‌خواهیم بدانید دقیقاً چه اتفاقی می‌افتد؛ بدون هزینه‌ی پنهان و بدون اشتراک ماهانه."
          />
        </Reveal>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.number}>
              <Reveal delay={index * 0.1} className="h-full">
                <article className="card-surface relative flex h-full flex-col p-6 sm:p-7">
                  <div className="mb-6 flex items-start justify-between">
                    <span
                      className={`inline-flex size-12 items-center justify-center rounded-2xl ${step.color}`}
                    >
                      <step.icon className="size-6" aria-hidden="true" />
                    </span>
                    <span
                      className="text-3xl font-bold text-black/[0.14]"
                      aria-hidden="true"
                    >
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm leading-8 text-muted">
                    {step.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 border-t border-black/5 pt-4 text-[11px] font-bold text-primary">
                    قدم {step.number}
                  </span>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-xs leading-6 text-muted">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="m-0">
              لایسنس‌ها توسط تیم انسانی ثبت می‌شوند؛ معمولاً کمتر از یک روز
              کاری. اگر سفارش شما بیش از این منتظر ماند، با پشتیبانی تماس
              بگیرید تا پیگیری کنیم.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 flex justify-center">
          <ButtonLink to="/how-it-works" variant="secondary" size="sm" arrow>
            راهنمای کامل خرید و تحویل
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
