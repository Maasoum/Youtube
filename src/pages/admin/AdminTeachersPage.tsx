import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowDown,
  ArrowUp,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  UsersRound,
} from "lucide-react";
import { adminApi, getErrorMessage, type Teacher } from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  InputField,
  TextareaField,
} from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { zodResolver } from "@/lib/zodResolver";
import {
  adminTeacherSchema,
  type AdminTeacherFormValues,
} from "@/lib/validation";
import { teacherAccentLabels } from "@/lib/labels";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

const accentClasses: Record<Teacher["accent"], string> = {
  lavender: "bg-primary-soft/40 text-primary",
  yellow: "bg-accent/30 text-ink",
  sky: "bg-sky-100 text-sky-800",
  coral: "bg-orange-100 text-orange-800",
};

export function AdminTeachersPage() {
  const { notify } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [busy, setBusy] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const form = useForm<AdminTeacherFormValues>({
    resolver: zodResolver(adminTeacherSchema),
    defaultValues: {
      name: "",
      role: "",
      bio: "",
      initials: "",
      accent: "lavender",
      isActive: true,
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTeachers(await adminApi.adminListTeachers());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      role: "",
      bio: "",
      initials: "",
      accent: "lavender",
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditing(teacher);
    form.reset({
      name: teacher.name,
      role: teacher.role,
      bio: teacher.bio,
      initials: teacher.initials,
      accent: teacher.accent,
      isActive: teacher.isActive !== false,
    });
    setModalOpen(true);
  };

  const save = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await adminApi.updateTeacher(editing.id, values);
        notify("اطلاعات مربی ویرایش شد.", "success");
      } else {
        await adminApi.createTeacher(values);
        notify("مربی تازه اضافه شد.", "success");
      }
      setModalOpen(false);
      await load();
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  const handleMove = async (teacher: Teacher, direction: "up" | "down") => {
    setMovingId(teacher.id);
    try {
      setTeachers(await adminApi.moveTeacher(teacher.id, direction));
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setMovingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await adminApi.deleteTeacher(deleteTarget.id);
      notify("مربی حذف شد.", "success");
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setBusy(false);
    }
  };

  const columns: DataTableColumn<Teacher>[] = [
    {
      id: "order",
      header: "ترتیب",
      cell: (teacher) => (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface-soft text-[10px] font-bold tabular-nums text-muted">
          {toPersianDigits((teacher.order ?? 0) + 1)}
        </span>
      ),
    },
    {
      id: "teacher",
      header: "مربی",
      cell: (teacher) => (
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold",
              accentClasses[teacher.accent],
            )}
            aria-hidden="true"
          >
            {teacher.initials}
          </span>
          <div>
            <p className="font-bold text-ink">{teacher.name}</p>
            <p className="text-[10px] text-muted">{teacher.role}</p>
          </div>
        </div>
      ),
    },
    {
      id: "bio",
      header: "معرفی",
      cell: (teacher) => (
        <p className="line-clamp-2 max-w-sm text-[10px] leading-5 text-muted">
          {teacher.bio}
        </p>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (teacher) => (
        <div className="space-y-1">
          <span
            className={cn(
              "chip text-[10px]",
              teacher.isActive !== false
                ? "bg-emerald-50 text-emerald-800"
                : "bg-surface-soft text-muted",
            )}
          >
            {teacher.isActive !== false ? "فعال" : "غیرفعال"}
          </span>
          <p className="text-[9px] text-muted">{teacherAccentLabels[teacher.accent]}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "اقدام‌ها",
      headerClassName: "text-end",
      cellClassName: "text-end",
      cell: (teacher) => {
        const index = teachers.findIndex((item) => item.id === teacher.id);
        return (
          <div className="flex flex-wrap justify-end gap-1">
            <button
              type="button"
              onClick={() => void handleMove(teacher, "up")}
              disabled={index <= 0 || movingId === teacher.id}
              aria-label="انتقال به بالا"
              className="inline-flex size-7 items-center justify-center rounded-full border border-black/5 text-muted transition hover:text-primary disabled:opacity-30"
            >
              <ArrowUp className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void handleMove(teacher, "down")}
              disabled={index >= teachers.length - 1 || movingId === teacher.id}
              aria-label="انتقال به پایین"
              className="inline-flex size-7 items-center justify-center rounded-full border border-black/5 text-muted transition hover:text-primary disabled:opacity-30"
            >
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => openEdit(teacher)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-2.5 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary-soft/20"
            >
              <PencilLine className="size-3.5" aria-hidden="true" />
              ویرایش
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(teacher)}
              className="inline-flex size-7 items-center justify-center rounded-full border border-red-100 text-red-600 transition hover:bg-red-50"
              aria-label="حذف مربی"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="مدیریت محتوا"
        title="مربیان"
        description="کارت مربیان صفحه‌ی اصلی را مدیریت کنید؛ ترتیب نمایش و فعال/غیرفعال بودن هر کارت را تغییر دهید."
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
            <Button size="sm" icon={Plus} onClick={openCreate}>
              مربی تازه
            </Button>
          </>
        }
      />

      <DataTable
        caption="مربیان"
        rows={teachers}
        columns={columns}
        getRowId={(teacher) => teacher.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        searchText={(teacher) => `${teacher.name} ${teacher.role} ${teacher.bio}`}
        searchPlaceholder="جست‌وجو در نام و نقش مربی…"
        emptyTitle="مربی‌ای ثبت نشده"
        emptyDescription="اولین کارت مربی را اضافه کنید."
        emptyIcon={UsersRound}
        emptyAction={
          <Button size="sm" icon={Plus} onClick={openCreate}>
            افزودن مربی
          </Button>
        }
        pageSize={10}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "ویرایش مربی" : "مربی تازه"}
        description="اطلاعات این کارت در بخش مربیان صفحه‌ی اصلی نمایش داده می‌شود."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              size="sm"
              type="submit"
              form="teacher-form"
              loading={form.formState.isSubmitting}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={save} noValidate className="space-y-4">
          {form.formState.errors.root?.message ? (
            <p role="alert" className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="نام مربی"
              required
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            <InputField
              label="نقش / تخصص"
              required
              placeholder="مثلاً مربی خلاقیت دیجیتال"
              error={form.formState.errors.role?.message}
              {...form.register("role")}
            />
            <InputField
              label="کوته‌نوشت (۱ تا ۳ نویسه)"
              required
              maxLength={3}
              placeholder="مثلاً س‌م"
              error={form.formState.errors.initials?.message}
              {...form.register("initials")}
            />
            <div>
              <label htmlFor="teacher-accent" className="label-base">
                رنگ کارت
              </label>
              <select id="teacher-accent" className="input-base" {...form.register("accent")}>
                {(
                  Object.keys(teacherAccentLabels) as Teacher["accent"][]
                ).map((accent) => (
                  <option key={accent} value={accent}>
                    {teacherAccentLabels[accent]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <TextareaField
            label="معرفی کوتاه"
            required
            rows={4}
            error={form.formState.errors.bio?.message}
            {...form.register("bio")}
          />
          <CheckboxField
            label="این کارت در صفحه‌ی اصلی نمایش داده شود."
            {...form.register("isActive")}
          />
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف مربی"
        description="کارت این مربی از صفحه‌ی اصلی حذف می‌شود. این اقدام قابل بازگشت نیست."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              onClick={() => void handleDelete()}
            >
              حذف مربی
            </Button>
          </>
        }
      >
        <p className="rounded-2xl bg-surface-soft/60 p-3 text-xs leading-7 text-ink">
          {deleteTarget?.name} — {deleteTarget?.role}
        </p>
      </Modal>
    </div>
  );
}
