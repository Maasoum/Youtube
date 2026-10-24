import { useEffect, useState } from "react";
import { AlertCircle, Check, Copy, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import {
  getErrorMessage,
  ordersApi,
  type AdminLicenseListItem,
  type LicenseReveal,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { copyText } from "@/lib/clipboard";
import { toPersianDigits } from "@/lib/format";
import { useTransientReveal } from "@/hooks/useTransientReveal";

export function RevealLicenseDialog({
  license,
  onClose,
}: {
  license: AdminLicenseListItem | null;
  onClose: () => void;
}) {
  const { notify } = useToast();
  const {
    value: reveal,
    show: showReveal,
    hide: hideReveal,
    remainingSeconds,
  } = useTransientReveal<LicenseReveal>({
    onExpire: () => {
      notify("کلید برای امنیت پنهان شد؛ برای نمایش دوباره، پنجره را باز کنید.", "info");
      onClose();
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!license) {
      hideReveal();
      setError(null);
      return;
    }
    let active = true;
    hideReveal();
    setError(null);
    setLoading(true);
    ordersApi
      .revealLicense(license.id)
      .then((data) => {
        if (active) showReveal(data);
      })
      .catch((caught: unknown) => {
        if (active) setError(getErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [license, hideReveal, showReveal]);

  const handleCopy = async () => {
    if (!reveal) return;
    const ok = await copyText(reveal.code);
    if (ok) {
      setCopied(true);
      notify("کلید لایسنس کپی شد.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      notify("کپی خودکار ممکن نشد؛ کلید را دستی انتخاب کنید.", "error");
    }
  };

  return (
    <Modal
      open={license !== null}
      onClose={onClose}
      title="نمایش کلید لایسنس"
      description="کلید کامل فقط برای همین لحظه از سرور دریافت می‌شود و نمایش آن در گزارش اقدامات ثبت می‌شود. پس از یک دقیقه خودکار پنهان می‌شود."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            بستن
          </Button>
          <Button
            size="sm"
            icon={copied ? Check : Copy}
            onClick={() => void handleCopy()}
            disabled={!reveal}
          >
            {copied ? "کپی شد" : "کپی کلید"}
          </Button>
        </>
      }
    >
      {license ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-soft/60 p-3 text-[11px] leading-6 text-muted">
            <p className="font-bold text-ink">{license.courseTitle}</p>
            <p className="mt-1">
              سفارش {toPersianDigits(license.orderNumber)} · {license.customerName}
            </p>
            <p className="mt-0.5 font-mono text-[10px]" dir="ltr">
              {license.customerEmail}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-black/5 py-10 text-xs text-muted" role="status">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
              در حال دریافت کلید…
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-xs leading-6 text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          ) : reveal ? (
            <>
              <div className="rounded-2xl bg-ink p-4 text-white">
                <p className="flex items-center gap-1.5 text-[10px] text-white/60">
                  <KeyRound className="size-3.5 text-accent" aria-hidden="true" />
                  کلید لایسنس
                </p>
                <code
                  dir="ltr"
                  className="mt-2 block select-all break-all rounded-xl bg-white/5 px-3 py-3 font-mono text-base tracking-[0.14em] text-accent"
                >
                  {reveal.code}
                </code>
                <p className="mt-2 text-[10px] text-white/60">
                  برای امنیت، کلید تا {toPersianDigits(remainingSeconds)} ثانیه‌ی
                  دیگر خودکار پنهان می‌شود.
                </p>
              </div>
              {reveal.description ? (
                <p className="rounded-2xl bg-accent/15 p-3 text-[11px] leading-6 text-ink">
                  {reveal.description}
                </p>
              ) : null}
              <p className="flex items-start gap-2 rounded-2xl border border-primary/10 bg-primary-soft/10 p-3 text-[10px] leading-5 text-muted">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                این اقدام با نام شما در گزارش ممیزی ثبت شد. کلید را در کانال‌های
                ناامن ارسال نکنید.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
