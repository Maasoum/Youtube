import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowDown,
  ArrowUp,
  HelpCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { adminApi, getErrorMessage, type HomeFaq } from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { CheckboxField, TextareaField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/panel/DataTable";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { zodResolver } from "@/lib/zodResolver";
import {
  adminFaqSchema,
  type AdminFaqFormValues,
} from "@/lib/validation";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminFaqsPage() {
  const { notify } = useToast();
  const [faqs, setFaqs] = useState<HomeFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HomeFaq | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomeFaq | null>(null);
  const [busy, setBusy] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const form = useForm<AdminFaqFormValues>({
    resolver: zodResolver(adminFaqSchema),
    defaultValues: { question: "", answer: "", isActive: true },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFaqs(await adminApi.adminListFaqs());
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
    form.reset({ question: "", answer: "", isActive: true });
    setModalOpen(true);
  };

  const openEdit = (faq: HomeFaq) => {
    setEditing(faq);
    form.reset({
      question: faq.question,
      answer: faq.answer,
      isActive: faq.isActive !== false,
    });
    setModalOpen(true);
  };

  const save = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await adminApi.updateFaq(editing.id, values);
        notify("پرسش ویرایش شد.", "success");
      } else {
        await adminApi.createFaq(values);
        notify("پرسش تازه اضافه شد.", "success");
      }
      setModalOpen(false);
      await load();
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  const handleMove = async (faq: HomeFaq, direction: "up" | "down") => {
    setMovingId(faq.id);
    try {
      setFaqs(await adminApi.moveFaq(faq.id, direction));
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
      await adminApi.deleteFaq(deleteTarget.id);
      notify("پرسش حذف شد.", "success");
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      notify(getErrorMessage(caught), "error");
    } finally {
      setBusy(false);
    }
  };

  const columns: DataTableColumn<HomeFaq>[] = [
    {
      id: "order",
      header: "ترتیب",
      cell: (faq) => (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface-soft text-[10px] font-bold tabular-nums text-muted">
          {toPersianDigits((faq.order ?? 0) + 1)}
        </span>
      ),
    },
    {
      id: "content",
      header: "پرسش و پاسخ",
      cell: (faq) => (
        <div className="max-w-md">
          <p className="font-bold text-ink">{faq.question}</p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-muted">
            {faq.answer}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (faq) => (
        <span
          className={cn(
            "chip text-[10px]",
            faq.isActive !== false
              ? "bg-emerald-50 text-emerald-800"
              : "bg-surface-soft text-muted",
          )}
        >
          {faq.isActive !== false ? "فعال" : "غیرفعال"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "اقدام‌ها",
      headerClassName: "text-end",
      cellClassName: "text-end",
      cell: (faq) => {
        const index = faqs.findIndex((item) => item.id === faq.id);
        return (
          <div className="flex flex-wrap justify-end gap-1">
            <button
              type="button"
              onClick={() => void handleMove(faq, "up")}
              disabled={index <= 0 || movingId === faq.id}
              aria-label="انتقال به بالا"
              className="inline-flex size-7 items-center justify-center rounded-full border border-black/5 text-muted transition hover:text-primary disabled:opacity-30"
            >
              <ArrowUp className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void handleMove(faq, "down")}
              disabled={index >= faqs.length - 1 || movingId === faq.id}
              aria-label="انتقال به پایین"
              className="inline-flex size-7 items-center justify-center rounded-full border border-black/5 text-muted transition hover:text-primary disabled:opacity-30"
            >
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => openEdit(faq)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-2.5 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary-soft/20"
            >
              <PencilLine className="size-3.5" aria-hidden="true" />
              ویرایش
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(faq)}
              className="inline-flex size-7 items-center justify-center rounded-full border border-red-100 text-red-600 transition hover:bg-red-50"
              aria-label="حذف پرسش"
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
        title="پرسش‌های متداول"
        description="پرسش‌های کوتاه صفحه‌ی اصلی را مدیریت کنید؛ ترتیب نمایش و فعال/غیرفعال بودن هر مورد قابل تغییر است."
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
              پرسش تازه
            </Button>
          </>
        }
      />

      <DataTable
        caption="پرسش‌های متداول"
        rows={faqs}
        columns={columns}
        getRowId={(faq) => faq.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        searchText={(faq) => `${faq.question} ${faq.answer}`}
        searchPlaceholder="جست‌وجو در پرسش‌ها…"
        emptyTitle="پرسشی ثبت نشده"
        emptyDescription="اولین پرسش پرتکرار را اضافه کنید."
        emptyIcon={HelpCircle}
        emptyAction={
          <Button size="sm" icon={Plus} onClick={openCreate}>
            افزودن پرسش
          </Button>
        }
        pageSize={10}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "ویرایش پرسش" : "پرسش تازه"}
        description="پاسخ کوتاه و روشن بنویسید؛ این متن در صفحه‌ی اصلی نمایش داده می‌شود."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              size="sm"
              type="submit"
              form="faq-form"
              loading={form.formState.isSubmitting}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <form id="faq-form" onSubmit={save} noValidate className="space-y-4">
          {form.formState.errors.root?.message ? (
            <p role="alert" className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <TextareaField
            label="پرسش"
            required
            rows={2}
            error={form.formState.errors.question?.message}
            {...form.register("question")}
          />
          <TextareaField
            label="پاسخ"
            required
            rows={5}
            error={form.formState.errors.answer?.message}
            {...form.register("answer")}
          />
          <CheckboxField
            label="این پرسش در صفحه‌ی اصلی نمایش داده شود."
            {...form.register("isActive")}
          />
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف پرسش"
        description="این پرسش از صفحه‌ی اصلی حذف می‌شود. این اقدام قابل بازگشت نیست."
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
              حذف پرسش
            </Button>
          </>
        }
      >
        <p className="rounded-2xl bg-surface-soft/60 p-3 text-xs leading-7 text-ink">
          {deleteTarget?.question}
        </p>
      </Modal>
    </div>
  );
}
