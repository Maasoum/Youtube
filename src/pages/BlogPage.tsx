import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Sparkles,
} from "lucide-react";
import { brand } from "@/config/brand";
import { useBlogPosts } from "@/hooks/useHomeContent";
import { formatDate, formatNumber } from "@/lib/format";
import { PageIntro } from "@/components/ui/PageIntro";
import { Emphasis } from "@/components/ui/Emphasis";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { Reveal } from "@/components/ui/Reveal";
import { ScallopStar } from "@/components/ui/Decorations";
import { cn } from "@/lib/cn";

export function BlogPage() {
  const { items: posts, loading, error, reload } = useBlogPosts();
  const [category, setCategory] = useState("همه");

  useEffect(() => {
    document.title = `وبلاگ | ${brand.nameFa}`;
  }, []);

  const categories = useMemo(
    () => ["همه", ...Array.from(new Set(posts.map((post) => post.category)))],
    [posts],
  );

  const visiblePosts = useMemo(
    () =>
      category === "همه"
        ? posts
        : posts.filter((post) => post.category === category),
    [posts, category],
  );

  return (
    <>
      <PageIntro
        eyebrow="وبلاگ مسیرهای روشن"
        title={
          <>
            خواندنی‌های کوتاه برای والدین{" "}
            <Emphasis>کنجکاو</Emphasis>
          </>
        }
        description="از گفت‌وگو با کودک درباره‌ی هوش مصنوعی تا بازی‌های بدون صفحه‌نمایش و چک‌لیست امنیت دیجیتال؛ نوشته‌هایی ساده و کاربردی برای خانه."
      >
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                category === item
                  ? "border-primary bg-primary text-white"
                  : "border-primary/10 bg-white text-primary hover:bg-primary-soft/20",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </PageIntro>

      <section className="relative overflow-hidden py-12 sm:py-16">
        <ScallopStar className="absolute -start-10 top-24 hidden size-28 -rotate-12 text-accent/25 md:block" />
        <div className="container-page relative">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="h-[26rem] animate-pulse rounded-3xl bg-surface-soft"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50 px-6 py-12 text-center">
              <AlertCircle className="size-9 text-red-500" aria-hidden="true" />
              <p className="text-sm font-bold text-red-800">{error}</p>
              <Button variant="secondary" size="sm" onClick={reload}>
                تلاش دوباره
              </Button>
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-3xl bg-surface-soft p-10 text-center">
              <p className="text-sm font-bold text-ink">
                در این دسته فعلاً مقاله‌ای نداریم.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setCategory("همه")}
              >
                نمایش همه‌ی مقاله‌ها
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visiblePosts.map((post, index) => (
                <Reveal key={post.id} delay={index * 0.07} className="h-full">
                  <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft transition duration-300 motion-safe:hover:-translate-y-1.5 hover:shadow-pop">
                    <Link
                      to={`/blog/${post.slug}`}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="relative block aspect-[16/10] overflow-hidden"
                    >
                      <PlaceholderArt
                        imageKey={post.art}
                        className="h-full w-full transition duration-500 motion-safe:group-hover:scale-[1.04]"
                      />
                      <span className="absolute start-4 top-4">
                        <Chip tone="white" className="backdrop-blur">
                          {post.category}
                        </Chip>
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          {formatDate(post.publishedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          {formatNumber(post.readMinutes)} دقیقه
                        </span>
                      </div>
                      <h2 className="mt-4 text-lg font-bold leading-8 text-ink">
                        <Link
                          to={`/blog/${post.slug}`}
                          className="transition hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                        >
                          {post.title}
                        </Link>
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">
                        {post.excerpt}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                        <span className="text-[11px] font-bold text-muted">
                          {post.author}
                        </span>
                        <Link
                          to={`/blog/${post.slug}`}
                          className="inline-flex items-center gap-2 text-xs font-bold text-primary transition hover:gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                        >
                          ادامه‌ی مطلب
                          <span
                            aria-hidden="true"
                            className="inline-flex size-7 items-center justify-center rounded-full bg-primary-soft/40"
                          >
                            <ArrowLeft className="size-3.5" />
                          </span>
                        </Link>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}

          <div className="relative mt-12 overflow-hidden rounded-[2.5rem] bg-primary p-6 text-white sm:p-10">
            <Sparkles className="size-6 text-accent" aria-hidden="true" />
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold text-white">
                  یادگیری را از خواندن به ساختن ببرید
                </h2>
                <p className="mt-2 text-sm leading-8 text-white/70">
                  دوره‌های مسیرهای روشن با بازی، داستان و پروژه‌های کوچک طراحی
                  شده‌اند تا کودک شما هوش مصنوعی را امن و خلاقانه تجربه کند.
                </p>
              </div>
              <ButtonLink to="/courses" variant="onDark" arrow>
                دیدن دوره‌ها
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
