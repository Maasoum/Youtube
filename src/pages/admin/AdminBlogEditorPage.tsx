import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  Eye,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type BlogPost,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { FormAlert } from "@/components/auth/FormAlert";
import { zodResolver } from "@/lib/zodResolver";
import {
  blogPostSchema,
  type BlogPostFormValues,
} from "@/lib/validation";
import { slugifyPersian } from "@/lib/slug";
import { formatDate } from "@/lib/format";

const artOptions = [
  { value: "foundations", label: "هوش مصنوعی مقدماتی" },
  { value: "creative", label: "خلاقیت و هنر" },
  { value: "python", label: "کدنویسی پایتون" },
  { value: "safety", label: "شهروند دیجیتال" },
  { value: "hero", label: "تصویر هیرو" },
  { value: "about", label: "درباره‌ی ما" },
] as const;

const emptyPost: BlogPostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  category: "راهنمای والدین",
  author: "",
  readMinutes: 6,
  art: "foundations",
  body: "",
  status: "draft",
};

export function AdminBlogEditorPage() {
  const { postId } = useParams();
  const isNew = !postId;
  const navigate = useNavigate();
  const { notify } = useToast();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: emptyPost,
  });

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setLoadError(null);
    try {
      const posts = await adminApi.adminListPosts();
      const found = posts.find((item) => item.id === postId);
      if (!found) {
        setLoadError("مقاله پیدا نشد.");
        return;
      }
      setPost(found);
      form.reset({
        title: found.title,
        slug: found.slug,
        excerpt: found.excerpt,
        category: found.category,
        author: found.author,
        readMinutes: found.readMinutes,
        art: (found.art as BlogPostFormValues["art"]) ?? "foundations",
        body:
          found.body ??
          found.sections
            .map(
              (section) =>
                `## ${section.heading}\n\n${section.paragraphs.join("\n\n")}`,
            )
            .join("\n\n"),
        status: found.status === "draft" ? "draft" : "published",
      });
    } catch (caught) {
      setLoadError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [form, isNew, postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = form.watch("title");
  const slug = form.watch("slug");
  const bodyValue = form.watch("body");

  useEffect(() => {
    if (slugTouched) return;
    form.setValue("slug", slugifyPersian(title), { shouldValidate: false });
  }, [form, title, slugTouched]);

  const save = (status: "draft" | "published") => {
    void form.handleSubmit(async (values) => {
      try {
        const input = { ...values, status };
        if (isNew) {
          await adminApi.createPost(input);
        } else if (post) {
          await adminApi.updatePost(post.id, input);
        }
        notify(
          status === "published"
            ? "مقاله ذخیره و منتشر شد."
            : "مقاله به‌صورت پیش‌نویس ذخیره شد.",
          "success",
        );
        navigate("/admin/blog");
      } catch (caught) {
        form.setError("root", { message: getErrorMessage(caught) });
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted" role="status">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          در حال دریافت مقاله…
        </div>
      </div>
    );
  }

  if (loadError || (!isNew && !post)) {
    return (
      <div>
        <PanelPageHeader
          title="مقاله پیدا نشد"
          backTo={{ to: "/admin/blog", label: "بازگشت به وبلاگ" }}
        />
        <PanelCard>
          <p className="py-8 text-center text-sm font-bold text-red-700">
            {loadError ?? "مقاله پیدا نشد."}
          </p>
        </PanelCard>
      </div>
    );
  }

  return (
    <div>
      <PanelPageHeader
        eyebrow={isNew ? "مقاله‌ی تازه" : "ویرایش مقاله"}
        title={isNew ? "نوشتن مقاله" : post?.title ?? "ویرایش مقاله"}
        description="هر تیتر سطح دو (##) یک بخش از مقاله‌ی عمومی را می‌سازد. پیش‌نمایش همیشه با همان قالب سایت نمایش داده می‌شود."
        backTo={{ to: "/admin/blog", label: "بازگشت به وبلاگ" }}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={Save}
              loading={form.formState.isSubmitting}
              onClick={() => save("draft")}
            >
              ذخیره‌ی پیش‌نویس
            </Button>
            <Button
              size="sm"
              icon={Eye}
              loading={form.formState.isSubmitting}
              onClick={() => save("published")}
            >
              ذخیره و انتشار
            </Button>
          </>
        }
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save("published");
        }}
        noValidate
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="space-y-4">
          {form.formState.errors.root?.message ? (
            <FormAlert message={form.formState.errors.root.message} />
          ) : null}

          <PanelCard>
            <div className="grid gap-4">
              <InputField
                label="عنوان مقاله"
                required
                placeholder="مثلاً چطور با کودک درباره‌ی هوش مصنوعی حرف بزنیم؟"
                error={form.formState.errors.title?.message}
                {...form.register("title")}
              />
              <div>
                <label htmlFor="post-excerpt" className="label-base">
                  خلاصه‌ی مقاله
                  <span className="ms-1 text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="post-excerpt"
                  rows={3}
                  placeholder="خلاصه در دو یا سه جمله؛ در کارت وبلاگ نمایش داده می‌شود."
                  className="input-base min-h-24"
                  aria-invalid={form.formState.errors.excerpt ? true : undefined}
                  {...form.register("excerpt")}
                />
                {form.formState.errors.excerpt?.message ? (
                  <p role="alert" className="mt-2 text-xs font-bold text-red-600">
                    {form.formState.errors.excerpt.message}
                  </p>
                ) : null}
              </div>
            </div>
          </PanelCard>

          <PanelCard>
            <MarkdownEditor
              value={bodyValue}
              onChange={(value) =>
                form.setValue("body", value, {
                  shouldDirty: true,
                  shouldValidate: false,
                })
              }
              error={form.formState.errors.body?.message}
              hint="پشتیبانی از تیتر (##)، درشت (**متن**)، فهرست (-)، نقل‌قول (>) و کد (`متن`). ایتالیک عمداً پشتیبانی نمی‌شود."
            />
          </PanelCard>
        </div>

        <aside className="space-y-4">
          <PanelCard title="تنظیمات انتشار">
            <div className="grid gap-4">
              <div>
                <InputField
                  label="نشانی مقاله"
                  required
                  placeholder="how-to-talk-about-ai"
                  error={form.formState.errors.slug?.message}
                  hint={`/blog/${slug || "…"}`}
                  {...form.register("slug", {
                    onChange: () => setSlugTouched(true),
                  })}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSlugTouched(false);
                    form.setValue("slug", slugifyPersian(form.getValues("title")), {
                      shouldValidate: true,
                    });
                    setSlugTouched(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary underline decoration-primary/30 underline-offset-4"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  ساخت نشانی از عنوان
                </button>
              </div>

              <div>
                <label htmlFor="post-category" className="label-base">
                  دسته‌بندی
                  <span className="ms-1 text-red-500" aria-hidden="true">*</span>
                </label>
                <select
                  id="post-category"
                  className="input-base"
                  {...form.register("category")}
                >
                  <option value="راهنمای والدین">راهنمای والدین</option>
                  <option value="امنیت دیجیتال">امنیت دیجیتال</option>
                  <option value="بازی و یادگیری">بازی و یادگیری</option>
                  <option value="پشت صحنه">پشت صحنه</option>
                </select>
                {form.formState.errors.category?.message ? (
                  <p className="mt-2 text-xs font-bold text-red-600">
                    {form.formState.errors.category.message}
                  </p>
                ) : null}
              </div>

              <InputField
                label="نویسنده"
                required
                placeholder="نام نویسنده"
                error={form.formState.errors.author?.message}
                {...form.register("author")}
              />

              <InputField
                label="زمان مطالعه (دقیقه)"
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                error={form.formState.errors.readMinutes?.message}
                {...form.register("readMinutes")}
              />

              <div>
                <label htmlFor="post-art" className="label-base">
                  تصویر مقاله
                </label>
                <select id="post-art" className="input-base" {...form.register("art")}>
                  {artOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-surface-soft/60 p-3 text-[10px] leading-5 text-muted">
                <p className="flex items-center gap-1.5 font-bold text-ink">
                  <CalendarDays className="size-3.5 text-primary" aria-hidden="true" />
                  وضعیت فعلی:{" "}
                  {post?.status === "draft" ? "پیش‌نویس" : "منتشرشده"}
                </p>
                {post?.updatedAt ? (
                  <p className="mt-1">آخرین ویرایش: {formatDate(post.updatedAt)}</p>
                ) : null}
                {post && post.status !== "draft" ? (
                  <Link
                    to={`/blog/${post.slug}`}
                    className="mt-2 inline-flex items-center gap-1 font-bold text-primary"
                  >
                    <Eye className="size-3.5" aria-hidden="true" />
                    مشاهده در سایت
                  </Link>
                ) : null}
              </div>
            </div>
          </PanelCard>

          <div className="rounded-3xl border border-primary/10 bg-primary-soft/10 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <RefreshCw className="size-3.5" aria-hidden="true" />
              یادآوری انتشار
            </p>
            <p className="mt-2 text-[11px] leading-6 text-muted">
              «ذخیره‌ی پیش‌نویس» مقاله را از سایت عمومی پنهان نگه می‌دارد.
              «ذخیره و انتشار» تاریخ انتشار را به‌روز می‌کند و مقاله بلافاصله
              در وبلاگ دیده می‌شود.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
