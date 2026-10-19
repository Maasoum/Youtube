import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Check,
  CheckCircle2,
  AlertCircle,
  Mail,
  ShieldCheck,
  Sparkles,
  Send,
} from "lucide-react";
import { api, getErrorMessage } from "@/api";
import { brand } from "@/config/brand";
import {
  membershipSchema,
  type MembershipFormValues,
} from "@/lib/validation";
import { zodResolver } from "@/lib/zodResolver";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { Reveal } from "@/components/ui/Reveal";
import {
  ConcentricCircles,
  ScallopStar,
} from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

const privacyPoints = [
  "فقط نام و ایمیل یا شماره موبایل شما ذخیره می‌شود.",
  `فقط برای ارسال اخبار و به‌روزرسانی‌های ${brand.nameFa} استفاده می‌شود.`,
  "هرگز با شخص ثالثی به اشتراک گذاشته نمی‌شود.",
  "هر زمان بخواهید، می‌توانید حذف اطلاعاتتان را درخواست کنید.",
];

interface Feedback {
  type: "success" | "error";
  message: string;
}

export function MembershipSection() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MembershipFormValues>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      fullName: "",
      contact: "",
      consent: false,
      website: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (values: MembershipFormValues) => {
    setFeedback(null);
    try {
      const receipt = await api.submitLead({
        fullName: values.fullName,
        contact: values.contact,
        consent: values.consent,
        website: values.website,
      });
      reset();
      setFeedback({ type: "success", message: receipt.message });
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  };

  return (
    <section
      className="relative overflow-hidden bg-white py-16 sm:py-24"
      aria-labelledby="membership-title"
    >
      <Container>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.2)_1.4px,transparent_1.4px)] [background-size:20px_20px] opacity-30"
          />
          <ConcentricCircles className="absolute -end-36 -top-40 size-[32rem] text-white/10" />
          <ScallopStar className="absolute start-[40%] top-6 hidden size-14 rotate-12 text-accent/60 md:block" />
          <span className="absolute -start-20 bottom-0 size-56 rounded-full bg-accent/10 blur-2xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
            <Reveal>
              <SectionTitle
                id="membership-title"
                align="start"
                tone="dark"
                eyebrow="خبرنامه‌ی خانواده‌ها"
                title={`به جامعه‌ی ${brand.nameFa} بپیوندید`}
                highlight={brand.nameFa}
                description="هر ماه یک ایمیل کوتاه و مفید می‌فرستیم: ایده‌ی بازی‌های خانگی، راهنمای امنیت کودک و خبر دوره‌های تازه. بدون پیام‌های پرت و بدون فشار برای خرید."
              />

              <ul className="mt-8 space-y-4">
                {[
                  "اولین نفر از دوره‌های تازه باخبر می‌شوید.",
                  "ایده‌های ساده برای گفت‌وگو با کودک درباره‌ی فناوری.",
                  "هر زمان بخواهید، با یک کلیک از خبرنامه خارج می‌شوید.",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-7 text-white/80"
                  >
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
                <Mail className="size-4 text-accent" aria-hidden="true" />
                حداکثر یک ایمیل در ماه؛ بدون تبلیغات مزاحم.
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-3xl bg-white p-5 text-ink shadow-pop sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-ink">
                      عضویت در خبرنامه
                    </h3>
                    <p className="mt-1 text-xs leading-6 text-muted">
                      فقط چند ثانیه وقت می‌گیرد.
                    </p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-accent/25 text-[#8A5A00]">
                    <Sparkles className="size-5" aria-hidden="true" />
                  </span>
                </div>

                <form
                  noValidate
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-6 space-y-5"
                >
                  <InputField
                    label="نام"
                    placeholder="مثلاً سارا محمدی"
                    autoComplete="name"
                    required
                    error={errors.fullName?.message}
                    {...register("fullName")}
                  />

                  <InputField
                    label="ایمیل یا شماره موبایل"
                    placeholder="name@example.com یا ۰۹۱۲۱۲۳۴۵۶۷"
                    autoComplete="email"
                    inputMode="email"
                    required
                    hint="برای ارسال خبرنامه، یکی از این دو کافی است."
                    error={errors.contact?.message}
                    {...register("contact")}
                  />

                  <div className="rounded-2xl border border-primary/10 bg-surface-soft p-4 sm:p-5">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
                      <ShieldCheck
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      ما از اطلاعات شما چگونه استفاده می‌کنیم
                    </h4>
                    <ul className="mt-3 space-y-2.5">
                      {privacyPoints.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2 text-xs leading-6 text-muted"
                        >
                          <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-start gap-3">
                      <input
                        id="membership-consent"
                        type="checkbox"
                        aria-invalid={errors.consent ? true : undefined}
                        aria-describedby={
                          errors.consent ? "membership-consent-error" : undefined
                        }
                        className="mt-1 size-5 shrink-0 cursor-pointer rounded-md border-black/20 accent-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                        {...register("consent")}
                      />
                      <label
                        htmlFor="membership-consent"
                        className="cursor-pointer text-xs leading-6 text-muted sm:text-sm"
                      >
                        من والد یا سرپرست قانونی هستم و با ذخیره و استفاده از
                        اطلاعاتم مطابق توضیحات بالا موافقم.
                      </label>
                    </div>
                    {errors.consent?.message ? (
                      <p
                        id="membership-consent-error"
                        role="alert"
                        className="mt-2 text-xs font-bold leading-6 text-red-600"
                      >
                        {errors.consent.message}
                      </p>
                    ) : null}
                  </div>

                  {/* تله‌ی ربات: از دید کاربر پنهان است و باید خالی بماند. */}
                  <div
                    aria-hidden="true"
                    className="absolute -start-[9999px] top-auto h-px w-px overflow-hidden"
                  >
                    <label htmlFor="membership-website">وب‌سایت</label>
                    <input
                      id="membership-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      {...register("website")}
                    />
                  </div>

                  {feedback ? (
                    <div
                      role={feedback.type === "success" ? "status" : "alert"}
                      aria-live="polite"
                      className={cn(
                        "flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs leading-6",
                        feedback.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-700",
                      )}
                    >
                      {feedback.type === "success" ? (
                        <CheckCircle2
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertCircle
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="font-bold">{feedback.message}</span>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    fullWidth
                    loading={isSubmitting}
                    icon={Send}
                  >
                    ارسال
                  </Button>

                  <p className="text-center text-[10px] leading-5 text-muted">
                    با ارسال این فرم، فقط در خبرنامه عضو می‌شوید؛ هیچ پرداختی
                    انجام نمی‌شود.
                  </p>
                </form>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
