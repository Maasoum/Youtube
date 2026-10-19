import { CheckCircle2, Quote, Sparkles } from "lucide-react";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import {
  ConcentricCircles,
  DotGrid,
  StarBurst,
} from "@/components/ui/Decorations";

const benefits = [
  "پیگیری وضعیت سفارش و لایسنس",
  "دسترسی دائمی به کد دوره‌ها",
  "دریافت ایمیل تحویل لایسنس",
];

export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden rounded-[2.5rem] bg-primary p-7 text-white lg:flex lg:flex-col">
      <DotGrid className="absolute -end-6 -top-6 h-32 w-44 opacity-20" />
      <ConcentricCircles className="absolute -start-28 -bottom-28 size-[24rem] text-white/15" />
      <StarBurst className="absolute end-6 top-6 size-16 rotate-12 text-accent/80" />

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-accent">
          <Sparkles className="size-3.5" aria-hidden="true" />
          حساب والدین
        </span>
        <h2 className="mt-4 text-balance text-2xl font-bold leading-[1.5] text-white">
          مسیر یادگیری، از همین‌جا روشن می‌شود.
        </h2>
        <p className="mt-3 text-sm leading-8 text-white/65">
          با یک حساب، همه‌ی سفارش‌ها، لایسنس‌ها و راهنمای والدین را در یک
          داشبورد ساده دارید.
        </p>
      </div>

      <div className="relative my-6 overflow-hidden rounded-3xl border-[5px] border-white/15">
        <PlaceholderArt imageKey="auth" className="aspect-[4/3] w-full" />
      </div>

      <ul className="relative space-y-3">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2.5 text-xs text-white/80">
            <CheckCircle2 className="size-4 shrink-0 text-accent" aria-hidden="true" />
            {benefit}
          </li>
        ))}
      </ul>

      <blockquote className="relative mt-auto flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 pt-4">
        <Quote className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="m-0 text-[11px] leading-7 text-white/65">
          «هر کودک کنجکاو، یک مسیر روشن برای شروع دارد. ما فقط مسیر را
          هموار می‌کنیم.»
        </p>
      </blockquote>
    </aside>
  );
}
