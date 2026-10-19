import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { ArrowLeft, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "onDark"
  | "outlineLight"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

interface SharedButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  arrow?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

const baseClasses =
  "group inline-flex items-center justify-center gap-2 rounded-full font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-pop hover:bg-primary-dark focus-visible:ring-primary/30",
  secondary:
    "border border-primary/35 bg-white text-primary hover:border-primary hover:bg-primary-soft/20 focus-visible:ring-primary/25",
  accent:
    "bg-accent text-ink hover:bg-[#EDBB33] focus-visible:ring-accent/40",
  onDark:
    "bg-white text-primary hover:bg-white/90 focus-visible:ring-white/40",
  outlineLight:
    "border border-white/55 bg-transparent text-white hover:bg-white/10 focus-visible:ring-white/30",
  ghost:
    "bg-transparent text-ink hover:bg-surface-soft focus-visible:ring-primary/20",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-200",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 py-2 text-xs",
  md: "min-h-12 px-5 py-2.5 text-sm",
  lg: "min-h-14 px-6 py-3 text-base",
};

const iconCircleSizes: Record<ButtonSize, string> = {
  sm: "size-7",
  md: "size-8",
  lg: "size-9",
};

const circleClasses: Record<ButtonVariant, string> = {
  primary: "bg-white text-primary",
  secondary: "bg-primary text-white",
  accent: "bg-ink text-white",
  onDark: "bg-primary text-white",
  outlineLight: "bg-white/15 text-white",
  ghost: "bg-primary-soft/40 text-primary",
  danger: "bg-red-600 text-white",
};

function Content({
  children,
  variant,
  size,
  arrow,
  icon: Icon,
  loading,
}: SharedButtonProps & { loading?: boolean }) {
  return (
    <>
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="size-4" aria-hidden="true" />
      ) : null}
      <span>{children}</span>
      {arrow && !loading ? (
        <span className="inline-flex items-center justify-center gap-0">
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              iconCircleSizes[size ?? "md"],
              circleClasses[variant ?? "primary"],
            )}
          >
            <ArrowLeft className="size-4" />
          </span>
        </span>
      ) : null}
    </>
  );
}

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    SharedButtonProps {
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  arrow = false,
  icon,
  fullWidth = false,
  loading = false,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      <Content
        variant={variant}
        size={size}
        arrow={arrow}
        icon={icon}
        loading={loading}
      >
        {children}
      </Content>
    </button>
  );
}

type ButtonLinkProps = LinkProps &
  SharedButtonProps & {
    to: string;
  };

export function ButtonLink({
  children,
  to,
  variant = "primary",
  size = "md",
  className,
  arrow = false,
  icon,
  fullWidth = false,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      <Content
        variant={variant}
        size={size}
        arrow={arrow}
        icon={icon}
        loading={false}
      >
        {children}
      </Content>
    </Link>
  );
}
