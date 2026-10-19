import { Link } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="مسیر صفحه" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <li>
          <Link
            to="/"
            className="inline-flex size-8 items-center justify-center rounded-full transition hover:bg-white hover:text-primary"
            aria-label="صفحه‌ی اصلی"
          >
            <Home className="size-4" aria-hidden="true" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              <ChevronLeft className="size-3.5 opacity-50" aria-hidden="true" />
              {isLast || !item.to ? (
                <span aria-current={isLast ? "page" : undefined} className="font-bold text-ink">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="rounded transition hover:text-primary"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
