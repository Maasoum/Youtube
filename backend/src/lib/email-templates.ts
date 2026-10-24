import { formatJalaliDateTime, formatToman } from "./format.js";

/**
 * قالب‌های ایمیل فارسی و راست‌چین.
 *
 * محدودیت‌ها:
 * - CSS فقط به‌صورت درون‌خطی (inline) است؛ هیچ فایل یا فونت بیرونی بارگذاری نمی‌شود.
 * - هیچ تصویر بیرونی در قالب نیست.
 * - قالب متن ساده هم در کنار HTML ساخته می‌شود تا کلاینت‌های ساده هم پیام را ببینند.
 * - کلید لایسنس فقط وقتی در HTML/متن قرار می‌گیرد که تنظیمات صریحاً اجازه داده باشد.
 */

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const BRAND = "مسیرهای روشن";

const COLORS = {
  ink: "#111111",
  muted: "#6B6B7B",
  primary: "#6446E0",
  primarySoft: "#CFC5F8",
  surface: "#F4F3F9",
  border: "#E4E1F0",
  accent: "#F7C948",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:26px;color:${COLORS.ink};text-align:right;">${escapeHtml(
    text,
  )}</p>`;
}

function mutedParagraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:12px;line-height:24px;color:${COLORS.muted};text-align:right;">${escapeHtml(
    text,
  )}</p>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 18px;font-size:20px;line-height:32px;color:${COLORS.ink};font-weight:700;text-align:right;">${escapeHtml(
    text,
  )}</h1>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 20px;"><tr><td style="border-radius:999px;background:${COLORS.primary};"><a href="${escapeHtml(
    href,
  )}" style="display:inline-block;padding:12px 28px;font-family:Tahoma,'Segoe UI',sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(
    label,
  )}</a></td></tr></table>`;
}

function codeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;"><tr><td dir="ltr" style="padding:14px 18px;border:1px dashed ${COLORS.primary};border-radius:14px;background:${COLORS.surface};font-family:Tahoma,monospace;font-size:15px;font-weight:700;color:${COLORS.primary};text-align:center;word-break:break-all;">${escapeHtml(
    code,
  )}</td></tr></table>`;
}

function infoRows(rows: Array<[string, string]>): string {
  if (rows.length === 0) return "";
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;font-size:12px;color:${COLORS.muted};text-align:right;white-space:nowrap;">${escapeHtml(
          label,
        )}</td><td style="padding:8px 12px;font-size:13px;color:${COLORS.ink};text-align:right;">${escapeHtml(
          value,
        )}</td></tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;border-top:1px solid ${COLORS.border};border-bottom:1px solid ${COLORS.border};">${body}</table>`;
}

export interface EmailLayoutInput {
  heading: string;
  intro?: string;
  bodyHtml?: string;
  footerNote?: string;
  /** برای ایمیل‌های هشدار مدیر، عنوان بالای قالب تغییر می‌کند. */
  eyebrow?: string;
}

/** پوسته‌ی مشترک همه‌ی ایمیل‌ها؛ کاملاً RTL و بدون منبع بیرونی. */
export function renderEmailLayout(input: EmailLayoutInput): string {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(input.heading)} | ${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.surface};font-family:Tahoma,'Segoe UI',Arial,sans-serif;direction:rtl;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.surface};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${COLORS.border};border-radius:20px;overflow:hidden;">
<tr><td style="padding:22px 26px 8px;text-align:right;">
<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${COLORS.primarySoft};color:${COLORS.primary};font-size:11px;font-weight:700;">${escapeHtml(
    input.eyebrow ?? BRAND,
  )}</span>
</td></tr>
<tr><td style="padding:10px 26px 26px;text-align:right;">
${heading(input.heading)}
${input.intro ? paragraph(input.intro) : ""}
${input.bodyHtml ?? ""}
</td></tr>
<tr><td style="padding:16px 26px;background:${COLORS.surface};text-align:right;">
${mutedParagraph(
    input.footerNote ??
      "این ایمیل به‌صورت خودکار از سامانه‌ی مسیرهای روشن ارسال شده است. اگر این پیام را انتظار نداشتید، آن را نادیده بگیرید.",
  )}
