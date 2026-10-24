import type { ImageKey } from "@/types/image";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./http";
import {
  ApiError,
  type AccountDeletionInput,
  type AccountDeletionReceipt,
  type AddLicenseInput,
  type AdminLicenseListItem,
  type AdminStats,
  type AdminUserDetail,
  type AdminUserSummary,
  type AuditLogEntry,
  type AuthSession,
  type BlogPost,
  type BlogPostInput,
  type BlogPostSection,
  type BulkDiscountInput,
  type CancelOrderInput,
  type ChangePasswordInput,
  type ContactMessageInput,
  type ContactReceipt,
  type Course,
  type CourseAccessStatus,
  type CourseInput,
  type CreateDiscountInput,
  type CreateOrderInput,
  type DiscountCode,
  type DiscountType,
  type DiscountUsageReport,
  type DiscountValidation,
  type EditLicenseInput,
  type EmailMessage,
  type FulfillLicenseInput,
  type GeneralSettings,
  type GiftLicenseInput,
  type HoldOrderInput,
  type HomeFaq,
  type HomeFaqInput,
  type InboxMessage,
  type LeadInput,
  type LeadReceipt,
  type LeadRecord,
  type License,
  type LicenseReveal,
  type LoginInput,
  type MessageStatus,
  type Notification,
  type Order,
  type OrderDiscount,
  type OrderRefund,
  type OrderStatus,
  type OrderStatusEvent,
  type PasswordResetInput,
  type PasswordResetReceipt,
  type PaymentResult,
  type PaymentSettings,
  type PaymentState,
  type PaymentTokenReceipt,
  type PublicSiteSettings,
  type RefundOrderInput,
  type RegisterInput,
  type RevokeLicenseInput,
  type SavePaymentTokenInput,
  type SetUserActiveInput,
  type SiteContent,
  type SiteFaq,
  type Teacher,
  type TeacherInput,
  type UpdateDiscountInput,
  type UpdateProfileInput,
  type User,
  type ValidateDiscountInput,
} from "./types";

/**
 * adapter واقعی: هر متد به یکی از مسیرهای Fastify وصل می‌شود و پاسخ خام را
 * به تایپ‌های مشترک `src/api/types.ts` تبدیل می‌کند. هیچ داده‌ای در
 * localStorage ذخیره نمی‌شود و کلید لایسنس فقط در پاسخ همان درخواست
 * «نمایش» برمی‌گردد.
 */

/* -------------------------------------------------------------------------- */
/* انواع پاسخ خام سرور                                                        */
/* -------------------------------------------------------------------------- */

interface RawUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "admin" | "user";
  createdAt: string;
  emailVerified?: boolean;
  totpEnabled?: boolean;
  deletionRequestedAt?: string | null;
  disabledAt?: string | null;
  disabledReason?: string | null;
}

interface RawSession {
  user: RawUser;
  totpRequired?: boolean;
  totpSetupRequired?: boolean;
}

interface RawCourse {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string | string[];
  level: Course["level"];
  ageMin: number;
  ageMax: number;
  durationWeeks: number;
  sessions: number;
  priceToman: number;
  compareAtPriceToman?: number | null;
  outcomes: string[];
  syllabus: Array<{ title: string; summary: string }>;
  faqs: Array<{ question: string; answer: string }>;
  art?: string | null;
  badge?: string | null;
  popular?: boolean;
  featured?: boolean;
  providerName: string;
  providerPanelUrl?: string | null;
  providerSiteUrl?: string | null;
  activationUrl?: string | null;
  activationInstructions?: string | null;
  published?: boolean;
  isPublished?: boolean;
  updatedAt?: string;
}

interface RawLicense {
  id: string;
  maskedCode?: string;
  code?: string;
  issuedAt?: string;
  emailSentAt?: string | null;
  enteredBy?: string;
  description?: string | null;
  providerReference?: string | null;
  source: "purchase" | "admin_gift" | "provider" | "gift";
  revokedAt?: string | null;
  revokeReason?: string | null;
}

interface RawOrderEvent {
  id?: string | number;
  status: OrderStatus | null;
  at: string;
  note: string;
  byName?: string | null;
}

interface RawOrder {
  id: string;
  number: number;
  userId: string;
  status: OrderStatus;
  source?: "purchase" | "gift";
  course: {
    id: string;
    slug: string;
    title: string;
    art?: string | null;
    priceToman?: number;
  };
  customer: { fullName: string; email: string; phone: string | null };
  originalPriceToman?: number;
  unitPriceToman?: number;
  discountToman: number;
  discount?: {
    code: string;
    type: DiscountType;
    label: string;
    amountToman: number;
    percent?: number | null;
  } | null;
  taxPercent: number;
  taxToman: number;
  totalToman: number;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string | null;
  fulfilledAt?: string | null;
  expiresAt?: string | null;
  paymentRef?: string | null;
  paymentState?: PaymentState | "unpaid";
  license: RawLicense | null;
  note?: string | null;
  onHoldReason?: string | null;
  cancelReason?: string | null;
  refund?: {
    amountToman: number;
    reason: string | null;
    reference: string | null;
    refundedAt: string;
  } | null;
  statusHistory?: RawOrderEvent[];
  /** فقط در نمای صندوق تحویل مدیر */
  overdue?: boolean;
}

interface RawPanelOrder extends RawOrder {
  customer: { id?: string; fullName: string; email: string; phone: string | null };
  fulfilledAt: string | null;
  refund: {
    amountToman: number;
    reason: string | null;
    reference: string | null;
    refundedAt: string;
  } | null;
  paymentRef: string | null;
  license: RawLicense | null;
  overdue: boolean;
  overdueHours: number;
  statusHistory: Array<{
    status: OrderStatus | null;
    at: string;
    note: string;
    byName: string | null;
  }>;
}

interface RawDiscount {
  code: string;
  type: DiscountType;
  percent: number | null;
  amountToman: number | null;
  maxDiscountToman: number | null;
  minOrderToman: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  maxUsesPerUser: number;
  courseIds?: string[];
  firstPurchaseOnly: boolean;
  allowFree: boolean;
  createdAt: string;
}

interface RawFaq {
  id: string;
  question: string;
  answer: string;
  sortOrder?: number;
  order?: number;
  isActive?: boolean;
}

