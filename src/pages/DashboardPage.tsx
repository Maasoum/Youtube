import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  getErrorMessage,
  ordersApi,
  type Order,
} from "@/api";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatDate, formatDateTime, formatNumber, toPersianDigits } from "@/lib/format";
import { PageLoader } from "@/components/ui/Loading";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { LicenseCode } from "@/components/license/LicenseCode";
import {
  BrushBlob,
  ConcentricCircles,
  DotGrid,
} from "@/components/ui/Decorations";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    document.title = `داشبورد من | ${brand.nameFa}`;
  }, []);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError(null);

    ordersApi
      .listMine()
      .then((data) => {
        if (!active) return;
        setOrders(data);
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
  }, [version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  const resendEmail = async (orderId: string) => {
    setResendingId(orderId);
    try {
      const updated = await ordersApi.resendLicenseEmail(orderId);
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order)),
      );
      notify("ایمیل لایسنس دوباره ارسال شد.", "success");
    } catch (reason) {
      notify(getErrorMessage(reason), "error");
    } finally {
      setResendingId(null);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      notify("از حساب خود خارج شدید.", "info");
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) return null;

  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered" && order.license,
  );
  const pendingOrders = orders.filter((order) => order.status === "paid");
  const paidTotal = orders
    .filter((order) => order.status === "paid" || order.status === "delivered")
    .reduce((sum, order) => sum + order.totalToman, 0);

  return (
    <>
      <section className="relative overflow-hidden border-b border-black/5 bg-surface-soft/70">
        <DotGrid className="absolute -start-8 top-10 h-32 w-48 opacity-40" />
        <ConcentricCircles className="absolute -end-40 -top-44 size-[30rem] text-primary/10" />
        <BrushBlob className="absolute start-[38%] top-0 w-52 text-accent/25" />
        <div className="container-page relative py-9 sm:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-primary shadow-sm">
                <UserRound className="size-3.5" aria-hidden="true" />
                {user.role === "admin" ? "حساب مدیر" : "حساب والدین"}
              </span>
              <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
                سلام، {user.fullName.split(" ")[0]}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
                سفارش‌ها، لایسنس‌ها و وضعیت تحویل دوره‌های کودک‌تان را از همین
               ‌جا پیگیری کنید.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.role === "admin" ? (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary-dark"
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  پنل مدیریت
                </Link>
              ) : null}
              <ButtonLink to="/courses" variant="secondary" size="sm" arrow>
                خرید دوره‌ی تازه
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-12">
        {status === "loading" ? (
          <PageLoader label="در حال دریافت سفارش‌های شما…" />
        ) : status === "error" ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50 px-6 py-12 text-center">
            <AlertCircle className="size-9 text-red-500" aria-hidden="true" />
            <p className="text-sm font-bold text-red-800">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              تلاش دوباره
            </Button>
          </div>
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="card-surface p-5">
                <dt className="flex items-center gap-2 text-xs text-muted">
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                  دوره‌های فعال
                </dt>
                <dd className="mt-2 text-2xl font-bold text-ink">
                  {toPersianDigits(deliveredOrders.length)}
                </dd>
              </div>
              <div className="card-surface p-5">
                <dt className="flex items-center gap-2 text-xs text-muted">
                  <Clock3 className="size-4 text-sky-600" aria-hidden="true" />
                  در انتظار لایسنس
                </dt>
                <dd className="mt-2 text-2xl font-bold text-ink">
                  {toPersianDigits(pendingOrders.length)}
                </dd>
              </div>
              <div className="card-surface p-5">
                <dt className="flex items-center gap-2 text-xs text-muted">
                  <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                  مجموع پرداخت‌ها
                </dt>
                <dd className="mt-2 text-lg font-bold text-ink">
                  {formatNumber(paidTotal)}{" "}
                  <span className="text-xs font-medium text-muted">تومان</span>
                </dd>
              </div>
            </dl>

            {orders.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  icon={BookOpen}
                  title="هنوز دوره‌ای انتخاب نکرده‌اید"
                  description="مسیرهای یادگیری برای سنین ۸ تا ۱۴ سال آماده‌اند. یک دوره انتخاب کنید تا لایسنس دائمی آن در همین داشبورد قرار بگیرد."
                  action={
                    <ButtonLink to="/courses" arrow>
                      دیدن دوره‌ها
                    </ButtonLink>
                  }
                />
              </div>
            ) : (
              <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
                <div className="space-y-8">
                  <section aria-labelledby="licenses-title">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 id="licenses-title" className="text-xl font-bold text-ink">
                        دوره‌های من
                      </h2>
                      <span className="text-xs text-muted">
                        {toPersianDigits(deliveredOrders.length)} لایسنس فعال
                      </span>
                    </div>

                    {deliveredOrders.length === 0 ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-primary/20 bg-surface-soft/70 p-5">
                        <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                        <p className="m-0 text-xs leading-7 text-muted">
                          هنوز لایسنسی تحویل نشده است. اگر سفارش پرداخت‌شده
                          دارید، تیم ما در حال دریافت کد است.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {deliveredOrders.map((order) => (
                          <article
                            key={order.id}
                            className="card-surface overflow-hidden"
                          >
                            <div className="grid sm:grid-cols-[168px_1fr]">
                              <div className="h-32 sm:h-full">
                                <PlaceholderArt
                                  imageKey={order.course.art}
                                  className="h-full w-full"
                                />
                              </div>
                              <div className="p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="chip bg-emerald-50 text-emerald-800">
                                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                    لایسنس فعال
                                  </span>
                                  <span className="text-[11px] text-muted">
                                    سفارش {toPersianDigits(order.number)}
                                  </span>
                                </div>
                                <h3 className="mt-2 text-base font-bold text-ink">
                                  {order.course.title}
                                </h3>
                                <p className="mt-1 text-[11px] text-muted">
                                  خریداری‌شده در {formatDate(order.paidAt ?? order.createdAt)}
                                </p>

                                {order.license ? (
                                  <>
                                    <div className="mt-4">
                                      <LicenseCode
                                        code={order.license.code}
                                        label="کد لایسنس این دوره"
                                      />
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                      <p className="flex items-center gap-1.5 text-[10px] text-muted">
                                        <Mail className="size-3.5" aria-hidden="true" />
                                        ایمیل ارسال‌شده
                                        {order.license.emailSentAt
                                          ? ` — ${formatDateTime(order.license.emailSentAt)}`
                                          : ""}
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        icon={RefreshCw}
                                        loading={resendingId === order.id}
                                        onClick={() => void resendEmail(order.id)}
                                      >
                                        ارسال دوباره‌ی ایمیل
                                      </Button>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  {pendingOrders.length > 0 ? (
                    <section aria-labelledby="pending-title">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 id="pending-title" className="text-xl font-bold text-ink">
                          در انتظار لایسنس
                        </h2>
                        <span className="chip bg-sky-50 text-sky-800">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          حداکثر یک روز کاری
                        </span>
                      </div>
                      <div className="space-y-3">
                        {pendingOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:flex-row sm:items-center"
                          >
                            <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                              <PlaceholderArt
                                imageKey={order.course.art}
                                className="h-full w-full"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-ink">
                                {order.course.title}
                              </p>
                              <p className="mt-1 text-[11px] text-muted">
                                سفارش {toPersianDigits(order.number)} — پرداخت در{" "}
                                {formatDate(order.paidAt ?? order.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <KeyRound className="size-4 text-sky-700" aria-hidden="true" />
                              <span className="text-[11px] font-bold text-sky-800">
                                در حال دریافت کد
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section aria-labelledby="orders-title">
                    <h2 id="orders-title" className="mb-4 text-xl font-bold text-ink">
                      تاریخچه‌ی سفارش‌ها
                    </h2>
                    <div className="card-surface divide-y divide-black/5 overflow-hidden">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-12 shrink-0 overflow-hidden rounded-xl">
                              <PlaceholderArt
                                imageKey={order.course.art}
                                className="h-full w-full"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink">
                                {order.course.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted">
                                {formatDate(order.createdAt)} — سفارش{" "}
                                {toPersianDigits(order.number)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                            <OrderStatusBadge status={order.status} />
                            <span className="text-xs font-bold text-ink">
                              {formatNumber(order.totalToman)} تومان
                            </span>
                            {order.status === "awaiting_payment" ? (
                              <Link
                                to={`/checkout/${order.course.slug}`}
                                className="text-[11px] font-bold text-primary hover:underline"
                              >
                                تکمیل پرداخت
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24">
                  <div className="card-surface p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                        {user.fullName.trim().charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">
                          {user.fullName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {user.role === "admin" ? "مدیر سایت" : "والد همراه"}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-5 space-y-3 border-t border-black/5 pt-4 text-xs">
                      <div>
                        <dt className="text-[10px] text-muted">ایمیل</dt>
                        <dd dir="ltr" className="ltr-inline mt-1 truncate font-mono text-[11px] text-ink">
                          {user.email}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted">شماره موبایل</dt>
                        <dd className="mt-1 text-ink">{toPersianDigits(user.phone)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted">عضویت</dt>
                        <dd className="mt-1 text-ink">{formatDate(user.createdAt)}</dd>
                      </div>
                    </dl>
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      icon={LogOut}
                      loading={loggingOut}
                      onClick={() => void handleLogout()}
                      className="mt-5"
                    >
                      خروج از حساب
                    </Button>
                  </div>

                  <div className="rounded-3xl bg-primary p-5 text-white">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-accent">
                      <Mail className="size-5" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm font-bold text-white">پشتیبانی والدین</p>
                    <p className="mt-1.5 text-[11px] leading-6 text-white/60">
                      درباره‌ی لایسنس یا انتخاب دوره سؤالی دارید؟ برای ما بنویسید.
                    </p>
                    <p dir="ltr" className="ltr-inline mt-2 font-mono text-[11px] text-accent">
                      {brand.supportEmail}
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
