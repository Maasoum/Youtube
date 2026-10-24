import type { ImageKey } from "@/types/image";

export type UserRole = "parent" | "admin";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  /** زمان ثبت درخواست حذف حساب؛ تا بررسی توسط تیم پشتیبانی. */
  deletionRequestedAt?: string;
  /** حساب غیرفعال نمی‌تواند وارد شود؛ داده‌ها برای حسابرسی باقی می‌مانند. */
  disabledAt?: string;
  disabledReason?: string;
}

export interface AuthSession {
  user: User;
  /**
   * در سرور واقعی نشست با کوکی httpOnly نگه داشته می‌شود و توکنی به کلاینت
   * نمی‌رسد؛ این فیلد فقط برای سازگاری با adapter ساختگی حفظ شده است.
   */
  token?: string;
  /** ثبت‌نام انجام شده اما تا تأیید ایمیل، ورود ممکن نیست. */
  pendingVerification?: boolean;
  /** پیام توضیحی سرور برای حالت‌های ویژه (مثل انتظار تأیید ایمیل). */
  message?: string;
  /** مدیر با تأیید دومرحله‌ای فعال باید کد TOTP را در همین نشست تأیید کند. */
  totpRequired?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  /**
   * کد تأیید دومرحله‌ای. سرور آن را در همان درخواست ورود می‌پذیرد؛ اگر مدیر
   * TOTP فعال داشته باشد و کد نیامده باشد، پاسخ `totpRequired` است.
   */
  totp?: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateProfileInput {
  fullName: string;
  phone: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AccountDeletionInput {
  reason?: string;
  confirmation: string;
}

export interface AccountDeletionReceipt {
  message: string;
  requestedAt: string;
}

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface CourseChapter {
  title: string;
  summary: string;
}

export interface CourseFaq {
  question: string;
  answer: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string[];
  level: CourseLevel;
  ageRange: {
    min: number;
    max: number;
  };
  durationWeeks: number;
  sessions: number;
  priceToman: number;
  compareAtPriceToman?: number;
  outcomes: string[];
  syllabus: CourseChapter[];
  faqs: CourseFaq[];
  art: ImageKey;
  badge?: string;
  popular?: boolean;
  featured?: boolean;
  /** نام ارائه‌دهنده‌ی محتوای دوره. */
  providerName: string;
  /** لینک پنل ارائه‌دهنده برای پیگیری صدور لایسنس. */
  providerPanelUrl: string;
  /** لینک ورود به سایت دوره برای کاربر دارای لایسنس. */
  activationUrl: string;
  /** راهنمای فعال‌سازی، چند خطی و قابل نمایش در داشبورد. */
  activationInstructions: string;
  /** دوره‌های پیش‌نویس در سایت عمومی نمایش داده نمی‌شوند. */
  published: boolean;
  updatedAt?: string;
}

export type CourseInput = Omit<Course, "id">;

/**
 * چرخه‌ی عمر سفارش:
 * pending → awaiting_license → fulfilled
 * و حالت‌های پایانی failed / cancelled / expired / refunded و on_hold.
 */
export type OrderStatus =
  | "pending"
  | "awaiting_license"
  | "fulfilled"
  | "on_hold"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export interface OrderStatusEvent {
  id: string;
  status: OrderStatus;
  at: string;
  note?: string;
  byName?: string;
}

export interface OrderCourse {
  id: string;
  slug: string;
  title: string;
  art: ImageKey;
  priceToman: number;
}

export interface OrderCustomer {
  fullName: string;
  email: string;
  phone: string;
}

export type DiscountType = "percent" | "fixed";

export interface OrderDiscount {
  code: string;
  type: DiscountType;
  label: string;
  amountToman: number;
  percent?: number;
}

export interface License {
  id: string;
  /** کلید کامل فقط از مسیر revealLicense برگردانده می‌شود. */
  code?: string;
  maskedCode: string;
  issuedAt: string;
  emailSentAt?: string;
  enteredBy: string;
  /** توضیحات تکمیلی که مدیر هنگام ثبت وارد می‌کند. */
  description?: string;
  /** شناسه‌ی ارجاع نزد ارائه‌دهنده. */
  providerReference?: string;
  source: "provider" | "gift";
  /** پس از لغو، کلید دیگر معتبر نیست اما سابقه‌ی آن حفظ می‌شود. */
  revokedAt?: string;
  revokeReason?: string;
}

export interface LicenseReveal {
  licenseId: string;
  orderId: string;
  code: string;
  description?: string;
  providerReference?: string;
  providerName: string;
  providerPanelUrl: string;
  activationUrl: string;
  activationInstructions: string;
}

export interface OrderRefund {
  amountToman: number;
  refundedAt: string;
  reference?: string;
  reason: string;
}

export interface Order {
  id: string;
  number: number;
  userId: string;
  course: OrderCourse;
  customer: OrderCustomer;
  originalPriceToman: number;
  discount: OrderDiscount | null;
  /** مالیات بر ارزش افزوده‌ی اعمال‌شده؛ فقط وقتی درصد تنظیمات بیشتر از صفر باشد. */
  taxPercent?: number;
  taxToman?: number;
  totalToman: number;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  /** شماره‌ی پیگیری تراکنش؛ پس از پرداخت موفق پر می‌شود. */
  paymentRef?: string;
  paymentState?: PaymentState | "unpaid";
  license: License | null;
  note?: string;
  updatedAt: string;
  /** مسیر ایجاد سفارش؛ خرید معمول یا هدیه‌ی دستی مدیر. */
  source: "purchase" | "gift";
  /** شناسه‌ی ارجاع درخواست نزد ارائه‌دهنده؛ برای پیگیری صدور لایسنس. */
  providerReference?: string;
  statusHistory: OrderStatusEvent[];
  onHoldReason?: string;
  cancelReason?: string;
  refund?: OrderRefund | null;
}

export interface CreateOrderInput {
  courseId: string;
  discountCode?: string;
  note?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface AddLicenseInput {
  orderId: string;
  licenseCode: string;
  description?: string;
  providerReference?: string;
  confirmDuplicate?: boolean;
}

export interface FulfillLicenseInput extends AddLicenseInput {
  notifyUser: boolean;
}

export interface EditLicenseInput {
  licenseId: string;
  licenseCode?: string;
  description?: string;
  providerReference?: string;
  notifyUser: boolean;
}

export interface HoldOrderInput {
  orderId: string;
  reason: string;
  sendDelayEmail: boolean;
}

export interface CancelOrderInput {
  orderId: string;
  reason: string;
}

export interface RefundOrderInput {
  orderId: string;
  reason: string;
  reference?: string;
}

export interface GiftLicenseInput {
  email: string;
  courseId: string;
  licenseCode: string;
  description?: string;
  providerReference?: string;
  notifyUser: boolean;
  /** تأیید صریح در صورت تکراری بودن کلید. */
  confirmDuplicate?: boolean;
}

export interface DiscountCode {
  code: string;
  type: DiscountType;
  /** در کدهای درصدی، درصد تخفیف. */
  percent?: number;
  /** در کدهای ثابت، مبلغ تخفیف به تومان. */
  amountToman?: number;
  /** سقف تخفیف برای کدهای درصدی. */
  maxDiscountToman?: number;
  /** حداقل مبلغ سفارش برای اعمال کد. */
  minOrderToman?: number;
  active: boolean;
  startsAt?: string;
  expiresAt?: string;
  maxUses: number;
  usedCount: number;
  /** سقف استفاده برای هر کاربر. */
  maxUsesPerUser: number;
  /** اگر خالی باشد، برای همه‌ی دوره‌ها معتبر است. */
  courseIds?: string[];
  firstPurchaseOnly?: boolean;
  /** اجازه‌ی سفارش با مبلغ صفر. */
  allowFree?: boolean;
  createdAt: string;
}

export type DiscountValidation =
  | {
      valid: true;
      discount: DiscountCode;
      amountToman: number;
      finalToman: number;
      label: string;
    }
  | {
      valid: false;
      message: string;
    };

export interface ValidateDiscountInput {
  code: string;
  courseId: string;
}

export interface CreateDiscountInput {
  code: string;
  type: DiscountType;
  percent?: number;
  amountToman?: number;
  maxDiscountToman?: number;
  minOrderToman?: number;
  maxUses: number;
  maxUsesPerUser: number;
  courseIds?: string[];
  firstPurchaseOnly?: boolean;
  allowFree?: boolean;
  active?: boolean;
  startsAt?: string;
  expiresAt?: string;
}

export interface UpdateDiscountInput extends Omit<CreateDiscountInput, "code"> {
  code: string;
}

export interface BulkDiscountInput {
  prefix: string;
  count: number;
  type: DiscountType;
  percent?: number;
  amountToman?: number;
  maxDiscountToman?: number;
  minOrderToman?: number;
  maxUses: number;
  maxUsesPerUser: number;
  courseIds?: string[];
  firstPurchaseOnly?: boolean;
  allowFree?: boolean;
  active?: boolean;
  startsAt?: string;
  expiresAt?: string;
}

export interface DiscountUsageReport {
  code: string;
  totalUses: number;
  totalDiscountToman: number;
  orders: Array<{
    orderId: string;
    orderNumber: number;
    customerName: string;
    usedAt: string;
    discountToman: number;
  }>;
}

export interface RevenuePoint {
  date: string;
  label: string;
  amountToman: number;
  orders: number;
}

export interface AdminStats {
  totalRevenueToman: number;
  pendingLicenses: number;
  overdueFulfillments: number;
  totalOrders: number;
  customers: number;
  deliveredLicenses: number;
  todayOrders: number;
  newMessages: number;
  revenueSeries: RevenuePoint[];
}

export interface EmailMessage {
  id: string;
  orderId: string;
  to: string;
  subject: string;
  sentAt: string;
  /** متن کوتاه ایمیل؛ کلید کامل عمداً در آن قرار نمی‌گیرد. */
  body?: string;
  /** آیا این ایمیل شامل کلید لایسنس بوده است (طبق تنظیمات). */
  includesLicenseKey?: boolean;
  template:
    | "license-delivery"
    | "delay-notice"
    | "license-updated"
    | "gift-license"
    | "refund-notice"
    | "order-cancelled"
    | "order-hold"
    /** قالب‌های دیگر سرور (رسید پرداخت، هشدار مدیر، یادآوری و…) */
    | "other";
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: "license" | "order" | "system";
  createdAt: string;
  readAt?: string;
  href?: string;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
}

export type MessageStatus = "new" | "read" | "done";

export interface InboxMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status?: MessageStatus;
}

export interface OrderList {
  orders: Order[];
  total: number;
}

export interface AdminLicenseListItem {
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
  emailSentAt?: string;
  source: License["source"];
  revokedAt?: string;
  revokeReason?: string;
  description?: string;
  providerReference?: string;
}

export interface AdminUserSummary extends User {
  isActive: boolean;
  ordersCount: number;
  licensesCount: number;
  totalSpentToman: number;
  lastOrderAt?: string;
}

export interface AdminUserDetail {
  user: AdminUserSummary;
  orders: Order[];
  licenses: AdminLicenseListItem[];
}

export interface SetUserActiveInput {
  userId: string;
  active: boolean;
  reason?: string;
}

export interface RevokeLicenseInput {
  licenseId: string;
  reason: string;
}

export interface FooterSettings {
  about: string;
  email: string;
  phone: string;
  address: string;
}

export interface TrustBadgeSettings {
  enabled: boolean;
  label: string;
  /** نشانی صفحه/تصویر نماد؛ فقط https مجاز است. */
  url: string;
  /** کد جایگزاری که در نسخه‌ی واقعی در فوتر قرار می‌گیرد. */
  code: string;
}

export interface PublicSiteSettings {
  footer: FooterSettings;
  trustBadge: TrustBadgeSettings;
  /** مهلت تحویل لایسنس برای نمایش در صفحه‌ی خرید. */
  fulfillmentSlaHours: number;
  /** درصد مالیات برای نمایش در تسویه‌حساب؛ محاسبه‌ی نهایی در adapter انجام می‌شود. */
  taxPercent: number;
}

export interface GeneralSettings {
  /** مهلت SLA صف تحویل لایسنس، بر حسب ساعت. */
  fulfillmentSlaHours: number;
  /** درج کلید کامل لایسنس در ایمیل تحویل؛ پیش‌فرض خاموش است. */
  includeLicenseKeyInEmail: boolean;
  /** درصد مالیات نمایشی؛ پیش‌فرض صفر. */
  taxPercent: number;
  footer: FooterSettings;
  trustBadge: TrustBadgeSettings;
  updatedAt?: string;
}

export interface PaymentSettings {
  hasToken: boolean;
  /** فقط چهار کاراکتر آخر؛ توکن کامل هرگز ذخیره یا بازگردانده نمی‌شود. */
  maskedToken: string;
  enabled: boolean;
  /** آدرس بازگشت درگاه؛ از مبدأ جاری ساخته می‌شود. */
  returnUrl: string;
  lastTestedAt?: string;
  lastTestResult?: "success" | "failed";
}

export interface SavePaymentTokenInput {
  token: string;
}

export interface PaymentTokenReceipt {
  message: string;
  maskedToken: string;
  hasToken: boolean;
}

export type ApiErrorField =
  | "email"
  | "phone"
  | "password"
  | "fullName"
  | "code"
  | "licenseCode"
  | "currentPassword"
  | "newPassword"
  | "confirmation"
  | "reason"
  | "title"
  | "slug"
  | "token"
  | "question"
  | "answer"
  | "name"
  | "role"
  | "bio"
  | "body"
  | "general";

export class ApiError extends Error {
  field?: ApiErrorField;
  /** کد ماشین‌خوان برای تصمیم‌گیری رابط کاربری (مثلاً license_duplicate). */
  code?: string;

  constructor(message: string, field?: ApiErrorField, code?: string) {
    super(message);
    this.name = "ApiError";
    this.field = field;
    this.code = code;
  }
}

export type FaqCategory = "license" | "learning" | "support";

export interface SiteFaq {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
}

export interface Testimonial {
  id: string;
  parentName: string;
  city: string;
  childInfo: string;
  quote: string;
  rating: number;
}

export interface SiteContent {
  faqs: SiteFaq[];
  testimonials: Testimonial[];
}

export interface BlogPostSection {
  heading: string;
  paragraphs: string[];
}

export type ContentStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  readMinutes: number;
  publishedAt: string;
  art: ImageKey;
  sections: BlogPostSection[];
  /** متن Markdown برای ویرایشگر پنل؛ در نمایش عمومی به sections تبدیل می‌شود. */
  body?: string;
  status?: ContentStatus;
  updatedAt?: string;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  readMinutes: number;
  art: ImageKey;
  body: string;
  status: ContentStatus;
}

export type TeacherAccent = "lavender" | "yellow" | "sky" | "coral";

export interface Teacher {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
  accent: TeacherAccent;
  /** ترتیب نمایش در سایت؛ عدد کمتر اول می‌آید. */
  order?: number;
  isActive?: boolean;
}

export interface TeacherInput {
  name: string;
  role: string;
  bio: string;
  initials: string;
  accent: TeacherAccent;
  isActive: boolean;
}

export interface HomeFaq {
  id: string;
  question: string;
  answer: string;
  order?: number;
  isActive?: boolean;
}

export interface HomeFaqInput {
  question: string;
  answer: string;
  isActive: boolean;
}

export interface LeadInput {
  fullName: string;
  contact: string;
  consent: boolean;
  /** فیلد تله‌ی ربات؛ کاربر واقعی آن را پر نمی‌کند. */
  website?: string;
}

export interface LeadReceipt {
  id: string;
  message: string;
}

export interface LeadRecord {
  id: string;
  fullName: string;
  contact: string;
  createdAt: string;
}

export type PaymentState = "success" | "failed" | "pending" | "error";

export interface PaymentResult {
  orderId: string;
  state: PaymentState;
  message: string;
  trackingNumber?: string;
  paidAt?: string;
  order?: Order;
}

/** وضعیت دسترسی کاربر به خرید یک دوره؛ برای جلوگیری از خرید تکراری. */
export interface CourseAccessStatus {
  allowed: boolean;
  reason?: "license" | "in-progress" | "pending-payment";
  orderId?: string;
  orderNumber?: number;
  orderStatus?: OrderStatus;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** فیلد تله‌ی ربات؛ باید خالی بماند. */
  website?: string;
}

export interface ContactReceipt {
  id: string;
  message: string;
}

export interface PasswordResetInput {
  email: string;
}

export interface PasswordResetReceipt {
  message: string;
}
