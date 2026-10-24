import { useFieldArray, useForm } from "react-hook-form";
import {
  BookOpen,
  DollarSign,
  ExternalLink,
  ListChecks,
  Plus,
  Save,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  adminApi,
  getErrorMessage,
  type Course,
  type CourseInput,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  CheckboxField,
  InputField,
  TextareaField,
} from "@/components/ui/Field";
import { FormAlert } from "@/components/auth/FormAlert";
import { zodResolver } from "@/lib/zodResolver";
import {
  courseFormSchema,
  type CourseFormValues,
} from "@/lib/validation";
import { formatToman, toPersianDigits } from "@/lib/format";

interface CourseFormProps {
  course?: Course;
  onSaved: (course: Course) => void;
}

const artOptions = [
  { value: "foundations", label: "هوش مصنوعی مقدماتی" },
  { value: "studio", label: "پوستر استودیوی کوچک من" },
  { value: "creative", label: "خلاقیت و هنر" },
  { value: "python", label: "کدنویسی پایتون" },
  { value: "safety", label: "شهروند دیجیتال" },
] as const;

function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export function CourseForm({ course, onSaved }: CourseFormProps) {
  const { notify } = useToast();
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: course?.title ?? "",
      slug: course?.slug ?? "",
      tagline: course?.tagline ?? "",
      descriptionText: course?.description.join("\n\n") ?? "",
      outcomesText: course?.outcomes.join("\n") ?? "",
      level: course?.level ?? "beginner",
      ageMin: course?.ageRange.min ?? 8,
      ageMax: course?.ageRange.max ?? 12,
      durationWeeks: course?.durationWeeks ?? 6,
      sessions: course?.sessions ?? 12,
      priceToman: course?.priceToman ?? 0,
      compareAtPriceToman: course?.compareAtPriceToman ?? 0,
      providerName: course?.providerName ?? "",
      providerPanelUrl: course?.providerPanelUrl ?? "",
      activationUrl: course?.activationUrl ?? "",
      activationInstructions: course?.activationInstructions ?? "",
      art: (course?.art as CourseFormValues["art"] | undefined) ?? "foundations",
      badge: course?.badge ?? "",
      popular: course?.popular ?? false,
      featured: course?.featured ?? false,
      published: course?.published ?? true,
      syllabus:
        course?.syllabus && course.syllabus.length > 0
          ? course.syllabus
          : [{ title: "", summary: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "syllabus",
  });

  const price = form.watch("priceToman");
  const compareAt = form.watch("compareAtPriceToman");

  const onSubmit = form.handleSubmit(async (values) => {
    const input: CourseInput = {
      title: values.title,
      slug: values.slug,
      tagline: values.tagline,
      description: values.descriptionText
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0),
      outcomes: toLines(values.outcomesText),
      level: values.level,
      ageRange: { min: values.ageMin, max: values.ageMax },
      durationWeeks: values.durationWeeks,
      sessions: values.sessions,
      priceToman: values.priceToman,
      compareAtPriceToman:
        values.compareAtPriceToman > 0 ? values.compareAtPriceToman : undefined,
      syllabus: values.syllabus.map((chapter) => ({
        title: chapter.title,
        summary: chapter.summary,
      })),
      faqs: course?.faqs ?? [],
      art: values.art,
      badge: values.badge || undefined,
      popular: values.popular,
      featured: values.featured,
      providerName: values.providerName,
      providerPanelUrl: values.providerPanelUrl,
      activationUrl: values.activationUrl,
      activationInstructions: values.activationInstructions,
      published: values.published,
    };

    try {
      const saved = course
        ? await adminApi.updateCourse(course.id, input)
        : await adminApi.createCourse(input);
      notify(
        course ? "دوره با موفقیت ویرایش شد." : "دوره‌ی جدید ساخته شد.",
        "success",
      );
      onSaved(saved);
    } catch (caught) {
      form.setError("root", { message: getErrorMessage(caught) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {form.formState.errors.root?.message ? (
        <FormAlert message={form.formState.errors.root.message} />
      ) : null}

      <section className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <SectionTitle icon={BookOpen} title="اطلاعات پایه" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <InputField
              label="عنوان دوره"
              required
              error={form.formState.errors.title?.message}
              {...form.register("title")}
            />
          </div>
          <InputField
            label="نشانی دوره (slug)"
            required
            dirLtr
            mono
            placeholder="ai-foundations"
            hint="در نشانی صفحه‌ی دوره استفاده می‌شود؛ فقط حروف کوچک انگلیسی، عدد و خط تیره."
            error={form.formState.errors.slug?.message}
            {...form.register("slug")}
          />
          <div>
            <label htmlFor="course-level" className="label-base">
              سطح دوره
              <span className="ms-1 text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="course-level"
              className="input-base"
              {...form.register("level")}
            >
              <option value="beginner">مقدماتی</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">پیشرفته</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <InputField
              label="جمله‌ی معرفی"
              required
              error={form.formState.errors.tagline?.message}
              {...form.register("tagline")}
            />
          </div>
          <div>
            <label htmlFor="course-art" className="label-base">
              تصویر دوره
              <span className="ms-1 text-red-500" aria-hidden="true">*</span>
            </label>
            <select id="course-art" className="input-base" {...form.register("art")}>
              {artOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="حداقل سن"
              type="number"
              inputMode="numeric"
              required
              error={form.formState.errors.ageMin?.message}
              {...form.register("ageMin")}
            />
            <InputField
              label="حداکثر سن"
              type="number"
              inputMode="numeric"
              required
              error={form.formState.errors.ageMax?.message}
              {...form.register("ageMax")}
            />
          </div>
          <InputField
            label="مدت دوره (هفته)"
            type="number"
            inputMode="numeric"
            required
            error={form.formState.errors.durationWeeks?.message}
            {...form.register("durationWeeks")}
          />
          <InputField
            label="تعداد جلسه"
            type="number"
            inputMode="numeric"
            required
            error={form.formState.errors.sessions?.message}
            {...form.register("sessions")}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <SectionTitle icon={DollarSign} title="قیمت و انتشار" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <InputField
            label="قیمت فروش (تومان)"
            type="number"
            inputMode="numeric"
            required
            hint={price > 0 ? formatToman(Number(price)) : "برای دوره‌ی رایگان صفر بگذارید."}
            error={form.formState.errors.priceToman?.message}
            {...form.register("priceToman")}
          />
          <InputField
            label="قیمت پیش از تخفیف (تومان)"
            type="number"
            inputMode="numeric"
            hint={
              Number(compareAt) > 0
                ? `نمایش خط‌خورده: ${formatToman(Number(compareAt))}`
                : "اختیاری؛ باید بیشتر از قیمت فروش باشد."
            }
            error={form.formState.errors.compareAtPriceToman?.message}
            {...form.register("compareAtPriceToman")}
          />
          <InputField
            label="برچسب (اختیاری)"
            placeholder="مثلاً: پرفروش‌ترین"
            error={form.formState.errors.badge?.message}
            {...form.register("badge")}
          />
          <div className="space-y-3 pt-1">
            <CheckboxField label="دوره در سایت عمومی منتشر شود." {...form.register("published")} />
            <CheckboxField label="در بخش «محبوب» نمایش داده شود." {...form.register("popular")} />
            <CheckboxField label="در بخش «ویژه» صفحه‌ی اصلی نمایش داده شود." {...form.register("featured")} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <SectionTitle icon={ListChecks} title="توضیحات و سرفصل‌ها" />
        <div className="mt-4 space-y-4">
          <TextareaField
            label="توضیحات دوره"
            required
            rows={5}
            hint="هر پاراگراف را با یک خط خالی از پاراگراف بعدی جدا کنید."
            error={form.formState.errors.descriptionText?.message}
            {...form.register("descriptionText")}
          />
          <TextareaField
            label="دستاوردهای دوره"
            required
            rows={4}
            hint="هر دستاورد در یک خط جداگانه."
            error={form.formState.errors.outcomesText?.message}
            {...form.register("outcomesText")}
          />

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-ink">سرفصل‌ها</p>
              <button
                type="button"
                onClick={() => append({ title: "", summary: "" })}
                className="inline-flex items-center gap-1 rounded-full border border-primary/25 px-3 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary-soft/20"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                افزودن سرفصل
              </button>
            </div>
            {form.formState.errors.syllabus?.root?.message ? (
              <p role="alert" className="mb-2 text-xs font-bold text-red-600">
                {form.formState.errors.syllabus.root.message}
              </p>
            ) : null}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-2xl border border-black/5 bg-surface-soft/40 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted">
                      سرفصل {toPersianDigits(index + 1)}
                    </p>
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        aria-label={`حذف سرفصل ${toPersianDigits(index + 1)}`}
                        className="inline-flex size-7 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <InputField
                      label="عنوان سرفصل"
                      required
                      error={form.formState.errors.syllabus?.[index]?.title?.message}
                      {...form.register(`syllabus.${index}.title`)}
                    />
                    <TextareaField
                      label="توضیح سرفصل"
                      required
                      rows={2}
                      error={form.formState.errors.syllabus?.[index]?.summary?.message}
                      {...form.register(`syllabus.${index}.summary`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <SectionTitle icon={ExternalLink} title="ارائه‌دهنده و فعال‌سازی" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <InputField
            label="نام ارائه‌دهنده"
            required
            error={form.formState.errors.providerName?.message}
            {...form.register("providerName")}
          />
          <InputField
            label="نشانی پنل ارائه‌دهنده"
            required
            dirLtr
            placeholder="https://partner.example/panel"
            error={form.formState.errors.providerPanelUrl?.message}
            {...form.register("providerPanelUrl")}
          />
          <div className="sm:col-span-2">
            <InputField
              label="نشانی سایت دوره برای فعال‌سازی"
              required
              dirLtr
              placeholder="https://learn.example/activate/course"
              error={form.formState.errors.activationUrl?.message}
              {...form.register("activationUrl")}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaField
              label="راهنمای فعال‌سازی"
              required
              rows={4}
              hint="هر مرحله را در یک خط بنویسید؛ در داشبورد کاربر شماره‌گذاری می‌شود."
              error={form.formState.errors.activationInstructions?.message}
              {...form.register("activationInstructions")}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/5 bg-white p-4">
        <p className="text-[10px] leading-5 text-muted">
          همه‌ی تغییرات در گزارش اقدامات ثبت می‌شود.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/admin/courses" variant="ghost" size="sm">
            انصراف
          </ButtonLink>
          <Button
            type="submit"
            size="sm"
            icon={Save}
            loading={form.formState.isSubmitting}
          >
            {course ? "ذخیره‌ی تغییرات" : "ساخت دوره"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary-soft/30 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      {title}
    </h2>
  );
}