interface RawTeacher {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
  accent: string;
  sortOrder?: number;
  order?: number;
  isActive?: boolean;
}

interface RawBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  readMinutes: number;
  art?: string | null;
  body?: string;
  sections?: BlogPostSection[];
  status?: "draft" | "published";
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface RawEmail {
  id: string;
  orderId: string | null;
  to: string;
  subject: string;
  template: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts?: number;
  lastError?: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface RawLicenseListItem {
  id: string;
  maskedCode: string;
  orderId: string;
  orderNumber: number;
  userId: string;
  customerName: string;
  customerEmail: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  emailSentAt: string | null;
  source: "purchase" | "admin_gift";
  revokedAt: string | null;
  revokeReason: string | null;
  description?: string | null;
  providerReference?: string | null;
}

interface RawAdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "admin" | "user";
  isActive: boolean;
  emailVerified?: boolean;
  createdAt: string;
  deletionRequestedAt?: string | null;
  ordersCount: number;
  licensesCount: number;
  totalSpentToman: number | string;
  lastOrderAt: string | null;
}

interface RawPaymentSettings {
  hasToken: boolean;
  maskedToken: string;
  enabled: boolean;
  returnUrl: string;
  lastTestedAt: string | null;
  lastTestResult: "success" | "failed" | null;
}

interface RawGeneralSettings {
  fulfillmentSlaHours: number;
  includeLicenseKeyInEmail: boolean;
  taxPercent: number;
  footer: GeneralSettings["footer"];
  trustBadge: GeneralSettings["trustBadge"];
  updatedAt?: string;
}

/* -------------------------------------------------------------------------- */
/* ابزارهای نگاشت                                                             */
/* -------------------------------------------------------------------------- */

const IMAGE_KEYS: readonly ImageKey[] = [
  "hero",
  "foundations",
  "studio",
  "wizards",
  "creative",
  "python",
  "safety",
  "about",
  "auth",
  "success",
  "notFound",
  "dashboard",
];

const TEACHER_ACCENTS: readonly Teacher["accent"][] = [
  "lavender",
  "yellow",
  "sky",
  "coral",
];

function toImageKey(value: string | null | undefined, fallback: ImageKey): ImageKey {
  if (value && (IMAGE_KEYS as readonly string[]).includes(value)) {
    return value as ImageKey;
  }
  return fallback;
}

function toRole(value: "admin" | "user"): User["role"] {
  return value === "admin" ? "admin" : "parent";
}

function toDescription(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toLicense(license: RawLicense | null | undefined): License | null {
  if (!license) return null;
  return {
    id: license.id,
    maskedCode: license.maskedCode ?? "•••• ••••",
    issuedAt: license.issuedAt ?? new Date().toISOString(),
    emailSentAt: license.emailSentAt ?? undefined,
    enteredBy: license.enteredBy ?? "سیستم",
    description: license.description ?? undefined,
    providerReference: license.providerReference ?? undefined,
    source: license.source === "gift" || license.source === "admin_gift" ? "gift" : "provider",
    revokedAt: license.revokedAt ?? undefined,
    revokeReason: license.revokeReason ?? undefined,
  };
}

function toStatusHistory(events: RawOrderEvent[] | undefined): OrderStatusEvent[] {
  const result: OrderStatusEvent[] = [];
  for (const event of events ?? []) {
    // رخدادهای بدون وضعیت (مثل لغو لایسنس) در خط زمان سفارش نمی‌آیند.
    if (!event.status) continue;
    result.push({
      id: String(event.id ?? result.length),
      status: event.status,
      at: event.at,
      note: event.note,
      byName: event.byName ?? undefined,
    });
  }
  return result;
}

function toOrder(raw: RawOrder): Order {
  const discount: OrderDiscount | null = raw.discount
    ? {
        code: raw.discount.code,
        type: raw.discount.type,
        label: raw.discount.label,
        amountToman: raw.discount.amountToman,
        percent: raw.discount.percent ?? undefined,
      }
    : raw.discountToman > 0
      ? {
          code: "",
          type: "fixed",
          label: "تخفیف",
          amountToman: raw.discountToman,
        }
      : null;

  const refund: OrderRefund | null = raw.refund
    ? {
        amountToman: raw.refund.amountToman,
        refundedAt: raw.refund.refundedAt,
        reason: raw.refund.reason ?? "",
        reference: raw.refund.reference ?? undefined,
      }
    : null;

  return {
    id: raw.id,
    number: raw.number,
    userId: raw.userId,
    course: {
      id: raw.course.id,
      slug: raw.course.slug,
      title: raw.course.title,
      art: toImageKey(raw.course.art, "foundations"),
      priceToman:
        raw.course.priceToman ??
        raw.originalPriceToman ??
        raw.unitPriceToman ??
        raw.totalToman,
    },
    customer: {
      fullName: raw.customer.fullName,
      email: raw.customer.email,
      phone: raw.customer.phone ?? "",
    },
    originalPriceToman:
      raw.originalPriceToman ?? raw.unitPriceToman ?? raw.totalToman,
    discount,
    taxPercent: raw.taxPercent > 0 ? raw.taxPercent : undefined,
    taxToman: raw.taxToman > 0 ? raw.taxToman : undefined,
    totalToman: raw.totalToman,
    status: raw.status,
    createdAt: raw.createdAt,
    paidAt: raw.paidAt ?? undefined,
    paymentRef: raw.paymentRef ?? undefined,
    paymentState: raw.paymentState,
    license: toLicense(raw.license),
    note: raw.note ?? undefined,
    updatedAt: raw.updatedAt ?? raw.fulfilledAt ?? raw.paidAt ?? raw.createdAt,
    source: raw.source === "gift" ? "gift" : "purchase",
    statusHistory: toStatusHistory(raw.statusHistory),
    onHoldReason: raw.onHoldReason ?? undefined,
    cancelReason: raw.cancelReason ?? undefined,
    refund,
  };
}

function toCourse(raw: RawCourse): Course {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    tagline: raw.tagline ?? "",
    description: toDescription(raw.description),
    level: raw.level,
    ageRange: { min: raw.ageMin, max: raw.ageMax },
    durationWeeks: raw.durationWeeks,
    sessions: raw.sessions,
    priceToman: raw.priceToman,
    compareAtPriceToman: raw.compareAtPriceToman ?? undefined,
    outcomes: raw.outcomes ?? [],
    syllabus: raw.syllabus ?? [],
    faqs: raw.faqs ?? [],
    art: toImageKey(raw.art, "foundations"),
    badge: raw.badge ?? undefined,
    popular: raw.popular ?? false,
    featured: raw.featured ?? false,
    providerName: raw.providerName,
    providerPanelUrl: raw.providerPanelUrl ?? raw.providerSiteUrl ?? "",
    activationUrl: raw.activationUrl ?? "",
    activationInstructions: raw.activationInstructions ?? "",
    published: raw.published ?? raw.isPublished ?? true,
    updatedAt: raw.updatedAt,
  };
}

