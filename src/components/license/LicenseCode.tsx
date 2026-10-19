import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/cn";

interface LicenseCodeProps {
  code: string;
  className?: string;
  label?: string;
}

export function LicenseCode({
  code,
  className,
  label = "کد لایسنس شما",
}: LicenseCodeProps) {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      notify("کد لایسنس کپی شد.", "success");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      notify(
        "کپی خودکار ممکن نشد؛ کد را انتخاب کنید و دستی کپی کنید.",
        "error",
      );
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-ink p-4 text-white",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] text-white/50">
          <KeyRound className="size-3.5 text-accent" aria-hidden="true" />
          {label}
        </p>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="کپی کد لایسنس"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copied ? "کپی شد" : "کپی کد"}
        </button>
      </div>
      <code
        dir="ltr"
        className="ltr-inline mt-2 block select-all break-all rounded-xl bg-white/5 px-3 py-2.5 font-mono text-sm tracking-[0.12em] text-accent"
      >
        {code}
      </code>
      <p className="mt-2 text-[10px] leading-5 text-white/35">
        این کد مخصوص حساب شماست؛ آن را در اختیار دیگران قرار ندهید.
      </p>
    </div>
  );
}
