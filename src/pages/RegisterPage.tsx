import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Sparkles, UserPlus } from "lucide-react";
import { ApiError } from "@/api";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { zodResolver } from "@/lib/zodResolver";
import { registerSchema, type RegisterFormValues } from "@/lib/validation";
import { AuthAside } from "@/components/auth/AuthAside";
import { FormAlert } from "@/components/auth/FormAlert";
import { CheckboxField, InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Loading";
import { DotGrid } from "@/components/ui/Decorations";

interface LocationState {
  from?: string;
}

function safeRedirect(from: string | undefined, fallback: string): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }
  return fallback;
}

export function RegisterPage() {
  const { user, loading, register: registerAccount } = useAuth();
  const { notify } = useToast();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  useEffect(() => {
    document.title = `ساخت حساب | ${brand.nameFa}`;
  }, []);

  if (loading) {
    return <PageLoader label="در حال بررسی حساب…" />;
  }

  if (user) {
    return <Navigate to={safeRedirect(state?.from, "/dashboard")} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerAccount({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
      notify("حساب شما ساخته شد. خوش آمدید!", "success");
    } catch (error) {
      if (error instanceof ApiError && error.field === "email") {
        setError("email", { message: error.message });
      } else if (error instanceof ApiError && error.field === "phone") {
        setError("phone", { message: error.message });
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "ساخت حساب ممکن نشد؛ لطفاً دوباره تلاش کنید.",
        );
      }
    }
  });

  return (
    <section className="relative overflow-hidden bg-surface-soft/40 py-10 sm:py-16">
      <DotGrid className="absolute -start-8 top-16 h-40 w-56 opacity-30" />
      <div className="container-page relative">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-stretch">
          <div className="rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-soft sm:p-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft/30 px-3 py-1.5 text-[11px] font-bold text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              شروع مسیر
            </span>
            <h1 className="mt-4 text-3xl font-bold text-ink">ساخت حساب والدین</h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              با این حساب، سفارش‌ها و لایسنس‌های کودک‌تان را مدیریت می‌کنید.
              اطلاعات کودک را نگه نمی‌داریم؛ فقط همین چند فیلد لازم است.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
              {formError ? <FormAlert message={formError} /> : null}

              <InputField
                label="نام و نام خانوادگی"
                autoComplete="name"
                placeholder="مثلاً سارا محمدی"
                error={errors.fullName?.message}
                required
                {...register("fullName")}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <InputField
                  label="ایمیل"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  required
                  dirLtr
                  {...register("email")}
                />
                <InputField
                  label="شماره موبایل"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                  error={errors.phone?.message}
                  required
                  {...register("phone")}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <InputField
                  label="رمز عبور"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="حداقل ۸ کاراکتر"
                  hint="ترکیبی از حرف و عدد"
                  error={errors.password?.message}
                  required
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                      className="inline-flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                  {...register("password")}
                />
                <InputField
                  label="تکرار رمز عبور"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="رمز را دوباره وارد کنید"
                  error={errors.confirmPassword?.message}
                  required
                  {...register("confirmPassword")}
                />
              </div>

              <CheckboxField
                label={
                  <>
                    با{" "}
                    <span className="font-bold text-ink">شرایط استفاده</span> و{" "}
                    <span className="font-bold text-ink">حریم خصوصی</span>{" "}
                    موافقم و می‌دانم هر لایسنس مخصوص یک کاربر است.
                  </>
                }
                error={errors.acceptTerms?.message}
                {...register("acceptTerms")}
              />

              <Button
                type="submit"
                size="lg"
                fullWidth
                arrow
                icon={UserPlus}
                loading={isSubmitting}
              >
                {isSubmitting ? "در حال ساخت حساب…" : "ساخت حساب"}
              </Button>

              <p className="text-center text-xs text-muted">
                قبلاً حساب ساخته‌اید؟{" "}
                <Link
                  to="/login"
                  state={state}
                  className="font-bold text-primary transition hover:text-primary-dark"
                >
                  ورود به حساب
                </Link>
              </p>
            </form>
          </div>

          <AuthAside />
        </div>
      </div>
    </section>
  );
}
