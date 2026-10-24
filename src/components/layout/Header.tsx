import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { brand } from "@/config/brand";
import { Logo } from "@/components/brand/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "دوره‌ها", to: "/courses" },
  { label: "چطور کار می‌کند", to: "/how-it-works" },
  { label: "درباره ما", to: "/about" },
  { label: "وبلاگ", to: "/blog" },
  { label: "سوالات متداول", to: "/faq" },
];

function AuthSkeleton() {
  return <div className="h-10 w-28 animate-pulse rounded-full bg-surface-soft" />;
}

function DashboardLink({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Link
      to="/dashboard"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-black/5 bg-surface-soft/60 py-1.5 pe-3 ps-1.5 text-sm font-bold text-ink transition hover:border-primary/20 hover:bg-primary-soft/20",
        compact && "w-full justify-center",
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {user.fullName.trim().charAt(0)}
      </span>
      <span>داشبورد من</span>
    </Link>
  );
}

function MobileNavLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "block rounded-full px-4 py-3 text-sm transition",
          isActive
            ? "bg-primary-soft/25 font-bold text-primary"
            : "text-ink/75 hover:bg-surface-soft hover:text-ink",
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function Header() {
  const { user, loading, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setMobileOpen(false);
      notify("از حساب خود خارج شدید.", "info");
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/85 backdrop-blur-xl">
        <div className="container-page flex h-[76px] items-center justify-between gap-4">
          <Logo size="md" />

          <nav aria-label="منوی اصلی" className="hidden lg:block">
            <ul className="flex items-center gap-1.5">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex rounded-full border px-3.5 py-2 text-[13px] transition xl:px-4",
                        isActive
                          ? "border-primary/25 bg-primary-soft/20 font-bold text-primary"
                          : "border-[#ECE8F7] bg-white text-ink/70 hover:border-primary/25 hover:text-ink",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            {loading ? (
              <AuthSkeleton />
            ) : user ? (
              <UserMenu />
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-ink/70 transition hover:text-ink"
                >
                  ورود
                </Link>
                <ButtonLink
                  to="/courses"
                  variant="secondary"
                  size="sm"
                  arrow
                  className="border-primary/25 text-ink hover:border-primary/45 hover:bg-primary-soft/10"
                >
                  شروع کنید
                </ButtonLink>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label="باز کردن منو"
            className="inline-flex size-11 items-center justify-center rounded-full border border-black/10 bg-white text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen
          ? [
              <motion.div
                key="mobile-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
              />,
              <motion.div
                key="mobile-panel"
                ref={panelRef}
                id="mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label="منوی موبایل"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
                className="fixed inset-y-0 start-0 z-[70] flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
                  <Logo size="sm" linked={false} />
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="بستن منو"
                    className="inline-flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>

                <nav aria-label="منوی موبایل" className="flex-1 px-3 py-4">
                  <ul className="flex flex-col gap-1">
                    <li>
                      <MobileNavLink to="/">خانه</MobileNavLink>
                    </li>
                    {navItems.map((item) => (
                      <li key={item.to}>
                        <MobileNavLink to={item.to}>
                          {item.label}
                        </MobileNavLink>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="space-y-2 border-t border-black/5 px-4 py-4">
                  {loading ? (
                    <AuthSkeleton />
                  ) : user ? (
                    <>
                      <DashboardLink compact />
                      {user.role === "admin" ? (
                        <ButtonLink
                          to="/admin"
                          variant="secondary"
                          size="sm"
                          fullWidth
                          icon={LayoutDashboard}
                        >
                          پنل مدیریت
                        </ButtonLink>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        icon={LogOut}
                        loading={loggingOut}
                        onClick={() => void handleLogout()}
                        className="text-red-600 hover:bg-red-50"
                      >
                        خروج از حساب
                      </Button>
                    </>
                  ) : (
                    <>
                      <ButtonLink
                        to="/login"
                        variant="secondary"
                        size="sm"
                        fullWidth
                        icon={LogIn}
                      >
                        ورود به حساب
                      </ButtonLink>
                      <ButtonLink to="/courses" size="sm" fullWidth arrow>
                        شروع کنید
                      </ButtonLink>
                    </>
                  )}
                  <p className="pt-2 text-center text-[10px] leading-5 text-muted">
                    {brand.nameFa} — یادگیری هوش مصنوعی برای کودکان
                  </p>
                </div>
              </motion.div>,
            ]
          : null}
      </AnimatePresence>
    </>
  );
}
