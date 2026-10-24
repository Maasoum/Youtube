import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { brand } from "@/config/brand";
import { purchaseConfig } from "@/config/purchase";
import { toPersianDigits } from "@/lib/format";
import { contentApi, type PublicSiteSettings } from "@/api";
import { Logo } from "@/components/brand/Logo";

const quickLinks = [
  { label: "خانه", to: "/" },
  { label: "همه‌ی دوره‌ها", to: "/courses" },
  { label: "چطور کار می‌کند", to: "/how-it-works" },
  { label: "درباره ما", to: "/about" },
  { label: "وبلاگ", to: "/blog" },
  { label: "پرسش‌های پرتکرار", to: "/faq" },
];

const legalLinks = [
  { label: "تماس با ما", to: "/contact" },
  { label: "حریم خصوصی", to: "/privacy" },
  { label: "قوانین و مقررات", to: "/terms" },
  { label: "شرایط بازگشت وجه", to: "/refund-policy" },
];

export function Footer() {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);

  useEffect(() => {
    let active = true;
    contentApi
      .getPublicSettings()
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch(() => {
        // در صورت خطا، اطلاعات پیش‌فرض برند نمایش داده می‌شود.
      });
    return () => {
      active = false;
    };
  }, []);

  const footerInfo = settings?.footer;
  const trustBadge = settings?.trustBadge;
  const deliveryHours =
    settings?.fulfillmentSlaHours ?? purchaseConfig.licenseDeliveryHours;

  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_0.9fr_0.9fr_1.1fr]">
          <div>
            <Logo size="md" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
              {footerInfo?.about ?? brand.description}
            </p>
            <p className="mt-4 text-xs leading-6 text-muted/80">
              ضمانت بازگشت {toPersianDigits(purchaseConfig.refundDays)} روزه ·
              تحویل لایسنس حداکثر {toPersianDigits(deliveryHours)} ساعت کاری
            </p>
          </div>

          <nav aria-label="دسترسی سریع">
            <h2 className="text-xs font-bold text-ink">دسترسی سریع</h2>
            <ul className="mt-4 space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted transition hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="پیوندهای حقوقی">
            <h2 className="text-xs font-bold text-ink">اطلاعات</h2>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted transition hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-bold text-ink">تماس با ما</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {brand.supportEmail ? (
                <li>
                  <a
                    href={`mailto:${brand.supportEmail}`}
                    dir="ltr"
                    className="inline-block underline-offset-4 transition hover:text-primary hover:underline"
                  >
                    {brand.supportEmail}
                  </a>
                </li>
              ) : null}
              {footerInfo?.phone ? (
                <li>
                  <a
                    href={`tel:${footerInfo.phone}`}
                    dir="ltr"
                    className="inline-block underline-offset-4 transition hover:text-primary hover:underline"
                  >
                    {toPersianDigits(footerInfo.phone)}
                  </a>
                </li>
              ) : null}
              {footerInfo?.address ? (
                <li className="leading-7">{footerInfo.address}</li>
              ) : null}
              <li className="leading-7">{brand.supportHours}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-black/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            © ۱۴۰۵ {brand.nameFa}. تمامی حقوق محفوظ است.
          </p>

          {trustBadge?.enabled ? (
            <a
              href={trustBadge.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 text-xs text-muted transition hover:text-primary"
            >
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              {trustBadge.label}
            </a>
          ) : (
            <p className="text-[11px] text-muted/70">
              اسناد حقوقی در حال بازبینی نهایی هستند.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
