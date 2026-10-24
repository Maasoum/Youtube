import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { api, getErrorMessage } from "@/api";
import { brand } from "@/config/brand";
import {
  membershipSchema,
  type MembershipFormValues,
} from "@/lib/validation";
import { zodResolver } from "@/lib/zodResolver";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { Reveal } from "@/components/ui/Reveal";
import { ScallopStar } from "@/components/ui/Decorations";
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

const inputOnPrimary =
  "rounded-full border-transparent bg-white/95 py-3.5 placeholder:text-muted/70 focus:border-white focus:ring-white/25";

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
      className="bg-white py-16 sm:py-24"
      aria-labelledby="membership-title"
    >
      <Container>
        <Reveal>
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] bg-primary px-6 py-12 text-center text-white sm:px-10 sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1.4px,transparent_1.4px)] [background-size:22px_22px] opacity-40"
            />
            <ScallopStar className="pointer-events-none absolute -bottom-6 -start-6 size-24 text-white/10" />

            <div className="relative">
              <h2
                id="membership-title"
                className="mx-auto max-w-lg text-balance text-[1.7rem] font-bold leading-[1.6] sm:text-[2.4rem]"
              >
                به جامعه‌ی{" "}
                <span className="text-accent">{brand.nameFa}</span> بپیوندید
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/70">
                هر ماه یک ایمیل کوتاه: ایده‌ی بازی خانگی، راهنمای امنیت کودک و
                خبر دوره‌های تازه.
              </p>

              <form
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                className="mx-auto mt-8 max-w-md space-y-3 text-start [&_[role=alert]]:text-red-100"
              >
                <InputField
                  hideLabel
                  label="نام"
                  placeholder="نام شما"
                  autoComplete="name"
                  required
                  error={errors.fullName?.message}
                  className={inputOnPrimary}
                  {...register("fullName")}
                />

                <InputField
                  hideLabel
                  label="ایمیل یا شماره موبایل"
                  placeholder="ایمیل یا شماره موبایل"
                  autoComplete="email"
                  inputMode="email"
                  required
                  error={errors.contact?.message}
                  className={inputOnPrimary}
                  {...register("contact")}
                />

                <div className="rounded-[1.5rem] bg-white/10 p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-white">
                    <ShieldCheck
                      className="size-4 text-accent"
                      aria-hidden="true"
                    />
                    ما از اطلاعات شما چگونه استفاده می‌کنیم
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {privacyPoints.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-[11px] leading-6 text-white/60"
                      >
                        <span className="mt-2 inline-block size-1 shrink-0 rounded-full bg-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-1">
                  <div className="flex items-start gap-3">
                    <input
                      id="membership-consent"
                      type="checkbox"
                      aria-invalid={errors.consent ? true : undefined}
                      aria-describedby={
                        errors.consent ? "membership-consent-error" : undefined
                      }
                      className="mt-1 size-4 shrink-0 cursor-pointer rounded border-white/40 bg-white/20 accent-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
                      {...register("consent")}
                    />
                    <label
                      htmlFor="membership-consent"
                      className="cursor-pointer text-[11px] leading-6 text-white/70"
                    >
                      من والد یا سرپرست قانونی هستم و با ذخیره و استفاده از
                      اطلاعاتم مطابق توضیحات بالا موافقم.
                    </label>
                  </div>
                  {errors.consent?.message ? (
                    <p
                      id="membership-consent-error"
                      role="alert"
                      className="mt-2 text-[11px] font-bold leading-6 text-red-100"
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
                      "flex items-start gap-2.5 rounded-2xl border p-3.5 text-[11px] leading-6",
                      feedback.type === "success"
                        ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-50"
                        : "border-red-300/30 bg-red-400/15 text-red-50",
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

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    fullWidth
                    loading={isSubmitting}
                  >
                    ارسال
                  </Button>
                </div>

                <p className="text-center text-[10px] leading-5 text-white/45">
                  با ارسال این فرم فقط در خبرنامه عضو می‌شوید؛ هیچ پرداختی انجام
                  نمی‌شود.
                </p>
              </form>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
