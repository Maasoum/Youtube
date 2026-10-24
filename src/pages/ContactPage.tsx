import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Instagram,
  Mail,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { brand } from "@/config/brand";
import { contactApi, getErrorMessage } from "@/api";
import { zodResolver } from "@/lib/zodResolver";
import {
  contactMessageSchema,
  type ContactMessageFormValues,
} from "@/lib/validation";
import { formatNumber, toPersianDigits } from "@/lib/format";
import { PageIntro } from "@/components/ui/PageIntro";
import { Emphasis } from "@/components/ui/Emphasis";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  InputField,
  TextareaField,
} from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormAlert } from "@/components/auth/FormAlert";
import { Accordion } from "@/components/ui/Accordion";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Reveal } from "@/components/ui/Reveal";
import { ConcentricCircles, DotGrid } from "@/components/ui/Decorations";

const contactFaqs = [
  {
    question: "پاسخ پیام‌ها چقدر طول می‌کشد؟",
    answer:
      "پیام‌ها در ساعات کاری بررسی می‌شوند و معمولاً حداکثر تا یک روز کاری پاسخ می‌گیرند. اگر پیام شما درباره‌ی یک سفارش است، شماره‌ی سفارش را هم بنویسید تا سریع‌تر بررسی شود.",
  },
  {
    question: "برای تغییر یا لغو سفارش باید چه کنم؟",
    answer:
      "پیش از تحویل لایسنس، از طریق همین فرم یا ایمیل پشتیبانی درخواست خود را بفرستید. پس از صدور لایسنس، شرایط بازگشت طبق صفحه‌ی «شرایط بازگشت وجه» بررسی می‌شود.",
  },
  {
    question: "آیا برای انتخاب دوره مشاوره می‌دهید؟",
    answer:
      "بله. سن، تجربه‌ی قبلی کودک و علاقه‌ی او را بنویسید تا مسیر مناسب را پیشنهاد بدهیم. این مشاوره رایگان است و به خرید دوره هم محدود نمی‌شود.",
  },
];

