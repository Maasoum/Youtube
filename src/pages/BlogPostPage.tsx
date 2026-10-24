import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  UserRound,
} from "lucide-react";
import { brand } from "@/config/brand";
import { getErrorMessage, listPosts, type BlogPost } from "@/api";
import { parseMarkdown } from "@/lib/markdown";
import { MarkdownPreview } from "@/components/admin/MarkdownEditor";
import { formatDate, formatNumber } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { PageLoader } from "@/components/ui/Loading";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ConcentricCircles, DotGrid } from "@/components/ui/Decorations";

export function BlogPostPage() {
  const { slug = "" } = useParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listPosts()
      .then((data) => {
        if (active) setPosts(data);
      })
      .catch((reason: unknown) => {
        if (active) setError(getErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [version]);

  const post = posts.find((item) => item.slug === slug);
  const body = post?.body?.trim() ?? "";
  const bodyBlocks = useMemo(() => parseMarkdown(body), [body]);
  const markdownHeadings = useMemo(
    () =>
      bodyBlocks.flatMap((block, index) =>
        block.kind === "heading"
          ? [{ id: `body-${index}`, text: block.text }]
          : [],
      ),
    [bodyBlocks],
  );

  useEffect(() => {
    if (post) document.title = `${post.title} | ${brand.nameFa}`;
    else if (!loading && !error) document.title = `مقاله پیدا نشد | ${brand.nameFa}`;
  }, [post, loading, error]);

  if (loading) return <PageLoader label="در حال دریافت مقاله…" />;

  if (error) {
    return (
      <section className="container-page py-16">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-3xl border border-red-100 bg-red-50 px-6 py-12 text-center">
          <AlertCircle className="size-9 text-red-500" aria-hidden="true" />
          <p className="text-sm font-bold text-red-800">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setVersion((current) => current + 1)}
          >
            تلاش دوباره
          </Button>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="container-page py-16">
        <div className="mx-auto max-w-xl rounded-[2.5rem] bg-surface-soft px-6 py-14 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-white text-primary shadow-sm">
            <AlertCircle className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-bold text-ink">
            این مقاله پیدا نشد
          </h1>
          <p className="mt-3 text-sm leading-8 text-muted">
            ممکن است نشانی تغییر کرده باشد. همه‌ی نوشته‌های ما در وبلاگ در دسترس
            هستند.
          </p>
          <ButtonLink to="/blog" variant="primary" className="mt-7" arrow>
            بازگشت به وبلاگ
          </ButtonLink>
        </div>
      </section>
    );
  }

  const related = posts
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);

  return (
    <>
      <article>
        <header className="relative overflow-hidden border-b border-black/5 bg-surface-soft/70">
          <DotGrid className="absolute -start-6 top-10 h-32 w-48 opacity-50" />
          <ConcentricCircles className="absolute -end-28 -top-28 size-[22rem] text-primary/10 sm:size-[26rem]" />
          <div className="container-page relative py-9 sm:py-14">
            <Breadcrumbs
              items={[
                { label: "وبلاگ", to: "/blog" },
                { label: post.category },
              ]}
            />
            <div className="max-w-3xl">
              <Chip tone="white">{post.category}</Chip>
              <h1 className="mt-5 text-balance text-3xl font-bold leading-[1.5] text-ink sm:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-sm leading-8 text-muted sm:text-base">
                {post.excerpt}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted">
                <span className="inline-flex items-center gap-2 font-bold text-ink">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-soft/50 text-primary">
                    <UserRound className="size-4" aria-hidden="true" />
                  </span>
                  {post.author}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {formatDate(post.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {formatNumber(post.readMinutes)} دقیقه مطالعه
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="container-page py-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <div className="overflow-hidden rounded-[2rem] border border-black/5 shadow-soft">
                <PlaceholderArt
                  imageKey={post.art}
                  className="aspect-[16/9] w-full"
                />
              </div>

              <div className="mt-9 grid gap-8">
                {body ? (
                  <MarkdownPreview
                    value={body}
                    headingIdPrefix="body"
                    className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-8 [&_p]:text-[0.95rem] [&_p]:leading-9 [&_h2]:mt-0"
                  />
                ) : (
                  post.sections.map((section, index) => (
                  <Reveal key={section.heading} delay={index * 0.05}>
                    <section
                      aria-labelledby={`section-${index}`}
                      className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-8"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/30 text-xs font-bold text-ink"
                        >
                          {formatNumber(index + 1)}
                        </span>
                        <h2
                          id={`section-${index}`}
                          className="text-lg font-bold leading-8 text-ink sm:text-xl"
                        >
                          {section.heading}
                        </h2>
                      </div>
                      <div className="mt-4 grid gap-4 ps-11">
                        {section.paragraphs.map((paragraph) => (
                          <p
                            key={paragraph.slice(0, 24)}
                            className="text-sm leading-8 text-muted"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </section>
                  </Reveal>
                  ))
                )}
              </div>

              <div className="mt-9 flex flex-col gap-4 rounded-3xl bg-surface-soft p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {post.author.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-xs text-muted">نویسنده</p>
                    <p className="text-sm font-bold text-ink">{post.author}</p>
                  </div>
                </div>
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-xs font-bold text-primary transition hover:gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  همه‌ی مقاله‌های وبلاگ
                </Link>
              </div>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl bg-primary p-6 text-white">
                <h2 className="text-lg font-bold text-white">
                  مسیر یادگیری را شروع کنید
                </h2>
                <p className="mt-2 text-xs leading-7 text-white/70">
                  دوره‌های ما با لایسنس دائمی و تک‌کاربره ارائه می‌شوند و پشتیبانی
                  والدین در کنارشان است.
                </p>
                <ButtonLink
                  to="/courses"
                  variant="onDark"
                  size="sm"
                  className="mt-5 w-full"
                  arrow
                >
                  دیدن دوره‌ها
                </ButtonLink>
              </div>

              <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-muted">در این مقاله</p>
                <ul className="mt-3 space-y-2.5 text-xs leading-6">
                  {body
                    ? markdownHeadings.map((heading) => (
                        <li key={heading.id}>
                          <a
                            href={`#${heading.id}`}
                            className="text-ink transition hover:text-primary"
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))
                    : post.sections.map((section, index) => (
                        <li key={`${section.heading}-${index}`}>
                          <a
                            href={`#section-${index}`}
                            className="text-ink transition hover:text-primary"
                          >
                            {section.heading}
                          </a>
                        </li>
                      ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="border-t border-black/5 bg-surface-soft/50 py-12 sm:py-16">
          <div className="container-page">
            <SectionTitle
              eyebrow="ادامه‌ی خواندن"
              title="مقاله‌های مرتبط"
              description="نوشته‌های کوتاه دیگر برای ساختن خانه‌ای کنجکاو و امن."
            />
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft"
                >
                  <Link
                    to={`/blog/${item.slug}`}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="block aspect-[16/10]"
                  >
                    <PlaceholderArt imageKey={item.art} className="h-full w-full" />
                  </Link>
                  <div className="p-5">
                    <Chip tone="lavender">{item.category}</Chip>
                    <h3 className="mt-3 text-base font-bold leading-7 text-ink">
                      <Link
                        to={`/blog/${item.slug}`}
                        className="transition hover:text-primary"
                      >
                        {item.title}
                      </Link>
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
