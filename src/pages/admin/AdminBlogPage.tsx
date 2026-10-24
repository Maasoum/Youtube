import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  FileText,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { adminApi, getErrorMessage, type BlogPost } from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { contentStatusLabels } from "@/lib/labels";
import { formatDate, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

type PostFilter = "all" | "published" | "draft";

export function AdminBlogPage() {
  const { notify } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PostFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await adminApi.adminListPosts());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusOf = (post: BlogPost): "published" | "draft" =>
    post.status === "draft" ? "draft" : "published";

  const filtered = useMemo(
    () =>
      posts.filter((post) =>
        filter === "all" ? true : statusOf(post) === filter,
      ),
    [posts, filter],
  );

  const draftCount = posts.filter((post) => statusOf(post) === "draft").length;

  const handleToggle = async (post: BlogPost) => {
    setBusyId(post.id);
    try {
      const updated = await adminApi.setPostStatus(
        post.id,
        statusOf(post) === "published" ? "draft" : "published",
      );
      setPosts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify(
        updated.status === "published"
          ? "مقاله منتشر شد و در وبلاگ عمومی دیده می‌شود."
          : "مقاله به پیش‌نویس منتقل شد و از وبلاگ عمومی حذف شد.",
        "success",
      );
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deletePost(deleteTarget.id);
      setPosts((current) => current.filter((item) => item.id !== deleteTarget.id));
      notify("مقاله حذف شد.", "success");
      setDeleteTarget(null);
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<BlogPost>[] = [
    {
      id: "title",
      header: "مقاله",
      cell: (post) => (
        <div className="min-w-52">
          <Link
            to={`/admin/blog/${post.id}`}
            className="font-bold text-primary underline decoration-primary/20 underline-offset-4"
          >
            {post.title}
          </Link>
          <p className="mt-0.5 font-mono text-[10px] text-muted" dir="ltr">
            /blog/{post.slug}
          </p>
        </div>
      ),
    },
    {
      id: "category",
      header: "دسته و نویسنده",
      cell: (post) => (
        <div className="text-[10px] leading-5 text-muted">
          <p className="font-bold text-ink">{post.category}</p>
          <p>{post.author}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (post) => (
        <span
          className={cn(
            "chip text-[10px]",
            statusOf(post) === "published"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-surface-soft text-muted",
          )}
        >
          {statusOf(post) === "published" ? (
            <Eye className="size-3.5" aria-hidden="true" />
          ) : (
            <EyeOff className="size-3.5" aria-hidden="true" />
          )}
          {contentStatusLabels[statusOf(post)]}
        </span>
      ),
    },
    {
      id: "updated",
      header: "آخرین ویرایش",
      cell: (post) => (
        <span className="text-[10px] text-muted">
          {formatDate(post.updatedAt ?? post.publishedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "اقدام‌ها",
      headerClassName: "text-end",
      cellClassName: "text-end",
      cell: (post) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Link
            to={`/admin/blog/${post.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-2.5 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary-soft/20"
          >
            <PencilLine className="size-3.5" aria-hidden="true" />
            ویرایش
          </Link>
          <button
            type="button"
            onClick={() => void handleToggle(post)}
            disabled={busyId === post.id}
            className="inline-flex items-center gap-1 rounded-full border border-black/5 px-2.5 py-1.5 text-[10px] font-bold text-muted transition hover:text-primary disabled:opacity-40"
          >
            {statusOf(post) === "published" ? (
              <EyeOff className="size-3.5" aria-hidden="true" />
            ) : (
              <Eye className="size-3.5" aria-hidden="true" />
            )}
            {statusOf(post) === "published" ? "پیش‌نویس" : "انتشار"}
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(post)}
            className="inline-flex items-center gap-1 rounded-full border border-red-100 px-2.5 py-1.5 text-[10px] font-bold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            حذف
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="وبلاگ"
        description="مقاله‌ها را با ویرایشگر Markdown فارسی بنویسید، پیش‌نمایش بگیرید و به‌صورت پیش‌نویس یا منتشرشده ذخیره کنید."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-bold text-muted transition hover:text-primary"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              به‌روزرسانی
            </button>
            <ButtonLink to="/admin/blog/new" size="sm" icon={Plus}>
              مقاله‌ی تازه
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all", label: "همه", count: posts.length },
            { id: "published", label: "منتشرشده", count: posts.length - draftCount },
            { id: "draft", label: "پیش‌نویس", count: draftCount },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              filter === item.id
                ? "border-primary bg-primary text-white"
                : "border-black/5 bg-white text-muted hover:text-primary",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] tabular-nums",
                filter === item.id ? "bg-white/20" : "bg-surface-soft",
              )}
            >
              {toPersianDigits(item.count)}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        caption="مقاله‌های وبلاگ"
        rows={filtered}
        columns={columns}
        getRowId={(post) => post.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        searchText={(post) =>
          `${post.title} ${post.slug} ${post.category} ${post.author} ${post.excerpt}`
        }
        searchPlaceholder="جست‌وجو در عنوان، نشانی یا نویسنده…"
        emptyTitle="مقاله‌ای پیدا نشد"
        emptyDescription="با تغییر فیلتر وضعیت یا عبارت جست‌وجو دوباره تلاش کنید."
        emptyIcon={FileText}
        emptyAction={
          <ButtonLink to="/admin/blog/new" size="sm" icon={Plus}>
            نوشتن اولین مقاله
          </ButtonLink>
        }
        pageSize={10}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف مقاله"
        description="این اقدام قابل بازگشت نیست و مقاله از وبلاگ عمومی هم حذف می‌شود."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={() => void handleDelete()}
            >
              حذف مقاله
            </Button>
          </>
        }
      >
        <p className="rounded-2xl bg-surface-soft/60 p-3 text-xs leading-7 text-ink">
          «{deleteTarget?.title}»
        </p>
      </Modal>
    </div>
  );
}
