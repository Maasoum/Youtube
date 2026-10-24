import { brand } from "@/config/brand";
import {
  evaluateDiscount,
  normalizeDiscountCode,
} from "@/lib/discount";
import {
  formatShortDate,
  normalizeEmail,
  normalizeLicenseCode,
  normalizePhone,
} from "@/lib/format";
import { paidOrderStatuses } from "@/lib/labels";
import type {
  AccountDeletionInput,
  AccountDeletionReceipt,
  AddLicenseInput,
  AdminLicenseListItem,
  AdminStats,
  AdminUserDetail,
  AdminUserSummary,
  AuditLogEntry,
  AuthSession,
  BlogPost,
  BlogPostInput,
  BulkDiscountInput,
  CancelOrderInput,
  ChangePasswordInput,
  ContactMessageInput,
  ContactReceipt,
  Course,
  CourseAccessStatus,
  CourseInput,
  CreateDiscountInput,
  CreateOrderInput,
  DiscountCode,
  DiscountUsageReport,
  DiscountValidation,
  EditLicenseInput,
  EmailMessage,
  FulfillLicenseInput,
  GeneralSettings,
  GiftLicenseInput,
  HoldOrderInput,
  InboxMessage,
  HomeFaq,
  HomeFaqInput,
  LeadInput,
  LeadReceipt,
  LeadRecord,
  LicenseReveal,
  LoginInput,
  MessageStatus,
  Notification,
  Order,
  OrderStatus,
  PasswordResetInput,
  PasswordResetReceipt,
  PaymentResult,
  PaymentSettings,
  PublicSiteSettings,
  PaymentTokenReceipt,
  RefundOrderInput,
  RegisterInput,
  RevokeLicenseInput,
  SavePaymentTokenInput,
  SetUserActiveInput,
  SiteContent,
  Teacher,
  TeacherInput,
  UpdateProfileInput,
  UpdateDiscountInput,
  RevenuePoint,
  User,
  ValidateDiscountInput,
} from "./types";
import { ApiError } from "./types";
import { blogPosts, homeFaqs, teachers } from "@/data/mock";
import {
  seedAuditLogs,
  seedCourses,
  seedDiscounts,
  seedEmails,
  seedFaqs,
  seedInboxMessages,
  seedLeads,
  seedNotifications,
  seedOrders,
  seedTestimonials,
  seedUsers,
} from "./seed";
import { purchaseConfig } from "@/config/purchase";
import { isValidPersianSlug, slugifyPersian } from "@/lib/slug";
import {
  markdownToSections,
  sectionsToMarkdown,
} from "@/lib/markdown";

/** یک تاخیر کوتاه برای شبیه‌سازی رفتار شبکه؛ در نسخه‌ی واقعی حذف می‌شود. */
function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface DbUserRecord extends User {
  passwordHash: string;
}

interface StoredPaymentSettings {
  hasToken: boolean;
  /** فقط چهار کاراکتر آخر؛ توکن کامل در هیچ جا نگه داشته نمی‌شود. */
  maskedToken: string;
  enabled: boolean;
  lastTestedAt?: string;
  lastTestResult?: "success" | "failed";
}

interface MockDb {
  users: DbUserRecord[];
  courses: Course[];
  orders: Order[];
  discounts: DiscountCode[];
  emails: EmailMessage[];
  notifications: Notification[];
  auditLogs: AuditLogEntry[];
  posts: BlogPost[];
  faqs: HomeFaq[];
  teachers: Teacher[];
  settings: {
    general: GeneralSettings;
    payment: StoredPaymentSettings;
  };
}

const defaultGeneralSettings: GeneralSettings = {
  fulfillmentSlaHours: purchaseConfig.fulfillmentSlaHours,
  includeLicenseKeyInEmail: false,
  taxPercent: 0,
  footer: {
    about: brand.description,
    email: brand.supportEmail,
    phone: "02191000000",
    address: "تهران، خیابان ولیعصر، پلاک ۱۲",
  },
  trustBadge: {
    enabled: false,
    label: "نماد اعتماد الکترونیکی",
    url: "https://trust.brightpaths.example",
    code: "",
  },
};

const defaultPaymentSettings: StoredPaymentSettings = {
  hasToken: false,
  maskedToken: "",
  enabled: false,
};

interface StoredSession {
  userId: string;
  token: string;
}

// نسخه‌ی تازه، کاتالوگ به‌روز دوره‌ها را برای پیش‌نمایش mock بارگذاری می‌کند.
const DB_KEY = "brightpaths.mockdb.v4";
const SESSION_KEY = "brightpaths.session.v1";
const LEADS_KEY = "brightpaths.leads.v1";
const CONTACT_KEY = "brightpaths.contact.v1";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ذخیره‌سازی محلی ممکن است در حالت ناشناس یا iframe در دسترس نباشد.
  }
}

function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // نادیده گرفتن خطای دسترسی به حافظه
  }
}

/**
 * هش نمایشی برای داده‌های ساختگی مرورگر. این تابع امنیتی نیست و در نسخه‌ی
 * واقعی، احراز هویت و هش رمز عبور باید در سرور انجام شود.
 */
