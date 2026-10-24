import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  LifeBuoy,
  LogOut,
  Menu,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

export interface PanelNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

export interface PanelNavGroup {
  title?: string;
  items: PanelNavItem[];
}

interface PanelFrameProps {
  panelLabel: string;
  panelDescription: string;
  nav: PanelNavGroup[];
  homePath: string;
  headerSlot?: ReactNode;
  footerNote?: string;
  children: ReactNode;
}

function NavItems({
  groups,
  homePath,
  onNavigate,
}: {
  groups: PanelNavGroup[];
  homePath: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="منوی پنل" className="flex flex-1 flex-col gap-6">
      {groups.map((group, groupIndex) => (
        <div key={group.title ?? `group-${groupIndex}`}>
          {group.title ? (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted">
              {group.title}
            </p>
          ) : null}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end ?? item.to === homePath}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                        isActive
                          ? "bg-primary text-white shadow-pop"
                          : "text-ink hover:bg-surface-soft",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-xl transition",
                            isActive
                              ? "bg-white/15 text-white"
                              : "bg-surface-soft text-primary group-hover:bg-white",
                          )}
                        >
                          <Icon className="size-[18px]" aria-hidden="true" />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 ? (
                          <span
                            className={cn(
                              "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                              isActive
                                ? "bg-white text-primary"
                                : "bg-accent text-ink",
                            )}
                          >
                            {item.badge.toLocaleString("fa-IR")}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function PanelFrame({
  panelLabel,
  panelDescription,
  nav,
  homePath,
  headerSlot,
  footerNote,
  children,
}: PanelFrameProps) {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const drawer = drawerRef.current;
      const firstFocusable = drawer?.querySelector<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      firstFocusable?.focus();
    }, 60);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobile();
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      openButtonRef.current?.focus();
    };
  }, [mobileOpen, closeMobile]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      notify("از حساب خود خارج شدید.", "info");
      navigate("/");
    } finally {
      setLoggingOut(false);
    }
  };

  const sidebarContent = (
    <>
      <div className="px-1">
        <Logo size="sm" linked />
      </div>
      <div className="mt-6 rounded-2xl bg-surface-soft/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {panelLabel}
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          {panelDescription}
        </p>
      </div>
      <div className="mt-6 flex flex-1 flex-col">
        <NavItems groups={nav} homePath={homePath} />
      </div>
      <div className="mt-6 rounded-2xl border border-primary/10 bg-primary-soft/15 p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-primary">
          <LifeBuoy className="size-4" aria-hidden="true" />
          نیاز به کمک دارید؟
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          {footerNote ?? `پشتیبانی ${brand.nameFa} پاسخ‌گوی شماست.`}
        </p>
        <Link
          to="/contact"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary underline decoration-primary/30 underline-offset-4"
        >
          تماس با پشتیبانی
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-surface-soft/40">
      <a
        href="#panel-main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        پرش به محتوای اصلی
      </a>

      <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col overflow-y-auto border-e border-black/5 bg-white p-5 lg:flex print:hidden">
        {sidebarContent}
      </aside>

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur print:hidden">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                ref={openButtonRef}
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="باز کردن منوی پنل"
                aria-expanded={mobileOpen}
                className="inline-flex size-10 items-center justify-center rounded-full border border-black/5 bg-white text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <span className="text-sm font-bold text-ink lg:hidden">
                {panelLabel}
              </span>
              <div className="hidden items-center gap-2 text-xs text-muted lg:flex">
                <Link
                  to={homePath}
                  className="rounded-full px-2 py-1 font-bold text-primary transition hover:bg-primary-soft/20"
                >
                  {panelLabel}
                </Link>
                <span aria-hidden="true">/</span>
                <span>خوش آمدید، {user?.fullName ?? "کاربر"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {headerSlot}
              <Link
                to="/"
                className="hidden items-center gap-1 rounded-full border border-black/5 bg-white px-3 py-2 text-[11px] font-bold text-muted transition hover:text-primary sm:inline-flex"
              >
                مشاهده سایت
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              <div className="hidden items-center gap-2 rounded-full border border-black/5 bg-white py-1 pe-3 ps-1 sm:flex">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {user?.fullName.trim().charAt(0) ?? "م"}
                </span>
                <span className="max-w-32 truncate text-[11px] font-bold text-ink">
                  {user?.fullName ?? "کاربر"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="خروج از حساب"
                title="خروج از حساب"
                className="inline-flex size-10 items-center justify-center rounded-full border border-black/5 bg-white text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:opacity-50"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main id="panel-main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8 print:max-w-none print:p-0">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-2 text-[11px] text-muted sm:px-6 print:hidden">
          <p>
            {brand.nameFa} — {brand.tagline}
          </p>
        </footer>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="بستن منوی پنل"
              className="absolute inset-0 h-full w-full bg-ink/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobile}
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="منوی پنل"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col overflow-y-auto border-e border-black/5 bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <Logo size="sm" linked={false} />
                <button
                  type="button"
                  onClick={closeMobile}
                  aria-label="بستن منو"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-black/5 text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-1 flex-col">
                <NavItems
                  groups={nav}
                  homePath={homePath}
                  onNavigate={closeMobile}
                />
              </div>
              <div className="mt-6 rounded-2xl bg-surface-soft/70 p-4 text-[11px] leading-5 text-muted">
                {panelDescription}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
