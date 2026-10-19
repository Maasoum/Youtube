import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { ApiError } from "@/api";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { zodResolver } from "@/lib/zodResolver";
import { loginSchema, type LoginFormValues } from "@/lib/validation";
import { AuthAside } from "@/components/auth/AuthAside";
import { FormAlert } from "@/components/auth/FormAlert";
import { InputField } from "@/components/ui/Field";
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

const demoAccounts = [
  {
    title: "حساب والدین",
    email: "parent@example.com",
    password: "demo1234",
  },
  {
    title: "حساب مدیر",
    email: "admin@brightpaths.example",
    password: "admin1234",
  },
];

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const { notify } = useToast();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    document.title = `ورود به حساب | ${brand.nameFa}`;
  }, []);

  if (loading) {
    return <PageLoader label="در حال بررسی حساب…" />;
  }

  if (user) {
    return (
      <Navigate
        to={safeRedirect(
          state?.from,
          user.role === "admin" ? "/admin" : "/dashboard",
        )}
        replace
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      notify("خوش آمدید! وارد حساب خود شدید.", "success");
    } catch (error) {
      if (error instanceof ApiError && error.field === "email") {
        setError("email", { message: error.message });
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "ورود ممکن نشد؛ لطفاً دوباره تلاش کنید.",
        );
      }
    }
  });

  const quickLogin = async (account: (typeof demoAccounts)[number]) => {
    setFormError(null);
    setDemoLoading(account.email);
    setValue("email", account.email);
    setValue("password", account.password);
    try {
      await login({ email: account.email, password: account.password });
      notify("حساب نمایشی با موفقیت وارد شد.", "success");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "ورود نمایشی ممکن نشد؛ دوباره تلاش کنید.",
      );
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <section className="relative overflow-hidden bg-surface-soft/40 py-10 sm:py-16">
      <DotGrid className="absolute -start-8 top-16 h-40 w-56 opacity-30" />
      <div className="container-page relative">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-stretch">
          <div className="rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-soft sm:p-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft/30 px-3 py-1.5 text-[11px] font-bold text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              ورود به مسیر
            </span>
            <h1 className="mt-4 text-3xl font-bold text-ink">خوش برگشته‌اید</h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              برای دیدن سفارش‌ها، کدهای لایسنس و ادامه‌ی مسیر وارد حساب خود
              شوید.
            </p>

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
                {...register("email")}
              />

              <InputField
                label="رمز عبور"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="رمز عبور خود را وارد کنید"
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

              <Button
                type="submit"
                size="lg"
                fullWidth
                arrow
                icon={LogIn}
                loading={isSubmitting}
              >
                {isSubmitting ? "در حال ورود…" : "ورود به حساب"}
              </Button>

              <p className="text-center text-xs text-muted">
                حساب ندارید؟{" "}
                <Link
                  to="/register"
                  state={state}
                  className="font-bold text-primary transition hover:text-primary-dark"
                >
                  ساخت حساب والدین
                </Link>
              </p>
            </form>

            <details className="group mt-6 rounded-2xl border border-dashed border-primary/20 bg-surface-soft/60 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-muted marker:content-none">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                  دسترسی نمایشی برای بازبینی
                </span>
                <span className="text-[10px] text-muted/70 group-open:hidden">
                  باز کردن
                </span>
                <span className="hidden text-[10px] text-muted/70 group-open:inline">
                  بستن
                </span>
              </summary>
              <p className="mt-3 text-[11px] leading-6 text-muted">
                این نسخه با داده‌های ساختگی کار می‌کند. برای دیدن داشبورد
                والدین یا پنل مدیریت، یکی از حساب‌های نمونه را انتخاب کنید.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => void quickLogin(account)}
                    disabled={demoLoading !== null}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-start transition hover:border-primary/30 hover:bg-primary-soft/10 disabled:opacity-60"
                  >
                    <span className="block text-xs font-bold text-ink">
                      {account.title}
                    </span>
                    <span dir="ltr" className="ltr-inline mt-1 block truncate font-mono text-[10px] text-muted">
                      {account.email}
                    </span>
                  </button>
                ))}
              </div>
            </details>
          </div>

          <AuthAside />
        </div>
      </div>
    </section>
  );
}