function toCoursePayload(input: CourseInput | Course) {
  return {
    slug: input.slug,
    title: input.title,
    tagline: input.tagline,
    description: input.description,
    level: input.level,
    ageMin: input.ageRange.min,
    ageMax: input.ageRange.max,
    durationWeeks: input.durationWeeks,
    sessions: input.sessions,
    priceToman: input.priceToman,
    compareAtPriceToman: input.compareAtPriceToman ?? null,
    outcomes: input.outcomes,
    syllabus: input.syllabus,
    faqs: input.faqs,
    art: input.art,
    badge: input.badge ?? null,
    popular: input.popular ?? false,
    featured: input.featured ?? false,
    providerName: input.providerName,
    providerPanelUrl: input.providerPanelUrl,
    activationUrl: input.activationUrl,
    activationInstructions: input.activationInstructions,
    published: input.published,
  };
}

function parseSections(markdown: string, fallbackTitle: string): BlogPostSection[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: BlogPostSection[] = [];
  let current: BlogPostSection | null = null;
  let buffer: string[] = [];

  const flushParagraph = () => {
    const text = buffer.join(" ").trim();
    if (text !== "" && current) current.paragraphs.push(text);
    buffer = [];
  };

  const openSection = (heading: string) => {
    flushParagraph();
    current = { heading, paragraphs: [] };
    sections.push(current);
  };

  for (const line of lines) {
    const heading = /^#{2,3}\s+(.+)$/.exec(line);
    if (heading?.[1]) {
      openSection(heading[1].trim());
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }
    buffer.push(line.trim());
  }
  flushParagraph();

  if (sections.length === 0) {
    const body = markdown.trim();
    return body === ""
      ? []
      : [{ heading: fallbackTitle, paragraphs: [body] }];
  }
  return sections;
}

function toBlogPost(raw: RawBlogPost): BlogPost {
  const body = raw.body ?? "";
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    category: raw.category,
    author: raw.author,
    readMinutes: raw.readMinutes,
    publishedAt:
      raw.publishedAt ?? raw.createdAt ?? raw.updatedAt ?? new Date().toISOString(),
    art: toImageKey(raw.art, "about"),
    sections: raw.sections ?? parseSections(body, raw.title),
    body,
    status: raw.status,
    updatedAt: raw.updatedAt,
  };
}

function toFaq(raw: RawFaq): HomeFaq {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    order: raw.order ?? raw.sortOrder,
    isActive: raw.isActive ?? true,
  };
}

function toTeacher(raw: RawTeacher): Teacher {
  return {
    id: raw.id,
    name: raw.name,
    role: raw.role,
    bio: raw.bio,
    initials: raw.initials,
    accent: (TEACHER_ACCENTS as readonly string[]).includes(raw.accent)
      ? (raw.accent as Teacher["accent"])
      : "lavender",
    order: raw.order ?? raw.sortOrder,
    isActive: raw.isActive ?? true,
  };
}

function toDiscount(raw: RawDiscount): DiscountCode {
  return {
    code: raw.code,
    type: raw.type,
    percent: raw.percent ?? undefined,
    amountToman: raw.amountToman ?? undefined,
    maxDiscountToman: raw.maxDiscountToman ?? undefined,
    minOrderToman: raw.minOrderToman,
    active: raw.active,
    startsAt: raw.startsAt ?? undefined,
    expiresAt: raw.expiresAt ?? undefined,
    maxUses: raw.maxUses,
    usedCount: raw.usedCount,
    maxUsesPerUser: raw.maxUsesPerUser,
    courseIds: raw.courseIds,
    firstPurchaseOnly: raw.firstPurchaseOnly,
    allowFree: raw.allowFree,
    createdAt: raw.createdAt,
  };
}

function toDiscountPayload(
  input: CreateDiscountInput | UpdateDiscountInput,
) {
  return {
    code: input.code,
    type: input.type,
    percent: input.percent,
    amountToman: input.amountToman,
    maxDiscountToman: input.maxDiscountToman,
    minOrderToman: input.minOrderToman ?? 0,
    maxUses: input.maxUses,
    maxUsesPerUser: input.maxUsesPerUser,
    courseIds: input.courseIds,
    firstPurchaseOnly: input.firstPurchaseOnly ?? false,
    allowFree: input.allowFree ?? false,
    active: input.active ?? true,
    startsAt: input.startsAt ?? null,
    endsAt: input.expiresAt ?? null,
  };
}

function toLicenseListItem(raw: RawLicenseListItem): AdminLicenseListItem {
  return {
    id: raw.id,
    maskedCode: raw.maskedCode,
    orderId: raw.orderId,
    orderNumber: raw.orderNumber,
    userId: raw.userId,
    customerName: raw.customerName,
    customerEmail: raw.customerEmail,
    courseId: raw.courseId,
    courseTitle: raw.courseTitle,
    issuedAt: raw.issuedAt,
    emailSentAt: raw.emailSentAt ?? undefined,
    source: raw.source === "admin_gift" ? "gift" : "provider",
    revokedAt: raw.revokedAt ?? undefined,
    revokeReason: raw.revokeReason ?? undefined,
    description: raw.description ?? undefined,
    providerReference: raw.providerReference ?? undefined,
  };
}

