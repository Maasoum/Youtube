import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  Mail,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  getErrorMessage,
  paymentsApi,
  type Order,
  type PaymentResult,
  type PaymentState,
} from "@/api";
import { brand } from "@/config/brand";
import { purchaseConfig } from "@/config/purchase";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatToman, toPersianDigits } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { PageLoader } from "@/components/ui/Loading";
import { Chip } from "@/components/ui/Chip";
import {
  ConcentricCircles,
  DotGrid,
  RotatingSeal,
  ScallopStar,
} from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

const validStates: PaymentState[] = ["success", "failed", "pending", "error"];

const stateLabels: Record<PaymentState, string> = {
  success: "موفق",
  failed: "ناموفق",
  pending: "در حال بررسی",
  error: "خطا",
};

const demo = {
  courseTitle: "استودیوی کوچک من",
  amountToman: 3590000,
  trackingNumber: "BP-1002-814590",
  orderNumber: 1002,
  paidAt: new Date().toISOString(),
};

interface ViewState {
  state: PaymentState;
  order: Order | null;
  trackingNumber: string;
  courseTitle: string;
  amountToman: number;
  paidAt: string;
  orderNumber?: number;
}

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const stateParam = searchParams.get("state");
  const orderId = searchParams.get("order");

  const previewState: PaymentState = validStates.includes(
    stateParam as PaymentState,
  )
    ? (stateParam as PaymentState)
    : "success";

  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    document.title = `نتیجه‌ی پرداخت | ${brand.nameFa}`;
  }, []);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setResult(null);
      return;
    }
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setLoadError("برای مشاهده‌ی نتیجه‌ی این پرداخت باید وارد حساب خود شوید.");
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);

    paymentsApi
      .getResult(orderId)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(getErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, user, authLoading, version]);

  const view = useMemo<ViewState>(() => {
    const state: PaymentState = result?.state ?? previewState;
    return {
      state,
      order: result?.order ?? null,
      trackingNumber: result?.trackingNumber ?? demo.trackingNumber,
      courseTitle: result?.order?.course.title ?? demo.courseTitle,
      amountToman: result?.order?.totalToman ?? demo.amountToman,
      paidAt: result?.paidAt ?? result?.order?.paidAt ?? demo.paidAt,
      orderNumber: result?.order?.number ?? (orderId ? undefined : demo.orderNumber),
    };
  }, [result, previewState, orderId]);

  if (loading || authLoading) {
    return <PageLoader label="در حال دریافت نتیجه‌ی پرداخت…" />;
  }

  if (orderId && loadError && !result) {
    return (
      <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-lg rounded-[2.5rem] border border-red-100 bg-white p-8 text-center shadow-soft">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-ink">
            نتیجه‌ی پرداخت در دسترس نیست
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted">{loadError}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!user ? (
              <ButtonLink
                to="/login"
                state={{ from: `/payment/callback?state=${previewState}${orderId ? `&order=${orderId}` : ""}` }}
                arrow
              >
                ورود به حساب
              </ButtonLink>
            ) : null}
            <ButtonLink to="/courses" variant="secondary">
              بازگشت به دوره‌ها
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-surface-soft/60 py-10 sm:py-16">
        <DotGrid className="absolute -start-8 top-16 h-40 w-56 opacity-35" />
        <ConcentricCircles className="absolute -end-40 -top-40 size-[32rem] text-primary/10" />
        <ScallopStar className="absolute start-[12%] top-10 hidden size-16 -rotate-12 text-accent/70 sm:block" />

        <div className="container-page relative">
          <div className="mx-auto max-w-2xl">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-pop sm:p-10">
              <StateDecoration state={view.state} />

              <div className="relative text-center">
                <StateIcon state={view.state} />
                <h1 className="mt-5 text-balance text-2xl font-bold leading-[1.5] text-ink sm:text-3xl">
                  {view.state === "success"
                    ? "پرداخت شما با موفقیت ثبت شد"
                    : view.state === "failed"
                      ? "پرداخت انجام نشد"
                      : view.state === "pending"
                        ? "پرداخت در حال بررسی است"
                        : "خطا در دریافت نتیجه‌ی پرداخت"}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-muted">
                  {view.state === "success"
                    ? "سفارش شما ثبت شد و لایسنس در صف صدور قرار گرفت. به‌محض ثبت کد، آن را در داشبورد و ایمیل خود می‌بینید."
                    : view.state === "failed"
                      ? "مبلغی از حساب شما کسر نشده یا تراکنش تأیید نشده است. می‌توانید دوباره تلاش کنید؛ اگر مبلغی کسر شده باشد، طبق روال بانکی بازگردانده می‌شود."
                      : view.state === "pending"
                        ? "بانک هنوز پاسخ نهایی را برنگردانده است. لطفاً چند لحظه صبر کنید و دوباره بررسی کنید."
                        : "ارتباط با درگاه پرداخت برقرار نشد یا اطلاعات پرداخت معتبر نبود. اگر مبلغی کسر شده باشد، حداکثر تا ۷۲ ساعت بازگردانده می‌شود."}
                </p>
              </div>

              {view.state === "success" ? (
                <div className="relative mt-7">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        تراکنش تأیید شد
                      </span>
                      <OrderStatusBadge
                        status={view.order?.status ?? "awaiting_license"}
                      />
                    </div>
                    <dl className="mt-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-emerald-900/70">شماره‌ی پیگیری</dt>
                        <dd
                          dir="ltr"
                          className="rounded-lg bg-white px-2 py-1 font-mono text-[11px] font-bold text-ink"
                        >
                          {view.trackingNumber}
                        </dd>
                      </div>
                      {view.orderNumber ? (
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-emerald-900/70">شماره‌ی سفارش</dt>
                          <dd className="font-bold text-ink">
                            {toPersianDigits(view.orderNumber)}
                          </dd>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-emerald-900/70">دوره</dt>
                        <dd className="max-w-[60%] text-end font-bold text-ink">
                          {view.courseTitle}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-emerald-900/70">مبلغ پرداخت‌شده</dt>
                        <dd className="font-bold text-ink">
                          {formatToman(view.amountToman)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-emerald-900/70">تاریخ پرداخت</dt>
                        <dd className="font-bold text-ink">
                          {formatDate(view.paidAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-primary-soft/15 p-4">
                    <Clock3
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <p className="m-0 text-xs leading-7 text-ink/80">
                      لایسنس شما حداکثر تا{" "}
                      <span className="font-bold text-primary">
                        {toPersianDigits(purchaseConfig.licenseDeliveryHours)} ساعت کاری
                      </span>{" "}
                      در داشبورد قرار می‌گیرد و به ایمیل شما اطلاع داده می‌شود.
                    </p>
                  </div>

                  <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[
                      { icon: KeyRound, text: "لایسنس دائمی و تک‌کاربره" },
                      { icon: Mail, text: "اطلاع‌رسانی با ایمیل" },
                      { icon: ShieldCheck, text: "پرداخت امن" },
                    ].map((item) => (
                      <li
                        key={item.text}
                        className="flex items-center gap-1.5 rounded-xl bg-surface-soft/70 px-3 py-2 text-[10px] font-bold text-muted"
                      >
                        <item.icon
                          className="size-3.5 text-primary"
                          aria-hidden="true"
                        />
                        {item.text}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <ButtonLink to="/dashboard" fullWidth arrow>
                      رفتن به داشبورد
                    </ButtonLink>
                    {view.order ? (
                      <ButtonLink
                        to={`/courses/${view.order.course.slug}`}
                        variant="secondary"
                        fullWidth
                      >
                        صفحه‌ی دوره
                      </ButtonLink>
                    ) : (
                      <ButtonLink to="/courses" variant="secondary" fullWidth>
                        دیدن دوره‌های دیگر
                      </ButtonLink>
                    )}
                  </div>
                </div>
              ) : null}

              {view.state === "failed" ? (
                <div className="relative mt-7 space-y-4">
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <XCircle
                      className="mt-0.5 size-4 shrink-0 text-red-600"
                      aria-hidden="true"
                    />
                    <p className="m-0 text-xs leading-7 text-red-800">
                      {result?.message ??
                        "تراکنش از سوی بانک تأیید نشد. اگر مبلغی از حساب شما کسر شده باشد، حداکثر تا ۷۲ ساعت بازگردانده می‌شود."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-soft/70 p-4 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">دوره</span>
                      <span className="font-bold text-ink">{view.courseTitle}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-muted">مبلغ</span>
                      <span className="font-bold text-ink">
                        {formatToman(view.amountToman)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <ButtonLink
                      to={
                        view.order
                          ? `/checkout/${view.order.course.slug}`
                          : "/courses"
                      }
                      fullWidth
                      icon={RefreshCw}
                    >
                      تلاش مجدد
                    </ButtonLink>
                    <ButtonLink to="/dashboard" variant="secondary" fullWidth>
                      داشبورد من
                    </ButtonLink>
                  </div>
                </div>
              ) : null}

              {view.state === "pending" ? (
                <div className="relative mt-7 space-y-4">
                  <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <Loader2
                      className="mt-0.5 size-4 shrink-0 animate-spin text-amber-700"
                      aria-hidden="true"
                    />
                    <p className="m-0 text-xs leading-7 text-amber-900">
                      {result?.message ??
                        "اگر مبلغ از حساب شما کسر شده باشد، نگران نباشید؛ نتیجه پس از تأیید بانک به‌روزرسانی می‌شود. تا آن زمان سفارش را دوباره ثبت نکنید."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-soft/70 p-4 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">شماره‌ی پیگیری</span>
                      <span
                        dir="ltr"
                        className="font-mono text-[11px] font-bold text-ink"
                      >
                        {view.trackingNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      fullWidth
                      icon={RefreshCw}
                      onClick={() => {
                        if (orderId) {
                          setVersion((current) => current + 1);
                        } else {
                          window.location.reload();
                        }
                      }}
                    >
                      بررسی دوباره
                    </Button>
                    <ButtonLink to="/dashboard" variant="secondary" fullWidth>
                      داشبورد من
                    </ButtonLink>
                  </div>
                </div>
              ) : null}

              {view.state === "error" ? (
                <div className="relative mt-7 space-y-4">
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <AlertCircle
                      className="mt-0.5 size-4 shrink-0 text-red-600"
                      aria-hidden="true"
                    />
                    <p className="m-0 text-xs leading-7 text-red-800">
                      {result?.message ??
                        "نتیجه‌ی این پرداخت در دسترس نیست. اگر مبلغی کسر شده باشد، شماره‌ی پیگیری را از صفحه‌ی تماس برای ما بفرستید."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-soft/70 p-4 text-xs">
                    <p className="flex items-center gap-2 text-muted">
                      <Clock3 className="size-4 text-primary" aria-hidden="true" />
                      ساعات پاسخ‌گویی پشتیبانی
                    </p>
                    <p className="mt-1.5 text-[11px] font-bold text-ink">
                      {brand.supportHours}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <ButtonLink to="/contact" fullWidth arrow>
                      تماس با پشتیبانی
                    </ButtonLink>
                    <ButtonLink to="/courses" variant="secondary" fullWidth>
                      بازگشت به دوره‌ها
                    </ButtonLink>
                  </div>
                </div>
              ) : null}

              <p className="relative mt-6 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted">
                <ReceiptText className="size-3.5" aria-hidden="true" />
                این نسخه نمایشی است و پرداخت واقعی انجام نمی‌شود.
              </p>
            </div>

            {!orderId ? (
              <div className="mt-5 rounded-2xl border border-dashed border-primary/20 bg-white/70 p-4">
                <p className="text-center text-[10px] font-bold text-muted">
                  پیش‌نمایش حالت‌های پرداخت
                </p>
                <div
                  className="mt-2 flex flex-wrap justify-center gap-1.5"
                  role="group"
                  aria-label="انتخاب حالت پیش‌نمایش"
                >
                  {validStates.map((state) => (
                    <Link
                      key={state}
                      to={`/payment/callback?state=${state}`}
                      aria-current={previewState === state ? "page" : undefined}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[10px] font-bold transition",
                        previewState === state
                          ? "bg-primary text-white"
                          : "bg-white text-muted hover:bg-primary-soft/20 hover:text-primary",
                      )}
                    >
                      {stateLabels[state]}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 text-center">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted transition hover:text-primary"
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  بازگشت به داشبورد
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function StateIcon({ state }: { state: PaymentState }) {
  const config = {
    success: {
      icon: CheckCircle2,
      wrapper: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    },
    failed: {
      icon: XCircle,
      wrapper: "bg-red-50 text-red-600 ring-red-100",
    },
    pending: {
      icon: Clock3,
      wrapper: "bg-amber-50 text-amber-600 ring-amber-100",
    },
    error: {
      icon: AlertCircle,
      wrapper: "bg-red-50 text-red-600 ring-red-100",
    },
  }[state];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "mx-auto flex size-20 items-center justify-center rounded-full ring-8",
        config.wrapper,
      )}
    >
      <Icon className="size-10" aria-hidden="true" />
    </span>
  );
}

function StateDecoration({ state }: { state: PaymentState }) {
  if (state === "success") {
    return (
      <>
        <DotGrid className="absolute -start-6 -top-6 h-32 w-44 opacity-30" />
        <ConcentricCircles className="absolute -end-28 -bottom-28 size-72 text-primary/10" />
        <RotatingSeal className="absolute end-5 top-5 hidden size-16 text-primary/25 sm:block" />
        <ScallopStar className="absolute start-6 top-6 size-8 rotate-12 text-accent" />
        <Chip
          tone="lavender"
          className="absolute start-6 bottom-6 hidden sm:inline-flex"
        >
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          تراکنش موفق
        </Chip>
      </>
    );
  }
  return (
    <>
      <DotGrid className="absolute -end-6 -top-6 h-28 w-40 opacity-25" />
      <ConcentricCircles className="absolute -start-24 -bottom-24 size-64 text-primary/10" />
    </>
  );
}
