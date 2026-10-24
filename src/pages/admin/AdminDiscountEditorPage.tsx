import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  adminApi,
  getErrorMessage,
  type DiscountCode,
} from "@/api";
import { useToast } from "@/context/ToastContext";
import { DiscountForm } from "@/components/admin/DiscountForm";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";

export function AdminDiscountEditorPage() {
  const { code } = useParams<{ code: string }>();
  const isNew = !code || code === "new";
  const navigate = useNavigate();
  const { notify } = useToast();
  const [discount, setDiscount] = useState<DiscountCode | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew || !code) return;
    setLoading(true);
    setError(null);
    try {
      const discounts = await adminApi.listDiscounts();
      const found =
        discounts.find((item) => item.code === decodeURIComponent(code)) ?? null;
      if (!found) setError("کدی با این شناسه پیدا نشد.");
      setDiscount(found);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [code, isNew]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded-full bg-white/80" />
        <div className="h-80 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  if (!isNew && !discount) {
    return (
      <div>
        <PanelPageHeader
          title="کد تخفیف پیدا نشد"
          backTo={{ to: "/admin/discounts", label: "بازگشت به کدها" }}
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
        eyebrow={isNew ? "کد تخفیف جدید" : "ویرایش کد تخفیف"}
        title={isNew ? "ساخت کد تخفیف" : `کد ${discount?.code ?? ""}`}
        description="نوع، مقدار، بازه، سقف استفاده و محدودیت دوره‌ها را تعیین کنید."
        backTo={{ to: "/admin/discounts", label: "بازگشت به کدهای تخفیف" }}
      />
      <DiscountForm
        discount={discount ?? undefined}
        onSaved={(saved) => {
          notify(
            isNew ? "کد تخفیف ساخته شد." : "کد تخفیف ذخیره شد.",
            "success",
          );
          navigate(`/admin/discounts/${encodeURIComponent(saved.code)}`);
        }}
      />
    </div>
  );
}