function toAdminUser(raw: RawAdminUser): AdminUserSummary {
  return {
    id: raw.id,
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone ?? "",
    role: toRole(raw.role),
    createdAt: raw.createdAt,
    isActive: raw.isActive,
    deletionRequestedAt: raw.deletionRequestedAt ?? undefined,
    ordersCount: raw.ordersCount,
    licensesCount: raw.licensesCount,
    totalSpentToman: Number(raw.totalSpentToman),
    lastOrderAt: raw.lastOrderAt ?? undefined,
  };
}

function toAuditEntry(raw: {
  id: number | string;
  at: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
}): AuditLogEntry {
  return {
    id: String(raw.id),
    at: raw.at,
    actorId: raw.actorId ?? "",
    actorName: raw.actorName,
    action: raw.action,
    entityType: raw.entityType,
    entityId: raw.entityId ?? undefined,
    summary: raw.summary,
  };
}

const EMAIL_TEMPLATES: Record<string, EmailMessage["template"]> = {
  license_delivery: "license-delivery",
  delay_notice: "delay-notice",
  license_updated: "license-updated",
  gift_license: "gift-license",
  refund_notice: "refund-notice",
  order_cancelled: "order-cancelled",
  order_hold: "order-hold",
};

function toEmailMessage(raw: RawEmail): EmailMessage {
  return {
    id: raw.id,
    orderId: raw.orderId ?? "",
    to: raw.to,
    subject: raw.subject,
    sentAt: raw.sentAt ?? raw.createdAt,
    template: EMAIL_TEMPLATES[raw.template] ?? "other",
  };
}

