import { Link } from "react-router-dom";
import {
  Clock3,
  Mail,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { brand } from "@/config/brand";
import { Logo } from "@/components/brand/Logo";
import { StarBurst } from "@/components/ui/Decorations";

const quickLinks = [
  { label: "خانه", to: "/" },
  { label: "همه‌ی دوره‌ها", to: "/courses" },
  { label: "چطور کار می‌کند", to: "/how-it-works" },
  { label: "درباره ما", to: "/about" },
  { label: "وبلاگ", to: "/blog" },
  { label: "پرسش‌های پرتکرار", to: "/faq" },
];

const trustItems = [
  { icon: ShieldCheck, label: "پرداخت امن" },
  { icon: RotateCcw, label: "ضمانت بازگشت ۷ روزه" },
  { icon: Clock3, label: "تحویل لایسنس در یک روز کاری" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-white">
      <StarBurst className="absolute -end-12 -top-10 size-44 rotate-12 text-white/5" />
      <StarBurst className="absolute start-[6%] bottom-24 size-16 -rotate-12 text-accent/15" />
      <div className="container-page relative py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <Logo onDark size="md" showEnglish />
            <p className="mt-5 max-w-sm text-sm leading-8 text-white/60">
              {brand.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {trustItems.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/70"
                >
                  <item.icon className="size-3.5 text-accent" aria-hidden="true" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">دسترسی سریع</h2>
            <ul className="mt-4 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 transition hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">خرید و لایسنس</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-white/60">
              <li>هر دوره یک لایسنس دائمی و تک‌کاربره دارد.</li>
              <li>کد لایسنس پس از پرداخت در داشبورد شما قرار می‌گیرد.</li>
              <li>تحویل لایسنس حداکثر یک روز کاری است.</li>
              <li>لایسنس‌ها از سرویس‌دهنده‌ی آموزشی دریافت می‌شوند.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">با ما در تماس باشید</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-2.5 text-sm text-white/60">
                <Mail className="mt-1 size-4 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <p className="mb-1 text-xs text-white/40">ایمیل پشتیبانی</p>
                  <span dir="ltr" className="ltr-inline font-mono text-xs sm:text-sm">
                    {brand.supportEmail}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-white/60">
                <Clock3 className="mt-1 size-4 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <p className="mb-1 text-xs text-white/40">ساعات پاسخ‌گویی</p>
                  <span>{brand.supportHours}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sparkles className="size-4 text-accent" aria-hidden="true" />
                  همراه خانواده‌ها
                </p>
                <p className="mt-2 text-xs leading-7 text-white/55">
                  اگر در انتخاب دوره شک دارید، برایمان بنویسید؛ مسیر مناسب سن و
                  علاقه‌ی کودک را پیشنهاد می‌دهیم.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-xs text-white/40">
              © ۱۴۰۵ {brand.nameFa}. تمامی حقوق محفوظ است.
            </p>
            <p className="text-xs text-white/40">
              ساخته‌شده با دقت برای کودکان کنجکاو و والدین آگاه.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-white/70">
                جایگاه نماد اعتماد الکترونیکی
              </p>
              <p className="mt-0.5 text-[10px] text-white/35">
                پس از دریافت، در همین بخش نمایش داده می‌شود.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
