import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Printer } from "lucide-react";
import { getErrorMessage, ordersApi, type Order } from "@/api";
import { brand } from "@/config/brand";
import { Logo } from "@/components/brand/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, formatToman, toPersianDigits } from "@/lib/format";

export function DashboardReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      setOrder(await ordersApi.get(orderId));
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
      <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-3xl bg-white/70" aria-busy="true" />
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-black/5 bg-white p-8 text-center">
        <p className="text-sm font-bold text-ink">رسید پیدا نشد</p>
        <p className="mt-2 text-xs leading-6 text-muted">
          {error ?? "این سفارش در دسترس نیست."}
        </p>
        <ButtonLink to="/dashboard/orders" className="mt-5" size="sm">
          بازگشت به سفارش‌ها
        </ButtonLink>
      </div>
    );
  }

  const discountAmount = order.discount?.amountToman ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <ButtonLink
          to={`/dashboard/orders/${order.id}`}
          variant="ghost"
          size="sm"
        >
          بازگشت به سفارش
        </ButtonLink>
        <Button
          size="sm"
          variant="secondary"
          icon={Printer}
          onClick={() => window.print()}
        >
          چاپ رسید
        </Button>
      </div>

      <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(17,17,17,0.4)] sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
          <Logo linked={false} size="sm" />
          <div className="text-end">
            <p className="text-sm font-bold text-ink">رسید سفارش</p>
            <p className="mt-1 text-[11px] text-muted">
              شماره‌ی سفارش:{" "}
              <span className="font-bold tabular-nums text-ink">
                {toPersianDigits(order.number)}
              </span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
        </header>

        {order.paidAt ? (
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-emerald-900">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold">پرداخت تأیید شده است</p>
              <p className="mt-0.5 text-[10px] leading-5 text-emerald-900/80">
                {formatDateTime(order.paidAt)}
                {order.paymentRef ? (
                  <>
                    {" "}
                    · شناسه‌ی پرداخت:{" "}
                    <span className="font-mono" dir="ltr">
                      {order.paymentRef}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-900">
            این سفارش هنوز پرداخت نشده است و رسید مالی محسوب نمی‌شود.
          </p>
        )}

        <section className="mt-6">
          <h2 className="text-xs font-bold text-muted">مشخصات خریدار</h2>
          <dl className="mt-2 grid gap-3 rounded-2xl bg-surface-soft/50 p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[10px] text-muted">نام</dt>
              <dd className="mt-1 text-ink">{order.customer.fullName}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted">ایمیل</dt>
              <dd className="mt-1 text-ink" dir="ltr">
                {order.customer.email}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted">موبایل</dt>
              <dd className="mt-1 text-ink" dir="ltr">
                {order.customer.phone}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted">وضعیت سفارش</dt>
              <dd className="mt-1">
                <OrderStatusBadge status={order.status} />
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-bold text-muted">اقلام سفارش</h2>
          <table className="mt-2 w-full border-collapse text-start text-xs">
            <thead>
              <tr className="border-y border-black/10 bg-surface-soft/40 text-[10px] text-muted">
                <th scope="col" className="px-3 py-2 font-bold">دوره</th>
                <th scope="col" className="px-3 py-2 font-bold">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black/5">
                <td className="px-3 py-3 leading-6 text-ink">
                  {order.course.title}
                  {order.source === "gift" ? (
                    <span className="ms-2 text-[10px] text-primary">(هدیه)</span>
                  ) : null}
                </td>
                <td className="px-3 py-3 tabular-nums text-ink">
                  {formatToman(order.originalPriceToman)}
                </td>
              </tr>
              {discountAmount > 0 ? (
                <tr className="border-b border-black/5">
                  <td className="px-3 py-2 text-muted">
                    تخفیف
                    {order.discount?.code ? (
                      <span className="ms-1 font-mono text-[10px]" dir="ltr">
                        ({order.discount.code})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-emerald-700">
                    −{formatToman(discountAmount)}
                  </td>
                </tr>
              ) : null}
              {order.taxToman ? (
                <tr className="border-b border-black/5">
                  <td className="px-3 py-2 text-muted">
                    مالیات بر ارزش افزوده
                    {order.taxPercent ? ` (${toPersianDigits(order.taxPercent)}٪)` : ""}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-ink">
                    {formatToman(order.taxToman)}
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="px-3 py-3 text-start text-xs font-bold text-ink">
                  مبلغ نهایی
                </th>
                <td className="px-3 py-3 text-sm font-bold tabular-nums text-ink">
                  {formatToman(order.totalToman)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {order.license ? (
          <section className="mt-6 rounded-2xl border border-primary/10 bg-primary-soft/10 p-4">
            <p className="text-[10px] font-bold text-muted">لایسنس این سفارش</p>
            <p className="mt-1 text-xs text-ink">
              {order.license.source === "gift" ? "لایسنس هدیه" : "لایسنس دوره"} ·{" "}
              صادرشده در {formatDateTime(order.license.issuedAt)}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-muted">
              کد کامل لایسنس به دلایل امنیتی در رسید چاپ نمی‌شود؛ آن را از صفحه‌ی
              داشبورد و با دکمه‌ی «نمایش کد» ببینید.
            </p>
          </section>
        ) : null}

        <footer className="mt-8 border-t border-dashed border-black/10 pt-4 text-[10px] leading-6 text-muted">
          <p>
            این رسید به‌صورت نمایشی صادر شده و سند مالی رسمی نیست. برای هر
            پرسشی از صفحه‌ی تماس یا پشتیبانی {brand.nameFa} در ساعات{" "}
            {brand.supportHours} استفاده کنید.
          </p>
          <p className="mt-1">
            {brand.nameFa} — {brand.nameEn}
          </p>
        </footer>
      </article>
    </div>
  );
}
