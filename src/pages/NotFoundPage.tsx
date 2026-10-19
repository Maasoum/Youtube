import { useEffect } from "react";
import { Compass, Home } from "lucide-react";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { StarBurst } from "@/components/ui/Decorations";

export function NotFoundPage() {
  useEffect(() => {
    document.title = `صفحه پیدا نشد | ${brand.nameFa}`;
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-soft/80 to-white">
      <StarBurst className="absolute -start-8 top-16 size-28 rotate-12 text-accent/70" />
      <StarBurst className="absolute -end-12 bottom-0 size-40 -rotate-12 text-primary-soft/40" />
      <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <div className="relative mx-auto w-full max-w-md">
          <PlaceholderArt
            imageKey="notFound"
            className="aspect-[16/10] w-full rounded-[2.5rem] border-[7px] border-white shadow-pop"
          />
        </div>
        <p className="mt-8 text-sm font-bold text-primary">خطای ۴۰۴</p>
        <h1 className="mt-2 max-w-xl text-balance text-3xl font-bold leading-[1.5] text-ink sm:text-4xl">
          این صفحه در مسیر ما پیدا نشد
        </h1>
        <p className="mt-3 max-w-md text-sm leading-8 text-muted">
          شاید نشانی تغییر کرده یا لینک قدیمی باشد. می‌توانید به خانه برگردید
          یا فهرست دوره‌ها را ببینید و مسیر مناسب را پیدا کنید.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/" icon={Home}>
            بازگشت به خانه
          </ButtonLink>
          <ButtonLink to="/courses" variant="secondary" icon={Compass}>
            دیدن دوره‌ها
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
