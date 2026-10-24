import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/cn";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setOpen(false);
      notify("از حساب خود خارج شدید.", "info");
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-xs font-bold text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-menu"
        className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-surface-soft/60 py-1.5 pe-3 ps-1.5 text-sm font-bold text-ink transition hover:border-primary/20 hover:bg-primary-soft/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {user.fullName.trim().charAt(0)}
        </span>
        <span className="hidden max-w-24 truncate xl:inline">
          {user.fullName.split(" ")[0]}
        </span>
        <ChevronDown
          className={cn("size-4 text-muted transition", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id="user-menu"
          role="menu"
          aria-label="منوی کاربر"
          className="absolute end-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-black/5 bg-white p-2 shadow-pop"
        >
          <div className="rounded-xl bg-surface-soft/70 px-3 py-2.5">
            <p className="truncate text-xs font-bold text-ink">{user.fullName}</p>
            <p
              dir="ltr"
              className="mt-0.5 truncate text-start font-mono text-[10px] text-muted"
            >
              {user.email}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-primary-soft/40 px-2 py-0.5 text-[10px] font-bold text-primary">
              {user.role === "admin" ? "مدیر سایت" : "والد همراه"}
            </span>
          </div>

          <div className="mt-1.5 space-y-0.5">
            <Link
              to="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <LayoutDashboard className="size-4 text-primary" aria-hidden="true" />
              داشبورد من
            </Link>
            <Link
              to="/dashboard#orders"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <ReceiptText className="size-4 text-primary" aria-hidden="true" />
              سفارش‌های من
            </Link>
            {user.role === "admin" ? (
              <Link
                to="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                پنل مدیریت
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className={cn(itemClass, "text-red-600 hover:bg-red-50")}
            >
              <LogOut className="size-4" aria-hidden="true" />
              {loggingOut ? "در حال خروج…" : "خروج از حساب"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
