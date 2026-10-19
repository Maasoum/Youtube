import { Quote, Star } from "lucide-react";
import type { Testimonial } from "@/api";
import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/format";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StarBurst } from "@/components/ui/Decorations";

interface TestimonialsProps {
  testimonials: Testimonial[];
  loading: boolean;
}

const avatarStyles = [
  "bg-primary-soft text-primary-dark",
  "bg-accent text-ink",
  "bg-[#DCEBFF] text-[#2150AE]",
];

export function Testimonials({ testimonials, loading }: TestimonialsProps) {
  return (
    <section className="relative overflow-hidden bg-surface-soft/60 py-16 sm:py-24" aria-label="تجربه‌ی خانواده‌ها">
      <StarBurst className="absolute -start-8 top-16 size-28 rotate-12 text-accent/60" />
      <StarBurst className="absolute -end-12 bottom-10 size-40 -rotate-12 text-white" />
      <div className="container-page relative">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="از زبان خانواده‌ها"
            title="روایت‌های کوچک، تغییرهای بزرگ"
            description="تجربه‌ی چند خانواده‌ای که مسیر یادگیری هوش مصنوعی را با ما شروع کرده‌اند."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="card-surface h-64 animate-pulse bg-white/70" />
              ))
            : testimonials.map((testimonial, index) => {
                const featured = index === 1;
                return (
                  <Reveal key={testimonial.id} delay={index * 0.1} className="h-full">
                    <figure
                      className={cn(
                        "flex h-full flex-col rounded-3xl border p-6 sm:p-7",
                        featured
                          ? "border-primary bg-primary text-white shadow-pop"
                          : "border-black/5 bg-white text-ink shadow-soft",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex size-10 items-center justify-center rounded-xl",
                            featured ? "bg-white/15 text-accent" : "bg-primary-soft/30 text-primary",
                          )}
                          aria-hidden="true"
                        >
                          <Quote className="size-5" />
                        </span>
                        <div
                          className="flex items-center gap-0.5"
                          aria-label={`امتیاز ${toPersianDigits(testimonial.rating)} از ۵`}
                        >
                          {Array.from({ length: testimonial.rating }, (_, starIndex) => (
                            <Star
                              key={starIndex}
                              className="size-3.5 fill-accent text-accent"
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>

                      <blockquote
                        className={cn(
                          "mt-5 flex-1 text-sm leading-8",
                          featured ? "text-white/85" : "text-muted",
                        )}
                      >
                        «{testimonial.quote}»
                      </blockquote>

                      <figcaption
                        className={cn(
                          "mt-6 flex items-center gap-3 border-t pt-5",
                          featured ? "border-white/15" : "border-black/5",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-10 items-center justify-center rounded-full text-sm font-bold",
                            featured ? "bg-white text-primary" : avatarStyles[index % avatarStyles.length],
                          )}
                          aria-hidden="true"
                        >
                          {testimonial.parentName.trim().charAt(0)}
                        </span>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-bold",
                              featured ? "text-white" : "text-ink",
                            )}
                          >
                            {testimonial.parentName}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 text-[11px]",
                              featured ? "text-white/50" : "text-muted",
                            )}
                          >
                            {testimonial.childInfo} — {testimonial.city}
                          </p>
                        </div>
                      </figcaption>
                    </figure>
                  </Reveal>
                );
              })}
        </div>
      </div>
    </section>
  );
}