<p style="margin:0;font-size:11px;line-height:20px;color:${COLORS.muted};text-align:right;">${BRAND} — یادگیری مهارت‌های دیجیتال برای کودکان</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function verificationEmail(params: {
  fullName: string;
  link: string;
}): RenderedEmail {
  const subject = `تأیید ایمیل حساب ${BRAND}`;
  const text = [
    `${params.fullName} عزیز،`,
    "",
    "برای فعال‌سازی حساب خود روی پیوند زیر بزنید. این پیوند یک‌بارمصرف است و ۲۴ ساعت اعتبار دارد.",
    params.link,
    "",
    "اگر این ثبت‌نام را شما انجام نداده‌اید، این ایمیل را نادیده بگیرید.",
  ].join("\n");

  const html = renderEmailLayout({
    heading: "ایمیل خود را تأیید کنید",
    intro: `${params.fullName} عزیز، برای فعال‌سازی حساب یک قدم مانده است.`,
    bodyHtml: [
      paragraph(
        "با تأیید ایمیل، می‌توانید وارد شوید، سفارش‌هایتان را ببینید و وضعیت صدور لایسنس را دنبال کنید.",
      ),
      button("تأیید ایمیل", params.link),
      mutedParagraph(
        "این پیوند یک‌بارمصرف است و پس از ۲۴ ساعت منقضی می‌شود. اگر این ثبت‌نام را شما انجام نداده‌اید، اقدامی لازم نیست.",
      ),
    ].join(""),
  });

  return { subject, text, html };
}

export function passwordResetEmail(params: {
  fullName: string;
  link: string;
}): RenderedEmail {
  const subject = `بازیابی رمز عبور ${BRAND}`;
  const text = [
    `${params.fullName} عزیز،`,
    "",
    "برای تعیین رمز عبور تازه روی پیوند زیر بزنید. این پیوند یک‌بارمصرف است و یک ساعت اعتبار دارد.",
    params.link,
    "",
    "اگر درخواست بازیابی نداده‌اید، رمز فعلی شما تغییر نمی‌کند و می‌توانید این ایمیل را نادیده بگیرید.",
  ].join("\n");

  const html = renderEmailLayout({
    heading: "تعیین رمز عبور تازه",
    intro: `${params.fullName} عزیز، درخواست بازیابی رمز برای حساب شما ثبت شد.`,
    bodyHtml: [
      paragraph(
        "برای تعیین رمز تازه روی دکمه‌ی زیر بزنید. پس از تغییر رمز، همه‌ی نشست‌های قبلی بسته می‌شوند.",
      ),
      button("تعیین رمز تازه", params.link),
      mutedParagraph(
        "این پیوند یک ساعت اعتبار دارد. اگر این درخواست را شما نداده‌اید، رمز فعلی شما تغییری نمی‌کند.",
      ),
    ].join(""),
  });

  return { subject, text, html };
}

export function welcomeEmail(params: { fullName: string }): RenderedEmail {
  const subject = `به ${BRAND} خوش آمدید`;
  const text = [
    `${params.fullName} عزیز،`,
    "",
    `حساب شما در ${BRAND} فعال شد.`,
    "دوره‌ها را ببینید، سفارش‌هایتان را از داشبورد پیگیری کنید و پس از صدور لایسنس، کلید دوره را در همان‌جا ببینید.",
    "",
    "اگر پرسشی داشتید، از صفحه‌ی تماس با ما بنویسید.",
  ].join("\n");

  const html = renderEmailLayout({
    heading: "حساب شما فعال شد",
    intro: `${params.fullName} عزیز، به ${BRAND} خوش آمدید.`,
    bodyHtml: [
      paragraph(
        "از این پس می‌توانید دوره‌ها را ببینید، سفارش‌هایتان را پیگیری کنید و پس از صدور لایسنس، کلید دوره را در داشبورد ببینید.",
      ),
      infoRows([
        ["مسیر دوره‌ها", `${BRAND} / دوره‌ها`],
        ["پشتیبانی", "از صفحه‌ی تماس با ما"],
      ]),
      mutedParagraph(
        "برای امنیت حساب، هیچ‌گاه رمز یا کلید لایسنس را با دیگران به اشتراک نگذارید.",
      ),
    ].join(""),
  });

  return { subject, text, html };
}

