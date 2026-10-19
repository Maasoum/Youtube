import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Emphasis } from "@/components/ui/Emphasis";
import {
  ConcentricCircles,
  CurlyArrow,
  DotGrid,
  RotatingSeal,
  ScallopStar,
  Squiggle,
} from "@/components/ui/Decorations";
import { BoyAvatar, BoyOnCapsule } from "./BoyArt";

const fade = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

export function Hero() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#F7F5FC_0%,#FFFFFF_72%)]">
      <DotGrid className="absolute start-4 top-24 h-36 w-44 opacity-50 sm:start-10 sm:h-44 sm:w-56" />
      <DotGrid className="absolute end-8 bottom-28 hidden h-28 w-36 opacity-35 md:block" />
      <ScallopStar className="absolute -start-8 top-64 hidden size-24 -rotate-12 text-primary-soft sm:block lg:size-32" />
      <Squiggle className="absolute end-[6%] top-28 hidden w-24 text-accent md:block" />
      <span
        aria-hidden="true"
        className="absolute -end-20 -top-24 size-72 rounded-full bg-primary-soft/35 blur-2xl"
      />

      <Container className="relative pb-16 pt-8 sm:pb-24 sm:pt-12">
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-5 flex items-end justify-center gap-3 sm:mb-7 sm:gap-7">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative -rotate-3"
            >
              <span className="block size-16 overflow-hidden rounded-full border-4 border-white bg-primary-soft shadow-[0_16px_30px_-18px_rgba(17,17,17,0.45)] sm:size-24">
                <BoyAvatar />
              </span>
              <CurlyArrow className="absolute -bottom-11 -start-3 hidden w-16 -scale-x-100 text-primary/45 sm:block" />
            </motion.div>

            <motion.span
              initial={fade.hidden}
              animate="visible"
              variants={fade}
              transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
              className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white px-3 py-2 text-[10px] font-bold text-primary shadow-sm sm:gap-2 sm:px-4 sm:text-xs"
            >
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
              یادگیری هوش مصنوعی برای ۸ تا ۱۴ سال
            </motion.span>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, rotate: -12, scale: 0.9 }}
              animate={{ opacity: 1, rotate: 8, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="mb-2 hidden sm:block"
            >
              <RotatingSeal className="size-20 text-primary/40 lg:size-24" />
            </motion.div>
          </div>

          <motion.h1
            initial={initial}
            animate="visible"
            variants={fade}
            transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
            className="text-balance text-[1.95rem] font-bold leading-[1.5] text-ink sm:text-6xl sm:leading-[1.35] lg:text-[4.35rem] lg:leading-[1.28]"
          >
            بهترین جا برای
            <br />
            <Emphasis className="mx-1">یادگیری</Emphasis> هوش مصنوعی
            <br />و <Emphasis tone="accent">بازی</Emphasis> کودکان
          </motion.h1>

          <motion.p
            initial={initial}
            animate="visible"
            variants={fade}
            transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-muted sm:text-base sm:leading-9"
          >
            {brand.nameFa} هوش مصنوعی را با بازی، داستان و پروژه‌های کوچک به
            دنیای کودک شما می‌آورد؛ با لایسنس دائمی، مسیر گام‌به‌گام و همراهی
            والدین. بدون نیاز به هیچ پیش‌زمینه‌ای.
          </motion.p>

          <motion.div
            initial={initial}
            animate="visible"
            variants={fade}
            transition={{ duration: 0.6, delay: 0.24, ease: "easeOut" }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <ButtonLink
              to="/courses"
              size="lg"
              arrow
              className="px-8 shadow-[0_22px_48px_-16px_rgba(100,70,224,0.6)]"
            >
              شروع کنید
            </ButtonLink>
            <p className="flex items-center gap-2 text-[11px] font-bold text-muted sm:text-xs">
              <Star className="size-3.5 text-accent" aria-hidden="true" />
              لایسنس دائمی برای هر کودک، بدون اشتراک ماهانه
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="relative mx-auto mt-10 max-w-3xl sm:mt-14"
        >
          <div className="relative overflow-hidden rounded-[3rem] bg-[#EEEAFB] px-4 pb-0 pt-8 sm:px-10 sm:pt-10">
            <DotGrid className="absolute end-6 top-6 h-20 w-28 opacity-30" />
            <ConcentricCircles className="absolute -bottom-40 start-0 end-0 mx-auto size-[30rem] text-primary/15 sm:-bottom-48 sm:size-[36rem]" />
            <RotatingSeal className="absolute bottom-3 end-2 size-14 text-primary/35 sm:bottom-8 sm:end-5 sm:size-20 lg:size-24" />
            <ScallopStar className="absolute start-5 top-8 size-12 rotate-12 text-accent sm:size-16" />

            <div className="relative mx-auto w-full max-w-md">
              <BoyOnCapsule className="w-full drop-shadow-[0_24px_36px_rgba(100,70,224,0.16)]" />
            </div>

            <span className="absolute start-4 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-2xl border border-white bg-white/90 px-3 py-2 text-[11px] font-bold text-primary shadow-soft backdrop-blur sm:inline-flex lg:start-8">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft/60 text-[10px]">
                ۱
              </span>
              کنجکاوی
            </span>
            <span className="absolute end-4 top-1/3 hidden items-center gap-2 rounded-2xl border border-white bg-white/90 px-3 py-2 text-[11px] font-bold text-ink shadow-soft backdrop-blur sm:inline-flex lg:end-8">
              <span className="flex size-6 items-center justify-center rounded-full bg-accent/30 text-[10px]">
                ۲
              </span>
              خلاقیت
            </span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
