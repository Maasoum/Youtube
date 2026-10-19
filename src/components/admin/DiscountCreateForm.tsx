import { useState } from "react";
import { useForm } from "react-hook-form";
import { Tag } from "lucide-react";
import {
  ApiError,
  discountsApi,
  getErrorMessage,
  type DiscountCode,
} from "@/api";
import { zodResolver } from "@/lib/zodResolver";
import {
  adminDiscountSchema,
  type AdminDiscountFormValues,
} from "@/lib/validation";
import { useToast } from "@/context/ToastContext";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/auth/FormAlert";

interface DiscountCreateFormProps {
  onCreated: (discount: DiscountCode) => void;
}

export function DiscountCreateForm({ onCreated }: DiscountCreateFormProps) {
  const { notify } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminDiscountFormValues>({
    resolver: zodResolver(adminDiscountSchema),
    defaultValues: {
      code: "",
      percent: 20,
      maxUses: 100,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const discount = await discountsApi.create({
        code: values.code,
        percent: values.percent,
        maxUses: values.maxUses,
      });
      onCreated(discount);
      notify(`کد تخفیف ${discount.code} ساخته شد.`, "success");
      reset({ code: "", percent: 20, maxUses: 100 });
    } catch (error) {
      if (error instanceof ApiError && error.field === "code") {
        setError("code", { message: error.message });
      } else {
        setFormError(getErrorMessage(error));
      }
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="card-surface h-full p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent/25 text-[#8A5A00]">
          <Tag className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-ink">ساخت کد تخفیف</h2>
          <p className="mt-0.5 text-[10px] text-muted">
            برای هر سفارش فقط یک کد قابل استفاده است.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {formError ? <FormAlert message={formError} /> : null}

        <InputField
          label="کد تخفیف"
          placeholder="مثلاً SPRING25"
          error={errors.code?.message}
          hint="حروف انگلیسی، عدد و خط تیره"
          dirLtr
          mono
          required
          {...register("code")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="درصد تخفیف"
            type="number"
            min={5}
            max={90}
            step={1}
            placeholder="۲۰"
            error={errors.percent?.message}
            required
            {...register("percent", { valueAsNumber: true })}
          />
          <InputField
            label="سقف استفاده"
            type="number"
            min={1}
            max={10000}
            step={1}
            placeholder="۱۰۰"
            error={errors.maxUses?.message}
            required
            {...register("maxUses", { valueAsNumber: true })}
          />
        </div>
      </div>

      <Button
        type="submit"
        size="md"
        fullWidth
        loading={isSubmitting}
        className="mt-5"
        arrow
      >
        {isSubmitting ? "در حال ساخت…" : "ساخت کد تخفیف"}
      </Button>
    </form>
  );
}