export function paymentReceiptEmail(params: {
  fullName: string;
  orderNumber: number;
  courseTitle: string;
  amountToman: number;
  refId?: string | null;
  paidAt: Date;
}): RenderedEmail {
  const subject = `رسید سفارش #${params.orderNumber} | ${BRAND}`;
  const tracking = params.refId
    ? `شماره پیگیری پرداخت: ${params.refId}`
    : "این سفارش بدون پرداخت آنلاین ثبت شده است.";

  const text = [
    `${params.fullName} عزیز،`,
    "",
    `پرداخت شما برای دوره‌ی «${params.courseTitle}» با موفقیت ثبت شد.`,
    `مبلغ: ${formatToman(params.amountToman)}`,
    `شماره سفارش: ${params.orderNumber}`,
    tracking,
    `تاریخ: ${formatJalaliDateTime(params.paidAt)}`,
    "",
    "لایسنس دوره پس از صدور توسط تیم مسیرهای روشن برای شما ثبت و ایمیل می‌شود.",
  ].join("\n");

  const html = renderEmailLayout({
    heading: "پرداخت شما ثبت شد",
    intro: `${params.fullName} عزیز، پرداخت دوره‌ی «${params.courseTitle}» با موفقیت ثبت شد.`,
    bodyHtml: [
      infoRows([
        ["شماره سفارش", `#${params.orderNumber}`],
        ["مبلغ پرداخت", formatToman(params.amountToman)],
        ["تاریخ", formatJalaliDateTime(params.paidAt)],
        ...(params.refId ? [["شماره پیگیری", params.refId] as [string, string]] : []),
      ]),
      paragraph(
        "سفارش شما در صف صدور لایسنس قرار گرفت. پس از تحویل، ایمیل «لایسنس شما آماده است» ارسال می‌شود و کلید در داشبورد شما قابل مشاهده خواهد بود.",
      ),
      mutedParagraph(
        "اگر این پرداخت را شما انجام نداده‌اید، همین حالا با پشتیبانی تماس بگیرید.",
      ),
    ].join(""),
  });

  return { subject, text, html };
}

export interface LicenseReadyEmailInput {
  fullName: string;
  courseTitle: string;
  orderNumber: number;
  /** فقط وقتی تنظیمات اجازه داده باشد پر می‌شود. */
  licenseKey?: string | null;
  activationUrl?: string | null;
  activationInstructions?: string | null;
  isGift?: boolean;
}

