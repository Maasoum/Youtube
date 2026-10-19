import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getErrorMessage, ordersApi, type Order } from "@/api";
import { brand } from "@/config/brand";
import { formatDateTime, formatNumber, toPersianDigits } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Loading";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { LicenseCode } from "@/components/license/LicenseCode";
import {
  ConcentricCircles,
  DotGrid,
  StarBurst,
} from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

export function CheckoutSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStatus("loading");

    ordersApi
      .get(orderId ?? "")
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(getErrorMessage(reason));
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    document.title = `سفارش ثبت شد | ${brand.nameFa}`;
  }, []);

  if (status === "loading") {
    return <PageLoader label="در حال دریافت اطلاعات سفارش…" />;
  }

  if (status === "error" || !order) {
    return (
      <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
        <EmptyState
          icon={Clock3}
          title="اطلاعات سفارش در دسترس نیست"
          description={error ?? "ممکن است سفارش پیدا نشده باشد یا به حساب شما مربوط نباشد."}
          action={
            <ButtonLink to="/dashboard" arrow>
              رفتن به داشبورد
            </ButtonLink>
          }
        />
      </section>
    );
  }

  const delivered = order.status === "delivered" && order.license;
  const paid = Boolean(order.paidAt);

  return (
    <>
      <section className="relative overflow-hidden border-b border-black/5 bg-surface-soft/70">
        <DotGrid className="absolute -start-8 top-10 h-32 w-48 opacity-40" />
        <ConcentricCircles className="absolute -end-36 -top-36 size-[28rem] text-primary/10" />
        <StarBurst className="absolute end-[16%] top-8 hidden size-20 rotate-12 text-accent/70 sm:block" />
        <div className="container-page relative py-10 sm:py-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {delivered ? "لایسنس شما آماده است" : "پرداخت شما ثبت شد"}
              </span>
              <h1 className="mt-4 text-balance text-3xl font-bold leading-[1.45] text-ink sm:text-4xl">
                {delivered
                  ? "لایسنس دوره در داشبورد شماست"
                  : "سفارش شما با موفقیت ثبت شد"}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-8 text-muted sm:text-base">
                {delivered
                  ? "کد لایسنس در پایین همین صفحه و در داشبورد شما قرار دارد. نسخه‌ای هم به ایمیل شما ارسال شده است."
                  : "تیم ما اکنون کد لایسنس را از سرویس‌دهنده دریافت می‌کند و پس از ثبت، آن را در داشبورد و ایمیل شما قرار می‌دهد. این مرحله معمولاً کمتر از یک روز کاری زمان می‌برد."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink to="/dashboard" arrow>
                  رفتن به داشبورد
                </ButtonLink>
                <ButtonLink to="/courses" variant="secondary">
                  دیدن دوره‌های دیگر
                </ButtonLink>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                  پرداخت امن
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <KeyRound className="size-4 text-primary" aria-hidden="true" />
                  لایسنس دائمی
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-4 text-primary" aria-hidden="true" />
                  ارسال به ایمیل ثبت‌شده
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <StarBurst className="absolute -start-4 -bottom-4 z-10 size-16 rotate-12 text-accent" />
              <div className="overflow-hidden rounded-[2.5rem] border-[7px] border-white shadow-pop">
                <PlaceholderArt imageKey="success" className="aspect-[4/3.4] w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-10 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="card-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">جزئیات سفارش</h2>
              <span className="chip bg-surface-soft text-muted">
                شماره سفارش: {toPersianDigits(order.number)}
              </span>
            </div>

            <div className="mt-5 flex gap-4 rounded-2xl bg-surface-soft/70 p-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-xl">
                <PlaceholderArt imageKey={order.course.art} className="h-full w-full" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{order.course.title}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {formatDateTime(order.createdAt)}
                </p>
                <p className="mt-1 text-xs font-bold text-primary">
                  {formatNumber(order.totalToman)} تومان
                </p>
              </div>
            </div>

            {delivered && order.license ? (
              <div className="mt-5">
                <LicenseCode code={order.license.code} />
              </div>
            ) : null}

            <ol className="mt-7 space-y-0">
              <li className="relative flex gap-4 pb-6">
                <span className="absolute start-[13px] top-8 h-[calc(100%-2rem)] w-px bg-emerald-200" aria-hidden="true" />
                <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">پرداخت انجام شد</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {order.paidAt ? formatDateTime(order.paidAt) : "—"}
                  </p>
                </div>
              </li>
              <li className="relative flex gap-4 pb-6">
                <span
                  className={cn(
                    "absolute start-[13px] top-8 h-[calc(100%-2rem)] w-px",
                    delivered ? "bg-emerald-200" : "bg-primary/15",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                    delivered
                      ? "bg-emerald-500 text-white"
                      : "bg-primary-soft/40 text-primary",
                  )}
                >
                  {delivered ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <KeyRound className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">ثبت لایسنس توسط تیم</p>
                  <p className="mt-1 text-[11px] leading-6 text-muted">
                    {delivered
                      ? `کد در ${formatDateTime(order.license?.issuedAt ?? "")} ثبت شد.`
                      : "در حال دریافت کد از سرویس‌دهنده؛ حداکثر یک روز کاری."}
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    delivered
                      ? "bg-emerald-500 text-white"
                      : "bg-surface-soft text-muted",
                  )}
                >
                  {delivered ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <Mail className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">تحویل کد در داشبورد و ایمیل</p>
                  <p className="mt-1 text-[11px] leading-6 text-muted">
                    {delivered
                      ? `ارسال شده به ${order.customer.email}`
                      : `پس از ثبت، به ${order.customer.email} ارسال می‌شود.`}
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-primary p-5 text-white">
              <Sparkles className="size-5 text-accent" aria-hidden="true" />
              <h2 className="mt-3 text-base font-bold text-white">
                {paid && !delivered ? "در این فاصله چه کار کنیم؟" : "قدم بعدی"}
              </h2>
              <p className="mt-2 text-xs leading-7 text-white/65">
                {paid && !delivered
                  ? "می‌توانید وضعیت سفارش را در داشبورد دنبال کنید. به‌محض ثبت لایسنس، کد همان‌جا نمایش داده می‌شود و ایمیل هم ارسال می‌شود."
                  : "کد را در سامانه‌ی سرویس‌دهنده وارد کنید و مسیر یادگیری را شروع کنید. راهنمای والدین نیز در داشبورد شما قرار دارد."}
              </p>
              <Link
                to="/how-it-works"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-accent transition hover:text-white"
              >
                فرایند تحویل لایسنس
                <ArrowLeft className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white p-5">
              <p className="text-xs font-bold text-ink">پشتیبانی در کنار شما</p>
              <p className="mt-2 text-[11px] leading-6 text-muted">
                اگر تا یک روز کاری کد را دریافت نکردید، با شماره‌ی سفارش خود
                برای پشتیبانی بنویسید.
              </p>
              <p dir="ltr" className="ltr-inline mt-2 font-mono text-[11px] text-primary">
                {brand.supportEmail}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
