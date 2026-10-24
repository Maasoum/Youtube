import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock3,
  CreditCard,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import {
  ApiError,
  contentApi,
  coursesApi,
  discountsApi,
  getErrorMessage,
  ordersApi,
  paymentsApi,
  type Course,
  type CourseAccessStatus,
  type DiscountValidation,
} from "@/api";
import { brand } from "@/config/brand";
import { purchaseConfig } from "@/config/purchase";
import { useAuth } from "@/context/AuthContext";
import { zodResolver } from "@/lib/zodResolver";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/validation";
import {
  formatNumber,
  formatToman,
  toPersianDigits,
} from "@/lib/format";
import { formatAgeRange } from "@/lib/labels";
import { normalizeDiscountCode } from "@/lib/discount";
import { cn } from "@/lib/cn";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Loading";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { Price } from "@/components/ui/Price";
import { LevelBadge } from "@/components/ui/StatusBadge";
import { FormAlert } from "@/components/auth/FormAlert";
import {
  ConcentricCircles,
  DotGrid,
  ScallopStar,
} from "@/components/ui/Decorations";

type PageStatus = "loading" | "ready" | "not-found" | "error";

type AppliedDiscount = Extract<DiscountValidation, { valid: true }>;

const blockedCopy: Record<
  NonNullable<CourseAccessStatus["reason"]>,
  { title: string; description: string; action: string; to: string }
> = {
  license: {
    title: "شما لایسنس فعال این دوره را دارید",
    description:
      "برای هر کودک فقط یک لایسنس دائمی لازم است. کد این دوره در داشبورد شما قرار دارد و خرید دوباره لازم نیست.",
    action: "دیدن لایسنس در داشبورد",
    to: "/dashboard#licenses",
  },
  "in-progress": {
    title: "سفارش این دوره در جریان است",
    description:
      "پرداخت شما ثبت شده و لایسنس در حال آماده‌سازی است. وضعیت آن را از داشبورد پیگیری کنید.",
    action: "پیگیری سفارش",
    to: "/dashboard",
  },
  "pending-payment": {
    title: "یک سفارش در انتظار پرداخت دارید",
    description:
      "برای جلوگیری از سفارش تکراری، ابتدا همان سفارش را تکمیل کنید. اگر پرداخت را نیمه‌کاره رها کرده‌اید، می‌توانید از همین‌جا ادامه دهید.",
    action: "ادامه‌ی پرداخت",
    to: "/dashboard",
  },
};