export function licenseReadyEmail(
  params: LicenseReadyEmailInput,
): RenderedEmail {
  const subject = `لایسنس شما آماده است | ${params.courseTitle}`;
  const keyLine = params.licenseKey
    ? [`کلید لایسنس: ${params.licenseKey}`]
    : ["کلید لایسنس به دلایل امنیتی در این ایمیل درج نشده است؛ آن را از داشبورد خود ببینید."];

  const text = [
    `${params.fullName} عزیز،`,
    "",
    params.isGift
      ? `دوره‌ی «${params.courseTitle}» به‌صورت هدیه برای حساب شما فعال شد.`
      : `لایسنس دوره‌ی «${params.courseTitle}» آماده است.`,
    ...keyLine,
    ...(params.activationUrl ? [`نشانی فعال‌سازی: ${params.activationUrl}`] : []),
    ...(params.activationInstructions ? ["", params.activationInstructions] : []),
    "",
    `شماره سفارش: ${params.orderNumber}`,
  ].join("\n");

  const html = renderEmailLayout({
    heading: params.isGift ? "یک دوره به شما هدیه شد" : "لایسنس شما آماده است",
    intro: `${params.fullName} عزیز، ${
      params.isGift
        ? `دوره‌ی «${params.courseTitle}» به حساب شما اضافه شد.`
        : `کلید دوره‌ی «${params.courseTitle}» صادر شد.`
    }`,
    bodyHtml: [
      ...(params.licenseKey ? [codeBlock(params.licenseKey)] : []),
      infoRows([
        ["شماره سفارش", `#${params.orderNumber}`],
        ...(params.activationUrl
          ? [["نشانی فعال‌سازی", params.activationUrl] as [string, string]]
          : []),
      ]),
      params.activationInstructions
        ? paragraph(params.activationInstructions)
        : "",
      params.licenseKey
        ? mutedParagraph(
            "کلید بالا محرمانه است؛ آن را فقط در پنل ارائه‌دهنده وارد کنید و با دیگران به اشتراک نگذارید.",
          )
        : paragraph(
            "برای دیدن کلید، وارد داشبورد خود شوید و در بخش دوره‌های من روی «نمایش کلید» بزنید.",
          ),
    ].join(""),
  });

  return { subject, text, html };
}

export function licenseUpdatedEmail(params: {
  fullName: string;
  courseTitle: string;
  licenseKey?: string | null;
}): RenderedEmail {
  const subject = `به‌روزرسانی لایسنس دوره‌ی ${params.courseTitle}`;
  const text = [
    `${params.fullName} عزیز،`,
    "",
    `اطلاعات لایسنس دوره‌ی «${params.courseTitle}» به‌روزرسانی شد.`,
    ...(params.licenseKey ? [`کلید لایسنس: ${params.licenseKey}`] : []),
    "",
    "برای دیدن جزئیات به داشبورد مراجعه کنید.",
  ].join("\n");

  const html = renderEmailLayout({
    heading: "لایسنس شما به‌روزرسانی شد",
    intro: `${params.fullName} عزیز، اطلاعات لایسنس دوره‌ی «${params.courseTitle}» به‌روزرسانی شد.`,
    bodyHtml: [
      params.licenseKey ? codeBlock(params.licenseKey) : "",
      paragraph(
        params.licenseKey
          ? "کلید بالا محرمانه است؛ آن را فقط در پنل ارائه‌دهنده وارد کنید."
          : "برای دیدن کلید، به داشبورد خود مراجعه کنید.",
      ),
    ].join(""),
  });

  return { subject, text, html };
}

export function delayNoticeEmail(params: {
  fullName: string;
  courseTitle: string;
  orderNumber: number;
  reason?: string | null;
}): RenderedEmail {
  const subject = `اطلاع‌رسانی درباره‌ی زمان تحویل سفارش #${params.orderNumber}`;
  const text = [
    `${params.fullName} عزیز،`,
    "",
    `صدور لایسنس دوره‌ی «${params.courseTitle}» کمی بیشتر از موعد همیشگی طول کشیده است.`,
    ...(params.reason ? [`توضیح: ${params.reason}`] : []),
    "",
    "سفارش شما در اولویت بررسی است و پس از آماده‌شدن، ایمیل تحویل برای شما ارسال می‌شود.",
    "از صبر شما سپاسگزاریم.",
  ].join("\n");

  const html = renderEmailLayout({
    heading: "سفارش شما در حال بررسی است",
    intro: `${params.fullName} عزیز، صدور لایسنس دوره‌ی «${params.courseTitle}» کمی بیشتر از موعد همیشگی طول کشیده است.`,
    bodyHtml: [
      params.reason ? infoRows([["توضیح", params.reason]]) : "",
      paragraph(
        "سفارش شما در اولویت بررسی است و پس از آماده‌شدن، ایمیل تحویل برای شما ارسال می‌شود. از صبر شما سپاسگزاریم.",
      ),
      mutedParagraph("شماره سفارش شما در بالای این ایمیل آمده است."),
    ].join(""),
  });

  return { subject, text, html };
}