export function ContactPage() {
  const [receipt, setReceipt] = useState<{ id: string; message: string } | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactMessageFormValues>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      website: "",
    },
  });

  useEffect(() => {
    document.title = `تماس با ما | ${brand.nameFa}`;
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await contactApi.submit({
        name: values.name,
        email: values.email,
        subject: values.subject,
        message: values.message,
        website: values.website,
      });
      setReceipt({ id: result.id, message: result.message });
      reset();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <>
      <PageIntro
        eyebrow="تماس با ما"
        title={
          <>
            سؤالی دارید؟ <Emphasis>بنویسید</Emphasis>؛ ما هستیم.
          </>
        }
        description="برای انتخاب دوره، پیگیری سفارش یا هر پرسش دیگری درباره‌ی مسیر یادگیری کودک، پیام بفرستید. یک آدم واقعی (نه ربات) پیام شما را می‌خواند."
      >
        <Breadcrumbs items={[{ label: "تماس با ما" }]} />
      </PageIntro>

      <section className="relative overflow-hidden py-10 sm:py-16">
        <DotGrid className="absolute -end-10 top-24 hidden h-40 w-56 opacity-30 lg:block" />
        <div className="container-page relative">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Reveal className="min-w-0">
              <div className="rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-soft sm:p-9">
                {receipt ? (
                  <div className="flex flex-col items-start">
                    <span className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="size-7" aria-hidden="true" />
                    </span>
                    <h2 className="mt-5 text-xl font-bold text-ink">
                      پیام شما ثبت شد
                    </h2>
                    <p className="mt-3 text-sm leading-8 text-muted">
                      {receipt.message}
                    </p>
                    <div className="mt-5 rounded-2xl bg-surface-soft px-4 py-3">
                      <p className="text-[11px] text-muted">شماره‌ی پیگیری</p>
                      <p
                        dir="ltr"
                        className="mt-1 font-mono text-sm font-bold text-ink [unicode-bidi:isolate]"
                      >
                        {receipt.id}
                      </p>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setReceipt(null)}
                      >
                        نوشتن پیام تازه
                      </Button>
                      <ButtonLink to="/courses" variant="primary" arrow>
                        دیدن دوره‌ها
                      </ButtonLink>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary-soft/40 text-primary">
                        <MessageSquareText
                          className="size-5"
                          aria-hidden="true"
                        />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-ink">
                          فرم تماس
                        </h2>
                        <p className="text-xs text-muted">
                          همه‌ی فیلدهای ستاره‌دار الزامی‌اند.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={onSubmit}
                      noValidate
                      className="mt-7 grid gap-5"
                    >
                      {formError ? <FormAlert message={formError} /> : null}

                      <div className="grid gap-5 sm:grid-cols-2">
                        <InputField
                          label="نام و نام خانوادگی"
                          placeholder="مثلاً سارا محمدی"
                          autoComplete="name"
                          required
                          icon={UserRound}
                          error={errors.name?.message}
                          {...register("name")}
                        />
                        <InputField
                          label="ایمیل"
                          type="email"
                          dir="ltr"
                          dirLtr
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                          icon={Mail}
                          error={errors.email?.message}
                          {...register("email")}
                        />
                      </div>

                      <InputField
                        label="موضوع"
                        placeholder="مثلاً مشاوره برای انتخاب دوره‌ی پایتون"
                        required
                        error={errors.subject?.message}
                        {...register("subject")}
                      />

                      <TextareaField
                        label="پیام شما"
                        rows={7}
                        placeholder="سن کودک، تجربه‌ی قبلی و سؤال‌تان را بنویسید تا دقیق‌تر راهنمایی کنیم."
                        required
                        error={errors.message?.message}
                        {...register("message")}
                      />

                      {/*
                        تله‌ی ربات: کاربر واقعی این فیلد پنهان را پر نمی‌کند.
                        از دید صفحه‌خوان و کیبورد پنهان است.
                      */}
                      <div aria-hidden="true" className="sr-only">
                        <label htmlFor="contact-website">
                          این فیلد را خالی بگذارید
                        </label>
                        <input
                          id="contact-website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          {...register("website")}
                        />
                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="inline-flex items-start gap-2 text-[11px] leading-6 text-muted">
                          <ShieldCheck
                            className="mt-0.5 size-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                          اطلاعات تماس شما فقط برای پاسخ به همین پیام استفاده
                          می‌شود.
                        </p>
                        <Button
                          type="submit"
                          variant="primary"
                          loading={isSubmitting}
                          className="shrink-0"
                          arrow
                        >
                          ارسال پیام
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </Reveal>

            <aside className="space-y-6">
              <div className="overflow-hidden rounded-[2rem] bg-primary p-6 text-white">
                <ConcentricCircles className="size-40 text-white/10 opacity-60" />
                <div className="relative">
                  <span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white">
                    راه‌های دیگر ارتباط
                  </span>
                  <ul className="mt-5 space-y-5 text-sm">
                    {brand.supportEmail ? (
                      <li className="flex items-start gap-3">
                        <Mail
                          className="mt-0.5 size-5 shrink-0 text-accent"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-[11px] text-white/60">ایمیل</p>
                          <a
                            href={`mailto:${brand.supportEmail}`}
                            dir="ltr"
                            className="mt-1 block font-mono text-xs text-white underline-offset-4 hover:underline [unicode-bidi:isolate]"
                          >
                            {brand.supportEmail}
                          </a>
                        </div>
                      </li>
                    ) : null}
                    <li className="flex items-start gap-3">
                      <Clock3
                        className="mt-0.5 size-5 shrink-0 text-accent"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-[11px] text-white/60">ساعات پاسخ</p>
                        <p className="mt-1 text-xs leading-6 text-white">
                          {brand.supportHours}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Instagram
                        className="mt-0.5 size-5 shrink-0 text-accent"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-[11px] text-white/60">اینستاگرام</p>
                        <a
                          href={`https://instagram.com/${brand.instagramHandle}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          dir="ltr"
                          className="mt-1 block font-mono text-xs text-white underline-offset-4 transition hover:underline [unicode-bidi:isolate]"
                        >
                          @{brand.instagramHandle}
                        </a>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-ink">
                  پیش از ارسال پیام
                </h2>
                <p className="mt-2 text-xs leading-7 text-muted">
                  اگر پرسش شما درباره‌ی سفارش است، شماره‌ی سفارش و ایمیل حساب را
                  هم بنویسید. برای پرسش‌های پرتکرار، صفحه‌ی سؤالات متداول
                  سریع‌ترین راه است.
                </p>
                <ButtonLink
                  to="/faq"
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  سؤالات متداول
                </ButtonLink>
              </div>

              <div className="rounded-3xl bg-accent/25 p-6">
                <p className="text-xs font-bold text-ink">
                  {formatNumber(24)} ساعت کاری
                </p>
                <p className="mt-2 text-[11px] leading-6 text-ink/70">
                  حداکثر زمان پاسخ‌گویی تیم پشتیبانی در روزهای کاری است؛
                  پیام‌های تعطیلات، اولین روز کاری بعد پاسخ داده می‌شوند.
                </p>
              </div>
            </aside>
          </div>

          <div className="mt-14 sm:mt-20">
            <SectionTitle
              eyebrow="پرسش‌های پرتکرار"
              title="شاید جواب‌تان همین‌جا باشد"
              description={`اگر پاسخ سوالتان را پیدا نکردید، فرم بالا در دسترس است. ${toPersianDigits(3)} پرسش پرتکرار درباره‌ی ارتباط با ما.`}
            />
            <div className="mt-7 rounded-3xl border border-black/5 bg-white px-5 shadow-sm sm:px-8">
              <Accordion items={contactFaqs} defaultOpen={0} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
