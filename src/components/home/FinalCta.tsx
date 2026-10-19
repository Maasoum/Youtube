import { Check, Sparkles } from "lucide-react";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/Button";
import { Emphasis } from "@/components/ui/Emphasis";
import {
  ConcentricCircles,
  DotGrid,
  StarBurst,
} from "@/components/ui/Decorations";
import { Reveal } from "@/components/ui/Reveal";

const notes = ["لایسنس دائمی", "پشتیبانی والدین", "ضمانت ۷ روزه"];

export function FinalCta() {
  return (
    <section className="pb-16 pt-4 sm:pb-24" aria-label="شروع مسیر">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-12 text-white sm:px-12 sm:py-16">
            <DotGrid className="absolute -start-6 -top-6 h-40 w-56 opacity-20" />
            <ConcentricCircles className="absolute -end-24 -bottom-32 size-[28rem] text-white/15" />
            <StarBurst className="absolute end-[12%] top-8 hidden size-24 rotate-12 text-accent/80 sm:block" />
            <StarBurst className="absolute start-[8%] bottom-6 hidden size-14 -rotate-12 text-white/25 sm:block" />

            <div className="relative mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-accent">
                <Sparkles className="size-4" aria-hidden="true" />
                قدم بعدی، مال شماست
              </span>
              <h2 className="mt-5 text-balance text-3xl font-bold leading-[1.5] text-white sm:text-4xl">
                اولین قدم را امروز بردارید؛ کودک شما فردا{" "}
                <Emphasis tone="onDark">سازنده</Emphasis> است.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-white/70">
                دوره‌ای را انتخاب کنید که با سن و کنجکاوی کودک‌تان جور است. ما
                تا رسیدن لایسنس و شروع مسیر کنارتان می‌مانیم.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink to="/courses" variant="onDark" size="lg" arrow>
                  انتخاب دوره
                </ButtonLink>
                <ButtonLink
                  to="/how-it-works"
                  variant="outlineLight"
                  size="lg"
                >
                  راهنمای خرید
                </ButtonLink>
              </div>

              <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2">
                {notes.map((note) => (
                  <li
                    key={note}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-white/75"
                  >
                    <Check className="size-3.5 text-accent" aria-hidden="true" />
                    {note}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[11px] text-white/40">
                همراه {brand.nameFa} — مسیر یادگیری، شفاف و امن
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
