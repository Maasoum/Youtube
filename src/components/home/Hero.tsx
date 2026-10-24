import { motion, useReducedMotion } from "framer-motion";
import { assetUrl } from "@/lib/asset";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Emphasis } from "@/components/ui/Emphasis";
const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

/** تصویرهای تزئینیِ ارسالی کاربر؛ از پوشه‌ی public و بدون درخواست خارجی. */
const heroArt = {
  bb: {
    src: assetUrl("brand/hero-bb.png"),
    width: 268,
    height: 305,
  },
  dd: {
    src: assetUrl("brand/hero-dd.png"),
    width: 287,
    height: 317,
  },
  circle: {
    src: assetUrl("brand/hero-circle.png"),
    width: 168,
    height: 165,
  },
  arrow: {
    src: assetUrl("brand/hero-arrow.png"),
    width: 179,
    height: 138,
  },
} as const;

/** لوگوی دایره‌ای برند با حرکت چرخشی آرام؛ با prefers-reduced-motion متوقف می‌شود. */
function SpinningSeal({ className }: { className?: string }) {
  return (
    <img
      src={assetUrl("brand/logo-22.png")}
      alt=""
      aria-hidden="true"
      width={353}
      height={349}
      draggable={false}
      className={`seal-spin select-none rounded-full ${className ?? ""}`}
    />
  );
}

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-white">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-24 -top-28 size-80 rounded-full bg-primary-soft/25 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -start-24 top-52 size-64 rounded-full bg-accent/10 blur-3xl"
      />

      <Container className="relative pb-16 pt-12 sm:pb-20 sm:pt-16 xl:pb-24 xl:pt-20">
        {/* در RTL، end همان سمت چپِ بصری است: BB زیر هدر و کنار متن CTA می‌نشیند. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute end-4 top-10 z-10 hidden w-36 select-none lg:block xl:end-12 xl:top-12 xl:w-44 2xl:w-48"
        >
          <img
            src={heroArt.bb.src}
            alt=""
            width={heroArt.bb.width}
            height={heroArt.bb.height}
            draggable={false}
            className="block w-full object-contain"
          />
          <img
            src={heroArt.arrow.src}
            alt=""
            width={heroArt.arrow.width}
            height={heroArt.arrow.height}
            draggable={false}
            className="absolute -bottom-16 -start-10 w-28 object-contain xl:-bottom-20 xl:-start-12 xl:w-36 2xl:w-40"
          />
        </div>

        {/* دایره‌ی خطی زیر BB و نزدیک توضیح CTA می‌نشیند تا ترکیب دو سمت متعادل بماند. */}
        <img
          src={heroArt.circle.src}
          alt=""
          aria-hidden="true"
          width={heroArt.circle.width}
          height={heroArt.circle.height}
          draggable={false}
          className="pointer-events-none absolute end-4 top-[54%] hidden w-20 select-none object-contain lg:block xl:end-14 xl:w-24 2xl:top-[56%] 2xl:w-28"
        />

        {/* DD در سمت راستِ بصریِ CTA و هم‌راستا با دکمه‌ی شروع قرار می‌گیرد. */}
        <img
          src={heroArt.dd.src}
          alt=""
          aria-hidden="true"
          width={heroArt.dd.width}
          height={heroArt.dd.height}
          draggable={false}
          className="pointer-events-none absolute start-4 top-[43%] hidden w-40 select-none object-contain lg:block xl:start-12 xl:w-52 2xl:w-56"
        />

        {/* مهر چرخان بالای DD، روبه‌روی BB و در سمت راستِ عنوان CTA است. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute start-4 top-8 hidden lg:block xl:start-10 xl:top-10"
        >
          <SpinningSeal className="size-24 xl:size-28 2xl:size-32" />
        </div>

        <div className="relative mx-auto max-w-2xl text-center lg:max-w-[39rem] xl:max-w-2xl">
          <motion.h1
            initial={reduceMotion ? false : fade.hidden}
            animate="visible"
            variants={fade}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-balance text-[1.8rem] font-bold leading-[1.65] text-ink sm:text-5xl sm:leading-[1.5]"
          >
            فرزندتان را از{" "}
            <Emphasis underline="bold" className="mx-1">
              تماشاگر انیمیشن
            </Emphasis>{" "}
            به{" "}
            <Emphasis tone="accent" underline="bold" className="mx-1">
              سازنده‌ی آن
            </Emphasis>{" "}
            تبدیل کنید
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : fade.hidden}
            animate="visible"
            variants={fade}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-md text-sm leading-8 text-muted sm:text-[15px]"
          >
            دوره‌های پروژه‌محور AI ما برای کودکان ۷ تا ۱۲ سال طراحی شده تا با تولید
            ویدیو، صداگذاری و قصه‌گویی، اولین انیمیشن و درآمد خودشان را بسازند.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : fade.hidden}
            animate="visible"
            variants={fade}
            transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
            className="mt-8 flex justify-center"
          >
            <ButtonLink to="/courses" size="lg" arrow className="px-7">
              همین حالا اقدام کنید
            </ButtonLink>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
