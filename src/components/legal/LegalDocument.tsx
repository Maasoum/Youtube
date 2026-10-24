import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Scale } from "lucide-react";
import { brand } from "@/config/brand";
import { formatDate, toPersianDigits } from "@/lib/format";
import { PageIntro } from "@/components/ui/PageIntro";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { DotGrid } from "@/components/ui/Decorations";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalDocumentProps {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
  children?: ReactNode;
}

const legalLinks = [
  { to: "/terms", label: "قوانین و مقررات" },
  { to: "/privacy", label: "حریم خصوصی" },
  { to: "/refund-policy", label: "شرایط بازگشت وجه" },
];

export function LegalDocument({
  slug,
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
  children,
}: LegalDocumentProps) {
  useEffect(() => {
    document.title = `${title} | ${brand.nameFa}`;
  }, [title]);

  return (
    <>
      <PageIntro
        eyebrow={eyebrow}
        title={title}
        description={description}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Breadcrumbs items={[{ label: title }]} />
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-muted shadow-sm">
            پیش‌نویس اولیه — آخرین به‌روزرسانی: {formatDate(updatedAt)}
          </span>
        </div>
      </PageIntro>

      <section className="relative overflow-hidden py-10 sm:py-16">
        <DotGrid className="absolute -start-8 top-32 hidden h-40 w-56 opacity-25 lg:block" />
        <div className="container-page relative">
          <div
            role="note"
            className="mb-9 flex flex-col gap-3 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-start sm:p-6"
          >
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-900">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-950">
                نیاز به بازبینی حقوقی
              </p>
              <p className="mt-2 text-xs leading-7 text-amber-900/90 sm:text-sm">
                این متن یک پیش‌نویس اولیه است و صرفاً برای شفاف‌سازی تجربه‌ی
                کاربری نوشته شده؛ یک سند حقوقی نهایی یا مشاوره‌ی حقوقی نیست.
                پیش از انتشار عمومی، باید توسط وکیل یا مشاور حقوقی بررسی،
                تکمیل و با قوانین جاری (از جمله قوانین تجارت الکترونیک و
                حمایت از حقوق مصرف‌کننده) تطبیق داده شود. جای‌نگهدارهای
                داخل کروشه نیز باید با اطلاعات واقعی کسب‌وکار جایگزین شوند.
              </p>
            </div>
          </div>

          <div className="grid gap-9 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <nav
                aria-label="فهرست بخش‌های این سند"
                className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <p className="flex items-center gap-2 text-xs font-bold text-ink">
                  <Scale className="size-4 text-primary" aria-hidden="true" />
                  در این سند
                </p>
                <ol className="mt-3 space-y-1">
                  {sections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex items-start gap-2 rounded-xl px-2.5 py-2 text-xs leading-6 text-muted transition hover:bg-surface-soft hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                      >
                        <span className="font-bold tabular-nums text-primary/70">
                          {toPersianDigits(index + 1)}.
                        </span>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              <div className="mt-5 rounded-3xl bg-surface-soft p-5">
                <p className="text-xs font-bold text-ink">اسناد مرتبط</p>
                <ul className="mt-3 space-y-2">
                  {legalLinks
                    .filter((item) => item.to !== `/${slug}`)
                    .map((item) => (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-primary"
                        >
                          <ArrowLeft className="size-3.5" aria-hidden="true" />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            </aside>

            <article className="min-w-0 rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-soft sm:p-9">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-heading`}
                  className={index > 0 ? "mt-9 border-t border-black/5 pt-9" : ""}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft/35 text-xs font-bold text-primary"
                    >
                      {toPersianDigits(index + 1)}
                    </span>
                    <h2
                      id={`${section.id}-heading`}
                      className="scroll-mt-28 text-lg font-bold leading-8 text-ink sm:text-xl"
                    >
                      {section.title}
                    </h2>
                  </div>

                  <div className="mt-4 grid gap-3 ps-0 sm:ps-11">
                    {section.paragraphs?.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 28)}
                        className="text-sm leading-8 text-muted"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets ? (
                      <ul className="mt-1 grid gap-2.5">
                        {section.bullets.map((bullet) => (
                          <li
                            key={bullet.slice(0, 28)}
                            className="flex items-start gap-2.5 text-sm leading-8 text-muted"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-3 size-1.5 shrink-0 rounded-full bg-primary"
                            />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}

              {children}

              <div className="mt-10 flex flex-col gap-4 rounded-3xl bg-surface-soft p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-6 text-muted">
                  پرسشی درباره‌ی این سند دارید؟ برای شفاف‌سازی بنویسید؛ پیش از
                  انتشار نسخه‌ی نهایی هم پاسخ می‌دهیم.
                </p>
                <ButtonLink to="/contact" variant="secondary" size="sm">
                  تماس با ما
                </ButtonLink>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
