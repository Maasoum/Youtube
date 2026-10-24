import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminApi, getErrorMessage, type Course } from "@/api";
import { useToast } from "@/context/ToastContext";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { CourseForm } from "@/components/admin/CourseForm";

export function AdminCourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const isNew = !courseId || courseId === "new";
  const navigate = useNavigate();
  const { notify } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError(null);
    try {
      const courses = await adminApi.listCourses();
      const found = courses.find((item) => item.id === courseId) ?? null;
      if (!found) {
        setError("دوره‌ای با این شناسه پیدا نشد.");
      }
      setCourse(found);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [courseId, isNew]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded-full bg-white/80" />
        <div className="h-96 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  if (!isNew && !course) {
    return (
      <div>
        <PanelPageHeader
          title="دوره پیدا نشد"
          backTo={{ to: "/admin/courses", label: "بازگشت به دوره‌ها" }}
        />
        <PanelCard>
          <p className="py-8 text-center text-xs text-muted">{error}</p>
        </PanelCard>
      </div>
    );
  }

  return (
    <div>
      <PanelPageHeader
        eyebrow={isNew ? "دوره‌ی جدید" : "ویرایش دوره"}
        title={isNew ? "ساخت دوره" : course?.title ?? "ویرایش دوره"}
        description="اطلاعات دوره، قیمت، سرفصل‌ها و اطلاعات ارائه‌دهنده را کامل کنید."
        backTo={{ to: "/admin/courses", label: "بازگشت به دوره‌ها" }}
      />

      <CourseForm
        course={course ?? undefined}
        onSaved={(saved) => {
          notify(
            isNew ? "دوره‌ی جدید ساخته شد." : "تغییرات دوره ذخیره شد.",
            "success",
          );
          navigate(`/admin/courses/${saved.id}`);
        }}
      />
    </div>
  );
}
