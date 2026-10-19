import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Menu, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "دوره‌ها", to: "/courses" },
  { label: "چطور کار می‌کند", to: "/how-it-works" },
  { label: "درباره ما", to: "/about" },
  { label: "پرسش‌های شما", to: "/faq" },
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

export function Header() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md">
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Logo size="md" />

        <nav aria-label="منوی اصلی" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex rounded-full px-3 py-2 text-[13px] font-bold transition xl:px-3.5 xl:text-sm",
                      isActive
                        ? "bg-primary-soft/30 text-primary"
                        : "text-muted hover:bg-surface-soft hover:text-ink",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {loading ? (
            <AuthSkeleton />
          ) : user ? (
            <>
              {user.role === "admin" ? (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-muted transition hover:bg-surface-soft hover:text-primary"
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  پنل مدیریت
                </Link>
              ) : null}
              <DashboardLink />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-3.5 py-2 text-sm font-bold text-muted transition hover:bg-surface-soft hover:text-ink"
              >
                ورود
              </Link>
              <ButtonLink to="/courses" size="sm" arrow>
                شروع مسیر
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
          className="inline-flex size-11 items-center justify-center rounded-full border border-black/10 bg-white text-ink transition hover:bg-surface-soft lg:hidden"
        >
          {mobileOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {mobileOpen ? (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t border-black/5 bg-white lg:hidden"
          >
            <nav aria-label="منوی موبایل" className="container-page py-4">
              <ul className="flex flex-col gap-1">
                <li>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      cn(
                        "block rounded-2xl px-4 py-3 text-sm font-bold transition",
                        isActive
                          ? "bg-primary-soft/30 text-primary"
                          : "text-ink hover:bg-surface-soft",
                      )
                    }
                  >
                    خانه
                  </NavLink>
                </li>
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "block rounded-2xl px-4 py-3 text-sm font-bold transition",
                          isActive
                            ? "bg-primary-soft/30 text-primary"
                            : "text-ink hover:bg-surface-soft",
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-4">
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
                  </>
                ) : (
                  <>
                    <ButtonLink
                      to="/login"
                      variant="secondary"
                      size="sm"
                      fullWidth
                    >
                      ورود به حساب
                    </ButtonLink>
                    <ButtonLink to="/courses" size="sm" fullWidth arrow>
                      شروع مسیر
                    </ButtonLink>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
