import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { accountApi, getErrorMessage, type AccountDeletionReceipt } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  InputField,
} from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { PanelCard } from "@/components/panel/PanelCard";
import { PanelPageHeader } from "@/components/panel/PanelPageHeader";
import { zodResolver } from "@/lib/zodResolver";
import {
  accountDeletionSchema,
  changePasswordSchema,
  profileSchema,
  type AccountDeletionFormValues,
  type ChangePasswordFormValues,
  type ProfileFormValues,
} from "@/lib/validation";
import { formatDate } from "@/lib/format";

export function DashboardProfilePage() {
  const { user, refresh } = useAuth();
  const { notify } = useToast();
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deletionReceipt, setDeletionReceipt] =
    useState<AccountDeletionReceipt | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const deletionForm = useForm<AccountDeletionFormValues>({
    resolver: zodResolver(accountDeletionSchema),
    defaultValues: { confirmation: "", acknowledge: false },
  });

  const newPasswordValue = passwordForm.watch("newPassword");

  const onSubmitProfile = profileForm.handleSubmit(async (values) => {
    setProfileMessage(null);
    try {
      await accountApi.updateProfile(values);
      await refresh();
      setProfileMessage("اطلاعات پروفایل با موفقیت ذخیره شد.");
      notify("پروفایل به‌روزرسانی شد.", "success");
    } catch (caught) {
      const message = getErrorMessage(caught);
      profileForm.setError("root", { message });
    }
  });

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    setPasswordMessage(null);
    try {
      await accountApi.changePassword(values);
      passwordForm.reset();
      setPasswordMessage("رمز عبور تغییر کرد. از این پس با رمز جدید وارد شوید.");
      notify("رمز عبور تغییر کرد.", "success");
    } catch (caught) {
      const message = getErrorMessage(caught);
      passwordForm.setError("root", { message });
    }
  });

  const onSubmitDeletion = deletionForm.handleSubmit(async (values) => {
    try {
      const receipt = await accountApi.requestDeletion(values);
      setDeletionReceipt(receipt);
      setDeletionOpen(false);
      deletionForm.reset();
      notify("درخواست حذف حساب ثبت شد.", "info");
    } catch (caught) {
      deletionForm.setError("root", { message: getErrorMessage(caught) });
    }
  });

  if (!user) return null;

  return (
    <div className="space-y-5">
      <PanelPageHeader
        eyebrow="پنل کاربری"
        title="پروفایل و امنیت"
        description="اطلاعات حساب، رمز عبور و انتخاب‌های مربوط به حذف حساب."
      />

      <PanelCard>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-primary text-2xl font-bold text-white">
            {user.fullName.trim().charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-ink">{user.fullName}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted" dir="ltr">
              <Mail className="size-3.5" aria-hidden="true" />
              {user.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="chip bg-surface-soft text-[10px] text-muted">
                {user.role === "admin" ? "مدیر" : "والد یا سرپرست"}
              </span>
              <span className="chip bg-surface-soft text-[10px] text-muted">
                عضو از {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="اطلاعات شخصی"
        description="نام و شماره‌ی موبایل برای پیگیری سفارش‌ها و هماهنگی لایسنس استفاده می‌شود."
      >
        <form onSubmit={onSubmitProfile} noValidate className="space-y-4">
          {profileForm.formState.errors.root?.message ? (
            <FormAlert variant="error" message={profileForm.formState.errors.root.message} />
          ) : null}
          {profileMessage ? (
            <FormAlert variant="success" message={profileMessage} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="نام و نام خانوادگی"
              icon={UserRound}
              required
              autoComplete="name"
              error={profileForm.formState.errors.fullName?.message}
              {...profileForm.register("fullName")}
            />
            <InputField
              label="شماره موبایل"
              icon={ShieldCheck}
              required
              dirLtr
              inputMode="tel"
              autoComplete="tel"
              placeholder="09121234567"
              error={profileForm.formState.errors.phone?.message}
              {...profileForm.register("phone")}
            />
          </div>

          <InputField
            label="ایمیل"
            value={user.email}
            readOnly
            dirLtr
            hint="ایمیل حساب قابل ویرایش نیست؛ برای تغییر آن با پشتیبانی تماس بگیرید."
            className="bg-surface-soft/60"
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              loading={profileForm.formState.isSubmitting}
              icon={CheckCircle2}
            >
              ذخیره‌ی تغییرات
            </Button>
          </div>
        </form>
      </PanelCard>

      <PanelCard
        title="تغییر رمز عبور"
        description="رمز جدید باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد."
      >
        <form onSubmit={onSubmitPassword} noValidate className="space-y-4">
          {passwordForm.formState.errors.root?.message ? (
            <FormAlert variant="error" message={passwordForm.formState.errors.root.message} />
          ) : null}
          {passwordMessage ? (
            <FormAlert variant="success" message={passwordMessage} />
          ) : null}

          <InputField
            label="رمز عبور فعلی"
            type="password"
            icon={KeyRound}
            required
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register("currentPassword")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <InputField
                label="رمز عبور جدید"
                type="password"
                required
                autoComplete="new-password"
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register("newPassword")}
              />
              <PasswordStrength value={newPasswordValue ?? ""} />
            </div>
            <InputField
              label="تکرار رمز عبور جدید"
              type="password"
              required
              autoComplete="new-password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register("confirmPassword")}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              loading={passwordForm.formState.isSubmitting}
            >
              تغییر رمز عبور
            </Button>
          </div>
        </form>
      </PanelCard>

      <section className="rounded-3xl border border-red-200 bg-red-50/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-red-900">حذف حساب کاربری</h2>
            <p className="mt-1 text-[11px] leading-6 text-red-900/80">
              با حذف حساب، دسترسی به لایسنس‌ها، رسیدها و اعلان‌ها از بین می‌رود.
              درخواست شما ابتدا بررسی می‌شود و تا آن زمان حساب فعال می‌ماند.
            </p>
            {user.deletionRequestedAt || deletionReceipt ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-white p-3 text-[11px] leading-6 text-ink">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {deletionReceipt?.message ??
                  `درخواست حذف شما در ${formatDate(user.deletionRequestedAt ?? "")} ثبت شده و در انتظار بررسی است.`}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setDeletionOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-4 py-2 text-[11px] font-bold text-red-700 transition hover:bg-red-100"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                درخواست حذف حساب
              </button>
            )}
          </div>
        </div>
      </section>

      <Modal
        open={deletionOpen}
        onClose={() => setDeletionOpen(false)}
        title="درخواست حذف حساب"
        description="این کار فوری نیست؛ درخواست برای بررسی به تیم پشتیبانی ارسال می‌شود."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletionOpen(false)}
              disabled={deletionForm.formState.isSubmitting}
            >
              منصرف شدم
            </Button>
            <Button
              type="submit"
              form="account-deletion-form"
              variant="danger"
              size="sm"
              loading={deletionForm.formState.isSubmitting}
            >
              ثبت درخواست
            </Button>
          </>
        }
      >
        <form
          id="account-deletion-form"
          onSubmit={onSubmitDeletion}
          noValidate
          className="space-y-4"
        >
          {deletionForm.formState.errors.root?.message ? (
            <FormAlert variant="error" message={deletionForm.formState.errors.root.message} />
          ) : null}
          <p className="rounded-2xl bg-surface-soft/70 p-3 text-[11px] leading-6 text-muted">
            دسترسی شما به دوره‌های خریداری‌شده و کدهای لایسنس قطع خواهد شد.
            توصیه می‌کنیم پیش از ثبت درخواست، کدهای فعال خود را ذخیره کنید.
          </p>
          <InputField
            label="برای تأیید، عبارت «حذف» را بنویسید"
            placeholder="حذف"
            required
            error={deletionForm.formState.errors.confirmation?.message}
            {...deletionForm.register("confirmation")}
          />
          <CheckboxField
            label="می‌دانم که پس از حذف، بازیابی لایسنس‌ها و سابقه‌ی سفارش‌ها ممکن نیست."
            error={deletionForm.formState.errors.acknowledge?.message}
            {...deletionForm.register("acknowledge")}
          />
          {deletionForm.formState.isSubmitting ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              در حال ارسال درخواست…
            </p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