function hashPassword(password: string): string {
  let hash = 2166136261;
  const input = `brightpaths-demo::${password}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof window.crypto !== "undefined" && "getRandomValues" in window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toPublicUser(record: DbUserRecord): User {
  return {
    id: record.id,
    fullName: record.fullName,
    email: record.email,
    phone: record.phone,
    role: record.role,
    createdAt: record.createdAt,
    ...(record.deletionRequestedAt
      ? { deletionRequestedAt: record.deletionRequestedAt }
      : {}),
    ...(record.disabledAt
      ? {
          disabledAt: record.disabledAt,
          disabledReason: record.disabledReason,
        }
      : {}),
  };
}

function createSeedDb(): MockDb {
  return {
    users: seedUsers.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      passwordHash: hashPassword(user.password),
    })),
    courses: clone(seedCourses),
    orders: clone(seedOrders),
    discounts: clone(seedDiscounts),
    emails: clone(seedEmails),
    notifications: clone(seedNotifications),
    auditLogs: clone(seedAuditLogs),
    posts: blogPosts.map((post) => ({
      ...clone(post),
      body: post.body ?? sectionsToMarkdown(post.sections),
      status: post.status ?? "published",
      updatedAt: post.updatedAt ?? post.publishedAt,
    })),
    faqs: homeFaqs.map((faq, index) => ({
      ...clone(faq),
      order: faq.order ?? index,
      isActive: faq.isActive ?? true,
    })),
    teachers: teachers.map((teacher, index) => ({
      ...clone(teacher),
      order: teacher.order ?? index,
      isActive: teacher.isActive ?? true,
    })),
    settings: {
      general: clone(defaultGeneralSettings),
      payment: clone(defaultPaymentSettings),
    },
  };
}

/** داده‌های ذخیره‌شده‌ی نسخه‌های قبلی را با فیلدهای تازه تکمیل می‌کند. */
function hydrateDb(stored: MockDb): MockDb {
  const fallback = createSeedDb();
  return {
    ...fallback,
    ...stored,
    posts: Array.isArray(stored.posts) ? stored.posts : fallback.posts,
    faqs: Array.isArray(stored.faqs) ? stored.faqs : fallback.faqs,
    teachers: Array.isArray(stored.teachers) ? stored.teachers : fallback.teachers,
    settings: {
      general: {
        ...fallback.settings.general,
        ...(stored.settings?.general ?? {}),
        footer: {
          ...fallback.settings.general.footer,
          ...(stored.settings?.general?.footer ?? {}),
        },
        trustBadge: {
          ...fallback.settings.general.trustBadge,
          ...(stored.settings?.general?.trustBadge ?? {}),
        },
      },
      payment: {
        ...fallback.settings.payment,
        ...(stored.settings?.payment ?? {}),
      },
    },
  };
}

function isMockDb(value: unknown): value is MockDb {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.courses) &&
    Array.isArray(candidate.orders) &&
    Array.isArray(candidate.discounts) &&
    Array.isArray(candidate.emails) &&
    Array.isArray(candidate.notifications) &&
    Array.isArray(candidate.auditLogs)
  );
}

let db: MockDb | null = null;

function getDb(): MockDb {
  if (db) return db;

  const stored = readStorage(DB_KEY);
  if (stored) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (isMockDb(parsed)) {
        db = hydrateDb(parsed);
        return db;
      }
    } catch {
      // داده‌ی خراب را نادیده می‌گیریم و از داده‌های اولیه شروع می‌کنیم.
    }
  }

  db = createSeedDb();
  saveDb();
  return db;
}

function saveDb(): void {
  if (!db) return;
  writeStorage(DB_KEY, JSON.stringify(db));
}

function getInbox(): InboxMessage[] {
  if (readStorage(CONTACT_KEY) === null) {
    writeStorage(CONTACT_KEY, JSON.stringify(seedInboxMessages));
    return clone(seedInboxMessages);
  }
  return readJsonArray<InboxMessage>(CONTACT_KEY).map((message) => ({
    ...message,
    status: message.status ?? "new",
  }));
}

function getLeads(): LeadRecord[] {
  if (readStorage(LEADS_KEY) === null) {
    writeStorage(LEADS_KEY, JSON.stringify(seedLeads));
    return clone(seedLeads);
  }
  return readJsonArray<LeadRecord>(LEADS_KEY);
}

function readSession(): StoredSession | null {
  const raw = readStorage(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.userId !== "string" || typeof candidate.token !== "string") {
      return null;
    }
    return { userId: candidate.userId, token: candidate.token };
  } catch {
    return null;
  }
}

function writeSession(userId: string): StoredSession {
  const session: StoredSession = { userId, token: createToken() };
  writeStorage(SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearSession(): void {
  removeStorage(SESSION_KEY);
}

function currentUser(): DbUserRecord {
  const session = readSession();
  if (!session) {
    throw new ApiError("برای ادامه باید وارد حساب خود شوید.", "general");
  }

  const user = getDb().users.find((item) => item.id === session.userId);
  if (!user) {
    clearSession();
    throw new ApiError("نشست شما منقضی شده است؛ دوباره وارد شوید.", "general");
  }
  if (user.disabledAt) {
    clearSession();
    throw new ApiError(
      "این حساب غیرفعال شده است؛ برای پیگیری با پشتیبانی تماس بگیرید.",
      "general",
      "account_disabled",
    );
  }
  return user;
}

function currentAdmin(): DbUserRecord {
  const user = currentUser();
  if (user.role !== "admin") {
    throw new ApiError("شما به این بخش دسترسی ندارید.", "general");
  }
  return user;
}

function assertOwnerOrAdmin(order: Order, user: DbUserRecord): void {
  if (user.role !== "admin" && order.userId !== user.id) {
    throw new ApiError("این سفارش به حساب شما مربوط نیست.", "general");
  }
}

function findCourse(courseId: string): Course {
  const course = getDb().courses.find((item) => item.id === courseId);
  if (!course) {
    throw new ApiError("دوره‌ی انتخاب‌شده پیدا نشد.", "general");
  }
  return course;
}

function findCourseBySlug(slug: string): Course | null {
  return (
    getDb().courses.find(
      (item) => item.slug === slug && item.published !== false,
    ) ?? null
  );
}

function userOrders(userId: string): Order[] {
  return getDb().orders.filter((order) => order.userId === userId);
}

function hasPaidOrder(userId: string): boolean {
  return userOrders(userId).some((order) =>
    paidOrderStatuses.includes(order.status),
  );
}

function discountUsageCount(userId: string, code: string): number {
  return userOrders(userId).filter(
    (order) =>
      order.discount?.code === code &&
      paidOrderStatuses.includes(order.status),
  ).length;
}

function evaluateDiscountFor(
  rawCode: string,
  course: Course,
  user: DbUserRecord,
): DiscountValidation {
  const code = normalizeDiscountCode(rawCode);
  if (!code) {
    return { valid: false, message: "کد تخفیف را وارد کنید." };
  }

  const discount = getDb().discounts.find((item) => item.code === code) ?? null;
  const result = evaluateDiscount(discount, {
    priceToman: course.priceToman,
    courseId: course.id,
    userUsageCount: discountUsageCount(user.id, code),
    isFirstPurchase: !hasPaidOrder(user.id),
  });

  if (!result.valid) {
    return { valid: false, message: result.message };
  }

  return {
    valid: true,
    discount: clone(result.discount),
    amountToman: result.amountToman,
    finalToman: result.finalToman,
    label: result.label,
  };
}

function getCourseAccessStatus(
  userId: string,
  courseId: string,
): CourseAccessStatus {
  const orders = userOrders(userId).filter(
    (order) => order.course.id === courseId,
  );

  const fulfilled = orders.find(
    (order) => order.status === "fulfilled" && order.license !== null,
  );
  if (fulfilled) {
    return {
      allowed: false,
      reason: "license",
      orderId: fulfilled.id,
      orderNumber: fulfilled.number,
      orderStatus: fulfilled.status,
    };
  }

  const inProgress = orders.find((order) =>
    ["awaiting_license", "fulfilled", "on_hold"].includes(order.status),
  );
  if (inProgress) {
    return {
      allowed: false,
      reason: "in-progress",
      orderId: inProgress.id,
      orderNumber: inProgress.number,
      orderStatus: inProgress.status,
    };
  }

  const pending = orders.find((order) => order.status === "pending");
  if (pending) {
    return {
      allowed: false,
      reason: "pending-payment",
      orderId: pending.id,
      orderNumber: pending.number,
      orderStatus: pending.status,
    };
  }

  return { allowed: true };
}

function consumeDiscount(order: Order): void {
  if (!order.discount) return;
  const discount = getDb().discounts.find(
    (item) => item.code === order.discount?.code,
  );
  if (discount) {
    discount.usedCount += 1;
  }
}

/**
 * متن ایمیل لایسنس بر اساس تنظیمات ساخته می‌شود.
 * حتی وقتی درج کلید روشن است، کلید کامل در سابقه‌ی ایمیل ذخیره نمی‌شود تا
 * هیچ فهرستی کلید را لو ندهد؛ فقط وضعیت درج ثبت می‌شود.
 */
function licenseEmailOptions(): Pick<
  EmailMessage,
  "body" | "includesLicenseKey"
> {
  const includesLicenseKey =
    getDb().settings.general.includeLicenseKeyInEmail;
  return {
    includesLicenseKey,
    body: includesLicenseKey
      ? "کد لایسنس شما در همین ایمیل درج شده است؛ آن را در جای امن نگه دارید."
      : "برای امنیت بیشتر، کد لایسنس در ایمیل درج نشده است؛ آن را از داشبورد کاربری بردارید.",
  };
}

function sendLicenseEmail(order: Order, sentAt: string): EmailMessage {
  const email: EmailMessage = {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId: order.id,
    to: order.customer.email,
    subject: `لایسنس دوره‌ی شما آماده است | ${brand.nameFa}`,
    sentAt,
    template: "license-delivery",
    ...licenseEmailOptions(),
  };
  getDb().emails.push(email);
  return email;
}

/** کلید کامل لایسنس هرگز در فهرست‌ها برنمی‌گردد؛ فقط revealLicense آن را می‌دهد. */
function toPublicOrder(order: Order): Order {
  const copy = clone(order);
  if (copy.license) {
    delete copy.license.code;
  }
  return copy;
}

function toPublicOrders(orders: Order[]): Order[] {
  return orders.map(toPublicOrder);
}

function toAdminLicense(order: Order): AdminLicenseListItem | null {
  const license = order.license;
  if (!license) return null;
  return {
    id: license.id,
    maskedCode: license.maskedCode,
    orderId: order.id,
    orderNumber: order.number,
    userId: order.userId,
    customerName: order.customer.fullName,
    customerEmail: order.customer.email,
    courseId: order.course.id,
    courseTitle: order.course.title,
    issuedAt: license.issuedAt,
    emailSentAt: license.emailSentAt,
    source: license.source,
    revokedAt: license.revokedAt,
    revokeReason: license.revokeReason,
    description: license.description,
    providerReference: license.providerReference,
  };
}

function toAdminUser(user: DbUserRecord): AdminUserSummary {
  const orders = userOrders(user.id);
  const paidOrders = orders.filter((order) =>
    paidOrderStatuses.includes(order.status),
  );
  const licenses = orders.filter((order) => order.license !== null);
  const lastOrder = [...orders].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  )[0];

  return {
    ...toPublicUser(user),
    isActive: !user.disabledAt,
    ordersCount: orders.filter((order) => order.status !== "pending").length,
    licensesCount: licenses.length,
    totalSpentToman: paidOrders
      .filter((order) => order.status !== "refunded")
      .reduce((sum, order) => sum + order.totalToman, 0),
    lastOrderAt: lastOrder?.createdAt,
  };
}

function paymentReturnUrl(): string {
  try {
    if (typeof window !== "undefined" && window.location.origin) {
      return `${window.location.origin}/payment/callback`;
    }
  } catch {
    // محیط بدون window (مثل رندر سروری) از نشانی پیش‌فرض استفاده می‌کند.
  }
  return "https://brightpaths.example/payment/callback";
}

function toPaymentSettings(): PaymentSettings {
  const settings = getDb().settings.payment;
  return {
    hasToken: settings.hasToken,
    maskedToken: settings.maskedToken,
    enabled: settings.enabled,
    returnUrl: paymentReturnUrl(),
    lastTestedAt: settings.lastTestedAt,
    lastTestResult: settings.lastTestResult,
  };
}

type GeneralSettingsInput = Omit<GeneralSettings, "updatedAt">;

function assertGeneralSettings(input: GeneralSettingsInput): void {
  if (
    !Number.isFinite(input.fulfillmentSlaHours) ||
    input.fulfillmentSlaHours < 1 ||
    input.fulfillmentSlaHours > 168
  ) {
    throw new ApiError(
      "SLA تحویل باید بین ۱ تا ۱۶۸ ساعت باشد.",
      "general",
    );
  }
  if (
    !Number.isFinite(input.taxPercent) ||
    input.taxPercent < 0 ||
    input.taxPercent > 30
  ) {
    throw new ApiError("درصد مالیات باید بین ۰ تا ۳۰ باشد.", "general");
  }
  const footerEmail = input.footer.email.trim();
  if (footerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(footerEmail)) {
    throw new ApiError("ایمیل فوتر را درست وارد کنید.", "general");
  }
  if (input.footer.about.trim().length < 20) {
    throw new ApiError("متن معرفی فوتر باید حداقل ۲۰ کاراکتر باشد.", "general");
  }
  if (input.footer.address.trim().length < 5) {
    throw new ApiError("نشانی فوتر را کامل‌تر بنویسید.", "general");
  }
  if (input.trustBadge.enabled) {
    if (input.trustBadge.label.trim().length < 3) {
      throw new ApiError("عنوان نماد اعتماد را بنویسید.", "general");
    }
    if (!/^https:\/\//.test(input.trustBadge.url.trim())) {
      throw new ApiError(
        "نشانی نماد اعتماد باید با https:// شروع شود.",
        "general",
      );
    }
  }
}

function assertPostInput(
  input: BlogPostInput,
  ignoreId?: string,
): {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  readMinutes: number;
  art: BlogPost["art"];
  body: string;
  status: NonNullable<BlogPost["status"]>;
  sections: BlogPost["sections"];
} {
  const database = getDb();
  const title = input.title.trim();
  if (title.length < 5) {
    throw new ApiError("عنوان مقاله باید حداقل ۵ کاراکتر باشد.", "title");
  }
  if (title.length > 140) {
    throw new ApiError("عنوان مقاله نمی‌تواند بیشتر از ۱۴۰ کاراکتر باشد.", "title");
  }
  if (input.excerpt.trim().length < 20) {
    throw new ApiError(
      "خلاصه‌ی مقاله باید حداقل ۲۰ کاراکتر باشد.",
      "general",
    );
  }
  if (input.category.trim().length < 2) {
    throw new ApiError("دسته‌بندی را بنویسید.", "general");
  }
  if (input.author.trim().length < 2) {
    throw new ApiError("نام نویسنده را بنویسید.", "general");
  }
  if (
    !Number.isFinite(input.readMinutes) ||
    input.readMinutes < 1 ||
    input.readMinutes > 90
  ) {
    throw new ApiError("زمان مطالعه باید بین ۱ تا ۹۰ دقیقه باشد.", "general");
  }
  if (input.body.trim().length < 30) {
    throw new ApiError("متن مقاله باید حداقل ۳۰ کاراکتر باشد.", "body");
  }

  const baseSlug = slugifyPersian(input.slug.trim() || title);
  if (!isValidPersianSlug(baseSlug)) {
    throw new ApiError(
      "نشانی مقاله فقط می‌تواند شامل حروف فارسی، عدد و خط تیره باشد.",
      "slug",
    );
  }
  const duplicate = database.posts.find(
    (post) => post.slug === baseSlug && post.id !== ignoreId,
  );
  if (duplicate) {
    throw new ApiError("این نشانی قبلاً برای مقاله‌ی دیگری استفاده شده است.", "slug");
  }

  const sections = markdownToSections(input.body);
  if (sections.length === 0) {
    throw new ApiError(
      "محتوای مقاله را با دست‌کم یک تیتر سطح دو (##) بنویسید.",
      "body",
    );
  }

  return {
    title,
    slug: baseSlug,
    excerpt: input.excerpt.trim(),
    category: input.category.trim(),
    author: input.author.trim(),
    readMinutes: Math.round(input.readMinutes),
    art: input.art,
    body: input.body.trim(),
    status: input.status,
    sections,
  };
}

function assertFaqInput(input: HomeFaqInput): {
  question: string;
  answer: string;
  isActive: boolean;
} {
  const question = input.question.trim();
  const answer = input.answer.trim();
  if (question.length < 10) {
    throw new ApiError("پرسش باید حداقل ۱۰ کاراکتر باشد.", "question");
  }
  if (question.length > 250) {
    throw new ApiError("پرسش نمی‌تواند بیشتر از ۲۵۰ کاراکتر باشد.", "question");
  }
  if (answer.length < 20) {
    throw new ApiError("پاسخ باید حداقل ۲۰ کاراکتر باشد.", "answer");
  }
  if (answer.length > 1500) {
    throw new ApiError("پاسخ نمی‌تواند بیشتر از ۱۵۰۰ کاراکتر باشد.", "answer");
  }
  return { question, answer, isActive: input.isActive };
}

function assertTeacherInput(input: TeacherInput): {
  name: string;
  role: string;
  bio: string;
  initials: string;
  accent: Teacher["accent"];
  isActive: boolean;
} {
  const name = input.name.trim();
  const role = input.role.trim();
  const bio = input.bio.trim();
  const initials = input.initials.trim();
  if (name.length < 3) {
    throw new ApiError("نام مربی را کامل وارد کنید.", "name");
  }
  if (role.length < 3) {
    throw new ApiError("عنوان نقش مربی را وارد کنید.", "role");
  }
  if (bio.length < 20) {
    throw new ApiError("معرفی مربی باید حداقل ۲۰ کاراکتر باشد.", "bio");
  }
  if (!/^[\p{L}\p{N}]{1,3}$/u.test(initials)) {
    throw new ApiError("کوته‌نوشت باید ۱ تا ۳ نویسه باشد.", "general");
  }
  if (!["lavender", "yellow", "sky", "coral"].includes(input.accent)) {
    throw new ApiError("رنگ کارت مربی معتبر نیست.", "general");
  }
  return { name, role, bio, initials, accent: input.accent, isActive: input.isActive };
}

function assertInboxStatus(status: string): MessageStatus {
  if (status !== "new" && status !== "read" && status !== "done") {
    throw new ApiError("وضعیت پیام معتبر نیست.", "general");
  }
  return status;
}

function reorderItems<T extends { order?: number }>(
  items: T[],
  id: string,
  direction: "up" | "down",
): void {
  const sorted = [...items].sort(
    (first, second) => (first.order ?? 0) - (second.order ?? 0),
  );
  const index = sorted.findIndex((item) => (item as { id?: string }).id === id);
  if (index < 0) {
    throw new ApiError("مورد انتخاب‌شده پیدا نشد.", "general");
  }
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= sorted.length) {
    throw new ApiError("جابه‌جایی در این جهت ممکن نیست.", "general");
  }
  const current = sorted[index];
  sorted[index] = sorted[target];
  sorted[target] = current;
  sorted.forEach((item, itemIndex) => {
    item.order = itemIndex;
  });
}

/** اثر انگشت ساده برای تشخیص کلید تکراری؛ در سرور واقعی هش امن استفاده می‌شود. */
function licenseFingerprint(code: string): string {
  return normalizeLicenseCode(code).replace(/[^A-Z0-9]/g, "");
}

function duplicateLicenseOwner(
  code: string,
  exceptOrderId?: string,
): Order | null {
  const fingerprint = licenseFingerprint(code);
  return (
    getDb().orders.find(
      (order) =>
        order.id !== exceptOrderId &&
        order.license?.code !== undefined &&
        licenseFingerprint(order.license.code) === fingerprint,
    ) ?? null
  );
}

function addHistory(
  order: Order,
  status: OrderStatus,
  note: string,
  byName = "سیستم",
): void {
  order.statusHistory.push({
    id: `evt-${order.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status,
    at: new Date().toISOString(),
    note,
    byName,
  });
}

