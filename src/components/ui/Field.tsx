import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** برچسب برای صفحه‌خوان خوانده می‌شود ولی دیده نمی‌شود (فرم‌های فشرده). */
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  dirLtr?: boolean;
  mono?: boolean;
  endAdornment?: ReactNode;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField(
    {
      label,
      hideLabel = false,
      error,
      hint,
      icon: Icon,
      dirLtr = false,
      mono = false,
      endAdornment,
      className,
      id,
      required,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const messageId = `${inputId}-message`;

    return (
      <div>
        <label
          htmlFor={inputId}
          className={hideLabel ? "sr-only" : "label-base"}
        >
          {label}
          {required ? (
            <span className="ms-1 text-red-500" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        <div className="relative">
          {Icon ? (
            <Icon
              className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
          ) : null}
          <input
            ref={ref}
            id={inputId}
            dir={dirLtr ? "ltr" : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            required={required}
            className={cn(
              "input-base",
              Icon && "ps-12",
              endAdornment ? "pe-12" : false,
              dirLtr && "text-start",
              mono && "font-mono tracking-wide",
              error && "input-error",
              className,
            )}
            {...rest}
          />
          {endAdornment ? (
            <span className="absolute end-2 top-1/2 -translate-y-1/2">
              {endAdornment}
            </span>
          ) : null}
        </div>
        {error ? (
          <p
            id={messageId}
            role="alert"
            className="mt-2 text-xs font-bold leading-6 text-red-600"
          >
            {error}
          </p>
        ) : hint ? (
          <p id={messageId} className="mt-2 text-xs leading-6 text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

interface TextareaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField(
    { label, error, hint, className, id, required, ...rest },
    ref,
  ) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const messageId = `${fieldId}-message`;

    return (
      <div>
        <label htmlFor={fieldId} className="label-base">
          {label}
          {required ? (
            <span className="ms-1 text-red-500" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          rows={4}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          required={required}
          className={cn(
            "input-base min-h-28 resize-y",
            error && "input-error",
            className,
          )}
          {...rest}
        />
        {error ? (
          <p
            id={messageId}
            role="alert"
            className="mt-2 text-xs font-bold leading-6 text-red-600"
          >
            {error}
          </p>
        ) : hint ? (
          <p id={messageId} className="mt-2 text-xs leading-6 text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

interface CheckboxFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
}

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  function CheckboxField({ label, error, className, id, ...rest }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = `${fieldId}-error`;

    return (
      <div>
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "mt-1 size-5 shrink-0 cursor-pointer rounded-md border-black/20 accent-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
              className,
            )}
            {...rest}
          />
          <label
            htmlFor={fieldId}
            className="cursor-pointer text-xs leading-6 text-muted sm:text-sm"
          >
            {label}
          </label>
        </div>
        {error ? (
          <p id={errorId} role="alert" className="mt-2 text-xs font-bold text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
