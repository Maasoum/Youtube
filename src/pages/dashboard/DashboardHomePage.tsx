import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Clock3,
  GraduationCap,
  Hourglass,
  PauseCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { getErrorMessage, ordersApi, type Order } from "@/api";
import { purchaseConfig } from "@/config/purchase";
import { useAuth } from "@/context/AuthContext";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { LicenseCard } from "@/components/dashboard/LicenseCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { PanelCard } from "@/components/panel/PanelCard";
import { StatCard } from "@/components/panel/StatCard";
import { formatDate, toPersianDigits } from "@/lib/format";

export function DashboardHomePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.listMine();
      setOrders(data);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "fulfilled" &&
          order.license !== null &&
          !order.license.revokedAt,
      ),
    [orders],
  );
  const awaitingOrders = useMemo(
    () => orders.filter((order) => order.status === "awaiting_license"),
    [orders],
  );
  const holdOrders = useMemo(
    () => orders.filter((order) => order.status === "on_hold"),
    [orders],
  );
  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === "pending"),
    [orders],
  );

  const totalCourses = activeOrders.length + awaitingOrders.length + holdOrders.length;

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل کاربری"
        title={`سلام ${user?.fullName.split(" ")[0] ?? "دوست عزیز"}!`}
        description="وضعیت لایسنس‌ها و دوره‌های خریداری‌شده‌ی شما در یک نگاه."
        actions={
          <ButtonLink to="/courses" variant="secondary" size="sm" arrow>
            دوره‌های بیشتر
          </ButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          icon={GraduationCap}
          label="لایسنس فعال"
          value={toPersianDigits(activeOrders.length)}
          hint="دوره‌های آماده‌ی استفاده"
          tone="success"
        />
        <StatCard
          icon={Clock3}
          label="در انتظار لایسنس"
          value={toPersianDigits(awaitingOrders.length)}
          hint={`تحویل معمولاً تا ${toPersianDigits(purchaseConfig.licenseDeliveryHours)} ساعت کاری`}
          tone="primary"
        />
        <StatCard
          icon={PauseCircle}
          label="در حال بررسی"
          value={toPersianDigits(holdOrders.length)}
          hint="نیازمند پیگیری تیم پشتیبانی"
          tone={holdOrders.length > 0 ? "accent" : "default"}
        />
      </div>

      {pendingOrders.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <ShoppingBag className="size-4" aria-hidden="true" />
            {toPersianDigits(pendingOrders.length)} سفارش در انتظار پرداخت دارید.
          </p>
          <Link
            to="/dashboard/orders"
            className="rounded-full bg-white px-3.5 py-2 text-[11px] font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
          >
            ادامه‌ی پرداخت
          </Link>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری دوره‌ها">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-3xl border border-black/5 bg-white/70"
            />
          ))}
        </div>
      ) : error ? (
        <PanelCard>
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-red-700">
              دوره‌های شما بارگذاری نشد
            </p>
            <p className="mt-2 text-xs leading-6 text-muted">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/25 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary-soft/20"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              تلاش دوباره
            </button>
          </div>
        </PanelCard>
      ) : totalCourses === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="هنوز دوره‌ای ندارید"
          description="با خرید اولین دوره، لایسنس شما پس از تأیید پرداخت در همین صفحه فعال می‌شود."
          action={<ButtonLink to="/courses" arrow>دیدن دوره‌ها</ButtonLink>}
        />
      ) : (
        <div className="space-y-8">
          {activeOrders.length > 0 ? (
            <section aria-labelledby="active-licenses">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2
                  id="active-licenses"
                  className="flex items-center gap-2 text-base font-bold text-ink"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <GraduationCap className="size-4" aria-hidden="true" />
                  </span>
                  لایسنس‌های فعال
                </h2>
                <span className="text-[10px] text-muted">
                  {toPersianDigits(activeOrders.length)} دوره
                </span>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {activeOrders.map((order) => (
                  <LicenseCard key={order.id} order={order} />
                ))}
              </div>
            </section>
          ) : null}

          {awaitingOrders.length > 0 ? (
            <section aria-labelledby="awaiting-licenses">
              <h2
                id="awaiting-licenses"
                className="mb-3 flex items-center gap-2 text-base font-bold text-ink"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                  <Clock3 className="size-4" aria-hidden="true" />
                </span>
                در انتظار صدور لایسنس
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {awaitingOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-3xl border border-sky-100 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(17,17,17,0.4)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-ink">
                        {order.course.title}
                      </h3>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 text-[11px] leading-6 text-muted">
                      پرداخت شما تأیید شده است. لایسنس معمولاً تا{" "}
                      {toPersianDigits(purchaseConfig.licenseDeliveryHours)}{" "}
                      ساعت کاری پس از پرداخت صادر و ایمیل می‌شود.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3">
                      <span className="text-[10px] text-muted">
                        سفارش {toPersianDigits(order.number)} ·{" "}
                        {formatDate(order.paidAt ?? order.createdAt)}
                      </span>
                      <Link
                        to={`/dashboard/orders/${order.id}`}
                        className="text-[11px] font-bold text-primary underline decoration-primary/30 underline-offset-4"
                      >
                        جزئیات سفارش
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {holdOrders.length > 0 ? (
            <section aria-labelledby="hold-licenses">
              <h2
                id="hold-licenses"
                className="mb-3 flex items-center gap-2 text-base font-bold text-ink"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-orange-50 text-orange-700">
                  <Hourglass className="size-4" aria-hidden="true" />
                </span>
                در حال بررسی
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {holdOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-3xl border border-orange-100 bg-orange-50/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-ink">
                        {order.course.title}
                      </h3>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 text-[11px] leading-6 text-ink/80">
                      {order.onHoldReason ??
                        "برای دقت بیشتر، سفارش شما در حال بررسی است."}
                    </p>
                    <p className="mt-2 text-[10px] leading-5 text-muted">
                      اگر اطلاعات بیشتری لازم باشد، همکاران ما با شما تماس
                      می‌گیرند. نیازی به ثبت دوباره‌ی سفارش نیست.
                    </p>
                    <Link
                      to={`/dashboard/orders/${order.id}`}
                      className="mt-3 inline-block text-[11px] font-bold text-primary underline decoration-primary/30 underline-offset-4"
                    >
                      مشاهده‌ی جزئیات
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
