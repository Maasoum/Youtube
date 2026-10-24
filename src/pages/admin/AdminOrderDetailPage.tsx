import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowUpRight,
  ClipboardList,
  Mail,
  Phone,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  ordersApi,
  type Course,
  type Order,
} from "@/api";
import { ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { OrderTimeline } from "@/components/panel/OrderTimeline";
import { formatDate, formatDateTime, formatToman, toPersianDigits } from "@/lib/format";

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const orderData = await ordersApi.get(orderId);
      setOrder(orderData);
      const courses = await adminApi.listCourses();
      setCourse(courses.find((item) => item.id === orderData.course.id) ?? null);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded-full bg-white/80" />
        <div className="h-56 animate-pulse rounded-3xl bg-white/70" />
        <div className="h-64 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PanelPageHeader
          title="سفارش پیدا نشد"
          backTo={{ to: "/admin/orders", label: "بازگشت به سفارش‌ها" }}
        />
        <PanelCard>
          <p className="py-8 text-center text-xs text-muted">
            {error ?? "اطلاعات این سفارش در دسترس نیست."}
          </p>
        </PanelCard>
      </div>
    );
  }

  const needsFulfillment =
    order.status === "awaiting_license" || order.status === "on_hold";

  return (
    <div className="space-y-5">
      <PanelPageHeader
        eyebrow="سفارش"
        title={`سفارش ${toPersianDigits(order.number)}`}
        description={`${order.customer.fullName} — ${order.course.title}`}
        backTo={{ to: "/admin/orders", label: "بازگشت به سفارش‌ها" }}
        actions={
          needsFulfillment || order.license ? (
            <ButtonLink
              to={`/admin/fulfillment/${order.id}`}
              size="sm"
              icon={ClipboardList}
            >
              {needsFulfillment ? "ثبت لایسنس" : "مدیریت لایسنس"}
            </ButtonLink>
          ) : undefined
        }
      />

      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {order.source === "gift" ? (
              <span className="chip bg-primary-soft/40 text-primary">هدیه</span>
            ) : null}
          </div>
          <p className="text-lg font-bold tabular-nums text-ink">
            {formatToman(order.totalToman)}
          </p>
        </div>

        <div className="mt-5 grid gap-4 border-t border-black/5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] text-muted">زمان ثبت</p>
            <p className="mt-1 text-xs text-ink">{formatDateTime(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted">زمان پرداخت</p>
            <p className="mt-1 text-xs text-ink">
              {order.paidAt ? formatDateTime(order.paidAt) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">شناسه‌ی پرداخت</p>
            <p className="mt-1 font-mono text-[11px] text-ink" dir="ltr">
              {order.paymentRef ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">شناسه‌ی ارائه‌دهنده</p>
            <p className="mt-1 font-mono text-[11px] text-ink" dir="ltr">
              {order.providerReference ?? "—"}
            </p>
          </div>
        </div>
      </PanelCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PanelCard title="اقلام و مبالغ">
            <table className="w-full border-collapse text-start text-xs">
              <caption className="sr-only">اقلام سفارش</caption>
              <thead>
                <tr className="border-b border-black/5 text-[10px] text-muted">
                  <th scope="col" className="py-2 font-bold">دوره</th>
                  <th scope="col" className="py-2 font-bold">مبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black/5">
                  <td className="py-3 text-ink">{order.course.title}</td>
                  <td className="py-3 tabular-nums text-ink">
                    {formatToman(order.originalPriceToman)}
                  </td>
                </tr>
                {order.discount ? (
                  <tr className="border-b border-black/5">
                    <td className="py-2 text-muted">
                      تخفیف{" "}
                      <span className="font-mono text-[10px]" dir="ltr">
                        {order.discount.code}
                      </span>
                    </td>
                    <td className="py-2 tabular-nums text-emerald-700">
                      −{formatToman(order.discount.amountToman)}
                    </td>
                  </tr>
                ) : null}
                {order.taxToman ? (
                  <tr className="border-b border-black/5">
                    <td className="py-2 text-muted">
                      مالیات بر ارزش افزوده
                      {order.taxPercent ? ` (${toPersianDigits(order.taxPercent)}٪)` : ""}
                    </td>
                    <td className="py-2 tabular-nums text-ink">
                      {formatToman(order.taxToman)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="py-3 text-start font-bold text-ink">
                    مبلغ نهایی
                  </th>
                  <td className="py-3 font-bold tabular-nums text-ink">
                    {formatToman(order.totalToman)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {order.note ? (
              <p className="mt-3 rounded-2xl bg-surface-soft/60 p-3 text-[11px] leading-6 text-muted">
                یادداشت خریدار: {order.note}
              </p>
            ) : null}
          </PanelCard>

          <PanelCard title="تاریخچه‌ی وضعیت">
            <OrderTimeline events={order.statusHistory} />
          </PanelCard>

          {order.refund ? (
            <div className="rounded-3xl border border-purple-200 bg-purple-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-purple-900">
                <RotateCcw className="size-4" aria-hidden="true" />
                بازگشت وجه
              </p>
              <p className="mt-1 text-xs leading-6 text-purple-900/90">
                {formatToman(order.refund.amountToman)} در{" "}
                {formatDate(order.refund.refundedAt)} — شناسه:{" "}
                <span className="font-mono" dir="ltr">
                  {order.refund.reference ?? "—"}
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-6 text-purple-900/80">
                دلیل: {order.refund.reason}
              </p>
              <p className="mt-2 rounded-2xl bg-white/70 p-3 text-[10px] leading-6">
                بازگشت پول از پنل PayPing انجام می‌شود و لغو لایسنس نزد
                ارائه‌دهنده باید جداگانه با او هماهنگ شود.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <PanelCard title="خریدار">
            <p className="text-sm font-bold text-ink">{order.customer.fullName}</p>
            <ul className="mt-3 space-y-2 text-[11px]">
              <li className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted" aria-hidden="true" />
                <a href={`mailto:${order.customer.email}`} className="truncate text-primary" dir="ltr">
                  {order.customer.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted" aria-hidden="true" />
                <a href={`tel:${order.customer.phone}`} className="text-ink" dir="ltr">
                  {order.customer.phone}
                </a>
              </li>
            </ul>
          </PanelCard>

          <PanelCard
            title="ارائه‌دهنده"
            action={
              course ? (
                <a
                  href={course.providerPanelUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"
                >
                  پنل
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              ) : null
            }
          >
            <p className="text-sm font-bold text-ink">
              {course?.providerName ?? "—"}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-muted">
              {course?.activationUrl ?? "نشانی سایت دوره ثبت نشده است."}
            </p>
          </PanelCard>

          <PanelCard title="لایسنس">
            {order.license ? (
              <div>
                <p className="font-mono text-sm tracking-widest text-ink" dir="ltr">
                  •••• •••• ••••
                </p>
                <p className="mt-2 text-[10px] leading-5 text-muted">
                  صادرشده در {formatDateTime(order.license.issuedAt)} ·{" "}
                  {order.license.source === "gift" ? "هدیه" : "ارائه‌دهنده"}
                </p>
                <ButtonLink
                  to={`/admin/fulfillment/${order.id}`}
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  fullWidth
                >
                  مشاهده و ویرایش
                </ButtonLink>
              </div>
            ) : (
              <div>
                <p className="flex items-center gap-2 text-xs text-muted">
                  <ShieldAlert className="size-4" aria-hidden="true" />
                  هنوز لایسنسی ثبت نشده است.
                </p>
                {needsFulfillment ? (
                  <ButtonLink
                    to={`/admin/fulfillment/${order.id}`}
                    size="sm"
                    className="mt-3"
                    fullWidth
                  >
                    ثبت لایسنس
                  </ButtonLink>
                ) : null}
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
