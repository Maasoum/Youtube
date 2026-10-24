import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { BlogPost } from "@/api";
import { useBlogPosts } from "@/hooks/useHomeContent";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { Reveal } from "@/components/ui/Reveal";
import { formatDate, formatNumber } from "@/lib/format";

export function BlogSection() {
  const { items: posts, loading, error } = useBlogPosts();

  return (
    <section
      className="bg-white py-16 sm:py-24"
      aria-labelledby="blog-title"
    >
      <Container>
        <Reveal>
          <SectionTitle
            id="blog-title"
            align="start"
            eyebrow="خواندنی‌های کوتاه برای والدین"
            title="وبلاگ ما را بخوانید"
            highlight="ما"
            description="نوشته‌های ساده و کاربردی درباره‌ی یادگیری، امنیت و گفت‌وگو با کودکان در دنیای هوش مصنوعی."
            action={
              <ButtonLink
                to="/blog"
                variant="secondary"
                size="sm"
                arrow
                className="border-primary/25 text-ink hover:border-primary/45 hover:bg-primary-soft/10"
              >
                همه‌ی مقاله‌ها
              </ButtonLink>
            }
          />
        </Reveal>

        {loading ? (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="h-80 animate-pulse rounded-[1.75rem] bg-surface-soft"
              />
            ))}
          </div>
        ) : error ? (
          <p className="mt-10 rounded-[1.75rem] bg-surface-soft p-8 text-center text-sm text-muted">
            {error}
          </p>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {posts.slice(0, 3).map((post, index) => (
              <Reveal key={post.id} delay={index * 0.08} className="h-full">
                <BlogCard post={post} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  const href = `/blog/${post.slug}`;

  return (
    <article className="group flex h-full flex-col rounded-[1.75rem] bg-[#F8F6FF] p-2.5">
      <Link
        to={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[16/10] overflow-hidden rounded-[1.35rem]"
      >
        <PlaceholderArt
          imageKey={post.art}
          className="h-full w-full transition duration-500 motion-safe:group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
        <p className="text-[11px] text-muted">
          {post.category} · {formatDate(post.publishedAt)} ·{" "}
          {formatNumber(post.readMinutes)} دقیقه
        </p>

        <h3 className="mt-2 text-lg font-bold leading-8 text-ink">
          <Link
            to={href}
            className="transition hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            {post.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">
          {post.excerpt}
        </p>

        <Link
          to={href}
          className="mt-auto w-fit pt-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary py-1.5 pe-1.5 ps-4 text-xs font-bold text-white transition group-hover:bg-primary-dark">
            ادامه‌ی مطلب
            <span
              aria-hidden="true"
              className="inline-flex size-6 items-center justify-center rounded-full bg-white text-primary"
            >
              <ArrowLeft className="size-3" />
            </span>
          </span>
        </Link>
      </div>
    </article>
  );
}
