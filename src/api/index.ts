import { realAdapter } from "./realAdapter";
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
  HomeFaq,
  HomeFaqInput,
  InboxMessage,
  LeadInput,
  LeadReceipt,
  LeadRecord,
  LicenseReveal,
  LoginInput,
  MessageStatus,
  Notification,
  Order,
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
  UpdateDiscountInput,
  UpdateProfileInput,
  User,
  ValidateDiscountInput,
} from "./types";

export * from "./types";

/**
 * انتخاب لایه‌ی داده:
 * - پیش‌فرض (و در production) adapter واقعی روی `/api/v1` با کوکی نشست.
 * - با `VITE_USE_MOCK=true` در محیط توسعه، همان adapter ساختگی قبلی فعال
 *   می‌شود تا کار روی رابط کاربری بدون بک‌اند ممکن بماند.
 */
const USE_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === "true";

export const apiMode: "mock" | "real" = USE_MOCK ? "mock" : "real";

type Adapter = typeof realAdapter;

/**
 * adapter ساختگی با import پویا بارگذاری می‌شود تا در build تولیدی به بسته‌ی
 * اصلی (و داده‌های نمونه‌اش) راه پیدا نکند. همه‌ی متدهای API از قبل async
 * هستند، بنابراین یک Proxy که هر فراخوانی را به نمونه‌ی بارگذاری‌شده می‌رساند
 * کافی است و امضای `src/api` تغییر نمی‌کند.
 */
let mockAdapterPromise: Promise<Adapter> | null = null;

function loadAdapter(): Promise<Adapter> {
  if (!USE_MOCK) return Promise.resolve(realAdapter);
  mockAdapterPromise ??= import("./mockAdapter").then(
    (module) => module.mockAdapter as unknown as Adapter,
  );
  return mockAdapterPromise;
}

const adapter = new Proxy({} as Adapter, {
  get(_target, property) {
    return (...args: unknown[]): Promise<unknown> =>
      loadAdapter().then((implementation) => {
        const method = implementation[property as keyof Adapter] as unknown as (
          ...params: unknown[]
        ) => unknown;
        return method.apply(implementation, args);
      });
  },
});

export interface AuthApi {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  getSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
  requestPasswordReset(input: PasswordResetInput): Promise<PasswordResetReceipt>;
}

export interface AccountApi {
  updateProfile(input: UpdateProfileInput): Promise<User>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  requestDeletion(input: AccountDeletionInput): Promise<AccountDeletionReceipt>;
}

export interface CoursesApi {
  list(): Promise<Course[]>;
  get(slug: string): Promise<Course | null>;
  getBySlug(slug: string): Promise<Course | null>;
  getById(id: string): Promise<Course | null>;
}

export interface OrdersApi {
  create(input: CreateOrderInput): Promise<Order>;
  cancel(orderId: string): Promise<Order>;
  get(orderId: string): Promise<Order>;
  listMine(): Promise<Order[]>;
  listAll(): Promise<Order[]>;
  getCourseAccess(courseId: string): Promise<CourseAccessStatus>;
  addLicense(input: AddLicenseInput): Promise<Order>;
  resendLicenseEmail(orderId: string): Promise<Order>;
  /** کلید کامل لایسنس فقط از این مسیر برگردانده می‌شود. */
  revealLicense(licenseId: string): Promise<LicenseReveal>;
}

export interface NotificationsApi {
  list(): Promise<Notification[]>;
  markRead(id: string): Promise<Notification>;
  markAllRead(): Promise<Notification[]>;
}

export interface PaymentsApi {
  start(orderId: string): Promise<PaymentResult>;
  getResult(orderId: string): Promise<PaymentResult>;
}

export interface ContactApi {
  submit(input: ContactMessageInput): Promise<ContactReceipt>;
}

export interface DiscountsApi {
  validate(input: ValidateDiscountInput): Promise<DiscountValidation>;
  listAll(): Promise<DiscountCode[]>;
  create(input: CreateDiscountInput): Promise<DiscountCode>;
  toggle(code: string): Promise<DiscountCode>;
}

