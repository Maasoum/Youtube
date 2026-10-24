import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface FormAlertProps {
  message: string;
  variant?: "error" | "success";
}

export function FormAlert({ message, variant = "error" }: FormAlertProps) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border px-4 py-3",
        variant === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="m-0 text-xs leading-6">{message}</p>
    </div>
  );
}