function addNotification(
  userId: string,
  input: {
    title: string;
    body: string;
    kind: Notification["kind"];
    href?: string;
  },
  at = new Date().toISOString(),
): void {
  getDb().notifications.unshift({
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    userId,
    title: input.title,
    body: input.body,
    kind: input.kind,
    createdAt: at,
    href: input.href,
  });
}

function writeAudit(
  actor: DbUserRecord,
  action: string,
  entityType: string,
  entityId: string | undefined,
  summary: string,
): void {
  getDb().auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    at: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.fullName,
    action,
    entityType,
    entityId,
    summary,
  });
}

function pushEmail(
  order: Order,
  template: EmailMessage["template"],
  subject: string,
  sentAt: string,
  extra: Pick<EmailMessage, "body" | "includesLicenseKey"> = {},
): EmailMessage {
  const email: EmailMessage = {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId: order.id,
    to: order.customer.email,
    subject,
    sentAt,
    template,
    ...extra,
  };
  getDb().emails.push(email);
  return email;
}

function sortNewest(orders: Order[]): Order[] {
  return [...orders].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

function nextOrderNumber(): number {
  return (
    getDb().orders.reduce((max, order) => Math.max(max, order.number), 1000) + 1
  );
}

function trackingNumber(order: Order): string {
  return order.paymentRef ?? `BP-${order.number}-${Date.now().toString().slice(-6)}`;
}

function toPaymentResult(order: Order): PaymentResult {
  const base = {
    orderId: order.id,
    trackingNumber: trackingNumber(order),
    paidAt: order.paidAt,
    order: toPublicOrder(order),
  };

  switch (order.status) {
    case "pending":
      return {
        ...base,
        state: "pending",
        message: "پرداخت شما در حال بررسی است؛ نتیجه به‌زودی اعلام می‌شود.",
      };
    case "failed":
      return {
        ...base,
        state: "failed",
        message: "پرداخت انجام نشد یا از سوی بانک تأیید نشد. می‌توانید دوباره تلاش کنید.",
      };
    case "cancelled":
    case "expired":
      return {
        ...base,
        state: "error",
        message:
          order.status === "expired"
            ? "زمان پرداخت این سفارش به پایان رسیده است. لطفاً سفارش تازه‌ای ثبت کنید."
            : "این سفارش لغو شده است. برای خرید دوباره به صفحه‌ی دوره برگردید.",
      };
    case "refunded":
      return {
        ...base,
        state: "success",
        message: "پرداخت شما قبلاً تأیید شده و مبلغ سفارش بازگردانده شده است.",
      };
    case "on_hold":
      return {
        ...base,
        state: "pending",
        message: "پرداخت شما تأیید شده اما سفارش برای بررسی بیشتر در انتظار است.",
      };
    case "awaiting_license":
    case "fulfilled":
    default:
      return {
        ...base,
        state: "success",
        message: "پرداخت شما با موفقیت تأیید شد.",
      };
  }
}

function buildOrderDiscount(
  validation: Extract<DiscountValidation, { valid: true }>,
): Order["discount"] {
  return {
    code: validation.discount.code,
    type: validation.discount.type,
    label: validation.label,
    amountToman: validation.amountToman,
    percent: validation.discount.percent,
  };
}

function readJsonArray<T>(key: string): T[] {
  try {
    const raw = readStorage(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function fulfillOrder(
  order: Order,
  admin: DbUserRecord,
  input: AddLicenseInput,
  notifyUser: boolean,
): Order {
  if (order.status === "fulfilled") {
    throw new ApiError("برای این سفارش قبلاً لایسنس ثبت شده است.", "general");
  }
  if (order.status !== "awaiting_license" && order.status !== "on_hold") {
    throw new ApiError(
      "فقط سفارش‌های در انتظار صدور یا در حال بررسی قابل تحویل هستند.",
      "general",
    );
  }

  const code = normalizeLicenseCode(input.licenseCode);
  if (code.length < 6) {
    throw new ApiError("کد لایسنس معتبر نیست.", "licenseCode");
  }

  const duplicate = duplicateLicenseOwner(code, order.id);
  if (duplicate && input.confirmDuplicate !== true) {
    throw new ApiError(
      `این کلید قبلاً برای سفارش ${duplicate.number} ثبت شده است. اگر مطمئن هستید، ثبت تکراری را تأیید کنید.`,
      "licenseCode",
      "license_duplicate",
    );
  }

  const now = new Date().toISOString();
  order.license = {
    id: order.license?.id ?? `license-${order.number}-${Date.now()}`,
    code,
    maskedCode: "••••",
    issuedAt: now,
    emailSentAt: notifyUser ? now : undefined,
    enteredBy: admin.id,
    description: input.description?.trim() || undefined,
    providerReference:
      input.providerReference?.trim() || order.providerReference,
    source: "provider",
  };
  order.status = "fulfilled";
  order.onHoldReason = undefined;
  order.updatedAt = now;
  addHistory(
    order,
    "fulfilled",
    duplicate
      ? "لایسنس با تأیید صریح کلید تکراری ثبت شد."
      : "لایسنس ثبت شد و سفارش تکمیل شد.",
    admin.fullName,
  );

  if (notifyUser) {
    pushEmail(
      order,
      "license-delivery",
      `لایسنس دوره‌ی شما آماده است | ${brand.nameFa}`,
      now,
      licenseEmailOptions(),
    );
    addNotification(
      order.userId,
      {
        title: "لایسنس دوره‌ی شما آماده شد",
        body: `کد لایسنس دوره‌ی «${order.course.title}» در داشبورد شما قرار گرفت.`,
        kind: "license",
        href: "/dashboard",
      },
      now,
    );
  }

  writeAudit(
    admin,
    duplicate ? "license.duplicate_accepted" : "license.fulfilled",
    "order",
    order.id,
    `لایسنس سفارش ${order.number} ثبت شد${
      duplicate ? ` (کلید تکراری با سفارش ${duplicate.number})` : ""
    }.`,
  );
  return order;
}

function assertDiscountConfig(input: {
  type: "percent" | "fixed";
  percent?: number;
  amountToman?: number;
  maxUses: number;
  maxUsesPerUser: number;
  startsAt?: string;
  expiresAt?: string;
}): void {
  if (input.type === "percent") {
    if (
      typeof input.percent !== "number" ||
      !Number.isInteger(input.percent) ||
      input.percent < 1 ||
      input.percent > 90
    ) {
      throw new ApiError("درصد تخفیف باید بین ۱ تا ۹۰ باشد.", "code");
    }
  } else if (
    typeof input.amountToman !== "number" ||
    !Number.isInteger(input.amountToman) ||
    input.amountToman < 1000
  ) {
    throw new ApiError("مبلغ تخفیف باید حداقل ۱٬۰۰۰ تومان باشد.", "code");
  }
  if (!Number.isInteger(input.maxUses) || input.maxUses < 1) {
    throw new ApiError("سقف استفاده باید حداقل ۱ باشد.", "code");
  }
  if (!Number.isInteger(input.maxUsesPerUser) || input.maxUsesPerUser < 1) {
    throw new ApiError("سقف استفاده‌ی هر کاربر باید حداقل ۱ باشد.", "code");
  }
  if (input.startsAt && input.expiresAt) {
    const start = new Date(input.startsAt).getTime();
    const end = new Date(input.expiresAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
      throw new ApiError("پایان بازه باید بعد از شروع آن باشد.", "code");
    }
  }
}

function makeBulkCode(prefix: string, taken: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let suffix = "";
    for (let index = 0; index < 4; index += 1) {
      suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const code = `${prefix}-${suffix}`;
    if (!taken.has(code)) return code;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

export const mockAdapter = {
  async login(input: LoginInput): Promise<AuthSession> {
    await delay();
    const database = getDb();
    const email = normalizeEmail(input.email);
    const user = database.users.find((item) => item.email === email);

    if (!user || user.passwordHash !== hashPassword(input.password)) {
      throw new ApiError("ایمیل یا رمز عبور درست نیست.", "general");
    }
    if (user.disabledAt) {
      throw new ApiError(
        "این حساب غیرفعال شده است؛ برای پیگیری با پشتیبانی تماس بگیرید.",
        "general",
        "account_disabled",
      );
    }

    const session = writeSession(user.id);
    return { user: toPublicUser(user), token: session.token };
  },

  async register(input: RegisterInput): Promise<AuthSession> {
    await delay(300);
    const database = getDb();
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);

    if (database.users.some((item) => item.email === email)) {
      throw new ApiError("این ایمیل قبلاً ثبت شده است.", "email");
    }
    if (database.users.some((item) => item.phone === phone)) {
      throw new ApiError("این شماره موبایل قبلاً ثبت شده است.", "phone");
    }

    const user: DbUserRecord = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fullName: input.fullName.trim(),
      email,
      phone,
      role: "parent",
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(input.password),
    };

    database.users.push(user);
    saveDb();
    const session = writeSession(user.id);
    return { user: toPublicUser(user), token: session.token };
  },

  async requestPasswordReset(
    _input: PasswordResetInput,
  ): Promise<PasswordResetReceipt> {
    await delay(420);
    // پیام عمداً عمومی است تا وجود یا نبود حساب لو نرود.
    return {
      message:
        "اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز برای شما ارسال شد.",
    };
  },

  async getSession(): Promise<AuthSession | null> {
    await delay(120);
    const session = readSession();
    if (!session) return null;
    const user = getDb().users.find((item) => item.id === session.userId);
    if (!user || user.disabledAt) {
      clearSession();
      return null;
    }
    return { user: toPublicUser(user), token: session.token };
  },

  async logout(): Promise<void> {
    await delay(80);
    clearSession();
  },

  async listCourses(): Promise<Course[]> {
    await delay(180);
    return clone(getDb().courses.filter((course) => course.published !== false));
  },

  async getCourse(slug: string): Promise<Course | null> {
    await delay(180);
    const course = findCourseBySlug(slug);
    return course ? clone(course) : null;
  },

  async getCourseBySlug(slug: string): Promise<Course | null> {
    await delay(200);
    const course = findCourseBySlug(slug);
    return course ? clone(course) : null;
  },

  async getCourseById(id: string): Promise<Course | null> {
    await delay(120);
    const course = getDb().courses.find(
      (item) => item.id === id && item.published !== false,
    );
    return course ? clone(course) : null;
  },

  async validateDiscount(
    input: ValidateDiscountInput,
  ): Promise<DiscountValidation> {
    await delay(260);
    const user = currentUser();
    const course = findCourse(input.courseId);
    return evaluateDiscountFor(input.code, course, user);
  },

  async getCourseAccess(courseId: string): Promise<CourseAccessStatus> {
    await delay(140);
    const user = currentUser();
    return getCourseAccessStatus(user.id, courseId);
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    await delay(320);
    const user = currentUser();
    const database = getDb();
    const course = findCourse(input.courseId);

    const access = getCourseAccessStatus(user.id, course.id);
    if (!access.allowed) {
      const message =
        access.reason === "license"
          ? "برای این دوره لایسنس فعال دارید؛ خرید دوباره لازم نیست."
          : access.reason === "pending-payment"
            ? "برای این دوره یک سفارش در انتظار پرداخت دارید."
            : "برای این دوره یک سفارش در جریان دارید.";
      throw new ApiError(message, "general");
    }

    let discount: Order["discount"] = null;
    let totalToman = course.priceToman;
    let freeOrder = false;

    if (input.discountCode && input.discountCode.trim().length > 0) {
      const validation = evaluateDiscountFor(
        input.discountCode,
        course,
        user,
      );
      if (!validation.valid) {
        throw new ApiError(validation.message, "code");
      }
      discount = buildOrderDiscount(validation);
      totalToman = validation.finalToman;
      freeOrder = totalToman === 0;
    }

    const taxPercent = database.settings.general.taxPercent;
    const taxToman =
      taxPercent > 0 ? Math.round((totalToman * taxPercent) / 100) : 0;
    totalToman += taxToman;
    freeOrder = totalToman === 0;

    const now = new Date().toISOString();
    const number = nextOrderNumber();
    const order: Order = {
      id: `order-${number}`,
      number,
      userId: user.id,
      source: "purchase",
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        art: course.art,
        priceToman: course.priceToman,
      },
      customer: {
        fullName: user.fullName,
        email: input.contactEmail ? normalizeEmail(input.contactEmail) : user.email,
        phone: input.contactPhone ? normalizePhone(input.contactPhone) : user.phone,
      },
      originalPriceToman: course.priceToman,
      discount,
      taxPercent: taxPercent > 0 ? taxPercent : undefined,
      taxToman: taxToman > 0 ? taxToman : undefined,
      totalToman,
      status: freeOrder ? "awaiting_license" : "pending",
      createdAt: now,
      paidAt: freeOrder ? now : undefined,
      paymentRef: freeOrder ? `FREE-${number}` : undefined,
      paymentState: freeOrder ? "success" : "unpaid",
      license: null,
      note: input.note?.trim() || undefined,
      updatedAt: now,
      statusHistory: [
        {
          id: `evt-order-${number}-created`,
          status: freeOrder ? "awaiting_license" : "pending",
          at: now,
          note: freeOrder
            ? "سفارش رایگان ثبت شد و به صف تحویل لایسنس رفت."
            : "سفارش ثبت شد و منتظر پرداخت است.",
          byName: user.fullName,
        },
      ],
      refund: null,
    };

    database.orders.push(order);
    if (freeOrder) consumeDiscount(order);
    addNotification(user.id, {
      title: "سفارش شما ثبت شد",
      body: `سفارش ${number} برای دوره‌ی ${course.title} ثبت شد. وضعیت تحویل را از داشبورد دنبال کنید.`,
      kind: "order",
      href: "/dashboard",
    });
    saveDb();
    return toPublicOrder(order);
  },

  async startPayment(orderId: string): Promise<PaymentResult> {
    await delay(700);
    const user = currentUser();
    const database = getDb();
    const order = database.orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    assertOwnerOrAdmin(order, user);

    if (order.status === "pending" || order.status === "failed") {
      const now = new Date().toISOString();
      order.status = "awaiting_license";
      order.paidAt = now;
      order.updatedAt = now;
      order.paymentRef = `BP-${order.number}-${Date.now().toString().slice(-6)}`;
      order.paymentState = "success";
      consumeDiscount(order);
      saveDb();
    }

    return toPaymentResult(clone(order));
  },

  async getPaymentResult(orderId: string): Promise<PaymentResult> {
    await delay(220);
    const user = currentUser();
    const order = getDb().orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("اطلاعات این پرداخت پیدا نشد.", "general");
    }
    assertOwnerOrAdmin(order, user);
    return toPaymentResult(clone(order));
  },

  async cancelOrder(orderId: string): Promise<Order> {
    await delay(200);
    const user = currentUser();
    const database = getDb();
    const order = database.orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    assertOwnerOrAdmin(order, user);
    if (order.status !== "pending") {
      throw new ApiError("فقط سفارش‌های در انتظار پرداخت قابل لغو هستند.", "general");
    }
    order.status = "cancelled";
    const now = new Date().toISOString();
    order.updatedAt = now;
    order.cancelReason = "لغو توسط کاربر پیش از پرداخت.";
    addHistory(order, "cancelled", order.cancelReason, user.fullName);
    saveDb();
    return toPublicOrder(order);
  },

  async getOrder(orderId: string): Promise<Order> {
    await delay(160);
    const user = currentUser();
    const order = getDb().orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    assertOwnerOrAdmin(order, user);
    return toPublicOrder(order);
  },

  async listMyOrders(): Promise<Order[]> {
    await delay(220);
    const user = currentUser();
    return toPublicOrders(sortNewest(userOrders(user.id)));
  },

  async listAllOrders(): Promise<Order[]> {
    await delay(260);
    currentAdmin();
    return toPublicOrders(sortNewest(getDb().orders));
  },

  async addLicense(input: AddLicenseInput): Promise<Order> {
    await delay(420);
    const admin = currentAdmin();
    const order = getDb().orders.find((item) => item.id === input.orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    fulfillOrder(order, admin, input, true);
    saveDb();
    return toPublicOrder(order);
  },

  async fulfillLicense(input: FulfillLicenseInput): Promise<Order> {
    await delay(480);
    const admin = currentAdmin();
    const order = getDb().orders.find((item) => item.id === input.orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    fulfillOrder(order, admin, input, input.notifyUser);
    saveDb();
    return toPublicOrder(order);
  },

  async revealLicense(licenseId: string): Promise<LicenseReveal> {
    await delay(300);
    const user = currentUser();
    const order = getDb().orders.find(
      (item) => item.license?.id === licenseId,
    );
    if (!order || !order.license) {
      throw new ApiError("لایسنس پیدا نشد.", "general");
    }
    assertOwnerOrAdmin(order, user);
    if (!order.license.code) {
      throw new ApiError("کلید این لایسنس در دسترس نیست.", "general");
    }
    const course = findCourse(order.course.id);

    writeAudit(
      user,
      "license.revealed",
      "license",
      licenseId,
      `کلید لایسنس سفارش ${order.number} نمایش داده شد.`,
    );
    saveDb();

    return {
      licenseId,
      orderId: order.id,
      code: order.license.code,
      description: order.license.description,
      providerReference: order.license.providerReference,
      providerName: course.providerName,
      providerPanelUrl: course.providerPanelUrl,
      activationUrl: course.activationUrl,
      activationInstructions: course.activationInstructions,
    };
  },

  async editLicense(input: EditLicenseInput): Promise<Order> {
    await delay(380);
    const admin = currentAdmin();
    const order = getDb().orders.find(
      (item) => item.license?.id === input.licenseId,
    );
    if (!order || !order.license) {
      throw new ApiError("لایسنس پیدا نشد.", "general");
    }

    if (input.licenseCode !== undefined && input.licenseCode.trim()) {
      const code = normalizeLicenseCode(input.licenseCode);
      if (code.length < 6) {
        throw new ApiError("کد لایسنس معتبر نیست.", "licenseCode");
      }
      if (
        licenseFingerprint(order.license.code ?? "") !==
        licenseFingerprint(code)
      ) {
        const duplicate = duplicateLicenseOwner(code, order.id);
        if (duplicate) {
          throw new ApiError(
            `این کلید قبلاً برای سفارش ${duplicate.number} ثبت شده است.`,
            "licenseCode",
            "license_duplicate",
          );
        }
        order.license.code = code;
      }
    }

    order.license.description =
      input.description?.trim() || order.license.description;
    order.license.providerReference =
      input.providerReference?.trim() || order.license.providerReference;

    const now = new Date().toISOString();
    order.updatedAt = now;
    if (input.notifyUser) {
      order.license.emailSentAt = now;
      pushEmail(
        order,
        "license-updated",
        `اطلاعات لایسنس دوره‌ی شما به‌روزرسانی شد | ${brand.nameFa}`,
        now,
      );
      addNotification(order.userId, {
        title: "اطلاعات لایسنس به‌روزرسانی شد",
        body: `جزئیات لایسنس دوره‌ی «${order.course.title}» تغییر کرد.`,
        kind: "license",
        href: "/dashboard",
      });
    }
    addHistory(order, "fulfilled", "اطلاعات لایسنس توسط مدیر ویرایش شد.", admin.fullName);
    writeAudit(
      admin,
      "license.updated",
      "license",
      order.license.id,
      `لایسنس سفارش ${order.number} ویرایش شد.`,
    );
    saveDb();
    return toPublicOrder(order);
  },

  async holdOrder(input: HoldOrderInput): Promise<Order> {
    await delay(360);
    const admin = currentAdmin();
    const order = getDb().orders.find((item) => item.id === input.orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    if (order.status !== "awaiting_license" && order.status !== "on_hold") {
      throw new ApiError("این سفارش در وضعیت قابل بررسی نیست.", "general");
    }
    const reason = input.reason.trim();
    if (reason.length < 5) {
      throw new ApiError("دلیل بررسی را کامل بنویسید.", "general");
    }

    const now = new Date().toISOString();
    order.status = "on_hold";
    order.onHoldReason = reason;
    order.updatedAt = now;
    addHistory(order, "on_hold", reason, admin.fullName);

    if (input.sendDelayEmail) {
      pushEmail(
        order,
        "order-hold",
        `سفارش شما در حال بررسی است | ${brand.nameFa}`,
        now,
      );
    }
    addNotification(order.userId, {
      title: "سفارش شما در حال بررسی است",
      body: `سفارش ${order.number} برای بررسی بیشتر متوقف شد. همکاران ما در اولین فرصت پیگیری می‌کنند.`,
      kind: "order",
      href: "/dashboard",
    });
    writeAudit(
      admin,
      "order.on_hold",
      "order",
      order.id,
      `سفارش ${order.number} با دلیل «${reason}» در انتظار بررسی قرار گرفت.`,
    );
    saveDb();
    return toPublicOrder(order);
  },

  async sendDelayEmail(orderId: string): Promise<Order> {
    await delay(300);
    const admin = currentAdmin();
    const order = getDb().orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    if (order.status !== "awaiting_license" && order.status !== "on_hold") {
      throw new ApiError(
        "ارسال ایمیل تأخیر فقط برای سفارش‌های در جریان ممکن است.",
        "general",
      );
    }
    const now = new Date().toISOString();
    pushEmail(
      order,
      "order-hold",
      `اطلاع‌رسانی تأخیر در تحویل لایسنس | ${brand.nameFa}`,
      now,
    );
    addNotification(order.userId, {
      title: "به‌روزرسانی زمان تحویل لایسنس",
      body: `تحویل لایسنس سفارش ${order.number} کمی بیشتر طول می‌کشد؛ همکاران ما در حال پیگیری هستند.`,
      kind: "order",
      href: "/dashboard/orders",
    });
    writeAudit(
      admin,
      "order.delay_email_sent",
      "order",
      order.id,
      `ایمیل اطلاع‌رسانی تأخیر برای سفارش ${order.number} ارسال شد.`,
    );
    saveDb();
    return toPublicOrder(order);
  },

  async resumeOrder(orderId: string): Promise<Order> {
    await delay(320);
    const admin = currentAdmin();
    const order = getDb().orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    if (order.status !== "on_hold") {
      throw new ApiError("فقط سفارش‌های در حال بررسی قابل بازگشت به صف هستند.", "general");
    }
    const now = new Date().toISOString();
    order.status = "awaiting_license";
    order.updatedAt = now;
    order.onHoldReason = undefined;
    addHistory(order, "awaiting_license", "بررسی پایان یافت و سفارش به صف تحویل بازگشت.", admin.fullName);
    addNotification(order.userId, {
      title: "بررسی سفارش شما پایان یافت",
      body: `سفارش ${order.number} دوباره در صف صدور لایسنس قرار گرفت.`,
      kind: "order",
      href: "/dashboard",
    });
    writeAudit(
      admin,
      "order.resumed",
      "order",
      order.id,
      `سفارش ${order.number} از بررسی خارج و به صف تحویل بازگردانده شد.`,
    );
    saveDb();
    return toPublicOrder(order);
  },

  async adminCancelOrder(input: CancelOrderInput): Promise<Order> {
    await delay(340);
    const admin = currentAdmin();
    const order = getDb().orders.find((item) => item.id === input.orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    if (["cancelled", "expired", "refunded"].includes(order.status)) {
      throw new ApiError("این سفارش قبلاً بسته شده است.", "general");
    }
    const reason = input.reason.trim();
    if (reason.length < 5) {
      throw new ApiError("دلیل لغو را کامل بنویسید.", "general");
    }
    const now = new Date().toISOString();
    order.status = "cancelled";
    order.cancelReason = reason;
    order.updatedAt = now;
    addHistory(order, "cancelled", reason, admin.fullName);
    pushEmail(
      order,
      "order-cancelled",
      `سفارش شما لغو شد | ${brand.nameFa}`,
      now,
    );
    addNotification(order.userId, {
      title: "سفارش شما لغو شد",
      body: `سفارش ${order.number} لغو شد. برای هماهنگی با پشتیبانی تماس بگیرید.`,
      kind: "order",
      href: "/dashboard/orders",
    });
    writeAudit(
      admin,
      "order.cancelled",
      "order",
      order.id,
      `سفارش ${order.number} با دلیل «${reason}» لغو شد.`,
    );
    saveDb();
    return toPublicOrder(order);
  },

  async refundOrder(input: RefundOrderInput): Promise<Order> {
    await delay(420);
    const admin = currentAdmin();
    const order = getDb().orders.find((item) => item.id === input.orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    if (order.status === "refunded") {
      throw new ApiError("برای این سفارش قبلاً بازگشت وجه ثبت شده است.", "general");
    }
    if (!order.paidAt) {
      throw new ApiError("این سفارش پرداختی ندارد که بازگردانده شود.", "general");
    }
    const reason = input.reason.trim();
    if (reason.length < 5) {
      throw new ApiError("دلیل بازگشت وجه را کامل بنویسید.", "general");
    }

    const now = new Date().toISOString();
    order.status = "refunded";
    order.refund = {
      amountToman: order.totalToman,
      refundedAt: now,
      reference: input.reference?.trim() || `PAYPING-${order.number}`,
      reason,
    };
    order.updatedAt = now;
    addHistory(order, "refunded", `بازگشت وجه دستی: ${reason}`, admin.fullName);
    pushEmail(
      order,
      "refund-notice",
      `بازگشت وجه سفارش شما ثبت شد | ${brand.nameFa}`,
      now,
    );
    addNotification(order.userId, {
      title: "بازگشت وجه سفارش ثبت شد",
      body: `مبلغ سفارش ${order.number} در حال بازگشت به حساب پرداخت‌کننده است. لغو لایسنس نزد ارائه‌دهنده جداگانه هماهنگ می‌شود.`,
      kind: "order",
      href: "/dashboard/orders",
    });
    writeAudit(
      admin,
      "order.refunded",
      "order",
      order.id,
      `بازگشت وجه سفارش ${order.number} به مبلغ ${order.totalToman} تومان ثبت شد.`,
    );
    saveDb();
    return toPublicOrder(order);
  },

  async grantGiftLicense(input: GiftLicenseInput): Promise<Order> {
    await delay(520);
    const admin = currentAdmin();
    const database = getDb();
    const email = normalizeEmail(input.email);
    const user = database.users.find((item) => item.email === email);
    if (!user) {
      throw new ApiError("کاربری با این ایمیل پیدا نشد.", "email");
    }
    const course = database.courses.find((item) => item.id === input.courseId);
    if (!course) {
      throw new ApiError("دوره پیدا نشد.", "general");
    }
    const code = normalizeLicenseCode(input.licenseCode);
    if (code.length < 6) {
      throw new ApiError("کد لایسنس معتبر نیست.", "licenseCode");
    }
    const duplicate = duplicateLicenseOwner(code);
    if (duplicate && input.confirmDuplicate !== true) {
      throw new ApiError(
        `این کلید قبلاً برای سفارش ${duplicate.number} ثبت شده است. اگر مطمئن هستید، ثبت تکراری را تأیید کنید.`,
        "licenseCode",
        "license_duplicate",
      );
    }

    const now = new Date().toISOString();
    const number = nextOrderNumber();
    const order: Order = {
      id: `order-${number}`,
      number,
      userId: user.id,
      source: "gift",
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        art: course.art,
        priceToman: course.priceToman,
      },
      customer: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
      originalPriceToman: course.priceToman,
      discount: null,
      totalToman: 0,
      status: "fulfilled",
      createdAt: now,
      paidAt: now,
      paymentRef: `GIFT-${number}`,
      paymentState: "success",
      license: {
        id: `license-${number}-${Date.now()}`,
        code,
        maskedCode: "••••",
        issuedAt: now,
        emailSentAt: input.notifyUser ? now : undefined,
        enteredBy: admin.id,
        description: input.description?.trim() || undefined,
        providerReference: input.providerReference?.trim() || undefined,
        source: "gift",
      },
      statusHistory: [
        {
          id: `evt-order-${number}-gift`,
          status: "fulfilled",
          at: now,
          note: "لایسنس هدیه به‌صورت دستی صادر شد.",
          byName: admin.fullName,
        },
      ],
      refund: null,
      updatedAt: now,
    };
    database.orders.push(order);

    if (input.notifyUser) {
      pushEmail(
        order,
        "gift-license",
        `یک لایسنس هدیه برای شما فعال شد | ${brand.nameFa}`,
        now,
        licenseEmailOptions(),
      );
    }
    addNotification(user.id, {
      title: "لایسنس هدیه فعال شد",
      body: `دوره‌ی «${course.title}» به‌صورت هدیه برای حساب شما فعال شد.`,
      kind: "license",
      href: "/dashboard",
    });
    writeAudit(
      admin,
      "license.gifted",
      "order",
      order.id,
      `لایسنس هدیه برای ${user.email} و دوره‌ی ${course.title} صادر شد${
        duplicate ? ` (کلید تکراری با سفارش ${duplicate.number})` : ""
      }.`,
    );
    saveDb();
    return toPublicOrder(order);
  },

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    await delay(320);
    const user = currentUser();
    const record = getDb().users.find((item) => item.id === user.id);
    if (!record) {
      throw new ApiError("حساب کاربری پیدا نشد.", "general");
    }
    const fullName = input.fullName.trim();
    if (fullName.length < 3) {
      throw new ApiError("نام را کامل وارد کنید.", "fullName");
    }
    const phone = normalizePhone(input.phone);
    if (!/^09\d{9}$/.test(phone)) {
      throw new ApiError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.", "phone");
    }
    record.fullName = fullName;
    record.phone = phone;
    saveDb();
    return clone(toPublicUser(record));
  },

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await delay(360);
    const user = currentUser();
    const record = getDb().users.find((item) => item.id === user.id);
    if (!record) {
      throw new ApiError("حساب کاربری پیدا نشد.", "general");
    }
    if (record.passwordHash !== hashPassword(input.currentPassword)) {
      throw new ApiError("رمز عبور فعلی درست نیست.", "currentPassword");
    }
    if (input.newPassword.length < 8) {
      throw new ApiError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.", "newPassword");
    }
    if (!/[A-Za-z]/.test(input.newPassword) || !/\d/.test(input.newPassword)) {
      throw new ApiError(
        "رمز عبور جدید باید هم حرف و هم عدد داشته باشد.",
        "newPassword",
      );
    }
    if (input.newPassword === input.currentPassword) {
      throw new ApiError("رمز عبور جدید باید با رمز فعلی متفاوت باشد.", "newPassword");
    }
    record.passwordHash = hashPassword(input.newPassword);
    saveDb();
    writeAudit(
      record,
      "account.password_changed",
      "user",
      record.id,
      "رمز عبور حساب کاربری تغییر کرد.",
    );
    saveDb();
  },

  async requestAccountDeletion(
    input: AccountDeletionInput,
  ): Promise<AccountDeletionReceipt> {
    await delay(420);
    const user = currentUser();
    const record = getDb().users.find((item) => item.id === user.id);
    if (!record) {
      throw new ApiError("حساب کاربری پیدا نشد.", "general");
    }
    if (input.confirmation.trim() !== "حذف") {
      throw new ApiError(
        "برای تأیید، عبارت «حذف» را دقیقاً وارد کنید.",
        "confirmation",
      );
    }
    const now = new Date().toISOString();
    record.deletionRequestedAt = now;
    writeAudit(
      record,
      "account.deletion_requested",
      "user",
      record.id,
      "درخواست حذف حساب کاربری ثبت شد و در انتظار بررسی است.",
    );
    addNotification(record.id, {
      title: "درخواست حذف حساب ثبت شد",
      body: "درخواست شما ثبت شد. تا بررسی نهایی، حساب فعال می‌ماند و با شما تماس می‌گیریم.",
      kind: "system",
    });
    saveDb();
    return {
      requestedAt: now,
      message:
        "درخواست حذف حساب ثبت شد. برای جلوگیری از حذف ناخواسته، تا بررسی نهایی حساب فعال می‌ماند.",
    };
  },

  async listNotifications(): Promise<Notification[]> {
    await delay(180);
    const user = currentUser();
    return clone(
      getDb()
        .notifications.filter((item) => item.userId === user.id)
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        ),
    );
  },

  async markNotificationRead(id: string): Promise<Notification> {
    await delay(120);
    const user = currentUser();
    const notification = getDb().notifications.find(
      (item) => item.id === id && item.userId === user.id,
    );
    if (!notification) {
      throw new ApiError("اعلان پیدا نشد.", "general");
    }
    if (!notification.readAt) {
      notification.readAt = new Date().toISOString();
      saveDb();
    }
    return clone(notification);
  },

  async markAllNotificationsRead(): Promise<Notification[]> {
    await delay(160);
    const user = currentUser();
    const now = new Date().toISOString();
    getDb()
      .notifications.filter(
        (item) => item.userId === user.id && !item.readAt,
      )
      .forEach((item) => {
        item.readAt = now;
      });
    saveDb();
    return clone(
      getDb().notifications.filter((item) => item.userId === user.id),
    );
  },

  async getFulfillmentQueue(): Promise<Order[]> {
    await delay(260);
    currentAdmin();
    const orders = getDb().orders.filter((order) =>
      ["awaiting_license", "on_hold"].includes(order.status),
    );
    return toPublicOrders(
      [...orders].sort(
        (first, second) =>
          new Date(first.paidAt ?? first.createdAt).getTime() -
          new Date(second.paidAt ?? second.createdAt).getTime(),
      ),
    );
  },

  async listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    await delay(220);
    currentAdmin();
    return clone(getDb().auditLogs.slice(0, limit));
  },

  async listInboxMessages(): Promise<InboxMessage[]> {
    await delay(200);
    currentAdmin();
    return clone(
      getInbox().sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      ),
    );
  },

  async adminListCourses(): Promise<Course[]> {
    await delay(220);
    currentAdmin();
    return clone(getDb().courses);
  },

  async createCourse(input: CourseInput): Promise<Course> {
    await delay(360);
    const admin = currentAdmin();
    const database = getDb();
    const slug = input.slug.trim().toLowerCase();
    if (database.courses.some((course) => course.slug === slug)) {
      throw new ApiError("این نشانی دوره قبلاً استفاده شده است.", "general");
    }
    if (!input.title.trim()) {
      throw new ApiError("عنوان دوره را وارد کنید.", "general");
    }
    const course: Course = {
      ...input,
      id: `course-${Date.now()}`,
      slug,
      priceToman: Math.max(0, Math.round(input.priceToman)),
      compareAtPriceToman:
        input.compareAtPriceToman && input.compareAtPriceToman > 0
          ? Math.round(input.compareAtPriceToman)
          : undefined,
      updatedAt: new Date().toISOString(),
    };
    database.courses.push(course);
    writeAudit(
      admin,
      "course.created",
      "course",
      course.id,
      `دوره‌ی «${course.title}» ساخته شد.`,
    );
    saveDb();
    return clone(course);
  },

  async updateCourse(id: string, input: CourseInput): Promise<Course> {
    await delay(340);
    const admin = currentAdmin();
    const database = getDb();
    const course = database.courses.find((item) => item.id === id);
    if (!course) {
      throw new ApiError("دوره پیدا نشد.", "general");
    }
    const slug = input.slug.trim().toLowerCase();
    if (
      database.courses.some(
        (item) => item.id !== id && item.slug === slug,
      )
    ) {
      throw new ApiError("این نشانی دوره قبلاً استفاده شده است.", "general");
    }
    Object.assign(course, input, {
      id: course.id,
      slug,
      priceToman: Math.max(0, Math.round(input.priceToman)),
      compareAtPriceToman:
        input.compareAtPriceToman && input.compareAtPriceToman > 0
          ? Math.round(input.compareAtPriceToman)
          : undefined,
      updatedAt: new Date().toISOString(),
    });
    writeAudit(
      admin,
      "course.updated",
      "course",
      course.id,
      `دوره‌ی «${course.title}» ویرایش شد.`,
    );
    saveDb();
    return clone(course);
  },

  async toggleCoursePublish(id: string): Promise<Course> {
    await delay(260);
    const admin = currentAdmin();
    const course = getDb().courses.find((item) => item.id === id);
    if (!course) {
      throw new ApiError("دوره پیدا نشد.", "general");
    }
    course.published = !course.published;
    course.updatedAt = new Date().toISOString();
    writeAudit(
      admin,
      course.published ? "course.published" : "course.unpublished",
      "course",
      course.id,
      `دوره‌ی «${course.title}» ${course.published ? "منتشر" : "از انتشار خارج"} شد.`,
    );
    saveDb();
    return clone(course);
  },

  async deleteCourse(id: string): Promise<void> {
    await delay(300);
    const admin = currentAdmin();
    const database = getDb();
    const course = database.courses.find((item) => item.id === id);
    if (!course) {
      throw new ApiError("دوره پیدا نشد.", "general");
    }
    if (database.orders.some((order) => order.course.id === id)) {
      throw new ApiError(
        "برای این دوره سفارش ثبت شده است؛ به‌جای حذف، آن را از انتشار خارج کنید.",
        "general",
      );
    }
    database.courses = database.courses.filter((item) => item.id !== id);
    writeAudit(
      admin,
      "course.deleted",
      "course",
      id,
      `دوره‌ی «${course.title}» حذف شد.`,
    );
    saveDb();
  },

  async resendLicenseEmail(orderId: string): Promise<Order> {
    await delay(300);
    const user = currentUser();
    const order = getDb().orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    assertOwnerOrAdmin(order, user);
    if (!order.license) {
      throw new ApiError("هنوز لایسنس این سفارش ثبت نشده است.", "general");
    }
    if (order.license.revokedAt) {
      throw new ApiError(
        "لایسنس این سفارش لغو شده است؛ ارسال دوباره‌ی ایمیل مجاز نیست.",
        "general",
      );
    }

    const now = new Date().toISOString();
    order.license.emailSentAt = now;
    order.updatedAt = now;
    sendLicenseEmail(order, now);
    if (user.role === "admin") {
      addNotification(order.userId, {
        title: "ایمیل لایسنس دوباره ارسال شد",
        body: `نسخه‌ی تازه‌ی ایمیل لایسنس سفارش ${order.number} برای شما ارسال شد.`,
        kind: "license",
        href: "/dashboard",
      });
      writeAudit(
        user,
        "license.email_resent",
        "order",
        order.id,
        `ایمیل لایسنس سفارش ${order.number} دوباره ارسال شد.`,
      );
    }
    saveDb();
    return toPublicOrder(order);
  },

  async listDiscounts(): Promise<DiscountCode[]> {
    await delay(200);
    currentAdmin();
    return clone(getDb().discounts);
  },

  async createDiscount(input: CreateDiscountInput): Promise<DiscountCode> {
    await delay(280);
    const admin = currentAdmin();
    const database = getDb();
    const code = normalizeDiscountCode(input.code);

    if (code.length < 3) {
      throw new ApiError("کد تخفیف باید حداقل ۳ کاراکتر باشد.", "code");
    }
    if (database.discounts.some((item) => item.code === code)) {
      throw new ApiError("این کد تخفیف قبلاً ساخته شده است.", "code");
    }
    assertDiscountConfig(input);

    const discount: DiscountCode = {
      code,
      type: input.type,
      percent: input.type === "percent" ? input.percent : undefined,
      amountToman: input.type === "fixed" ? input.amountToman : undefined,
      maxDiscountToman:
        input.type === "percent" ? input.maxDiscountToman : undefined,
      minOrderToman: input.minOrderToman,
      active: input.active ?? true,
      startsAt: input.startsAt,
      expiresAt: input.expiresAt,
      maxUses: input.maxUses,
      usedCount: 0,
      maxUsesPerUser: input.maxUsesPerUser,
      courseIds: input.courseIds?.length ? input.courseIds : undefined,
      firstPurchaseOnly: input.firstPurchaseOnly ?? false,
      allowFree: input.allowFree ?? false,
      createdAt: new Date().toISOString(),
    };
    database.discounts.unshift(discount);
    writeAudit(
      admin,
      "discount.created",
      "discount",
      discount.code,
      `کد تخفیف ${discount.code} ساخته شد.`,
    );
    saveDb();
    return clone(discount);
  },

  async updateDiscount(input: UpdateDiscountInput): Promise<DiscountCode> {
    await delay(320);
    const admin = currentAdmin();
    const discount = getDb().discounts.find(
      (item) => item.code === normalizeDiscountCode(input.code),
    );
    if (!discount) {
      throw new ApiError("کد تخفیف پیدا نشد.", "code");
    }
    assertDiscountConfig(input);

    discount.type = input.type;
    discount.percent = input.type === "percent" ? input.percent : undefined;
    discount.amountToman =
      input.type === "fixed" ? input.amountToman : undefined;
    discount.maxDiscountToman =
      input.type === "percent" ? input.maxDiscountToman : undefined;
    discount.minOrderToman = input.minOrderToman;
    discount.startsAt = input.startsAt;
    discount.expiresAt = input.expiresAt;
    discount.maxUses = input.maxUses;
    discount.maxUsesPerUser = input.maxUsesPerUser;
    discount.courseIds = input.courseIds?.length ? input.courseIds : undefined;
    discount.firstPurchaseOnly = input.firstPurchaseOnly ?? false;
    discount.allowFree = input.allowFree ?? false;
    if (typeof input.active === "boolean") discount.active = input.active;

    writeAudit(
      admin,
      "discount.updated",
      "discount",
      discount.code,
      `کد تخفیف ${discount.code} ویرایش شد.`,
    );
    saveDb();
    return clone(discount);
  },

  async deleteDiscount(code: string): Promise<void> {
    await delay(260);
    const admin = currentAdmin();
    const database = getDb();
    const normalized = normalizeDiscountCode(code);
    const discount = database.discounts.find((item) => item.code === normalized);
    if (!discount) {
      throw new ApiError("کد تخفیف پیدا نشد.", "code");
    }
    const usedInOrders = database.orders.some(
      (order) => order.discount?.code === normalized,
    );
    if (usedInOrders || discount.usedCount > 0) {
      throw new ApiError(
        "این کد در سفارش‌ها استفاده شده است؛ به‌جای حذف آن را غیرفعال کنید.",
        "code",
      );
    }
    database.discounts = database.discounts.filter(
      (item) => item.code !== normalized,
    );
    writeAudit(
      admin,
      "discount.deleted",
      "discount",
      normalized,
      `کد تخفیف ${normalized} حذف شد.`,
    );
    saveDb();
  },

  async bulkCreateDiscounts(
    input: BulkDiscountInput,
  ): Promise<DiscountCode[]> {
    await delay(520);
    const admin = currentAdmin();
    const database = getDb();
    const prefix = normalizeDiscountCode(input.prefix).replace(/-+$/, "");
    if (!/^[A-Z0-9]{3,10}$/.test(prefix)) {
      throw new ApiError(
        "پیشوند باید ۳ تا ۱۰ کاراکتر انگلیسی یا عدد باشد.",
        "code",
      );
    }
    if (!Number.isInteger(input.count) || input.count < 1 || input.count > 50) {
      throw new ApiError("تعداد کدها باید بین ۱ تا ۵۰ باشد.", "code");
    }
    assertDiscountConfig(input);

    const taken = new Set(database.discounts.map((item) => item.code));
    const created: DiscountCode[] = [];
    for (let index = 0; index < input.count; index += 1) {
      const code = makeBulkCode(prefix, taken);
      taken.add(code);
      const discount: DiscountCode = {
        code,
        type: input.type,
        percent: input.type === "percent" ? input.percent : undefined,
        amountToman: input.type === "fixed" ? input.amountToman : undefined,
        maxDiscountToman:
          input.type === "percent" ? input.maxDiscountToman : undefined,
        minOrderToman: input.minOrderToman,
        active: input.active ?? true,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        maxUses: input.maxUses,
        usedCount: 0,
        maxUsesPerUser: input.maxUsesPerUser,
        courseIds: input.courseIds?.length ? input.courseIds : undefined,
        firstPurchaseOnly: input.firstPurchaseOnly ?? false,
        allowFree: input.allowFree ?? false,
        createdAt: new Date().toISOString(),
      };
      created.push(discount);
    }
    database.discounts.unshift(...created);
    writeAudit(
      admin,
      "discount.bulk_created",
      "discount",
      prefix,
      `${created.length} کد تخفیف با پیشوند ${prefix} ساخته شد.`,
    );
    saveDb();
    return clone(created);
  },

  async getDiscountUsage(code: string): Promise<DiscountUsageReport> {
    await delay(260);
    currentAdmin();
    const normalized = normalizeDiscountCode(code);
    const orders = getDb().orders.filter(
      (order) => order.discount?.code === normalized,
    );
    return {
      code: normalized,
      totalUses: orders.length,
      totalDiscountToman: orders.reduce(
        (sum, order) => sum + (order.discount?.amountToman ?? 0),
        0,
      ),
      orders: orders
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        )
        .map((order) => ({
          orderId: order.id,
          orderNumber: order.number,
          customerName: order.customer.fullName,
          usedAt: order.paidAt ?? order.createdAt,
          discountToman: order.discount?.amountToman ?? 0,
        })),
    };
  },

  async toggleDiscount(code: string): Promise<DiscountCode> {
    await delay(220);
    const admin = currentAdmin();
    const discount = getDb().discounts.find(
      (item) => item.code === normalizeDiscountCode(code),
    );
    if (!discount) {
      throw new ApiError("کد تخفیف پیدا نشد.", "code");
    }
    discount.active = !discount.active;
    writeAudit(
      admin,
      discount.active ? "discount.activated" : "discount.deactivated",
      "discount",
      discount.code,
      `کد تخفیف ${discount.code} ${discount.active ? "فعال" : "غیرفعال"} شد.`,
    );
    saveDb();
    return clone(discount);
  },

  async getAdminStats(): Promise<AdminStats> {
    await delay(220);
    currentAdmin();
    const database = getDb();
    const paidOrderStatuses: OrderStatus[] = [
      "awaiting_license",
      "on_hold",
      "fulfilled",
      "refunded",
    ];
    const paidOrders = database.orders.filter((order) =>
      paidOrderStatuses.includes(order.status),
    );
    const now = new Date();

    const queue = database.orders.filter((order) =>
      ["awaiting_license", "on_hold"].includes(order.status),
    );
    const overdueFulfillments = queue.filter((order) => {
      const anchor = order.paidAt ?? order.createdAt;
      const hours =
        (now.getTime() - new Date(anchor).getTime()) / (60 * 60 * 1000);
      return hours > database.settings.general.fulfillmentSlaHours;
    }).length;

    const revenueSeries: RevenuePoint[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(now);
      day.setDate(day.getDate() - offset);
      const key = day.toISOString().slice(0, 10);
      const dayOrders = paidOrders.filter(
        (order) =>
          order.status !== "refunded" &&
          (order.paidAt ?? order.createdAt).slice(0, 10) === key,
      );
      revenueSeries.push({
        date: key,
        label: formatShortDate(day),
        amountToman: dayOrders.reduce(
          (sum, order) => sum + order.totalToman,
          0,
        ),
        orders: dayOrders.length,
      });
    }

    const inbox = getInbox();
    const newMessages = inbox.filter(
      (message) => (message.status ?? "new") === "new",
    ).length;

    return {
      totalRevenueToman: paidOrders
        .filter((order) => order.status !== "refunded")
        .reduce((sum, order) => sum + order.totalToman, 0),
      pendingLicenses: database.orders.filter(
        (order) => order.status === "awaiting_license",
      ).length,
      overdueFulfillments,
      totalOrders: database.orders.filter(
        (order) => order.status !== "cancelled" && order.status !== "expired",
      ).length,
      customers: database.users.filter((user) => user.role === "parent").length,
      deliveredLicenses: database.orders.filter(
        (order) => order.status === "fulfilled",
      ).length,
      todayOrders: database.orders.filter((order) => {
        const created = new Date(order.createdAt);
        return (
          paidOrderStatuses.includes(order.status) &&
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth() &&
          created.getDate() === now.getDate()
        );
      }).length,
      newMessages,
      revenueSeries,
    };
  },

  async getSiteContent(): Promise<SiteContent> {
    await delay(160);
    return clone({ faqs: seedFaqs, testimonials: seedTestimonials });
  },

  async listEmails(): Promise<EmailMessage[]> {
    await delay(160);
    currentAdmin();
    return clone(
      [...getDb().emails].sort(
        (first, second) =>
          new Date(second.sentAt).getTime() - new Date(first.sentAt).getTime(),
      ),
    );
  },

  async submitLead(input: LeadInput): Promise<LeadReceipt> {
    await delay(520);

    // تله‌ی ربات: پاسخ موفق بی‌صدا برمی‌گردد اما اطلاعاتی ذخیره نمی‌شود.
    if (input.website && input.website.trim().length > 0) {
      return { id: "lead-ignored", message: "عضویت شما ثبت شد." };
    }

    if (!input.consent) {
      throw new ApiError(
        "برای عضویت باید تأیید کنید که والد یا سرپرست قانونی هستید.",
        "general",
      );
    }

    const fullName = input.fullName.trim();
    const contact = input.contact.trim();
    if (fullName.length < 2) {
      throw new ApiError("نام را کامل وارد کنید.", "fullName");
    }
    if (contact.length < 5) {
      throw new ApiError("ایمیل یا شماره موبایل را درست وارد کنید.", "email");
    }

    const record: LeadRecord = {
      id: `lead-${Date.now().toString(36)}`,
      fullName,
      contact,
      createdAt: new Date().toISOString(),
    };

    const leads = getLeads();
    leads.push(record);
    writeStorage(LEADS_KEY, JSON.stringify(leads));

    return {
      id: record.id,
      message: `عضویت شما ثبت شد؛ خوشحالیم که همراه ${brand.nameFa} هستید.`,
    };
  },

  async submitContactMessage(
    input: ContactMessageInput,
  ): Promise<ContactReceipt> {
    await delay(560);

    // تله‌ی ربات
    if (input.website && input.website.trim().length > 0) {
      return { id: "contact-ignored", message: "پیام شما ثبت شد." };
    }

    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    const subject = input.subject.trim();
    const message = input.message.trim();

    if (name.length < 3) {
      throw new ApiError("نام را کامل وارد کنید.", "fullName");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new ApiError("ایمیل را درست وارد کنید.", "email");
    }
    if (subject.length < 3) {
      throw new ApiError("موضوع پیام را بنویسید.", "general");
    }
    if (message.length < 10) {
      throw new ApiError("متن پیام باید حداقل ۱۰ کاراکتر باشد.", "general");
    }

    const record = {
      id: `contact-${Date.now().toString(36)}`,
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
    };
    const items = getInbox();
    items.push(record);
    writeStorage(CONTACT_KEY, JSON.stringify(items));

    return {
      id: record.id,
      message: "پیام شما ثبت شد؛ تیم پشتیبانی در روزهای کاری پاسخ می‌دهد.",
    };
  },

  async listLicenses(): Promise<AdminLicenseListItem[]> {
    await delay(220);
    currentAdmin();
    return getDb()
      .orders.map(toAdminLicense)
      .filter((item): item is AdminLicenseListItem => item !== null)
      .sort(
        (first, second) =>
          new Date(second.issuedAt).getTime() -
          new Date(first.issuedAt).getTime(),
      );
  },

  async revokeLicense(input: RevokeLicenseInput): Promise<AdminLicenseListItem> {
    await delay(360);
    const admin = currentAdmin();
    const order = getDb().orders.find(
      (item) => item.license?.id === input.licenseId,
    );
    if (!order || !order.license) {
      throw new ApiError("لایسنس پیدا نشد.", "general");
    }
    if (order.license.revokedAt) {
      throw new ApiError("این لایسنس قبلاً لغو شده است.", "general");
    }
    const reason = input.reason.trim();
    if (reason.length < 10) {
      throw new ApiError("دلیل لغو را کامل‌تر بنویسید (حداقل ۱۰ کاراکتر).", "reason");
    }

    const now = new Date().toISOString();
    order.license.revokedAt = now;
    order.license.revokeReason = reason;
    order.updatedAt = now;
    addNotification(order.userId, {
      title: "لایسنس دوره لغو شد",
      body: `لایسنس سفارش ${order.number} لغو شد. برای پیگیری با پشتیبانی تماس بگیرید.`,
      kind: "license",
      href: "/dashboard/orders",
    });
    writeAudit(
      admin,
      "license.revoked",
      "license",
      order.license.id,
      `لایسنس سفارش ${order.number} با دلیل «${reason}» لغو شد.`,
    );
    saveDb();
    const item = toAdminLicense(order);
    if (!item) {
      throw new ApiError("لایسنس پیدا نشد.", "general");
    }
    return item;
  },

  async listUsers(): Promise<AdminUserSummary[]> {
    await delay(240);
    currentAdmin();
    return getDb()
      .users.map(toAdminUser)
      .sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      );
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    await delay(260);
    currentAdmin();
    const user = getDb().users.find((item) => item.id === userId);
    if (!user) {
      throw new ApiError("کاربر پیدا نشد.", "general");
    }
    const orders = sortNewest(userOrders(user.id));
    return {
      user: toAdminUser(user),
      orders: toPublicOrders(orders),
      licenses: orders
        .map(toAdminLicense)
        .filter((item): item is AdminLicenseListItem => item !== null),
    };
  },

  async setUserActive(input: SetUserActiveInput): Promise<AdminUserSummary> {
    await delay(360);
    const admin = currentAdmin();
    const user = getDb().users.find((item) => item.id === input.userId);
    if (!user) {
      throw new ApiError("کاربر پیدا نشد.", "general");
    }
    if (user.role === "admin") {
      throw new ApiError("حساب مدیر را نمی‌توان غیرفعال کرد.", "general");
    }
    if (user.id === admin.id) {
      throw new ApiError("حساب خودتان را نمی‌توانید غیرفعال کنید.", "general");
    }

    const reason = input.reason?.trim() ?? "";
    if (!input.active && reason.length < 5) {
      throw new ApiError("دلیل غیرفعال‌سازی را کوتاه بنویسید.", "reason");
    }

    const now = new Date().toISOString();
    if (input.active) {
      user.disabledAt = undefined;
      user.disabledReason = undefined;
    } else {
      user.disabledAt = now;
      user.disabledReason = reason;
    }
    writeAudit(
      admin,
      input.active ? "user.enabled" : "user.disabled",
      "user",
      user.id,
      input.active
        ? `حساب ${user.email} دوباره فعال شد.`
        : `حساب ${user.email} با دلیل «${reason}» غیرفعال شد.`,
    );
    saveDb();
    return toAdminUser(user);
  },

  async getPublicSettings(): Promise<PublicSiteSettings> {
    await delay(120);
    const settings = getDb().settings.general;
    return clone({
      footer: settings.footer,
      trustBadge: settings.trustBadge,
      fulfillmentSlaHours: settings.fulfillmentSlaHours,
      taxPercent: settings.taxPercent,
    });
  },

  async getGeneralSettings(): Promise<GeneralSettings> {
    await delay(180);
    currentAdmin();
    return clone(getDb().settings.general);
  },

  async updateGeneralSettings(
    input: GeneralSettingsInput,
  ): Promise<GeneralSettings> {
    await delay(360);
    const admin = currentAdmin();
    assertGeneralSettings(input);
    const now = new Date().toISOString();
    const updated: GeneralSettings = {
      fulfillmentSlaHours: Math.round(input.fulfillmentSlaHours),
      includeLicenseKeyInEmail: input.includeLicenseKeyInEmail,
      taxPercent: Math.round(input.taxPercent * 10) / 10,
      footer: {
        about: input.footer.about.trim(),
        email: input.footer.email.trim(),
        phone: input.footer.phone.trim(),
        address: input.footer.address.trim(),
      },
      trustBadge: {
        enabled: input.trustBadge.enabled,
        label: input.trustBadge.label.trim(),
        url: input.trustBadge.url.trim(),
        code: input.trustBadge.code.trim(),
      },
      updatedAt: now,
    };
    getDb().settings.general = updated;
    writeAudit(
      admin,
      "settings.updated",
      "settings",
      "general",
      `تنظیمات عمومی ذخیره شد؛ SLA تحویل ${updated.fulfillmentSlaHours} ساعت.`,
    );
    saveDb();
    return clone(updated);
  },

  async getPaymentSettings(): Promise<PaymentSettings> {
    await delay(180);
    currentAdmin();
    return toPaymentSettings();
  },

  async savePaymentToken(
    input: SavePaymentTokenInput,
  ): Promise<PaymentTokenReceipt> {
    await delay(480);
    const admin = currentAdmin();
    const token = input.token.trim();
    if (token.length < 12 || /\s/.test(token)) {
      throw new ApiError(
        "توکن دسترسی باید حداقل ۱۲ نویسه و بدون فاصله باشد.",
        "token",
      );
    }

    // توکن کامل عمداً نه در حافظه‌ی adapter و نه در localStorage نگه داشته
    // می‌شود؛ فقط پسوند چهارنویسه‌ای برای نمایش ماسک‌شده باقی می‌ماند.
    const maskedToken = `••••${token.slice(-4)}`;
    const settings = getDb().settings.payment;
    settings.hasToken = true;
    settings.maskedToken = maskedToken;
    settings.lastTestedAt = undefined;
    settings.lastTestResult = undefined;
    writeAudit(
      admin,
      "payment.token_saved",
      "settings",
      "payment",
      "توکن دسترسی درگاه پرداخت ذخیره شد (مقدار توکن ثبت نشد).",
    );
    saveDb();
    return {
      message: "توکن با موفقیت ذخیره شد.",
      maskedToken,
      hasToken: true,
    };
  },

  async setPaymentEnabled(enabled: boolean): Promise<PaymentSettings> {
    await delay(260);
    const admin = currentAdmin();
    const settings = getDb().settings.payment;
    if (enabled && !settings.hasToken) {
      throw new ApiError(
        "برای فعال‌سازی درگاه، ابتدا توکن دسترسی را ذخیره کنید.",
        "general",
      );
    }
    settings.enabled = enabled;
    writeAudit(
      admin,
      enabled ? "payment.enabled" : "payment.disabled",
      "settings",
      "payment",
      enabled ? "درگاه پرداخت فعال شد." : "درگاه پرداخت غیرفعال شد.",
    );
    saveDb();
    return toPaymentSettings();
  },

  async testPaymentConnection(): Promise<PaymentSettings> {
    await delay(650);
    const admin = currentAdmin();
    const settings = getDb().settings.payment;
    if (!settings.hasToken) {
      throw new ApiError("ابتدا توکن دسترسی را ذخیره کنید.", "general");
    }
    settings.lastTestedAt = new Date().toISOString();
    settings.lastTestResult = "success";
    writeAudit(
      admin,
      "payment.tested",
      "settings",
      "payment",
      "اتصال آزمایشی درگاه پرداخت با موفقیت بررسی شد.",
    );
    saveDb();
    return toPaymentSettings();
  },

  async adminListPosts(): Promise<BlogPost[]> {
    await delay(220);
    currentAdmin();
    return clone(
      [...getDb().posts].sort(
        (first, second) =>
          new Date(second.updatedAt ?? second.publishedAt).getTime() -
          new Date(first.updatedAt ?? first.publishedAt).getTime(),
      ),
    );
  },

  async createPost(input: BlogPostInput): Promise<BlogPost> {
    await delay(360);
    const admin = currentAdmin();
    const fields = assertPostInput(input);
    const now = new Date().toISOString();
    const post: BlogPost = {
      id: `post-${Date.now().toString(36)}`,
      ...fields,
      publishedAt: now,
      updatedAt: now,
    };
    getDb().posts.unshift(post);
    writeAudit(
      admin,
      "post.created",
      "post",
      post.id,
      `مقاله‌ی «${post.title}» به‌صورت ${
        post.status === "published" ? "منتشرشده" : "پیش‌نویس"
      } ساخته شد.`,
    );
    saveDb();
    return clone(post);
  },

  async updatePost(id: string, input: BlogPostInput): Promise<BlogPost> {
    await delay(360);
    const admin = currentAdmin();
    const post = getDb().posts.find((item) => item.id === id);
    if (!post) {
      throw new ApiError("مقاله پیدا نشد.", "general");
    }
    const fields = assertPostInput(input, id);
    const previousStatus = post.status ?? "published";
    const now = new Date().toISOString();
    Object.assign(post, fields, { updatedAt: now });
    if (fields.status === "published" && previousStatus !== "published") {
      post.publishedAt = now;
    }
    writeAudit(
      admin,
      "post.updated",
      "post",
      post.id,
      `مقاله‌ی «${post.title}» ویرایش شد.`,
    );
    saveDb();
    return clone(post);
  },

  async setPostStatus(
    id: string,
    status: "draft" | "published",
  ): Promise<BlogPost> {
    await delay(240);
    const admin = currentAdmin();
    const post = getDb().posts.find((item) => item.id === id);
    if (!post) {
      throw new ApiError("مقاله پیدا نشد.", "general");
    }
    const previous = post.status ?? "published";
    post.status = status;
    post.updatedAt = new Date().toISOString();
    if (status === "published" && previous !== "published") {
      post.publishedAt = post.updatedAt;
    }
    writeAudit(
      admin,
      status === "published" ? "post.published" : "post.unpublished",
      "post",
      post.id,
      `مقاله‌ی «${post.title}» ${
        status === "published" ? "منتشر" : "به پیش‌نویس منتقل"
      } شد.`,
    );
    saveDb();
    return clone(post);
  },

  async deletePost(id: string): Promise<void> {
    await delay(260);
    const admin = currentAdmin();
    const database = getDb();
    const post = database.posts.find((item) => item.id === id);
    if (!post) {
      throw new ApiError("مقاله پیدا نشد.", "general");
    }
    database.posts = database.posts.filter((item) => item.id !== id);
    writeAudit(
      admin,
      "post.deleted",
      "post",
      id,
      `مقاله‌ی «${post.title}» حذف شد.`,
    );
    saveDb();
  },

  async adminListFaqs(): Promise<HomeFaq[]> {
    await delay(200);
    currentAdmin();
    return clone(
      [...getDb().faqs].sort(
        (first, second) => (first.order ?? 0) - (second.order ?? 0),
      ),
    );
  },

  async createFaq(input: HomeFaqInput): Promise<HomeFaq> {
    await delay(280);
    const admin = currentAdmin();
    const fields = assertFaqInput(input);
    const faqs = getDb().faqs;
    const faq: HomeFaq = {
      id: `faq-${Date.now().toString(36)}`,
      ...fields,
      order: faqs.reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1,
    };
    faqs.push(faq);
    writeAudit(
      admin,
      "faq.created",
      "faq",
      faq.id,
      `پرسش «${faq.question.slice(0, 60)}» ساخته شد.`,
    );
    saveDb();
    return clone(faq);
  },

  async updateFaq(id: string, input: HomeFaqInput): Promise<HomeFaq> {
    await delay(280);
    const admin = currentAdmin();
    const faq = getDb().faqs.find((item) => item.id === id);
    if (!faq) {
      throw new ApiError("پرسش پیدا نشد.", "general");
    }
    Object.assign(faq, assertFaqInput(input));
    writeAudit(
      admin,
      "faq.updated",
      "faq",
      faq.id,
      `پرسش «${faq.question.slice(0, 60)}» ویرایش شد.`,
    );
    saveDb();
    return clone(faq);
  },

  async deleteFaq(id: string): Promise<void> {
    await delay(240);
    const admin = currentAdmin();
    const database = getDb();
    const faq = database.faqs.find((item) => item.id === id);
    if (!faq) {
      throw new ApiError("پرسش پیدا نشد.", "general");
    }
    database.faqs = database.faqs
      .filter((item) => item.id !== id)
      .sort((first, second) => (first.order ?? 0) - (second.order ?? 0))
      .map((item, index) => ({ ...item, order: index }));
    writeAudit(
      admin,
      "faq.deleted",
      "faq",
      id,
      `پرسش «${faq.question.slice(0, 60)}» حذف شد.`,
    );
    saveDb();
  },

  async moveFaq(id: string, direction: "up" | "down"): Promise<HomeFaq[]> {
    await delay(180);
    const admin = currentAdmin();
    const faqs = getDb().faqs;
    reorderItems(faqs, id, direction);
    writeAudit(
      admin,
      "faq.reordered",
      "faq",
      id,
      `ترتیب نمایش پرسش‌ها تغییر کرد (${direction === "up" ? "بالا" : "پایین"}).`,
    );
    saveDb();
    return clone(
      [...faqs].sort(
        (first, second) => (first.order ?? 0) - (second.order ?? 0),
      ),
    );
  },

  async adminListTeachers(): Promise<Teacher[]> {
    await delay(200);
    currentAdmin();
    return clone(
      [...getDb().teachers].sort(
        (first, second) => (first.order ?? 0) - (second.order ?? 0),
      ),
    );
  },

  async createTeacher(input: TeacherInput): Promise<Teacher> {
    await delay(280);
    const admin = currentAdmin();
    const fields = assertTeacherInput(input);
    const items = getDb().teachers;
    const teacher: Teacher = {
      id: `teacher-${Date.now().toString(36)}`,
      ...fields,
      order:
        items.reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1,
    };
    items.push(teacher);
    writeAudit(
      admin,
      "teacher.created",
      "teacher",
      teacher.id,
      `مربی «${teacher.name}» اضافه شد.`,
    );
    saveDb();
    return clone(teacher);
  },

  async updateTeacher(id: string, input: TeacherInput): Promise<Teacher> {
    await delay(280);
    const admin = currentAdmin();
    const teacher = getDb().teachers.find((item) => item.id === id);
    if (!teacher) {
      throw new ApiError("مربی پیدا نشد.", "general");
    }
    Object.assign(teacher, assertTeacherInput(input));
    writeAudit(
      admin,
      "teacher.updated",
      "teacher",
      teacher.id,
      `اطلاعات مربی «${teacher.name}» ویرایش شد.`,
    );
    saveDb();
    return clone(teacher);
  },

  async deleteTeacher(id: string): Promise<void> {
    await delay(240);
    const admin = currentAdmin();
    const database = getDb();
    const teacher = database.teachers.find((item) => item.id === id);
    if (!teacher) {
      throw new ApiError("مربی پیدا نشد.", "general");
    }
    database.teachers = database.teachers
      .filter((item) => item.id !== id)
      .sort((first, second) => (first.order ?? 0) - (second.order ?? 0))
      .map((item, index) => ({ ...item, order: index }));
    writeAudit(
      admin,
      "teacher.deleted",
      "teacher",
      id,
      `مربی «${teacher.name}» حذف شد.`,
    );
    saveDb();
  },

  async moveTeacher(id: string, direction: "up" | "down"): Promise<Teacher[]> {
    await delay(180);
    const admin = currentAdmin();
    const items = getDb().teachers;
    reorderItems(items, id, direction);
    writeAudit(
      admin,
      "teacher.reordered",
      "teacher",
      id,
      "ترتیب نمایش مربیان تغییر کرد.",
    );
    saveDb();
    return clone(
      [...items].sort(
        (first, second) => (first.order ?? 0) - (second.order ?? 0),
      ),
    );
  },

  async updateInboxStatus(
    id: string,
    status: MessageStatus,
  ): Promise<InboxMessage> {
    await delay(200);
    const admin = currentAdmin();
    const items = getInbox();
    const message = items.find((item) => item.id === id);
    if (!message) {
      throw new ApiError("پیام پیدا نشد.", "general");
    }
    const nextStatus = assertInboxStatus(status);
    message.status = nextStatus;
    writeStorage(CONTACT_KEY, JSON.stringify(items));
    writeAudit(
      admin,
      "message.status_changed",
      "message",
      id,
      `وضعیت پیام «${message.subject}» به ${
        nextStatus === "new" ? "تازه" : nextStatus === "read" ? "خوانده‌شده" : "انجام‌شده"
      } تغییر کرد.`,
    );
    saveDb();
    return clone(message);
  },

  async listLeads(): Promise<LeadRecord[]> {
    await delay(200);
    currentAdmin();
    return clone(
      [...getLeads()].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      ),
    );
  },

  async deleteLead(id: string): Promise<void> {
    await delay(220);
    const admin = currentAdmin();
    const leads = getLeads();
    const lead = leads.find((item) => item.id === id);
    if (!lead) {
      throw new ApiError("لید پیدا نشد.", "general");
    }
    writeStorage(
      LEADS_KEY,
      JSON.stringify(leads.filter((item) => item.id !== id)),
    );
    writeAudit(
      admin,
      "lead.deleted",
      "lead",
      id,
      `لید «${lead.fullName}» حذف شد.`,
    );
    saveDb();
  },

  async listPosts(): Promise<BlogPost[]> {
    await delay(180);
    return clone(
      getDb()
        .posts.filter((post) => (post.status ?? "published") === "published")
        .sort(
          (first, second) =>
            new Date(second.publishedAt).getTime() -
            new Date(first.publishedAt).getTime(),
        ),
    );
  },

  async listTeachers(): Promise<Teacher[]> {
    await delay(180);
    return clone(
      getDb()
        .teachers.filter((teacher) => teacher.isActive !== false)
        .sort((first, second) => (first.order ?? 0) - (second.order ?? 0)),
    );
  },

  async listFaqs(): Promise<HomeFaq[]> {
    await delay(160);
    return clone(
      getDb()
        .faqs.filter((faq) => faq.isActive !== false)
        .sort((first, second) => (first.order ?? 0) - (second.order ?? 0)),
    );
  },
};
