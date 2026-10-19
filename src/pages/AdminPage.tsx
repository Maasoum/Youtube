import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  Percent,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import {
  adminApi,
  discountsApi,
  getErrorMessage,
  ordersApi,
  type AdminStats,
  type DiscountCode,
  type EmailMessage,
  type Order,
} from "@/api";
import { brand } from "@/config/brand";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  toEnglishDigits,
  toPersianDigits,
} from "@/lib/format";
import { PageLoader } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { LicenseModal } from "@/components/admin/LicenseModal";
import { DiscountCreateForm } from "@/components/admin/DiscountCreateForm";
import {
  ConcentricCircles,
  DotGrid,
  StarBurst,
} from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

type AdminTab = "overview" | "orders" | "discounts";
type OrderFilter = "all" | "pending" | "delivered";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "نمای کلی" },
  { id: "orders", label: "سفارش‌ها" },
  { id: "discounts", label: "کدهای تخفیف" },
];

const orderFilters: Array<{ id: OrderFilter; label: string }> = [
  { id: "all", label: "همه" },
  { id: "pending", label: "در انتظار لایسنس" },
  { id: "delivered", label: "تحویل‌شده" },
];

export function AdminPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [tab, setTab] = useState<AdminTab>("overview");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [licenseOrder, setLicenseOrder] = useState<Order | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  useEffect(() => {
    document.title = `پنل مدیریت | ${brand.nameFa}`;
  }, []);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError(null);

    Promise.all([
      adminApi.getStats(),
      ordersApi.listAll(),
      discountsApi.listAll(),
      adminApi.listEmails(),
    ])
      .then(([statsData, ordersData, discountsData, emailsData]) => {
        if (!active) return;
        setStats(statsData);
        setOrders(ordersData);
        setDiscounts(discountsData);
        setEmails(emailsData);
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

  const refresh = () => setVersion((current) => current + 1);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === "paid").length,
    [orders],
  );
  const deliveredCount = useMemo(
    () => orders.filter((order) => order.status === "delivered").length,
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = toEnglishDigits(query.trim().toLowerCase());

    return orders.filter((order) => {
      const matchesFilter =
        orderFilter === "all" ||
        (orderFilter === "pending" && order.status === "paid") ||
        (orderFilter === "delivered" && order.status === "delivered");

      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        String(order.number),
        toPersianDigits(order.number),
        order.customer.fullName,
        order.customer.email,
        order.customer.phone,
        order.course.title,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [orders, orderFilter, query]);

  const softRefreshMeta = async () => {
    try {
      const [statsData, emailsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.listEmails(),
      ]);
      setStats(statsData);
      setEmails(emailsData);
    } catch {
      // به‌روزرسانی جزئی ناموفق بود؛ داده‌های فعلی حفظ می‌شوند.
    }
  };

  const handleLicenseSuccess = (updated: Order) => {
    setOrders((current) =>
      current.map((order) => (order.id === updated.id ? updated : order)),
    );
    void softRefreshMeta();
  };

  const resendEmail = async (orderId: string) => {
    setResendingId(orderId);
    try {
      const updated = await ordersApi.resendLicenseEmail(orderId);
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order)),
      );
      notify("ایمیل لایسنس دوباره برای مشتری ارسال شد.", "success");
      void softRefreshMeta();
    } catch (reason) {
      notify(getErrorMessage(reason), "error");
    } finally {
      setResendingId(null);
    }
  };

  const toggleDiscount = async (code: string) => {
    setTogglingCode(code);
    try {
      const updated = await discountsApi.toggle(code);
      setDiscounts((current) =>
        current.map((discount) =>
          discount.code === updated.code ? updated : discount,
        ),
      );
      notify(
        updated.active
          ? `کد ${updated.code} فعال شد.`
          : `کد ${updated.code} غیرفعال شد.`,
        "info",
      );
    } catch (reason) {
      notify(getErrorMessage(reason), "error");
    } finally {
      setTogglingCode(null);
    }
  };

  const goToPendingOrders = () => {
    setTab("orders");
    setOrderFilter("pending");
  };

  const statCards = stats
    ? [
        {
          label: "درآمد کل",
          value: formatNumber(stats.totalRevenueToman),
          unit: "تومان",
          icon: Wallet,
          tone: "bg-emerald-50 text-emerald-700",
        },
        {
          label: "در انتظار لایسنس",
          value: toPersianDigits(stats.pendingLicenses),
          unit: "سفارش",
          icon: Clock3,
          tone: "bg-amber-50 text-amber-700",
        },
        {
          label: "سفارش‌های امروز",
          value: toPersianDigits(stats.todayOrders),
          unit: "سفارش",
          icon: CalendarDays,
          tone: "bg-sky-50 text-sky-700",
        },
        {
          label: "مشتریان",
          value: toPersianDigits(stats.customers),
          unit: "نفر",
          icon: Users,
          tone: "bg-primary-soft/30 text-primary",
        },
      ]
    : [];

  return (
    <>
      <section className="relative overflow-hidden bg-ink pb-14 pt-9 text-white sm:pt-12">
        <DotGrid className="absolute -start-6 -top-6 h-40 w-56 opacity-20" />
        <ConcentricCircles className="absolute -end-40 -top-40 size-[30rem] text-white/10" />
        <StarBurst className="absolute end-[18%] top-8 hidden size-20 rotate-12 text-accent/60 sm:block" />

        <div className="container-page relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold text-accent">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              دسترسی مدیریت
            </span>
            <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              پنل مدیریت سفارش‌ها
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-white/55">
              سفارش‌های پرداخت‌شده را بررسی کنید، لایسنس دریافتی از
              سرویس‌دهنده را ثبت کنید و تحویل ایمیل را پیگیری کنید.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-end sm:block">
              <p className="text-xs font-bold text-white">{user?.fullName}</p>
              <p className="mt-0.5 text-[10px] text-white/40">مدیر سایت</p>
            </div>
            <Button
              variant="outlineLight"
              size="sm"
              icon={RefreshCw}
              onClick={refresh}
              loading={status === "loading"}
            >
              تازه‌سازی
            </Button>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="no-scrollbar relative z-10 -mt-7 flex gap-1 overflow-x-auto rounded-2xl border border-black/5 bg-white p-1.5 shadow-soft">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition",
                tab === item.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:bg-surface-soft hover:text-ink",
              )}
            >
              {item.label}
              {item.id === "orders" && pendingCount > 0 ? (
                <span
                  className={cn(
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]",
                    tab === item.id
                      ? "bg-white/20 text-white"
                      : "bg-accent/30 text-[#7A5800]",
                  )}
                >
                  {toPersianDigits(pendingCount)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <section className="container-page py-8 sm:py-10">
        {status === "loading" ? (
          <PageLoader label="در حال دریافت اطلاعات پنل…" />
        ) : status === "error" || !stats ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50 px-6 py-12 text-center">
            <AlertCircle className="size-9 text-red-500" aria-hidden="true" />
            <p className="text-sm font-bold text-red-800">{error}</p>
            <Button variant="secondary" size="sm" onClick={refresh}>
              تلاش دوباره
            </Button>
          </div>
        ) : tab === "overview" ? (
          <div className="space-y-6">
            {pendingCount > 0 ? (
              <div className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
                    <Clock3 className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-amber-950">
                      {toPersianDigits(pendingCount)} سفارش در انتظار ثبت لایسنس
                    </p>
                    <p className="mt-1 text-[11px] leading-6 text-amber-900/70">
                      پرداخت این سفارش‌ها تکمیل شده است؛ کد را از سرویس‌دهنده
                      بگیرید و در پنل ثبت کنید تا ایمیل تحویل ارسال شود.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goToPendingOrders}
                  className="shrink-0 border-amber-300 text-amber-900 hover:bg-white"
                >
                  بررسی سفارش‌ها
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden="true" />
                <p className="m-0 text-xs font-bold text-emerald-900">
                  همه‌ی سفارش‌های پرداخت‌شده لایسنس خود را دریافت کرده‌اند.
                </p>
              </div>
            )}

            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <div key={card.label} className="card-surface p-5">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-muted">{card.label}</dt>
                    <span className={`inline-flex size-9 items-center justify-center rounded-xl ${card.tone}`}>
                      <card.icon className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                  <dd className="mt-3 text-2xl font-bold tabular-nums text-ink">
                    {card.value}
                    <span className="ms-1.5 text-[11px] font-medium text-muted">
                      {card.unit}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="card-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-ink">آخرین سفارش‌ها</h2>
                  <button
                    type="button"
                    onClick={() => setTab("orders")}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    همه‌ی سفارش‌ها
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-8">
                    <EmptyState
                      icon={Tag}
                      title="هنوز سفارشی ثبت نشده"
                      description="پس از خرید والدین، سفارش‌ها در این بخش نمایش داده می‌شوند."
                    />
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-black/5">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-lg">
                            <PlaceholderArt
                              imageKey={order.course.art}
                              className="h-full w-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-ink">
                              {order.customer.fullName}
                              <span className="ms-1.5 font-medium text-muted">
                                — سفارش {toPersianDigits(order.number)}
                              </span>
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-muted">
                              {order.course.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          {order.status === "paid" ? (
                            <button
                              type="button"
                              onClick={() => setLicenseOrder(order)}
                              className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-primary-dark"
                            >
                              ثبت لایسنس
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-ink">ایمیل‌های ارسالی</h2>
                  <Mail className="size-4 text-muted" aria-hidden="true" />
                </div>
                {emails.length === 0 ? (
                  <p className="mt-5 text-xs leading-6 text-muted">
                    هنوز ایمیلی ارسال نشده است. با ثبت لایسنس، ایمیل تحویل
                    خودکار ارسال می‌شود.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {emails.slice(0, 4).map((email) => (
                      <div
                        key={email.id}
                        className="rounded-xl border border-black/5 bg-surface-soft/60 p-3"
                      >
                        <p className="text-[11px] font-bold text-ink">
                          ایمیل تحویل لایسنس
                        </p>
                        <p dir="ltr" className="ltr-inline mt-1 truncate font-mono text-[10px] text-muted">
                          {email.to}
                        </p>
                        <p className="mt-1 text-[9px] text-muted/80">
                          {formatDateTime(email.sentAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 rounded-xl bg-primary-soft/20 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    تحویل خودکار ایمیل
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-muted">
                    در این نسخه، ایمیل‌ها فقط در گزارش داخلی ثبت می‌شوند و
                    ارسال واقعی انجام نمی‌شود.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <p className="text-[10px] text-muted">لایسنس‌های تحویل‌شده</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">
                  {toPersianDigits(stats.deliveredLicenses)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <p className="text-[10px] text-muted">کل سفارش‌ها</p>
                <p className="mt-1 text-lg font-bold text-ink">
                  {toPersianDigits(stats.totalOrders)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <p className="text-[10px] text-muted">کدهای تخفیف</p>
                <p className="mt-1 text-lg font-bold text-ink">
                  {toPersianDigits(discounts.length)}
                </p>
              </div>
            </div>
          </div>
        ) : tab === "orders" ? (
          <div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">مدیریت سفارش‌ها</h2>
                <p className="mt-1 text-xs text-muted">
                  {toPersianDigits(filteredOrders.length)} سفارش در این نمایش
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-56">
                  <Search
                    className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="جست‌وجوی نام، ایمیل یا شماره سفارش"
                    aria-label="جست‌وجوی سفارش"
                    className="input-base ps-10 py-2.5 text-xs"
                  />
                </div>
                <div
                  role="group"
                  aria-label="فیلتر وضعیت سفارش"
                  className="no-scrollbar flex gap-1.5 overflow-x-auto"
                >
                  {orderFilters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={orderFilter === filter.id}
                      onClick={() => setOrderFilter(filter.id)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
                        orderFilter === filter.id
                          ? "border-primary bg-primary text-white"
                          : "border-black/10 bg-white text-muted hover:border-primary/30 hover:text-primary",
                      )}
                    >
                      {filter.label}
                      <span className="ms-1 opacity-70">
                        {toPersianDigits(
                          filter.id === "all"
                            ? orders.length
                            : filter.id === "pending"
                              ? pendingCount
                              : deliveredCount,
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {filteredOrders.length === 0 ? (
                <EmptyState
                  icon={Tag}
                  title="سفارشی با این مشخصات پیدا نشد"
                  description="فیلتر یا عبارت جست‌وجو را تغییر دهید تا همه‌ی سفارش‌ها را ببینید."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setOrderFilter("all");
                      }}
                    >
                      نمایش همه‌ی سفارش‌ها
                    </Button>
                  }
                />
              ) : (
                filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    className="card-surface overflow-hidden"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 bg-surface-soft/40 p-4 sm:p-5">
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
                            سفارش {toPersianDigits(order.number)} —{" "}
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <OrderStatusBadge status={order.status} />
                        <p className="text-sm font-bold text-ink">
                          {formatNumber(order.totalToman)} تومان
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
                      <div>
                        <p className="text-[10px] text-muted">مشتری</p>
                        <p className="mt-1 text-xs font-bold text-ink">
                          {order.customer.fullName}
                        </p>
                        <p dir="ltr" className="ltr-inline mt-1 truncate font-mono text-[10px] text-muted">
                          {order.customer.email}
                        </p>
                        <p className="mt-1 text-[10px] text-muted">
                          {toPersianDigits(order.customer.phone)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-muted">پرداخت</p>
                        <p className="mt-1 text-xs font-bold text-ink">
                          {formatNumber(order.totalToman)} تومان
                        </p>
                        {order.discount ? (
                          <p className="mt-1 text-[10px] text-emerald-700">
                            کد{" "}
                            <span dir="ltr" className="ltr-inline font-mono">
                              {order.discount.code}
                            </span>{" "}
                            — {formatPercent(order.discount.percent)} تخفیف
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] text-muted">بدون کد تخفیف</p>
                        )}
                        {order.paymentRef ? (
                          <p dir="ltr" className="ltr-inline mt-1 font-mono text-[9px] text-muted/70">
                            {order.paymentRef}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-[10px] text-muted">تحویل لایسنس</p>
                        {order.license ? (
                          <>
                            <code
                              dir="ltr"
                              className="ltr-inline mt-1 block break-all rounded-md bg-ink px-2 py-1 font-mono text-[10px] text-accent"
                            >
                              {order.license.code}
                            </code>
                            <p className="mt-1 flex items-center gap-1 text-[9px] text-emerald-700">
                              <Mail className="size-3" aria-hidden="true" />
                              ایمیل:{" "}
                              {order.license.emailSentAt
                                ? formatDateTime(order.license.emailSentAt)
                                : "ارسال نشده"}
                            </p>
                          </>
                        ) : order.status === "paid" ? (
                          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            در انتظار ثبت کد
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] text-muted">
                            بدون لایسنس
                          </p>
                        )}
                      </div>
                    </div>

                    {order.note ? (
                      <div className="mx-4 mb-4 rounded-xl border border-black/5 bg-amber-50/60 p-3 sm:mx-5">
                        <p className="text-[10px] font-bold text-amber-900">
                          یادداشت مشتری
                        </p>
                        <p className="mt-1 text-[11px] leading-6 text-amber-900/80">
                          {order.note}
                        </p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-4 py-3 sm:px-5">
                      <p className="text-[10px] text-muted">
                        {order.status === "paid"
                          ? "پرداخت تکمیل شده؛ کد لایسنس را از سرویس‌دهنده دریافت کنید."
                          : order.status === "delivered"
                            ? "لایسنس در داشبورد مشتری و ایمیل او قرار گرفته است."
                            : "این سفارش نیاز به اقدام مدیریتی ندارد."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {order.status === "paid" ? (
                          <Button
                            size="sm"
                            icon={KeyRound}
                            onClick={() => setLicenseOrder(order)}
                          >
                            ثبت لایسنس
                          </Button>
                        ) : null}
                        {order.status === "delivered" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={RefreshCw}
                            loading={resendingId === order.id}
                            onClick={() => void resendEmail(order.id)}
                          >
                            ارسال دوباره‌ی ایمیل
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <div>
              <h2 className="text-xl font-bold text-ink">کدهای تخفیف</h2>
              <p className="mt-1 text-xs text-muted">
                هر سفارش می‌تواند حداکثر یک کد تخفیف داشته باشد. کدهای غیرفعال
                در مرحله‌ی پرداخت پذیرفته نمی‌شوند.
              </p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
              <DiscountCreateForm
                onCreated={(discount) =>
                  setDiscounts((current) => [discount, ...current])
                }
              />

              <div className="card-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-ink">کدهای موجود</h3>
                  <span className="chip bg-surface-soft text-muted">
                    {toPersianDigits(discounts.length)} کد
                  </span>
                </div>

                {discounts.length === 0 ? (
                  <div className="py-8">
                    <EmptyState
                      icon={Percent}
                      title="کد تخفیفی وجود ندارد"
                      description="از فرم کنار، اولین کد تخفیف را بسازید."
                    />
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-black/5">
                    {discounts.map((discount) => {
                      const expired =
                        discount.expiresAt !== undefined &&
                        new Date(discount.expiresAt).getTime() < Date.now();
                      const usagePercent = Math.min(
                        100,
                        Math.round((discount.usedCount / discount.maxUses) * 100),
                      );
                      const usable =
                        discount.active &&
                        !expired &&
                        discount.usedCount < discount.maxUses;

                      return (
                        <div
                          key={discount.code}
                          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <code
                                dir="ltr"
                                className="ltr-inline rounded-lg bg-ink px-2 py-1 font-mono text-xs text-accent"
                              >
                                {discount.code}
                              </code>
                              <span
                                className={cn(
                                  "chip",
                                  usable
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-surface-soft text-muted",
                                )}
                              >
                                {expired
                                  ? "منقضی"
                                  : usable
                                    ? "قابل استفاده"
                                    : "غیرفعال"}
                              </span>
                              <span className="chip bg-primary-soft/25 text-primary">
                                {formatPercent(discount.percent)} تخفیف
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-soft">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted">
                                {toPersianDigits(discount.usedCount)} از{" "}
                                {toPersianDigits(discount.maxUses)} استفاده
                              </span>
                            </div>
                            {discount.expiresAt ? (
                              <p className="mt-1 text-[10px] text-muted">
                                انقضا: {formatDate(discount.expiresAt)}
                              </p>
                            ) : null}
                          </div>

                          <Button
                            variant={discount.active ? "ghost" : "secondary"}
                            size="sm"
                            loading={togglingCode === discount.code}
                            onClick={() => void toggleDiscount(discount.code)}
                          >
                            {discount.active ? "غیرفعال کردن" : "فعال کردن"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <LicenseModal
        order={licenseOrder}
        onClose={() => setLicenseOrder(null)}
        onSuccess={handleLicenseSuccess}
      />
    </>
  );
}