export interface AdminApi {
  getStats(): Promise<AdminStats>;
  getFulfillmentQueue(): Promise<Order[]>;
  listOrders(): Promise<Order[]>;
  listEmails(): Promise<EmailMessage[]>;
  listInbox(): Promise<InboxMessage[]>;
  listAuditLogs(limit?: number): Promise<AuditLogEntry[]>;

  listCourses(): Promise<Course[]>;
  createCourse(input: CourseInput): Promise<Course>;
  updateCourse(id: string, input: CourseInput): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  toggleCoursePublish(id: string): Promise<Course>;

  listDiscounts(): Promise<DiscountCode[]>;
  createDiscount(input: CreateDiscountInput): Promise<DiscountCode>;
  updateDiscount(input: UpdateDiscountInput): Promise<DiscountCode>;
  deleteDiscount(code: string): Promise<void>;
  toggleDiscount(code: string): Promise<DiscountCode>;
  bulkCreateDiscounts(input: BulkDiscountInput): Promise<DiscountCode[]>;
  getDiscountUsage(code: string): Promise<DiscountUsageReport>;

  fulfillLicense(input: FulfillLicenseInput): Promise<Order>;
  editLicense(input: EditLicenseInput): Promise<Order>;
  holdOrder(input: HoldOrderInput): Promise<Order>;
  resumeOrder(orderId: string): Promise<Order>;
  sendDelayEmail(orderId: string): Promise<Order>;
  cancelOrder(input: CancelOrderInput): Promise<Order>;
  refundOrder(input: RefundOrderInput): Promise<Order>;
  grantGiftLicense(input: GiftLicenseInput): Promise<Order>;
  resendLicenseEmail(orderId: string): Promise<Order>;

  listLicenses(): Promise<AdminLicenseListItem[]>;
  revokeLicense(input: RevokeLicenseInput): Promise<AdminLicenseListItem>;

  listUsers(): Promise<AdminUserSummary[]>;
  getUserDetail(userId: string): Promise<AdminUserDetail>;
  setUserActive(input: SetUserActiveInput): Promise<AdminUserSummary>;

  adminListPosts(): Promise<BlogPost[]>;
  createPost(input: BlogPostInput): Promise<BlogPost>;
  updatePost(id: string, input: BlogPostInput): Promise<BlogPost>;
  setPostStatus(
    id: string,
    status: "draft" | "published",
  ): Promise<BlogPost>;
  deletePost(id: string): Promise<void>;

  adminListFaqs(): Promise<HomeFaq[]>;
  createFaq(input: HomeFaqInput): Promise<HomeFaq>;
  updateFaq(id: string, input: HomeFaqInput): Promise<HomeFaq>;
  deleteFaq(id: string): Promise<void>;
  moveFaq(id: string, direction: "up" | "down"): Promise<HomeFaq[]>;

  adminListTeachers(): Promise<Teacher[]>;
  createTeacher(input: TeacherInput): Promise<Teacher>;
  updateTeacher(id: string, input: TeacherInput): Promise<Teacher>;
  deleteTeacher(id: string): Promise<void>;
  moveTeacher(id: string, direction: "up" | "down"): Promise<Teacher[]>;

  updateInboxStatus(id: string, status: MessageStatus): Promise<InboxMessage>;
  listLeads(): Promise<LeadRecord[]>;
  deleteLead(id: string): Promise<void>;

  getGeneralSettings(): Promise<GeneralSettings>;
  updateGeneralSettings(
    input: Omit<GeneralSettings, "updatedAt">,
  ): Promise<GeneralSettings>;
  getPaymentSettings(): Promise<PaymentSettings>;
  savePaymentToken(input: SavePaymentTokenInput): Promise<PaymentTokenReceipt>;
  setPaymentEnabled(enabled: boolean): Promise<PaymentSettings>;
  testPaymentConnection(): Promise<PaymentSettings>;
}

export interface ContentApi {
  getSiteContent(): Promise<SiteContent>;
  getPublicSettings(): Promise<PublicSiteSettings>;
}

/**
 * لایه‌ی داده‌ی عمومی برنامه.
 * همه‌ی صفحه‌ها فقط از این توابع استفاده می‌کنند تا در آینده adapter مرورگر
 * با API واقعی جایگزین شود، بدون تغییر در کامپوننت‌ها.
 */
