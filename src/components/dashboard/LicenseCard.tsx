import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { ordersApi, getErrorMessage, type LicenseReveal, type Order } from "@/api";
import { useToast } from "@/context/ToastContext";
import { useTransientReveal } from "@/hooks/useTransientReveal";
import { copyText } from "@/lib/clipboard";
import { formatDate, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

interface LicenseCardProps {
  order: Order;
}

function parseInstructions(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[\u06F0-\u06F9\d]+\s*[.)-]\s*/u, "").trim())
    .filter((line) => line.length > 0);
}

export function LicenseCard({ order }: LicenseCardProps) {
  const { notify } = useToast();
  const {
    value: reveal,
    show: showReveal,
    hide: hideReveal,
    remainingSeconds,
  } = useTransientReveal<LicenseReveal>({
    onExpire: () => notify("کد لایسنس برای امنیت پنهان شد.", "info"),
  });
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const license = order.license;
  if (!license) return null;
  const revoked = Boolean(license.revokedAt);

  const loadReveal = async (): Promise<LicenseReveal | null> => {
    if (reveal) return reveal;
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.revealLicense(license.id);
      showReveal(data);
      return data;
    } catch (caught) {
      setError(getErrorMessage(caught));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      const data = await loadReveal();
      if (!data) return;
      const copied = await copyText(data.code);
      if (copied) {
        notify("کد لایسنس در حافظه کپی شد.", "success");
      } else {
        notify("کپی خودکار ممکن نشد؛ کد را دستی انتخاب کنید.", "error");
      }
    } finally {
      setCopying(false);
    }
  };

  const instructions = reveal ? parseInstructions(reveal.activationInstructions) : [];

  return (
    <article className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_18px_45px_-38px_rgba(17,17,17,0.4)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft/30 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-ink">
              {order.course.title}
            </h3>
            <p className="mt-1 text-[10px] text-muted">
              سفارش {toPersianDigits(order.number)} · فعال‌شده در{" "}
              {formatDate(license.issuedAt)}
            </p>
          </div>
        </div>
        {revoked ? (
          <span className="chip bg-red-50 text-[10px] text-red-700">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            لایسنس لغو شده
          </span>
        ) : (
          <span className="chip bg-emerald-50 text-[10px] text-emerald-800">
            <Check className="size-3.5" aria-hidden="true" />
            لایسنس فعال
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="rounded-2xl bg-ink p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[10px] text-white/70">
              <KeyRound className="size-3.5" aria-hidden="true" />
              کد لایسنس
            </p>
            {reveal ? (
              <button
                type="button"
                onClick={() => hideReveal()}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <EyeOff className="size-3.5" aria-hidden="true" />
                پنهان کردن
              </button>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-2 select-all break-all font-mono text-lg tracking-[0.18em] text-white",
              !reveal && "text-white/60",
            )}
            dir="ltr"
            style={{ unicodeBidi: "isolate" }}
          >
            {reveal ? reveal.code : "•••• •••• ••••"}
          </p>

          {reveal ? (
            <p className="mt-2 text-[10px] text-white/60">
              برای امنیت، کد پس از {toPersianDigits(remainingSeconds)} ثانیه
              خودکار پنهان می‌شود.
            </p>
          ) : null}

          {revoked ? (
            <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-[10px] leading-5 text-red-100">
              این لایسنس لغو شده است و کلید آن دیگر نمایش داده نمی‌شود.
              {license.revokeReason ? ` دلیل: ${license.revokeReason}` : ""}
              برای پیگیری با پشتیبانی تماس بگیرید.
            </p>
          ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void (reveal ? hideReveal() : loadReveal())}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11px] font-bold text-primary transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : reveal ? (
                <EyeOff className="size-3.5" aria-hidden="true" />
              ) : (
                <Eye className="size-3.5" aria-hidden="true" />
              )}
              {reveal ? "پنهان کردن" : "نمایش کد"}
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={copying || loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20 disabled:opacity-60"
            >
              {copying ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              کپی
            </button>
          </div>
          )}
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs font-bold leading-6 text-red-600">
            {error}
          </p>
        ) : null}

        {reveal ? (
          <div className="mt-4 space-y-4">
            {reveal.description ? (
              <div className="rounded-2xl bg-surface-soft/70 p-3.5">
                <p className="text-[10px] font-bold text-muted">توضیح تکمیلی</p>
                <p className="mt-1 text-xs leading-7 text-ink">
                  {reveal.description}
                </p>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-bold text-ink">راهنمای فعال‌سازی</p>
              <ol className="space-y-2">
                {instructions.map((line, index) => (
                  <li key={`${index}-${line}`} className="flex gap-2.5">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft/40 text-[10px] font-bold text-primary">
                      {toPersianDigits(index + 1)}
                    </span>
                    <span className="text-xs leading-6 text-muted">{line}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/10 bg-primary-soft/10 p-3.5">
              <div className="min-w-0">
                <p className="text-[10px] text-muted">ارائه‌دهنده‌ی دوره</p>
                <p className="mt-0.5 text-xs font-bold text-ink">
                  {reveal.providerName}
                </p>
                {reveal.providerReference ? (
                  <p className="mt-1 text-[10px] text-muted">
                    شناسه‌ی مرجع:{" "}
                    <span className="font-mono" dir="ltr">
                      {reveal.providerReference}
                    </span>
                  </p>
                ) : null}
              </div>
              <a
                href={reveal.activationUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-white transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              >
                رفتن به سایت دوره
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] leading-6 text-muted">
            کد کامل فقط با درخواست شما از سرور دریافت می‌شود؛ برای دیدن کد و
            راهنمای فعال‌سازی روی «نمایش کد» بزنید.
          </p>
        )}
      </div>
    </article>
  );
}