export function refundNoticeEmail(params: {
  fullName: string;
  courseTitle: string;
  orderNumber: number;
  amountToman?: number;
  reason?: string | null;
}): RenderedEmail {
  const subject = `بازگشت وجه سفارش #${params.orderNumber}`;
  const text = [
    `${params.fullName} عزیز،`,
    "",
    `سفارش دوره‌ی «${params.courseTitle}» بازگشت وجه شد.`,
    ...(params.amountToman !== undefined
      ? [`مبلغ: ${formatToman(params.amountToman)}`]
      : []),
    ...(params.reason ? [`توضیح: ${params.reason}`] : []),
    "",
    "بازگشت مبلغ در پنل درگاه پرداخت انجام می‌شود و ممکن است چند روز کاری زمان ببرد.",
  ].join("\n");

  const html = renderEmailLayout({
    heading: "بازگشت وجه ثبت شد",
    intro: `${params.fullName} عزیز، سفارش دوره‌ی «${params.courseTitle}» بازگشت وجه شد.`,
    bodyHtml: [
      infoRows([
        ["شماره سفارش", `#${params.orderNumber}`],
        ...(params.amountToman !== undefined
          ? [["مبلغ", formatToman(params.amountToman)] as [string, string]]
          : []),
        ...(params.reason ? [["توضیح", params.reason] as [string, string]] : []),
      ]),
      paragraph(
        "بازگشت مبلغ در پنل درگاه پرداخت انجام می‌شود و ممکن است چند روز کاری زمان ببرد. لایسنس این سفارش لغو شده است.",
      ),
    ].join(""),
  });

  return { subject, text, html };
}

export function orderCancelledEmail(params: {
  fullName: string;
  courseTitle: string;
  orderNumber: number;
  reason?: string | null;
}): RenderedEmail {
  const subject = `لغو سفارش #${params.orderNumber}`;
  const text = [
    `${params.fullName} عزیز،`,
    "",
    `سفارش دوره‌ی «${params.courseTitle}» لغو شد.`,
    ...(params.reason ? [`دلیل: ${params.reason}`] : []),
    "",
    "اگر مبلغی پرداخت کرده‌اید، برای هماهنگی بازگشت وجه با پشتیبانی تماس بگیرید.",
  ].join("\n");

  const html = renderEmailLayout({
    heading: "سفارش شما لغو شد",
    intro: `${params.fullName} عزیز، سفارش دوره‌ی «${params.courseTitle}» لغو شد.`,
    bodyHtml: [
      infoRows([
        ["شماره سفارش", `#${params.orderNumber}`],
        ...(params.reason ? [["دلیل", params.reason] as [string, string]] : []),
      ]),
      paragraph(
        "اگر مبلغی پرداخت کرده‌اید، برای هماهنگی بازگشت وجه با پشتیبانی تماس بگیرید.",
      ),
    ].join(""),
  });

  return { subject, text, html };
}

export function adminAlertEmail(params: {
  subject: string;
  lines: string[];
}): RenderedEmail {
  const text = ["هشدار مدیر", "", ...params.lines].join("\n");
  const html = renderEmailLayout({
    eyebrow: "هشدار مدیر",
    heading: "نیاز به بررسی در پنل مدیریت",
    bodyHtml: [
      infoRows(params.lines.map((line, index) => [`ردیف ${index + 1}`, line])),
      mutedParagraph(
        "این پیام فقط برای مدیران ارسال شده است و هیچ کلید لایسنس یا توکن درگاهی در آن نیست.",
      ),
    ].join(""),
  });

  return { subject: params.subject, text, html };
}
