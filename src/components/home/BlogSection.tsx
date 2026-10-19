import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import type { BlogPost } from "@/api";
import { useBlogPosts } from "@/hooks/useHomeContent";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { Reveal } from "@/components/ui/Reveal";
import { Chip } from "@/components/ui/Chip";
import { ScallopStar } from "@/components/ui/Decorations";
import { formatDate, formatNumber } from "@/lib/format";

export function BlogSection() {
  const { items: posts, loading, error } = useBlogPosts();

  return (
    <section
      className="relative overflow-hidden bg-white py-16 sm:py-24"
      aria-labelledby="blog-title"
    >
      <ScallopStar className="absolute -start-12 top-24 hidden size-32 -rotate-12 text-accent/25 md:block" />
      <Container className="relative">
        <Reveal>
          <SectionTitle
            id="blog-title"
            eyebrow="خواندنی‌های کوتاه برای والدین"
            title="وبلاگ ما را بخوانید"
            highlight="ما"
            description="نوشته‌های ساده و کاربردی درباره‌ی یادگیری، امنیت و گفت‌وگو با کودکان در دنیای هوش مصنوعی؛ بدون ترساندن و بدون اصطلاح‌بازی."
          />
        </Reveal>

        {loading ? (
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="h-96 animate-pulse rounded-3xl bg-surface-soft"
              />
            ))}
          </div>
        ) : error ? (
          <p className="mt-10 rounded-3xl bg-surface-soft p-8 text-center text-sm text-muted">
            {error}
          </p>
        ) : (
          <>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {posts.slice(0, 3).map((post, index) => (
                <Reveal key={post.id} delay={index * 0.08} className="h-full">
                  <BlogCard post={post} />
                </Reveal>
              ))}
            </div>
            <div className="mt-9 flex justify-center">
              <ButtonLink to="/blog" variant="secondary" arrow>
                همه‌ی مقاله‌ها
              </ButtonLink>
            </div>
          </>
        )}
      </Container>
    </section>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  return (
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
            {formatNumber(post.readMinutes)} دقیقه مطالعه
          </span>
        </div>

        <h3 className="mt-4 text-lg font-bold leading-8 text-ink">
          <Link
            to={`/blog/${post.slug}`}
            className="transition hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">
          {post.excerpt}
        </p>

        <Link
          to={`/blog/${post.slug}`}
          className="mt-auto inline-flex items-center gap-2 pt-6 text-xs font-bold text-primary transition hover:gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
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
    </article>
  );
}
