import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  CreditCard,
  Info,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import {
  coursesApi,
  discountsApi,
  getErrorMessage,
  ordersApi,
  type Course,
} from "@/api";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { zodResolver } from "@/lib/zodResolver";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/validation";
import {
  formatNumber,
  formatPercent,
  normalizeCode,
  toPersianDigits,
} from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckboxField, InputField, TextareaField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Loading";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { FormAlert } from "@/components/auth/FormAlert";
import { CourseMeta } from "@/components/course/CourseMeta";
import { cn } from "@/lib/cn";

interface AppliedDiscount {
  code: string;
  percent: number;
  amountToman: number;
}

const steps = ["بازبینی سفارش", "اطلاعات و تخفیف", "پرداخت"];

function CheckoutStepper({ current }: { current: number }) {
  return (
    <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="مراحل تکمیل سفارش">
      {steps.map((label, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-start"
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                isDone && "bg-emerald-100 text-emerald-700",
                isCurrent && "bg-primary text-white shadow-pop",
                !isDone && !isCurrent && "bg-surface-soft text-muted",
              )}
            >
              {isDone ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                toPersianDigits(index + 1)
              )}
            </span>
            <span
              className={cn(
                "text-[10px] font-bold leading-5 sm:text-xs",
                isCurrent ? "text-ink" : "text-muted",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">(
    "loading",
  );
  const [step, setStep] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(
    null,
  );
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const pendingOrderId = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      note: "",
      acceptRules: false,
    },
  });

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setCourse(null);
    setStep(0);
    setAppliedDiscount(null);
    setDiscountInput("");
    pendingOrderId.current = null;

    coursesApi
      .getBySlug(slug ?? "")
      .then((data) => {
        if (!active) return;
        if (!data) {
          setStatus("not-found");
          return;
        }
        setCourse(data);
        setStatus("ready");
        document.title = `تکمیل سفارش | ${brand.nameFa}`;
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (status === "loading") {
    return <PageLoader label="در حال آماده‌سازی سفارش…" />;
  }

  if (status === "not-found" || !course) {
    return (
      <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
        <EmptyState
          icon={AlertCircle}
          title={status === "error" ? "دریافت اطلاعات دوره ممکن نشد" : "دوره پیدا نشد"}
          description={
            status === "error"
              ? "لطفاً دوباره تلاش کنید یا به فهرست دوره‌ها برگردید."
              : "نشانی این سفارش معتبر نیست. از فهرست دوره‌ها، دوره‌ی موردنظر را انتخاب کنید."
          }
          action={
            <ButtonLink to="/courses" arrow>
              بازگشت به دوره‌ها
            </ButtonLink>
          }
        />
      </section>
    );
  }

  const discountAmount = appliedDiscount?.amountToman ?? 0;
  const totalToman = Math.max(0, course.priceToman - discountAmount);
  const licenseEmail = watch("email");

  const applyDiscount = async () => {
    const code = normalizeCode(discountInput);
    setDiscountError(null);

    if (!code) {
      setDiscountError("کد تخفیف را وارد کنید.");
      return;
    }

    setCheckingDiscount(true);
    try {
      const result = await discountsApi.validate({
        code,
        courseId: course.id,
      });
      if (!result.valid) {
        setDiscountError(result.message);
        return;
      }
      setAppliedDiscount({
        code: result.discount.code,
        percent: result.discount.percent,
        amountToman: result.amountToman,
      });
      setDiscountInput(result.discount.code);
      notify("کد تخفیف اعمال شد.", "success");
    } catch (error) {
      setDiscountError(getErrorMessage(error));
    } finally {
      setCheckingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountError(null);
  };

  const goToPayment = async () => {
    const valid = await trigger();
    if (valid) {
      setStep(2);
    }
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setPayError(null);
      setPaying(true);
      try {
        let orderId = pendingOrderId.current;
        if (!orderId) {
          const order = await ordersApi.create({
            courseId: course.id,
            discountCode: appliedDiscount?.code,
            note: values.note?.trim() || undefined,
            contactEmail: values.email,
            contactPhone: values.phone,
          });
          orderId = order.id;
          pendingOrderId.current = order.id;
        }

        await ordersApi.pay(orderId);
        notify("پرداخت با موفقیت ثبت شد. لایسنس در حال آماده‌سازی است.", "success");
        navigate(`/checkout/success/${orderId}`, { replace: true });
      } catch (error) {
        const message = getErrorMessage(error);
        setPayError(message);
        notify(message, "error");
      } finally {
        setPaying(false);
      }
    },
    () => {
      setStep(1);
    },
  );

  const busy = isSubmitting || paying;

  return (
    <>
      <section className="border-b border-black/5 bg-surface-soft/60 py-8">
        <div className="container-page">
          <Breadcrumbs
            items={[
              { label: "دوره‌ها", to: "/courses" },
              { label: course.title, to: `/courses/${course.slug}` },
              { label: "تکمیل سفارش" },
            ]}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ink">تکمیل سفارش</h1>
              <p className="mt-2 text-sm leading-7 text-muted">
                یک سفارش، یک دوره و حداکثر یک کد تخفیف. لایسنس پس از پرداخت
                برای شما آماده می‌شود.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-bold text-emerald-700 shadow-sm">
              <Lock className="size-3.5" aria-hidden="true" />
              اتصال امن به درگاه پرداخت
            </span>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-12">
        <CheckoutStepper current={step} />

        <div className="grid gap-8 lg:grid-cols-[1fr_21rem] lg:items-start xl:grid-cols-[1fr_23rem]">
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            {step === 0 ? (
              <div className="card-surface p-5 sm:p-7">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    ۱
                  </span>
                  <h2 className="text-lg font-bold text-ink">بازبینی سفارش</h2>
                </div>

                <div className="mt-5 overflow-hidden rounded-3xl border border-black/5">
                  <div className="aspect-[16/8] w-full">
                    <PlaceholderArt imageKey={course.art} className="h-full w-full" />
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip bg-primary-soft/35 text-primary">
                        {course.badge ?? "دوره‌ی آنلاین"}
                      </span>
                      <span className="text-xs text-muted">
                        لایسنس دائمی و تک‌کاربره
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-ink">{course.title}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted">{course.tagline}</p>
                    <CourseMeta course={course} className="mt-3" />
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-surface-soft p-4">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <p className="m-0 text-xs leading-7 text-muted">
                    محتوای دوره در سامانه‌ی سرویس‌دهنده ارائه می‌شود. پس از
                    پرداخت، کد لایسنس در داشبورد شما و ایمیل ثبت‌شده قرار
                    می‌گیرد.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <ButtonLink
                    to={`/courses/${course.slug}`}
                    variant="ghost"
                    size="sm"
                  >
                    بازگشت به صفحه‌ی دوره
                  </ButtonLink>
                  <Button
                    type="button"
                    size="md"
                    arrow
                    onClick={() => setStep(1)}
                  >
                    ادامه‌ی سفارش
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="card-surface p-5 sm:p-7">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    ۲
                  </span>
                  <h2 className="text-lg font-bold text-ink">اطلاعات تحویل و تخفیف</h2>
                </div>
                <p className="mt-2 text-xs leading-7 text-muted">
                  برای هر سفارش فقط یک کد تخفیف قابل استفاده است.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <InputField
                    label="ایمیل دریافت لایسنس"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    error={errors.email?.message}
                    required
                    dirLtr
                    hint="کد لایسنس به این ایمیل ارسال می‌شود."
                    {...register("email")}
                  />
                  <InputField
                    label="شماره موبایل"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                    error={errors.phone?.message}
                    required
                    {...register("phone")}
                  />
                </div>

                <div className="mt-6">
                  <label htmlFor="discount-code" className="label-base">
                    کد تخفیف (اختیاری)
                  </label>

                  {appliedDiscount ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white text-emerald-700">
                          <Tag className="size-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-emerald-900">
                            کد{" "}
                            <span
                              dir="ltr"
                              className="ltr-inline mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-[11px]"
                            >
                              {appliedDiscount.code}
                            </span>{" "}
                            اعمال شد
                          </p>
                          <p className="mt-1 text-[11px] text-emerald-800/80">
                            {formatPercent(appliedDiscount.percent)} تخفیف —{" "}
                            {formatNumber(appliedDiscount.amountToman)} تومان
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeDiscount}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                        حذف کد
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          id="discount-code"
                          value={discountInput}
                          onChange={(event) => {
                            setDiscountInput(event.target.value.toUpperCase());
                            setDiscountError(null);
                          }}
                          dir="ltr"
                          maxLength={20}
                          placeholder="BRIGHT20"
                          aria-invalid={discountError ? true : undefined}
                          aria-describedby={discountError ? "discount-error" : undefined}
                          className={cn(
                            "input-base ltr-inline font-mono tracking-wide text-start",
                            discountError && "input-error",
                          )}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void applyDiscount()}
                          loading={checkingDiscount}
                          className="shrink-0"
                        >
                          {checkingDiscount ? "بررسی…" : "اعمال کد"}
                        </Button>
                      </div>
                      {discountError ? (
                        <p
                          id="discount-error"
                          role="alert"
                          className="mt-2 text-xs font-bold text-red-600"
                        >
                          {discountError}
                        </p>
                      ) : (
                        <p className="mt-2 text-[11px] text-muted">
                          هیچ کد تخفیفی ندارید؟ این مرحله را بدون کد ادامه دهید.
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-5">
                  <TextareaField
                    label="توضیح سفارش (اختیاری)"
                    placeholder="اگر نکته‌ای برای تحویل لایسنس دارید بنویسید…"
                    error={errors.note?.message}
                    rows={3}
                    {...register("note")}
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-surface-soft p-4">
                  <CheckboxField
                    label={
                      <>
                        شرایط خرید و تحویل لایسنس را می‌پذیرم و می‌دانم این
                        لایسنس تک‌کاربره و مخصوص یک کودک است. کد پس از پرداخت
                        توسط تیم ثبت و در داشبورد و ایمیل تحویل می‌شود.
                      </>
                    }
                    error={errors.acceptRules?.message}
                    {...register("acceptRules")}
                  />
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={ArrowRight}
                    onClick={() => setStep(0)}
                  >
                    بازگشت
                  </Button>
                  <Button
                    type="button"
                    size="md"
                    arrow
                    onClick={() => void goToPayment()}
                  >
                    ادامه به پرداخت
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="card-surface p-5 sm:p-7">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    ۳
                  </span>
                  <h2 className="text-lg font-bold text-ink">پرداخت سفارش</h2>
                </div>

                {payError ? (
                  <div className="mt-5">
                    <FormAlert message={payError} />
                  </div>
                ) : null}

                <div className="mt-5 rounded-2xl border-2 border-primary bg-primary-soft/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-bold text-ink">
                      <CreditCard className="size-5 text-primary" aria-hidden="true" />
                      پرداخت آنلاین
                    </span>
                    <span className="chip bg-emerald-50 text-emerald-800">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      انتخاب‌شده
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-7 text-muted">
                    انتقال به درگاه بانکی امن؛ مبلغ از حساب شما کسر می‌شود.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-surface-soft p-4">
                  <div className="flex items-start gap-2.5">
                    <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <p className="m-0 text-xs leading-7 text-muted">
                      کد لایسنس به ایمیل{" "}
                      <span dir="ltr" className="ltr-inline mx-1 font-mono text-[11px] text-ink">
                        {licenseEmail || user?.email}
                      </span>{" "}
                      ارسال می‌شود و در داشبورد شما نیز قرار می‌گیرد.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <Info className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <p className="m-0 text-[11px] leading-6 text-amber-900/80">
                    این یک نسخه‌ی نمایشی است؛ پرداخت واقعی انجام نمی‌شود و
                    مبلغی از حساب شما کسر نخواهد شد. فرایند ثبت سفارش و
                    لایسنس شبیه‌سازی شده است.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={ArrowRight}
                    onClick={() => setStep(1)}
                    disabled={busy}
                  >
                    بازگشت
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    icon={ShieldCheck}
                    loading={busy}
                    className="sm:min-w-64"
                  >
                    {busy
                      ? "در حال اتصال به درگاه…"
                      : `پرداخت ${formatNumber(totalToman)} تومان`}
                  </Button>
                </div>
              </div>
            ) : null}
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="card-surface overflow-hidden">
              <div className="aspect-[16/9] w-full">
                <PlaceholderArt imageKey={course.art} className="h-full w-full" />
              </div>
              <div className="p-5">
                <p className="text-[11px] text-muted">خلاصه‌ی سفارش</p>
                <h2 className="mt-1.5 text-sm font-bold leading-6 text-ink">
                  {course.title}
                </h2>

                <dl className="mt-4 space-y-2.5 border-t border-black/5 pt-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted">قیمت دوره</dt>
                    <dd className="font-bold text-ink">
                      {formatNumber(course.priceToman)} تومان
                    </dd>
                  </div>
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between gap-2 text-emerald-700">
                      <dt>
                        تخفیف ({formatPercent(appliedDiscount.percent)})
                      </dt>
                      <dd className="font-bold">
                        {formatNumber(appliedDiscount.amountToman)}− تومان
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-2 border-t border-dashed border-black/10 pt-3">
                    <dt className="text-sm font-bold text-ink">مبلغ قابل پرداخت</dt>
                    <dd className="text-base font-bold text-primary">
                      {formatNumber(totalToman)} تومان
                    </dd>
                  </div>
                </dl>

                <ul className="mt-4 space-y-2 border-t border-black/5 pt-4">
                  <li className="flex items-center gap-2 text-[11px] text-muted">
                    <KeyRound className="size-3.5 text-primary" aria-hidden="true" />
                    لایسنس دائمی و تک‌کاربره
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted">
                    <Mail className="size-3.5 text-primary" aria-hidden="true" />
                    تحویل در داشبورد و ایمیل
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted">
                    <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
                    ضمانت بازگشت ۷ روزه
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/10 bg-primary-soft/15 p-4">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="m-0 text-[11px] leading-6 text-muted">
                سؤالی دارید؟ پیش از پرداخت، صفحه‌ی{" "}
                <Link to="/faq" className="font-bold text-primary underline-offset-4 hover:underline">
                  پرسش‌های پرتکرار
                </Link>{" "}
                را ببینید.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