export const authApi: AuthApi = {
  login: (input) => adapter.login(input),
  register: (input) => adapter.register(input),
  getSession: () => adapter.getSession(),
  logout: () => adapter.logout(),
  requestPasswordReset: (input) => adapter.requestPasswordReset(input),
};

export const accountApi: AccountApi = {
  updateProfile: (input) => adapter.updateProfile(input),
  changePassword: (input) => adapter.changePassword(input),
  requestDeletion: (input) => adapter.requestAccountDeletion(input),
};

export const coursesApi: CoursesApi = {
  list: () => adapter.listCourses(),
  get: (slug) => adapter.getCourse(slug),
  getBySlug: (slug) => adapter.getCourseBySlug(slug),
  getById: (id) => adapter.getCourseById(id),
};

export const ordersApi: OrdersApi = {
  create: (input) => adapter.createOrder(input),
  cancel: (orderId) => adapter.cancelOrder(orderId),
  get: (orderId) => adapter.getOrder(orderId),
  listMine: () => adapter.listMyOrders(),
  listAll: () => adapter.listAllOrders(),
  getCourseAccess: (courseId) => adapter.getCourseAccess(courseId),
  addLicense: (input) => adapter.addLicense(input),
  resendLicenseEmail: (orderId) => adapter.resendLicenseEmail(orderId),
  revealLicense: (licenseId) => adapter.revealLicense(licenseId),
};

export const notificationsApi: NotificationsApi = {
  list: () => adapter.listNotifications(),
  markRead: (id) => adapter.markNotificationRead(id),
  markAllRead: () => adapter.markAllNotificationsRead(),
};

export const paymentsApi: PaymentsApi = {
  start: (orderId) => adapter.startPayment(orderId),
  getResult: (orderId) => adapter.getPaymentResult(orderId),
};

export const contactApi: ContactApi = {
  submit: (input) => adapter.submitContactMessage(input),
};

export const discountsApi: DiscountsApi = {
  validate: (input) => adapter.validateDiscount(input),
  listAll: () => adapter.listDiscounts(),
  create: (input) => adapter.createDiscount(input),
  toggle: (code) => adapter.toggleDiscount(code),
};

export const adminApi: AdminApi = {
  getStats: () => adapter.getAdminStats(),
  getFulfillmentQueue: () => adapter.getFulfillmentQueue(),
  listOrders: () => adapter.listAllOrders(),
  listEmails: () => adapter.listEmails(),
  listInbox: () => adapter.listInboxMessages(),
  listAuditLogs: (limit) => adapter.listAuditLogs(limit),

  listCourses: () => adapter.adminListCourses(),
  createCourse: (input) => adapter.createCourse(input),
  updateCourse: (id, input) => adapter.updateCourse(id, input),
  deleteCourse: (id) => adapter.deleteCourse(id),
  toggleCoursePublish: (id) => adapter.toggleCoursePublish(id),

  listDiscounts: () => adapter.listDiscounts(),
  createDiscount: (input) => adapter.createDiscount(input),
  updateDiscount: (input) => adapter.updateDiscount(input),
  deleteDiscount: (code) => adapter.deleteDiscount(code),
  toggleDiscount: (code) => adapter.toggleDiscount(code),
  bulkCreateDiscounts: (input) => adapter.bulkCreateDiscounts(input),
  getDiscountUsage: (code) => adapter.getDiscountUsage(code),

  fulfillLicense: (input) => adapter.fulfillLicense(input),
  editLicense: (input) => adapter.editLicense(input),
  holdOrder: (input) => adapter.holdOrder(input),
  resumeOrder: (orderId) => adapter.resumeOrder(orderId),
  sendDelayEmail: (orderId) => adapter.sendDelayEmail(orderId),
  cancelOrder: (input) => adapter.adminCancelOrder(input),
  refundOrder: (input) => adapter.refundOrder(input),
  grantGiftLicense: (input) => adapter.grantGiftLicense(input),
  resendLicenseEmail: (orderId) => adapter.resendLicenseEmail(orderId),

  listLicenses: () => adapter.listLicenses(),
  revokeLicense: (input) => adapter.revokeLicense(input),

  listUsers: () => adapter.listUsers(),
  getUserDetail: (userId) => adapter.getUserDetail(userId),
  setUserActive: (input) => adapter.setUserActive(input),

  adminListPosts: () => adapter.adminListPosts(),
  createPost: (input) => adapter.createPost(input),
  updatePost: (id, input) => adapter.updatePost(id, input),
  setPostStatus: (id, status) => adapter.setPostStatus(id, status),
  deletePost: (id) => adapter.deletePost(id),

  adminListFaqs: () => adapter.adminListFaqs(),
  createFaq: (input) => adapter.createFaq(input),
  updateFaq: (id, input) => adapter.updateFaq(id, input),
  deleteFaq: (id) => adapter.deleteFaq(id),
  moveFaq: (id, direction) => adapter.moveFaq(id, direction),

  adminListTeachers: () => adapter.adminListTeachers(),
  createTeacher: (input) => adapter.createTeacher(input),
  updateTeacher: (id, input) => adapter.updateTeacher(id, input),
  deleteTeacher: (id) => adapter.deleteTeacher(id),
  moveTeacher: (id, direction) => adapter.moveTeacher(id, direction),

  updateInboxStatus: (id, status) =>
    adapter.updateInboxStatus(id, status),
  listLeads: () => adapter.listLeads(),
  deleteLead: (id) => adapter.deleteLead(id),

  getGeneralSettings: () => adapter.getGeneralSettings(),
  updateGeneralSettings: (input) => adapter.updateGeneralSettings(input),
  getPaymentSettings: () => adapter.getPaymentSettings(),
  savePaymentToken: (input) => adapter.savePaymentToken(input),
  setPaymentEnabled: (enabled) => adapter.setPaymentEnabled(enabled),
  testPaymentConnection: () => adapter.testPaymentConnection(),
};

