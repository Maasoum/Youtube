import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  Gift,
  Loader2,
  PencilLine,
  ShieldAlert,
} from "lucide-react";
import {
  ApiError,
  adminApi,
  getErrorMessage,
  type Course,
  type Order,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  InputField,
  TextareaField,
} from "@/components/ui/Field";
import { FormAlert } from "@/components/auth/FormAlert";
import { Modal } from "@/components/ui/Modal";
import { zodResolver } from "@/lib/zodResolver";
import {
  editLicenseSchema,
  giftLicenseSchema,
  type EditLicenseFormValues,
  type GiftLicenseFormValues,
} from "@/lib/validation";
import { toPersianDigits } from "@/lib/format";

export function EditLicenseDialog({
  order,
  open,
  onClose,
  onUpdated,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
  onUpdated: (order: Order) => void;
}) {
  const { notify } = useToast();
  const form = useForm<EditLicenseFormValues>({
    resolver: zodResolver(editLicenseSchema),
    defaultValues: {
      licenseCode: "",
      description: order.license?.description ?? "",
      providerReference: order.license?.providerReference ?? "",
      notifyUser: true,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!order.license) return;
    try {
      const updated = await adminApi.editLicense({
        licenseId: order.license.id,
        licenseCode: values.licenseCode.trim() || undefined,
        description: values.description || undefined,
        providerReference: values.providerReference || undefined,
        notifyUser: values.notifyUser,
      });
      notify(
        values.notifyUser
          ? "لایسنس ویرایش شد و به کاربر اطلاع داده شد."
          : "لایسنس ویرایش شد.",
        "success",
      );
      onUpdated(updated);
      onClose();
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ویرایش لایسنس"
      description="تا وقتی کد جدید وارد نکنید، کلید فعلی تغییر نمی‌کند."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            انصراف
          </Button>
          <Button
            type="submit"
            form="edit-license-form"
            size="sm"
            loading={form.formState.isSubmitting}
            icon={PencilLine}
          >
            ذخیره‌ی تغییرات
          </Button>
        </>
      }
    >
      <form id="edit-license-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {form.formState.errors.root?.message ? (
          <FormAlert message={form.formState.errors.root.message} />
        ) : null}

        <p className="rounded-2xl bg-surface-soft/70 p-3 text-[11px] leading-6 text-muted">
          سفارش {toPersianDigits(order.number)} — کلید فعلی با ماسک نمایش داده
          می‌شود. برای امنیت، کد کامل در این پنجره بارگذاری نمی‌شود.
        </p>

        <InputField
          label="کد لایسنس جدید (اختیاری)"
          dirLtr
          mono
          placeholder="اگر تغییر نمی‌کند خالی بگذارید"
          error={form.formState.errors.licenseCode?.message}
          hint="در صورت خالی‌بودن، کلید فعلی حفظ می‌شود."
          {...form.register("licenseCode")}
        />
        <TextareaField
          label="توضیح تکمیلی برای کاربر"
          rows={3}
          error={form.formState.errors.description?.message}
          {...form.register("description")}
        />
        <InputField
          label="شناسه‌ی مرجع ارائه‌دهنده"
          dirLtr
          mono
          error={form.formState.errors.providerReference?.message}
          {...form.register("providerReference")}
        />
        <CheckboxField
          label="تغییرات با ایمیل و اعلان به کاربر اطلاع داده شود."
          {...form.register("notifyUser")}
        />
      </form>
    </Modal>
  );
}

