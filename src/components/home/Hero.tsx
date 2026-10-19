import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Check, Clock3, Sparkles, Star } from "lucide-react";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/Button";
import { Emphasis } from "@/components/ui/Emphasis";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import {
  BrushBlob,
  ConcentricCircles,
  DotGrid,
  HandArrow,
  StarBurst,
} from "@/components/ui/Decorations";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

const trustPoints = [
  "لایسنس دائمی و تک‌کاربره",
  "پشتیبانی والدین",
  "بدون نیاز به پیش‌زمینه",
];

const avatarStyles = [
  "bg-primary-soft text-primary-dark",
  "bg-[#FFE2DC] text-[#9A3D2F]",
  "bg-[#DCEBFF] text-[#2150AE]",
  "bg-[#FDE9A8] text-[#7A5800]",
];

const avatarLabels = ["س", "ن", "ر", "م"];

export function Hero() {
  const reduceMotion = useReducedMotion();
  const fadeInitial = reduceMotion ? false : { opacity: 0, y: 20 };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-soft/90 via-white to-white">
      <DotGrid className="absolute start-0 top-16 h-40 w-56 opacity-60" />
      <BrushBlob className="absolute -end-24 top-10 w-[26rem] text-primary-soft/25" />
      <ConcentricCircles className="absolute -start-40 -bottom-52 size-[34rem] text-primary/10" />
      <StarBurst className="absolute end-[8%] top-10 hidden size-20 rotate-12 text-accent/70 sm:block" />

      <div className="container-page relative grid gap-12 py-10 sm:py-16 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-8 lg:py-20">
        <div>
          <motion.div
            initial={fadeInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white px-4 py-2 text-[11px] font-bold text-primary shadow-sm sm:text-xs">
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
              دوره‌های آنلاین هوش مصنوعی برای ۸ تا ۱۴ سال
            </span>
          </motion.div>

          <motion.h1
            initial={fadeInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="mt-5 text-balance text-[2rem] font-bold leading-[1.45] text-ink sm:text-5xl sm:leading-[1.4] lg:text-[3.4rem]"
          >
            آینده‌ی کودک‌تان را از امروز{" "}
            <Emphasis>روشن</Emphasis> کنید.
          </motion.h1>

          <motion.p
            initial={fadeInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: "easeOut" }}
            className="mt-5 max-w-xl text-sm leading-8 text-muted sm:text-base sm:leading-9"
          >
            {brand.nameFa}، هوش مصنوعی را با بازی، داستان و پروژه‌های کوچک به
            دنیای کودک شما می‌آورد؛ با لایسنس دائمی، مسیر گام‌به‌گام و همراهی
            والدین. بدون نیاز به دانش فنی.
          </motion.p>

          <motion.div
            initial={fadeInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: "easeOut" }}
            className="relative mt-8 flex flex-wrap items-center gap-3"
          >
            <ButtonLink to="/courses" size="lg" arrow>
              دوره‌ها را ببینید
            </ButtonLink>
            <ButtonLink
              to="/how-it-works"
              size="lg"
              variant="secondary"
              icon={Sparkles}
            >
              چطور کار می‌کند؟
            </ButtonLink>
            <HandArrow className="absolute -bottom-14 end-24 hidden w-24 -scale-x-100 text-primary/45 lg:block" />
          </motion.div>

          <motion.ul
            initial={fadeInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32, ease: "easeOut" }}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-3"
          >
            {trustPoints.map((point) => (
              <li
                key={point}
                className="flex items-center gap-2 text-xs font-bold text-ink/80 sm:text-[13px]"
              >
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                {point}
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={fadeInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease: "easeOut" }}
            className="mt-9 flex flex-wrap items-center gap-4 border-t border-black/5 pt-7"
          >
            <div className="flex items-center" aria-hidden="true">
              {avatarLabels.map((label, index) => (
                <span
                  key={label}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold",
                    avatarStyles[index],
                    index > 0 && "-ms-2.5",
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-ink">
                  {formatNumber(2400)}+ خانواده
                </span>
                <span className="mx-1 inline-flex items-center gap-0.5" aria-label="امتیاز ۴٫۹ از ۵">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className="size-3.5 fill-accent text-accent"
                      aria-hidden="true"
                    />
                  ))}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                امتیاز ۴٫۹ از ۵ از تجربه‌ی خانواده‌های همراه
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-lg lg:max-w-none"
        >
          <BrushBlob className="absolute -start-8 -top-8 w-52 text-accent/45" />
          <ConcentricCircles className="absolute -end-16 -bottom-16 size-64 text-primary/15" />
          <StarBurst className="absolute -start-4 bottom-12 z-10 size-14 rotate-12 text-accent sm:size-16" />

          <div className="relative rounded-[2.6rem] border-[7px] border-white bg-white shadow-pop motion-safe:rotate-[1.5deg]">
            <PlaceholderArt
              imageKey="hero"
              className="aspect-[5/4] w-full rounded-[2rem]"
            />
          </div>

          <div className="absolute -start-3 top-6 hidden items-center gap-2.5 rounded-2xl border border-black/5 bg-white/95 px-3.5 py-2.5 shadow-soft backdrop-blur animate-float sm:flex">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary-soft/40 text-primary">
              <BadgeCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-ink">لایسنس دائمی</p>
              <p className="mt-0.5 text-[10px] text-muted">بدون اشتراک ماهانه</p>
            </div>
          </div>

          <div className="absolute -end-3 bottom-10 hidden items-center gap-2.5 rounded-2xl border border-black/5 bg-white/95 px-3.5 py-2.5 shadow-soft backdrop-blur animate-float [animation-delay:1.5s] sm:flex">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent/25 text-[#8A5A00]">
              <Clock3 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-ink">تحویل تا ۲۴ ساعت</p>
              <p className="mt-0.5 text-[10px] text-muted">کد در داشبورد و ایمیل</p>
            </div>
          </div>

          <span className="absolute -top-4 end-8 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm">
            <Star className="size-3.5 fill-ink" aria-hidden="true" />
            ۸ تا ۱۴ سال
          </span>
        </motion.div>
      </div>
    </section>
  );
}
