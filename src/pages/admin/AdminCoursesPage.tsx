import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Eye,
  EyeOff,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { adminApi, getErrorMessage, type Course } from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LevelBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { formatDate, formatToman, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

type PublishFilter = "all" | "published" | "draft";

export function AdminCoursesPage() {
  const { notify } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PublishFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourses(await adminApi.listCourses());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      courses.filter((course) =>
        filter === "all"
          ? true
          : filter === "published"
            ? course.published
            : !course.published,
      ),
    [courses, filter],
  );

  const handleToggle = async (course: Course) => {
    setBusyId(course.id);
    try {
      const updated = await adminApi.toggleCoursePublish(course.id);
      setCourses((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify(
        updated.published
          ? "دوره منتشر شد."
          : "دوره از انتشار خارج شد و در سایت عمومی دیده نمی‌شود.",
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
      await adminApi.deleteCourse(deleteTarget.id);
      setCourses((current) =>
        current.filter((course) => course.id !== deleteTarget.id),
      );
      notify("دوره حذف شد.", "success");
      setDeleteTarget(null);
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<Course>[] = [
    {
      id: "title",
      header: "دوره",
      cell: (course) => (
        <div>
          <Link
            to={`/admin/courses/${course.id}`}
            className="font-bold text-primary underline decoration-primary/20 underline-offset-4"
          >
            {course.title}
          </Link>
          <p className="mt-0.5 font-mono text-[10px] text-muted" dir="ltr">
            {course.slug}
          </p>
        </div>
      ),
    },
    {
      id: "level",
      header: "سطح و سن",
      cell: (course) => (
        <div className="space-y-1">
          <LevelBadge level={course.level} />
          <p className="text-[10px] text-muted">
            {toPersianDigits(course.ageRange.min)} تا{" "}
            {toPersianDigits(course.ageRange.max)} سال
          </p>
        </div>
      ),
    },
    {
      id: "price",
      header: "قیمت",
      cell: (course) => (
        <div>
          <p className="font-bold tabular-nums text-ink">
            {formatToman(course.priceToman)}
          </p>
          {course.compareAtPriceToman ? (
            <p className="mt-0.5 text-[10px] text-muted line-through">
              {formatToman(course.compareAtPriceToman)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "provider",
      header: "ارائه‌دهنده",
      cell: (course) => (
        <span className="block max-w-40 truncate text-[11px] text-ink">
          {course.providerName}
        </span>
      ),
    },
    {
      id: "state",
      header: "انتشار",
      cell: (course) => (
        <span
          className={cn(
            "chip text-[10px]",
            course.published
              ? "bg-emerald-50 text-emerald-800"
              : "bg-surface-soft text-muted",
          )}
        >
          {course.published ? "منتشرشده" : "پیش‌نویس"}
        </span>
      ),
    },
    {
      id: "updated",
      header: "آخرین ویرایش",
      cell: (course) => (
        <span className="text-[10px] text-muted">
          {course.updatedAt ? formatDate(course.updatedAt) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "اقدام",
      cell: (course) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/admin/courses/${course.id}`}
            aria-label={`ویرایش ${course.title}`}
            className="inline-flex size-8 items-center justify-center rounded-full text-primary transition hover:bg-primary-soft/20"
          >
            <PencilLine className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => void handleToggle(course)}
            disabled={busyId === course.id}
            aria-label={course.published ? `خروج ${course.title} از انتشار` : `انتشار ${course.title}`}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink disabled:opacity-50"
          >
            {course.published ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(course)}
            aria-label={`حذف ${course.title}`}
            className="inline-flex size-8 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="پنل مدیریت"
        title="دوره‌ها"
        description="ساخت، ویرایش، قیمت‌گذاری و انتشار دوره‌ها."
        actions={
          <ButtonLink to="/admin/courses/new" size="sm" icon={Plus}>
            دوره‌ی جدید
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="فیلتر انتشار">
        {(
          [
            { value: "all", label: "همه", count: courses.length },
            {
              value: "published",
              label: "منتشرشده",
              count: courses.filter((course) => course.published).length,
            },
            {
              value: "draft",
              label: "پیش‌نویس",
              count: courses.filter((course) => !course.published).length,
            },
          ] as Array<{ value: PublishFilter; label: string; count: number }>
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition",
              filter === item.value
                ? "bg-primary text-white"
                : "border border-black/5 bg-white text-muted hover:text-ink",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] tabular-nums",
                filter === item.value
                  ? "bg-white/20 text-white"
                  : "bg-surface-soft text-muted",
              )}
            >
              {toPersianDigits(item.count)}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <PanelCard>
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-red-700">دوره‌ها دریافت نشد</p>
            <p className="mt-2 text-xs text-muted">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/25 px-4 py-2 text-xs font-bold text-primary"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              تلاش دوباره
            </button>
          </div>
        </PanelCard>
      ) : (
        <DataTable
          caption="دوره‌ها"
          rows={filtered}
          columns={columns}
          getRowId={(course) => course.id}
          loading={loading}
          searchText={(course) =>
            `${course.title} ${course.slug} ${course.providerName} ${course.level}`
          }
          searchPlaceholder="جست‌وجو در دوره‌ها…"
          emptyTitle="دوره‌ای با این فیلتر نیست"
          emptyDescription="یک دوره‌ی تازه بسازید یا فیلتر انتشار را تغییر دهید."
          emptyIcon={BookOpen}
          emptyAction={
            <ButtonLink to="/admin/courses/new" size="sm" icon={Plus}>
              دوره‌ی جدید
            </ButtonLink>
          }
        />
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف دوره"
        description="دوره‌ای که سفارش دارد قابل حذف نیست؛ در آن صورت آن را از انتشار خارج کنید."
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
              icon={Trash2}
            >
              حذف قطعی
            </Button>
          </>
        }
      >
        <p className="text-xs leading-7 text-muted">
          دوره‌ی «{deleteTarget?.title}» برای همیشه حذف می‌شود. این کار برگشت
          ندارد.
        </p>
      </Modal>
    </div>
  );
}
