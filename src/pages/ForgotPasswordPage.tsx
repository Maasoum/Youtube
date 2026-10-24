import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowRight, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { authApi, getErrorMessage } from "@/api";
import { brand } from "@/config/brand";
import { zodResolver } from "@/lib/zodResolver";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validation";
import { AuthAside } from "@/components/auth/AuthAside";
import { FormAlert } from "@/components/auth/FormAlert";
import { InputField } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DotGrid } from "@/components/ui/Decorations";

export function ForgotPasswordPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    document.title = `بازیابی رمز عبور | ${brand.nameFa}`;
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await authApi.requestPasswordReset({ email: values.email });
      setSuccess(result.message);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <section className="relative overflow-hidden bg-surface-soft/40 py-10 sm:py-16">
      <DotGrid className="absolute -start-8 top-16 h-40 w-56 opacity-30" />
      <div className="container-page relative">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-stretch">
          <div className="rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-soft sm:p-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft/30 px-3 py-1.5 text-[11px] font-bold text-primary">
              <KeyRound className="size-3.5" aria-hidden="true" />
              بازیابی دسترسی
            </span>
            <h1 className="mt-4 text-3xl font-bold text-ink">
              رمز عبور را فراموش کرده‌اید؟
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              ایمیل حساب خود را وارد کنید. اگر حسابی با این ایمیل وجود داشته
              باشد، لینک بازیابی برای شما ارسال می‌شود.
            </p>

            {success ? (
              <div className="mt-7 space-y-5" role="status" aria-live="polite">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-bold">درخواست شما ثبت شد</p>
                    <p className="mt-1 text-xs leading-6">{success}</p>
                  </div>
                </div>
                <p className="text-xs leading-6 text-muted">
                  اگر ایمیل را دریافت نکردید، پوشه‌ی هرزنامه را بررسی کنید یا
                  چند دقیقه بعد دوباره تلاش کنید.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ButtonLink to="/login" fullWidth arrow>
                    بازگشت به ورود
                  </ButtonLink>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setSuccess(null)}
                  >
                    ارسال دوباره
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
                {formError ? <FormAlert message={formError} /> : null}

                <InputField
                  label="ایمیل"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  required
                  dirLtr
                  icon={Mail}
                  {...register("email")}
                />

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  arrow
                  loading={isSubmitting}
                >
                  {isSubmitting ? "در حال ارسال…" : "ارسال لینک بازیابی"}
                </Button>

                <p className="text-center text-xs text-muted">
                  یادتان آمد؟{" "}
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 font-bold text-primary transition hover:text-primary-dark"
                  >
                    بازگشت به ورود
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </p>
              </form>
            )}
          </div>

          <AuthAside />
        </div>
      </div>
    </section>
  );
}