export function GiftLicenseDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const { notify } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [duplicate, setDuplicate] = useState<{
    message: string;
    values: GiftLicenseFormValues;
  } | null>(null);

  const form = useForm<GiftLicenseFormValues>({
    resolver: zodResolver(giftLicenseSchema),
    defaultValues: {
      email: "",
      courseId: "",
      licenseCode: "",
      description: "",
      providerReference: "",
      notifyUser: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingCourses(true);
    adminApi
      .listCourses()
      .then((items) => {
        if (!active) return;
        setCourses(items);
        if (!form.getValues("courseId") && items[0]) {
          form.setValue("courseId", items[0].id);
        }
      })
      .catch((caught) => {
        form.setError("root", { message: getErrorMessage(caught) });
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });
    return () => {
      active = false;
    };
  }, [open, form]);

  const submit = async (values: GiftLicenseFormValues, confirmDuplicate: boolean) => {
    try {
      const order = await adminApi.grantGiftLicense({
        email: values.email,
        courseId: values.courseId,
        licenseCode: values.licenseCode,
        description: values.description || undefined,
        providerReference: values.providerReference || undefined,
        notifyUser: values.notifyUser,
        confirmDuplicate,
      });
      setDuplicate(null);
      form.reset();
      notify("لایسنس هدیه صادر شد.", "success");
      onCreated(order);
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "license_duplicate") {
        setDuplicate({ message: caught.message, values });
        return;
      }
      form.setError("root", { message: getErrorMessage(caught) });
    }
  };

  const onSubmit = form.handleSubmit((values) => submit(values, false));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="صدور لایسنس هدیه"
      description="برای هماهنگی‌های ویژه یا جبران تأخیر؛ سفارش با مبلغ صفر ثبت می‌شود."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            انصراف
          </Button>
          <Button
            type="submit"
            form="gift-license-form"
            size="sm"
            loading={form.formState.isSubmitting}
            icon={Gift}
          >
            صدور لایسنس هدیه
          </Button>
        </>
      }
    >
      <form id="gift-license-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {form.formState.errors.root?.message ? (
          <FormAlert message={form.formState.errors.root.message} />
        ) : null}

        <InputField
          label="ایمیل کاربر"
          type="email"
          required
          dirLtr
          placeholder="name@example.com"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />

        <div>
          <label htmlFor="gift-course" className="label-base">
            دوره
            <span className="ms-1 text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="gift-course"
            className="input-base"
            aria-invalid={form.formState.errors.courseId ? true : undefined}
            {...form.register("courseId")}
          >
            {loadingCourses ? <option value="">در حال دریافت دوره‌ها…</option> : null}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          {form.formState.errors.courseId?.message ? (
            <p role="alert" className="mt-2 text-xs font-bold text-red-600">
              {form.formState.errors.courseId.message}
            </p>
          ) : null}
        </div>

        <InputField
          label="کد لایسنس"
          required
          dirLtr
          mono
          placeholder="BP-GIFT-XXXX-XXXX"
          error={form.formState.errors.licenseCode?.message}
          {...form.register("licenseCode")}
        />
        <TextareaField
          label="توضیح تکمیلی (اختیاری)"
          rows={2}
          error={form.formState.errors.description?.message}
          {...form.register("description")}
        />
        <InputField
          label="شناسه‌ی مرجع ارائه‌دهنده (اختیاری)"
          dirLtr
          mono
          error={form.formState.errors.providerReference?.message}
          {...form.register("providerReference")}
        />
        <CheckboxField
          label="ایمیل و اعلان «لایسنس هدیه فعال شد» برای کاربر ارسال شود."
          {...form.register("notifyUser")}
        />

        {loadingCourses ? (
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            در حال دریافت فهرست دوره‌ها…
          </p>
        ) : null}

        {duplicate ? (
          <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="flex items-start gap-2 text-xs font-bold leading-6 text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              کلید تکراری است
            </p>
            <p className="mt-1.5 text-[11px] leading-6 text-amber-900/90">
              {duplicate.message}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void submit(duplicate.values, true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-900 px-4 py-2 text-[11px] font-bold text-white"
              >
                <ShieldAlert className="size-3.5" aria-hidden="true" />
                با وجود تکراری بودن، ثبت کن
              </button>
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="rounded-full border border-amber-300 bg-white px-4 py-2 text-[11px] font-bold text-amber-900"
              >
                اصلاح کد
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