export function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [access, setAccess] = useState<CourseAccessStatus | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [discountInput, setDiscountInput] = useState("");
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [taxPercent, setTaxPercent] = useState(0);
  const [slaHours, setSlaHours] = useState<number>(
    purchaseConfig.licenseDeliveryHours,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { acceptRules: false },
  });

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError(null);
    setCourse(null);
    setAccess(null);
    setApplied(null);
    setDiscountInput("");
    setPayError(null);

    contentApi
      .getPublicSettings()
      .then((settings) => {
        if (!active) return;
        setTaxPercent(settings.taxPercent);
        setSlaHours(settings.fulfillmentSlaHours);
      })
      .catch(() => {
        // اگر تنظیمات عمومی در دسترس نبود، پیش‌فرض‌های امن همین‌جا می‌مانند.
      });

    coursesApi
      .get(slug ?? "")
      .then(async (data) => {
        if (!active) return;
        if (!data) {
          setStatus("not-found");
          return;
        }
        setCourse(data);
        document.title = `تکمیل سفارش | ${brand.nameFa}`;

        try {
          const accessStatus = await ordersApi.getCourseAccess(data.id);
          if (!active) return;
          setAccess(accessStatus);
        } catch {
          if (!active) return;
          // اگر بررسی دسترسی ممکن نشد، خرید را باز می‌گذاریم؛
          // createOrder در سرور دوباره این قاعده را اعمال می‌کند.
          setAccess({ allowed: true });
        }
        if (active) setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(getErrorMessage(reason));
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (status === "loading") {
    return <PageLoader label="در حال آماده‌سازی سفارش…" />;
  }

  if (status === "not-found" || status === "error" || !course) {
    return (
      <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
        <EmptyState
          icon={AlertCircle}
          title={
            status === "error"
              ? "دریافت اطلاعات دوره ممکن نشد"
              : "این دوره پیدا نشد"
          }
          description={
            status === "error"
              ? error ?? "لطفاً دوباره تلاش کنید."
              : "نشانی سفارش معتبر نیست. از فهرست دوره‌ها، دوره‌ی موردنظر را انتخاب کنید."
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

  if (access && !access.allowed && access.reason) {
    const copy = blockedCopy[access.reason];
    const to =
      access.reason === "pending-payment" && access.orderId
        ? `/payment/callback?state=pending&order=${access.orderId}`
        : copy.to;

    return (
      <section className="container-page py-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-primary/10 bg-white p-7 text-center shadow-soft sm:p-10">
            <DotGrid className="absolute -end-6 -top-6 h-32 w-44 opacity-30" />
            <span className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft/40 text-primary">
              <ShieldCheck className="size-8" aria-hidden="true" />
            </span>
            <h1 className="relative mt-5 text-2xl font-bold text-ink sm:text-3xl">
              {copy.title}
            </h1>
            <p className="relative mx-auto mt-3 max-w-md text-sm leading-8 text-muted">
              {copy.description}
            </p>
            {access.orderNumber ? (
              <p className="relative mt-3 text-xs font-bold text-primary">
                شماره سفارش: {toPersianDigits(access.orderNumber)}
              </p>
            ) : null}
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink to={to} arrow>
                {copy.action}
              </ButtonLink>
              <ButtonLink to={`/courses/${course.slug}`} variant="secondary">
                بازگشت به صفحه‌ی دوره
              </ButtonLink>
            </div>
            <p className="relative mt-6 text-[11px] leading-6 text-muted">
              برای هر دوره یک لایسنس دائمی و تک‌کاربره صادر می‌شود.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const discountAmount = applied?.amountToman ?? 0;
  const discountedToman = Math.max(0, course.priceToman - discountAmount);
  const taxToman =
    taxPercent > 0 ? Math.round((discountedToman * taxPercent) / 100) : 0;
  const totalToman = discountedToman + taxToman;
  const isFree = totalToman === 0;

  const applyDiscount = async () => {
    const code = normalizeDiscountCode(discountInput);
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
        setApplied(null);
        setDiscountError(result.message);
        return;
      }
      setApplied(result);
      setDiscountInput(result.discount.code);
    } catch (reason) {
      setApplied(null);
      setDiscountError(getErrorMessage(reason));
    } finally {
      setCheckingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setApplied(null);
    setDiscountInput("");
    setDiscountError(null);
  };

  const onSubmit = handleSubmit(async () => {
    setPayError(null);
    setPaying(true);
    try {
      const order = await ordersApi.create({
        courseId: course.id,
        discountCode: applied?.discount.code,
        contactEmail: user?.email,
        contactPhone: user?.phone,
      });

      const result = await paymentsApi.start(order.id);
      const state = result.state === "success" ? "success" : result.state;
      navigate(
        `/payment/callback?state=${state}&order=${encodeURIComponent(order.id)}`,
      );
    } catch (reason) {
      if (reason instanceof ApiError && reason.message) {
        setPayError(reason.message);
      } else {
        setPayError(getErrorMessage(reason));
      }
    } finally {
      setPaying(false);
    }
  });

  return (
    <>
      <section className="relative overflow-hidden border-b border-black/5 bg-surface-soft/60">
        <DotGrid className="absolute -start-6 top-6 h-28 w-44 opacity-35" />
        <ConcentricCircles className="absolute -end-36 -top-36 size-[26rem] text-primary/10" />
        <div className="container-page relative py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: "دوره‌ها", to: "/courses" },
              { label: course.title, to: `/courses/${course.slug}` },
              { label: "تکمیل سفارش" },
            ]}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ink sm:text-4xl">
                تکمیل سفارش
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted">
                یک سفارش، یک دوره و حداکثر یک کد تخفیف. لایسنس دائمی و
                تک‌کاربره است.
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
        <div className="grid gap-8 lg:grid-cols-[1fr_21rem] lg:items-start xl:grid-cols-[1fr_23rem]">
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <div className="card-surface p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  ۱
                </span>
                <h2 className="text-lg font-bold text-ink">خلاصه‌ی سفارش</h2>
              </div>

              <div className="mt-5 flex flex-col gap-4 rounded-3xl border border-black/5 p-4 sm:flex-row sm:items-center">
                <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl sm:w-40">
                  <PlaceholderArt imageKey={course.art} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <LevelBadge level={course.level} />
                    <span className="text-[11px] text-muted">
                      {formatAgeRange(course.ageRange.min, course.ageRange.max)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-ink">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">
                    {course.tagline}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
                      <KeyRound className="size-3.5" aria-hidden="true" />
                      لایسنس دائمی و تک‌کاربره
                    </span>
                    <Price
                      amount={course.priceToman}
                      compareAt={course.compareAtPriceToman}
                      size="md"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-surface-soft/80 p-4">
                <Mail
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <p className="m-0 text-xs leading-7 text-muted">
                  لایسنس به ایمیل{" "}
                  <span
                    dir="ltr"
                    className="mx-1 font-mono text-[11px] text-ink"
                  >
                    {user?.email}
                  </span>{" "}
                  ارسال و در داشبورد شما قرار می‌گیرد.
                </p>
              </div>
            </div>

            <div className="card-surface p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  ۲
                </span>
                <h2 className="text-lg font-bold text-ink">کد تخفیف</h2>
              </div>

              <div className="mt-5">
                {applied ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="size-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">
                          کد تخفیف اعمال شد
                        </p>
                        <p className="mt-0.5 text-[11px] text-emerald-800/80">
                          <span
                            dir="ltr"
                            className="font-mono text-[10px]"
                          >
                            {applied.discount.code}
                          </span>{" "}
                          — {applied.label}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeDiscount}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                    >
                      <X className="size-3" aria-hidden="true" />
                      حذف کد
                    </button>
                  </div>
                ) : (
                  <>
                    <label htmlFor="discount-code" className="label-base">
                      کد تخفیف
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="discount-code"
                        value={discountInput}
                        onChange={(event) =>
                          setDiscountInput(event.target.value)
                        }
                        placeholder="BRIGHT20"
                        autoComplete="off"
                        dir="ltr"
                        aria-invalid={discountError ? true : undefined}
                        aria-describedby={
                          discountError ? "discount-error" : "discount-hint"
                        }
                        className={cn(
                          "input-base text-start font-mono tracking-wide",
                          discountError && "input-error",
                        )}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void applyDiscount()}
                        loading={checkingDiscount}
                        icon={Tag}
                        className="shrink-0"
                      >
                        اعمال
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
                      <p id="discount-hint" className="mt-2 text-[11px] text-muted">
                        هر سفارش حداکثر یک کد تخفیف دارد. اگر کدی ندارید، این
                        مرحله را بدون کد ادامه دهید.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="card-surface p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  ۳
                </span>
                <h2 className="text-lg font-bold text-ink">تأیید و پرداخت</h2>
              </div>

              <dl className="mt-5 space-y-3 rounded-2xl bg-surface-soft/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">مبلغ دوره</dt>
                  <dd className="font-bold text-ink">
                    {formatToman(course.priceToman)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">تخفیف</dt>
                  <dd
                    className={cn(
                      "font-bold",
                      discountAmount > 0 ? "text-emerald-700" : "text-muted",
                    )}
                  >
                    {discountAmount > 0
                      ? `${formatNumber(discountAmount)}− تومان`
                      : "بدون تخفیف"}
                  </dd>
                </div>
                {taxToman > 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted">
                      مالیات بر ارزش افزوده ({toPersianDigits(taxPercent)}٪)
                    </dt>
                    <dd className="font-bold text-ink">{formatToman(taxToman)}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2 border-t border-dashed border-black/10 pt-3">
                  <dt className="text-sm font-bold text-ink">مبلغ قابل پرداخت</dt>
                  <dd className="text-lg font-bold text-primary">
                    {formatToman(totalToman)}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-primary-soft/15 p-4">
                <Clock3
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <p className="m-0 text-xs leading-7 text-ink/80">
                  پس از پرداخت، لایسنس شما حداکثر تا{" "}
                  <span className="font-bold text-primary">
                    {toPersianDigits(slaHours)} ساعت کاری
                  </span>{" "}
                  در داشبورد قرار می‌گیرد و به ایمیل شما اطلاع داده می‌شود.
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-white p-1">
                <CheckboxField
                  label={
                    <>
                      شرایط خرید و{" "}
                      <Link
                        to="/terms"
                        className="font-bold text-primary underline-offset-4 hover:underline"
                      >
                        قوانین
                      </Link>{" "}
                      و{" "}
                      <Link
                        to="/refund-policy"
                        className="font-bold text-primary underline-offset-4 hover:underline"
                      >
                        سیاست بازگشت وجه
                      </Link>{" "}
                      را می‌پذیرم و می‌دانم این لایسنس تک‌کاربره و مخصوص یک
                      کودک است.
                    </>
                  }
                  error={errors.acceptRules?.message}
                  {...register("acceptRules")}
                />
              </div>

              {isFree ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-6 text-emerald-800">
                  مبلغ این سفارش با کد تخفیف صفر شده است؛ پرداخت آنلاین لازم
                  نیست و سفارش مستقیم برای صدور لایسنس ثبت می‌شود.
                </p>
              ) : null}

              {payError ? (
                <div className="mt-4">
                  <FormAlert message={payError} />
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                fullWidth
                arrow
                icon={CreditCard}
                loading={paying}
                className="mt-5"
              >
                {paying
                  ? "در حال اتصال به درگاه…"
                  : isFree
                    ? "ثبت سفارش رایگان"
                    : `پرداخت ${formatToman(totalToman)}`}
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
                <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
                این نسخه نمایشی است و پرداخت واقعی انجام نمی‌شود.
              </p>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="card-surface overflow-hidden">
              <div className="relative">
                <div className="aspect-[16/9] w-full">
                  <PlaceholderArt imageKey={course.art} className="h-full w-full" />
                </div>
                <ScallopStar className="absolute -bottom-5 end-4 size-10 rotate-12 text-accent" />
              </div>
              <div className="p-5">
                <p className="text-[11px] text-muted">خلاصه‌ی پرداخت</p>
                <h2 className="mt-1.5 text-sm font-bold leading-6 text-ink">
                  {course.title}
                </h2>

                <dl className="mt-4 space-y-2.5 border-t border-black/5 pt-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted">قیمت دوره</dt>
                    <dd className="font-bold text-ink">
                      {formatToman(course.priceToman)}
                    </dd>
                  </div>
                  {course.compareAtPriceToman &&
                  course.compareAtPriceToman > course.priceToman ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted">قیمت پیش از تخفیف</dt>
                      <dd className="text-muted line-through">
                        {formatNumber(course.compareAtPriceToman)}
                      </dd>
                    </div>
                  ) : null}
                  {applied ? (
                    <div className="flex items-center justify-between gap-2 text-emerald-700">
                      <dt>تخفیف ({applied.label})</dt>
                      <dd className="font-bold">
                        {formatNumber(applied.amountToman)}− تومان
                      </dd>
                    </div>
                  ) : null}
                  {taxToman > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt>مالیات ({toPersianDigits(taxPercent)}٪)</dt>
                      <dd className="font-bold">{formatToman(taxToman)}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-2 border-t border-dashed border-black/10 pt-3">
                    <dt className="text-sm font-bold text-ink">قابل پرداخت</dt>
                    <dd className="text-base font-bold text-primary">
                      {formatToman(totalToman)}
                    </dd>
                  </div>
                </dl>

                <ul className="mt-4 space-y-2 border-t border-black/5 pt-4">
                  <li className="flex items-center gap-2 text-[11px] text-muted">
                    <KeyRound className="size-3.5 text-primary" aria-hidden="true" />
                    لایسنس دائمی و تک‌کاربره
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted">
                    <Clock3 className="size-3.5 text-primary" aria-hidden="true" />
                    تحویل تا {toPersianDigits(slaHours)}{" "}
                    ساعت کاری
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted">
                    <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
                    بازگشت وجه تا {toPersianDigits(purchaseConfig.refundDays)} روز
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/10 bg-primary-soft/15 p-4">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="m-0 text-[11px] leading-6 text-muted">
                محتوای دوره در سامانه‌ی سرویس‌دهنده میزبانی می‌شود. این سایت
                مرجع خرید و تحویل لایسنس است.
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-4">
              <p className="text-[11px] font-bold text-ink">نیاز به کمک دارید؟</p>
              <p className="mt-1.5 text-[10px] leading-6 text-muted">
                پیش از پرداخت،{" "}
                <Link
                  to="/faq"
                  className="font-bold text-primary underline-offset-4 hover:underline"
                >
                  پرسش‌های پرتکرار
                </Link>{" "}
                را ببینید یا از{" "}
                <Link
                  to="/contact"
                  className="font-bold text-primary underline-offset-4 hover:underline"
                >
                  صفحه‌ی تماس
                </Link>{" "}
                برای ما بنویسید.
              </p>
            </div>

            <Link
              to={`/courses/${course.slug}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-muted transition hover:text-primary"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              بازگشت به صفحه‌ی دوره
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