export const contentApi: ContentApi = {
  getSiteContent: () => adapter.getSiteContent(),
  getPublicSettings: () => adapter.getPublicSettings(),
};

export interface LeadsApi {
  submitLead(input: LeadInput): Promise<LeadReceipt>;
}

export interface HomeContentApi {
  listPosts(): Promise<BlogPost[]>;
  listTeachers(): Promise<Teacher[]>;
  listFaqs(): Promise<HomeFaq[]>;
  listCourses(): Promise<Course[]>;
}

export const leadsApi: LeadsApi = {
  submitLead: (input) => adapter.submitLead(input),
};

export const homeContentApi: HomeContentApi = {
  listPosts: () => adapter.listPosts(),
  listTeachers: () => adapter.listTeachers(),
  listFaqs: () => adapter.listFaqs(),
  listCourses: () => adapter.listCourses(),
};

/**
 * سطح ساده‌ی API مطابق قرارداد صفحه‌ی اصلی.
 * کامپوننت‌ها فقط با این توابع کار می‌کنند و بعداً adapter واقعی جایگزین می‌شود.
 */
export const submitLead = (input: LeadInput): Promise<LeadReceipt> =>
  adapter.submitLead(input);

export const listCourses = (): Promise<Course[]> => adapter.listCourses();

export const listPosts = (): Promise<BlogPost[]> => adapter.listPosts();

export const listFaqs = (): Promise<HomeFaq[]> => adapter.listFaqs();

export const listTeachers = (): Promise<Teacher[]> => adapter.listTeachers();

export const getCourse = (slug: string): Promise<Course | null> =>
  adapter.getCourse(slug);

export const validateDiscount = (
  input: ValidateDiscountInput,
): Promise<DiscountValidation> => adapter.validateDiscount(input);

export const createOrder = (input: CreateOrderInput): Promise<Order> =>
  adapter.createOrder(input);

export const getPaymentResult = (orderId: string): Promise<PaymentResult> =>
  adapter.getPaymentResult(orderId);

export const submitContactMessage = (
  input: ContactMessageInput,
): Promise<ContactReceipt> => adapter.submitContactMessage(input);

/** دسترسی مستقیم به کلید لایسنس؛ تنها راه رسیدن به کد کامل. */
export const revealLicense = (licenseId: string): Promise<LicenseReveal> =>
  adapter.revealLicense(licenseId);

export const api = {
  submitLead,
  listCourses,
  listPosts,
  listFaqs,
  listTeachers,
  getCourse,
  validateDiscount,
  createOrder,
  getPaymentResult,
  submitContactMessage,
  revealLicense,
} as const;

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید.";
}