function toPaymentSettings(raw: RawPaymentSettings): PaymentSettings {
  return {
    hasToken: raw.hasToken,
    maskedToken: raw.maskedToken,
    enabled: raw.enabled,
    returnUrl: raw.returnUrl,
    lastTestedAt: raw.lastTestedAt ?? undefined,
    lastTestResult: raw.lastTestResult ?? undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* نشست                                                                       */
/* -------------------------------------------------------------------------- */

let cachedUser: RawUser | null = null;
let sessionKnown = false;

function rememberSession(user: RawUser | null): void {
  cachedUser = user;
  sessionKnown = true;
}

async function currentRawUser(): Promise<RawUser | null> {
  if (sessionKnown) return cachedUser;
  try {
    const data = await apiGet<RawSession>("/auth/me");
    rememberSession(data.user);
    return data.user;
  } catch {
    rememberSession(null);
    return null;
  }
}

async function isAdminSession(): Promise<boolean> {
  const user = await currentRawUser();
  return user?.role === "admin";
}

/* -------------------------------------------------------------------------- */
/* adapter                                                                    */
/* -------------------------------------------------------------------------- */

const PAYMENT_MESSAGES: Record<PaymentState, string> = {
  success: "پرداخت با موفقیت انجام شد.",
  pending: "پرداخت هنوز نهایی نشده است؛ نتیجه را دوباره بررسی کنید.",
  failed: "پرداخت انجام نشد یا لغو شد.",
  error: "بررسی وضعیت پرداخت ممکن نشد؛ با پشتیبانی تماس بگیرید.",
};

function computePaymentResult(raw: RawOrder): PaymentResult {
  const order = toOrder(raw);
  const state: PaymentState =
    raw.paymentState === "success" || raw.status === "fulfilled"
      ? "success"
      : raw.paymentState === "pending" || raw.status === "pending"
        ? "pending"
        : raw.paymentState === "failed" ||
            raw.status === "failed" ||
            raw.status === "expired" ||
            raw.status === "cancelled"
          ? "failed"
          : raw.paymentState === "error"
            ? "error"
            : raw.paidAt
              ? "success"
              : "pending";

  return {
    orderId: raw.id,
    state,
    message: PAYMENT_MESSAGES[state],
    trackingNumber: raw.paymentRef ?? undefined,
    paidAt: raw.paidAt ?? undefined,
    order,
  };
}

export const realAdapter = {
  /* -------------------------------- auth -------------------------------- */

  async login(input: LoginInput): Promise<AuthSession> {
    const data = await apiPost<{
      user: RawUser;
      totpRequired: boolean;
      totpSetupRequired: boolean;
    }>("/auth/login", {
      email: input.email,
      password: input.password,
      ...(input.totp ? { totp: input.totp } : {}),
    });

    rememberSession(data.user);
    return {
      user: toPublicUser(data.user),
      totpRequired: data.totpRequired || data.totpSetupRequired,
    };
  },

  async register(input: RegisterInput): Promise<AuthSession> {
    const data = await apiPost<{ user: RawUser; message?: string }>(
      "/auth/register",
      {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        password: input.password,
      },
    );

    rememberSession(null);
    return {
      user: toPublicUser(data.user),
      pendingVerification: true,
      message: data.message,
    };
  },

  async requestPasswordReset(
    input: PasswordResetInput,
  ): Promise<PasswordResetReceipt> {
    return apiPost<PasswordResetReceipt>("/auth/password/forgot", {
      email: input.email,
    });
  },

  async getSession(): Promise<AuthSession | null> {
    try {
      const data = await apiGet<RawSession>("/auth/me");
      rememberSession(data.user);
      return {
        user: toPublicUser(data.user),
        totpRequired: data.totpRequired || data.totpSetupRequired,
      };
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "session_expired" ||
          error.code === "unauthorized" ||
          error.code === "account_disabled")
      ) {
        rememberSession(null);
        return null;
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    rememberSession(null);
    try {
      await apiPost<void>("/auth/logout");
    } catch {
      // خروج سمت کلاینت همیشه موفق است؛ نشست سرور در بدترین حالت منقضی است.
    }
  },

  /* ------------------------------- account ------------------------------ */

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const data = await apiPatch<{ user: RawUser }>("/me/profile", input);
    if (cachedUser) rememberSession(data.user);
    return toPublicUser(data.user);
  },

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await apiPost<{ message: string }>("/auth/password/change", input);
  },

  async requestAccountDeletion(
    input: AccountDeletionInput,
  ): Promise<AccountDeletionReceipt> {
    return apiPost<AccountDeletionReceipt>("/me/deletion-request", {
      reason: input.reason,
      confirmation: input.confirmation,
    });
  },

  /* ------------------------------- courses ------------------------------ */

  async listCourses(): Promise<Course[]> {
    const data = await apiGet<{ courses: RawCourse[] }>("/courses", {
      limit: 100,
    });
    return data.courses.map(toCourse);
  },

  async getCourse(slug: string): Promise<Course | null> {
    try {
      const data = await apiGet<{ course: RawCourse }>(
        `/courses/${encodeURIComponent(slug)}`,
      );
      return toCourse(data.course);
    } catch (error) {
      if (error instanceof ApiError && error.code === "course_not_found") {
        return null;
      }
      throw error;
    }
  },

  async getCourseBySlug(slug: string): Promise<Course | null> {
    return realAdapter.getCourse(slug);
  },

  async getCourseById(id: string): Promise<Course | null> {
    const courses = await realAdapter.listCourses();
    return courses.find((course) => course.id === id) ?? null;
  },

  async validateDiscount(
    input: ValidateDiscountInput,
  ): Promise<DiscountValidation> {
    const data = await apiPost<
      | { valid: false; message?: string }
      | {
          valid: true;
          code: string;
          label: string;
          amountToman: number;
          finalToman: number;
          discount: {
            type: DiscountType;
            percent: number | null;
            amountToman: number | null;
            maxDiscountToman: number | null;
          };
        }
    >("/discount/validate", input);

    if (!data.valid) {
      return {
        valid: false,
        message:
          data.message ?? "کد تخفیف معتبر نیست؛ دوباره بررسی کنید.",
      };
    }

    return {
      valid: true,
      label: data.label,
      amountToman: data.amountToman,
      finalToman: data.finalToman,
      discount: {
        code: data.code,
        type: data.discount.type,
        percent: data.discount.percent ?? undefined,
        amountToman: data.discount.amountToman ?? undefined,
        maxDiscountToman: data.discount.maxDiscountToman ?? undefined,
        minOrderToman: 0,
        active: true,
        maxUses: 0,
        usedCount: 0,
        maxUsesPerUser: 1,
        createdAt: new Date().toISOString(),
      },
    };
  },

  async getCourseAccess(courseId: string): Promise<CourseAccessStatus> {
    const data = await apiGet<{ access: CourseAccessStatus }>(
      `/me/courses/${encodeURIComponent(courseId)}/access`,
    );
    return data.access;
  },

  /* -------------------------------- orders ------------------------------ */

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const data = await apiPost<{ order: RawOrder }>("/orders", {
      courseId: input.courseId,
      discountCode: input.discountCode,
    });
    return toOrder(data.order);
  },

  async startPayment(orderId: string): Promise<PaymentResult> {
    /**
     * سفارش رایگان (تخفیف ۱۰۰٪) در وضعیت `awaiting_license` است و درگاه
     * ندارد؛ نتیجه‌ی آن مستقیماً از وضعیت سفارش ساخته می‌شود.
     */
    const current = await apiGet<{ order: RawOrder }>(
      `/orders/${encodeURIComponent(orderId)}`,
    );
    if (current.order.status !== "pending") {
      return computePaymentResult(current.order);
    }

    const data = await apiPost<{ order: RawOrder; paymentUrl: string }>(
      `/orders/${encodeURIComponent(orderId)}/payment`,
    );

    // انتقال واقعی به درگاه؛ پاسخ بازگشتی فقط برای حالت‌های جایگزین است.
    if (typeof window !== "undefined" && data.paymentUrl) {
      window.location.assign(data.paymentUrl);
    }

    return {
      orderId,
      state: "pending",
      message: "در حال انتقال به درگاه پرداخت…",
      order: toOrder(data.order),
    };
  },

  async getPaymentResult(orderId: string): Promise<PaymentResult> {
    const data = await apiGet<{ order: RawOrder }>(
      `/orders/${encodeURIComponent(orderId)}`,
    );
    return computePaymentResult(data.order);
  },

  async cancelOrder(orderId: string): Promise<Order> {
    const data = await apiPost<{ order: RawOrder }>(
      `/orders/${encodeURIComponent(orderId)}/cancel`,
    );
    return toOrder(data.order);
  },

  async getOrder(orderId: string): Promise<Order> {
    const admin = await isAdminSession();
    if (admin) {
      const data = await apiGet<{ order: RawPanelOrder }>(
        `/admin/orders/${encodeURIComponent(orderId)}`,
      );
      return toOrder(data.order);
    }
    const data = await apiGet<{ order: RawOrder }>(
      `/orders/${encodeURIComponent(orderId)}`,
    );
    return toOrder(data.order);
  },

  async listMyOrders(): Promise<Order[]> {
    const data = await apiGet<{ orders: RawOrder[] }>("/orders");
    return data.orders.map(toOrder);
  },

  async listAllOrders(): Promise<Order[]> {
    const data = await apiGet<{ orders: RawPanelOrder[] }>("/admin/orders", {
      limit: 200,
    });
    return data.orders.map(toOrder);
  },

  async addLicense(input: AddLicenseInput): Promise<Order> {
    return realAdapter.fulfillLicense({ ...input, notifyUser: true });
  },

  async fulfillLicense(input: FulfillLicenseInput): Promise<Order> {
    const data = await apiPost<{ order: RawPanelOrder }>(
      `/admin/orders/${encodeURIComponent(input.orderId)}/license`,
      {
        licenseCode: input.licenseCode,
        description: input.description,
        providerReference: input.providerReference,
        confirmDuplicate: input.confirmDuplicate ?? false,
        notifyUser: input.notifyUser,
      },
    );
    return toOrder(data.order);
  },

  async revealLicense(licenseId: string): Promise<LicenseReveal> {
    const admin = await isAdminSession();
    const payload = admin
      ? await apiPost<{ license: RawLicenseReveal }>(
          `/admin/licenses/${encodeURIComponent(licenseId)}/reveal`,
        )
      : await apiGet<{ license: RawLicenseReveal }>(
          `/me/licenses/${encodeURIComponent(licenseId)}/reveal`,
        );

    const license = payload.license;
    return {
      licenseId: license.licenseId,
      orderId: license.orderId,
      code: license.code,
      description: license.description ?? undefined,
      providerReference: license.providerReference ?? undefined,
      providerName: license.providerName,
      providerPanelUrl: license.providerPanelUrl ?? "",
      activationUrl: license.activationUrl ?? "",
      activationInstructions: license.activationInstructions ?? "",
    };
  },

  async editLicense(input: EditLicenseInput): Promise<Order> {
    const data = await apiPatch<{ order: RawPanelOrder }>(
      `/admin/licenses/${encodeURIComponent(input.licenseId)}`,
      {
        licenseCode: input.licenseCode,
        description: input.description,
        providerReference: input.providerReference,
        notifyUser: input.notifyUser,
        confirmDuplicate: false,
      },
    );
    return toOrder(data.order);
  },

  async holdOrder(input: HoldOrderInput): Promise<Order> {
    const data = await apiPost<{ order: RawPanelOrder }>(
      `/admin/orders/${encodeURIComponent(input.orderId)}/hold`,
      { reason: input.reason, sendDelayEmail: input.sendDelayEmail },
    );
    return toOrder(data.order);
  },

  async sendDelayEmail(orderId: string): Promise<Order> {
    const data = await apiPost<{ order: RawPanelOrder }>(
      `/admin/orders/${encodeURIComponent(orderId)}/delay-email`,
    );
    return toOrder(data.order);
  },

  async resumeOrder(orderId: string): Promise<Order> {
    const data = await apiPost<{ order: RawPanelOrder }>(
      `/admin/orders/${encodeURIComponent(orderId)}/resume`,
    );
    return toOrder(data.order);
  },

  async adminCancelOrder(input: CancelOrderInput): Promise<Order> {
    const data = await apiPost<{ order: RawPanelOrder }>(
      `/admin/orders/${encodeURIComponent(input.orderId)}/cancel`,
      { reason: input.reason },
    );
    return toOrder(data.order);
  },

  async refundOrder(input: RefundOrderInput): Promise<Order> {
    const data = await apiPost<{ order: RawPanelOrder }>(
      `/admin/orders/${encodeURIComponent(input.orderId)}/refund`,
      { reason: input.reason, reference: input.reference },
    );
    return toOrder(data.order);
  },

  async grantGiftLicense(input: GiftLicenseInput): Promise<Order> {
    const data = await apiPost<{ order: RawPanelOrder }>(
      "/admin/licenses/gift",
      {
        email: input.email,
        courseId: input.courseId,
        licenseCode: input.licenseCode,
        description: input.description,
        providerReference: input.providerReference,
        notifyUser: input.notifyUser,
        confirmDuplicate: false,
      },
    );
    return toOrder(data.order);
  },

  async resendLicenseEmail(orderId: string): Promise<Order> {
    const data = await apiPost<{ order: RawPanelOrder }>(
      `/admin/orders/${encodeURIComponent(orderId)}/resend-license-email`,
    );
    return toOrder(data.order);
  },

  /* ----------------------------- notifications -------------------------- */

  async listNotifications(): Promise<Notification[]> {
    const data = await apiGet<{ notifications: Notification[] }>(
      "/me/notifications",
    );
    return data.notifications.map(normalizeNotification);
  },

  async markNotificationRead(id: string): Promise<Notification> {
    const data = await apiPost<{ notification: Notification }>(
      `/me/notifications/${encodeURIComponent(id)}/read`,
    );
    return normalizeNotification(data.notification);
  },

  async markAllNotificationsRead(): Promise<Notification[]> {
    await apiPost<{ updated: number }>("/me/notifications/read-all");
    return realAdapter.listNotifications();
  },

  /* ------------------------------ admin base ---------------------------- */

  async getFulfillmentQueue(): Promise<Order[]> {
    const data = await apiGet<{ orders: RawPanelOrder[] }>("/admin/fulfillment");
    return data.orders.map(toOrder);
  },

  async listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    const data = await apiGet<{
      logs: Array<{
        id: number;
        at: string;
        actorId: string | null;
        actorName: string;
        action: string;
        entityType: string;
        entityId: string | null;
        summary: string;
      }>;
    }>("/admin/audit-logs", { limit });
    return data.logs.map(toAuditEntry);
  },

  async listInboxMessages(): Promise<InboxMessage[]> {
    const data = await apiGet<{ messages: InboxMessage[] }>("/admin/messages");
    return data.messages;
  },

  async listEmails(): Promise<EmailMessage[]> {
    const data = await apiGet<{ emails: RawEmail[] }>("/admin/emails", {
      limit: 100,
    });
    return data.emails.map(toEmailMessage);
  },

  /* ------------------------------- courses ------------------------------ */

  async adminListCourses(): Promise<Course[]> {
    const data = await apiGet<{ courses: RawCourse[] }>("/admin/courses");
    return data.courses.map(toCourse);
  },

  async createCourse(input: CourseInput): Promise<Course> {
    const data = await apiPost<{ course: RawCourse }>(
      "/admin/courses",
      toCoursePayload(input),
    );
    return toCourse(data.course);
  },

  async updateCourse(id: string, input: CourseInput): Promise<Course> {
    const data = await apiPut<{ course: RawCourse }>(
      `/admin/courses/${encodeURIComponent(id)}`,
      toCoursePayload(input),
    );
    return toCourse(data.course);
  },

  async toggleCoursePublish(id: string): Promise<Course> {
    const courses = await realAdapter.adminListCourses();
    const current = courses.find((course) => course.id === id);
    const data = await apiPost<{ course: RawCourse }>(
      `/admin/courses/${encodeURIComponent(id)}/publish`,
      { published: !(current?.published ?? false) },
    );
    return toCourse(data.course);
  },

  async deleteCourse(id: string): Promise<void> {
    await apiDelete(`/admin/courses/${encodeURIComponent(id)}`);
  },

  /* ------------------------------ discounts ----------------------------- */

  async listDiscounts(): Promise<DiscountCode[]> {
    const data = await apiGet<{ discounts: RawDiscount[] }>(
      "/admin/discounts",
      { limit: 200 },
    );
    return data.discounts.map(toDiscount);
  },

  async createDiscount(input: CreateDiscountInput): Promise<DiscountCode> {
    const data = await apiPost<{ discount: RawDiscount }>(
      "/admin/discounts",
      toDiscountPayload(input),
    );
    return toDiscount(data.discount);
  },

  async updateDiscount(input: UpdateDiscountInput): Promise<DiscountCode> {
    const data = await apiPut<{ discount: RawDiscount }>(
      `/admin/discounts/${encodeURIComponent(input.code)}`,
      toDiscountPayload(input),
    );
    return toDiscount(data.discount);
  },

  async deleteDiscount(code: string): Promise<void> {
    await apiDelete(`/admin/discounts/${encodeURIComponent(code)}`);
  },

  async toggleDiscount(code: string): Promise<DiscountCode> {
    const data = await apiPost<{ discount: RawDiscount }>(
      `/admin/discounts/${encodeURIComponent(code)}/toggle`,
    );
    return toDiscount(data.discount);
  },

  async bulkCreateDiscounts(input: BulkDiscountInput): Promise<DiscountCode[]> {
    const data = await apiPost<{ discounts: RawDiscount[] }>(
      "/admin/discounts/bulk",
      {
        prefix: input.prefix,
        count: input.count,
        type: input.type,
        percent: input.percent,
        amountToman: input.amountToman,
        maxDiscountToman: input.maxDiscountToman,
        minOrderToman: input.minOrderToman ?? 0,
        maxUses: input.maxUses,
        maxUsesPerUser: input.maxUsesPerUser,
        courseIds: input.courseIds,
        firstPurchaseOnly: input.firstPurchaseOnly ?? false,
        allowFree: input.allowFree ?? false,
        active: input.active ?? true,
        startsAt: input.startsAt ?? null,
        endsAt: input.expiresAt ?? null,
      },
    );
    return data.discounts.map(toDiscount);
  },

  async getDiscountUsage(code: string): Promise<DiscountUsageReport> {
    const data = await apiGet<{ usage: DiscountUsageReport }>(
      `/admin/discounts/${encodeURIComponent(code)}/usage`,
    );
    return data.usage;
  },

  /* ------------------------------ licenses ------------------------------ */

  async listLicenses(): Promise<AdminLicenseListItem[]> {
    const data = await apiGet<{ licenses: RawLicenseListItem[] }>(
      "/admin/licenses",
      { limit: 200 },
    );
    return data.licenses.map(toLicenseListItem);
  },

  async revokeLicense(input: RevokeLicenseInput): Promise<AdminLicenseListItem> {
    const data = await apiPost<{
      licenseId: string;
      orderId: string;
      order: RawPanelOrder;
    }>(`/admin/licenses/${encodeURIComponent(input.licenseId)}/revoke`, {
      reason: input.reason,
    });

    const order = data.order;
    return {
      id: data.licenseId,
      maskedCode: order.license?.maskedCode ?? "•••• ••••",
      orderId: order.id,
      orderNumber: order.number,
      userId: order.userId,
      customerName: order.customer.fullName,
      customerEmail: order.customer.email,
      courseId: order.course.id,
      courseTitle: order.course.title,
      issuedAt: order.license?.issuedAt ?? order.createdAt,
      emailSentAt: order.license?.emailSentAt ?? undefined,
      source: order.license?.source === "admin_gift" ? "gift" : "provider",
      revokedAt:
        order.license?.revokedAt ?? new Date().toISOString(),
      revokeReason: order.license?.revokeReason ?? input.reason,
    };
  },

  /* -------------------------------- users ------------------------------- */

  async listUsers(): Promise<AdminUserSummary[]> {
    const data = await apiGet<{ users: RawAdminUser[] }>("/admin/users");
    return data.users.map(toAdminUser);
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const data = await apiGet<{
      detail: {
        user: RawAdminUser;
        orders: RawPanelOrder[];
        licenses: RawLicenseListItem[];
      };
    }>(`/admin/users/${encodeURIComponent(userId)}`);

    return {
      user: toAdminUser(data.detail.user),
      orders: data.detail.orders.map(toOrder),
      licenses: data.detail.licenses.map(toLicenseListItem),
    };
  },

  async setUserActive(input: SetUserActiveInput): Promise<AdminUserSummary> {
    const data = await apiPatch<{ user: RawAdminUser }>(
      `/admin/users/${encodeURIComponent(input.userId)}`,
      { active: input.active, reason: input.reason },
    );
    return toAdminUser(data.user);
  },

  /* -------------------------------- blog -------------------------------- */

  async adminListPosts(): Promise<BlogPost[]> {
    const data = await apiGet<{ posts: RawBlogPost[] }>("/admin/blog");
    return data.posts.map(toBlogPost);
  },

  async createPost(input: BlogPostInput): Promise<BlogPost> {
    const data = await apiPost<{ post: RawBlogPost }>("/admin/blog", input);
    return toBlogPost(data.post);
  },

  async updatePost(id: string, input: BlogPostInput): Promise<BlogPost> {
    const data = await apiPut<{ post: RawBlogPost }>(
      `/admin/blog/${encodeURIComponent(id)}`,
      input,
    );
    return toBlogPost(data.post);
  },

  async setPostStatus(
    id: string,
    status: "draft" | "published",
  ): Promise<BlogPost> {
    const data = await apiPost<{ post: RawBlogPost }>(
      `/admin/blog/${encodeURIComponent(id)}/status`,
      { status },
    );
    return toBlogPost(data.post);
  },

  async deletePost(id: string): Promise<void> {
    await apiDelete(`/admin/blog/${encodeURIComponent(id)}`);
  },

  async listPosts(): Promise<BlogPost[]> {
    const data = await apiGet<{ posts: RawBlogPost[] }>("/blog", {
      limit: 100,
    });
    return data.posts.map(toBlogPost);
  },

  /* --------------------------------- FAQs -------------------------------- */

  async adminListFaqs(): Promise<HomeFaq[]> {
    const data = await apiGet<{ faqs: RawFaq[] }>("/admin/faqs");
    return data.faqs.map(toFaq);
  },

  async createFaq(input: HomeFaqInput): Promise<HomeFaq> {
    const data = await apiPost<{ faq: RawFaq }>("/admin/faqs", input);
    return toFaq(data.faq);
  },

  async updateFaq(id: string, input: HomeFaqInput): Promise<HomeFaq> {
    const data = await apiPut<{ faq: RawFaq }>(
      `/admin/faqs/${encodeURIComponent(id)}`,
      input,
    );
    return toFaq(data.faq);
  },

  async deleteFaq(id: string): Promise<void> {
    await apiDelete(`/admin/faqs/${encodeURIComponent(id)}`);
  },

  async moveFaq(id: string, direction: "up" | "down"): Promise<HomeFaq[]> {
    const data = await apiPost<{ faqs: RawFaq[] }>(
      `/admin/faqs/${encodeURIComponent(id)}/move`,
      { direction },
    );
    return data.faqs.map(toFaq);
  },

  async listFaqs(): Promise<HomeFaq[]> {
    const data = await apiGet<{ faqs: RawFaq[] }>("/faqs");
    return data.faqs.map(toFaq);
  },

  /* ------------------------------- teachers ------------------------------ */

  async adminListTeachers(): Promise<Teacher[]> {
    const data = await apiGet<{ teachers: RawTeacher[] }>("/admin/teachers");
    return data.teachers.map(toTeacher);
  },

  async createTeacher(input: TeacherInput): Promise<Teacher> {
    const data = await apiPost<{ teacher: RawTeacher }>(
      "/admin/teachers",
      input,
    );
    return toTeacher(data.teacher);
  },

  async updateTeacher(id: string, input: TeacherInput): Promise<Teacher> {
    const data = await apiPut<{ teacher: RawTeacher }>(
      `/admin/teachers/${encodeURIComponent(id)}`,
      input,
    );
    return toTeacher(data.teacher);
  },

  async deleteTeacher(id: string): Promise<void> {
    await apiDelete(`/admin/teachers/${encodeURIComponent(id)}`);
  },

  async moveTeacher(
    id: string,
    direction: "up" | "down",
  ): Promise<Teacher[]> {
    const data = await apiPost<{ teachers: RawTeacher[] }>(
      `/admin/teachers/${encodeURIComponent(id)}/move`,
      { direction },
    );
    return data.teachers.map(toTeacher);
  },

  async listTeachers(): Promise<Teacher[]> {
    const data = await apiGet<{ teachers: RawTeacher[] }>("/teachers");
    return data.teachers.map(toTeacher);
  },

  /* -------------------------------- inbox ------------------------------- */

  async updateInboxStatus(
    id: string,
    status: MessageStatus,
  ): Promise<InboxMessage> {
    const data = await apiPatch<{ message: InboxMessage }>(
      `/admin/messages/${encodeURIComponent(id)}`,
      { status },
    );
    return data.message;
  },

  async listLeads(): Promise<LeadRecord[]> {
    const data = await apiGet<{ leads: LeadRecord[] }>("/admin/leads");
    return data.leads;
  },

  async deleteLead(id: string): Promise<void> {
    await apiDelete(`/admin/leads/${encodeURIComponent(id)}`);
  },

  /* ------------------------------- settings ----------------------------- */

  async getGeneralSettings(): Promise<GeneralSettings> {
    const data = await apiGet<{ settings: RawGeneralSettings }>(
      "/admin/site-settings",
    );
    return data.settings;
  },

  async updateGeneralSettings(
    input: Omit<GeneralSettings, "updatedAt">,
  ): Promise<GeneralSettings> {
    const data = await apiPut<{ settings: RawGeneralSettings }>(
      "/admin/site-settings",
      input,
    );
    return data.settings;
  },

  async getPaymentSettings(): Promise<PaymentSettings> {
    return toPaymentSettings(
      await apiGet<RawPaymentSettings>("/admin/settings/payment"),
    );
  },

  async savePaymentToken(
    input: SavePaymentTokenInput,
  ): Promise<PaymentTokenReceipt> {
    return apiPut<PaymentTokenReceipt>("/admin/settings/payment/token", {
      token: input.token,
    });
  },

  async setPaymentEnabled(enabled: boolean): Promise<PaymentSettings> {
    return toPaymentSettings(
      await apiPut<RawPaymentSettings>("/admin/settings/payment/enabled", {
        enabled,
      }),
    );
  },

  async testPaymentConnection(): Promise<PaymentSettings> {
    return toPaymentSettings(
      await apiPost<RawPaymentSettings>("/admin/settings/payment/test"),
    );
  },

  async getPublicSettings(): Promise<PublicSiteSettings> {
    const data = await apiGet<{ settings: PublicSiteSettings }>(
      "/site-settings",
    );
    return data.settings;
  },

  async getSiteContent(): Promise<SiteContent> {
    const data = await apiGet<{ faqs: RawFaq[] }>("/faqs");
    const faqs: SiteFaq[] = data.faqs.map((faq) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: "support",
    }));
    return { faqs, testimonials: [] };
  },

  /* -------------------------------- misc -------------------------------- */

  async getAdminStats(): Promise<AdminStats> {
    return apiGet<AdminStats>("/admin/stats");
  },

  async submitLead(input: LeadInput): Promise<LeadReceipt> {
    const data = await apiPost<{ id: string; message: string }>("/leads", {
      fullName: input.fullName,
      contact: input.contact,
      consent: input.consent,
      website: input.website ?? "",
    });
    return { id: data.id, message: data.message };
  },

  async submitContactMessage(
    input: ContactMessageInput,
  ): Promise<ContactReceipt> {
    return apiPost<ContactReceipt>("/contact", input);
  },
};

/* -------------------------------------------------------------------------- */
/* کمکی‌های پایانی                                                            */
/* -------------------------------------------------------------------------- */

interface RawLicenseReveal {
  licenseId: string;
  orderId: string;
  code: string;
  description: string | null;
  providerReference: string | null;
  providerName: string;
  providerPanelUrl: string | null;
  activationUrl: string | null;
  activationInstructions: string | null;
}

function toPublicUser(raw: RawUser): User {
  return {
    id: raw.id,
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone ?? "",
    role: toRole(raw.role),
    createdAt: raw.createdAt,
    deletionRequestedAt: raw.deletionRequestedAt ?? undefined,
    disabledAt: raw.disabledAt ?? undefined,
    disabledReason: raw.disabledReason ?? undefined,
  };
}

function normalizeNotification(raw: Notification): Notification {
  const kind =
    raw.kind === "license" || raw.kind === "order" || raw.kind === "system"
      ? raw.kind
      : "system";
  return { ...raw, kind };
}
