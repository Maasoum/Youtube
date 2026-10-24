import { useState } from "react";
import { Link } from "react-router-dom";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { assetUrl } from "@/lib/asset";

type LogoVariant = "fa" | "en";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  className?: string;
  size?: LogoSize;
  linked?: boolean;
  /** «fa» برای رابط فارسی و «en» برای بخش‌های انگلیسی/دوزبانه. */
  variant?: LogoVariant;
  /** روی پس‌زمینه‌های تیره، لوگو داخل یک کاشی سفید می‌نشیند. */
  onDark?: boolean;
}

/**
 * ابعاد اصلی فایل‌ها (پس از حذف حاشیه‌ی شفاف) برای جلوگیری از پرش چیدمان.
 * فایل‌ها در `public/brand` نگهداری می‌شوند و هیچ منبع بیرونی‌ای بارگذاری نمی‌شود.
 */
const ASSETS = {
  fa: { file: "brand/logo-fa.png", width: 565, height: 237, alt: brand.nameFa },
  en: { file: "brand/logo-en.png", width: 1310, height: 596, alt: brand.nameEn },
} as const;

const imageHeights: Record<LogoSize, string> = {
  sm: "h-10",
  md: "h-12",
  lg: "h-16",
};

const tilePadding: Record<LogoSize, string> = {
  sm: "p-1.5",
  md: "p-2",
  lg: "p-2.5",
};

const fallbackText: Record<LogoSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Logo({
  className,
  size = "md",
  linked = true,
  variant = "fa",
  onDark = false,
}: LogoProps) {
  const [failed, setFailed] = useState(false);
  const asset = ASSETS[variant];

  // اگر تصویر در دسترس نبود (مثلاً انتشار ناقص)، نام برند به‌صورت متنی نمایش داده می‌شود.
  const inner = failed ? (
    <span
      dir={variant === "en" ? "ltr" : undefined}
      className={cn("font-bold leading-tight text-ink", fallbackText[size])}
    >
      {asset.alt}
    </span>
  ) : (
    <img
      src={assetUrl(asset.file)}
      alt={linked ? "" : asset.alt}
      width={asset.width}
      height={asset.height}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("block w-auto shrink-0 select-none", imageHeights[size])}
    />
  );

  const content = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        onDark &&
          "rounded-2xl bg-white shadow-[0_12px_32px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/20",
        onDark && tilePadding[size],
        className,
      )}
    >
      {inner}
    </span>
  );

  if (!linked) {
    return content;
  }

  return (
    <Link
      to="/"
      aria-label={`${brand.nameFa} — صفحه‌ی اصلی`}
      className="inline-flex shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
    >
      {content}
    </Link>
  );
}
