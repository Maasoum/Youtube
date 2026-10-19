import { mockAdapter } from "./mockAdapter";
import type {
  AddLicenseInput,
  AdminStats,
  AuthSession,
  Course,
  CreateDiscountInput,
  CreateOrderInput,
  DiscountCode,
  DiscountValidation,
  EmailMessage,
  LoginInput,
  Order,
  RegisterInput,
  SiteContent,
  ValidateDiscountInput,
} from "./types";

export * from "./types";

export interface AuthApi {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  getSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
}

export interface CoursesApi {
  list(): Promise<Course[]>;
  getBySlug(slug: string): Promise<Course | null>;
  getById(id: string): Promise<Course | null>;
}

export interface OrdersApi {
  create(input: CreateOrderInput): Promise<Order>;
  pay(orderId: string): Promise<Order>;
  cancel(orderId: string): Promise<Order>;
  get(orderId: string): Promise<Order>;
  listMine(): Promise<Order[]>;
  listAll(): Promise<Order[]>;
  addLicense(input: AddLicenseInput): Promise<Order>;
  resendLicenseEmail(orderId: string): Promise<Order>;
}

export interface DiscountsApi {
  validate(input: ValidateDiscountInput): Promise<DiscountValidation>;
  listAll(): Promise<DiscountCode[]>;
  create(input: CreateDiscountInput): Promise<DiscountCode>;
  toggle(code: string): Promise<DiscountCode>;
}

export interface AdminApi {
  getStats(): Promise<AdminStats>;
  listEmails(): Promise<EmailMessage[]>;
}

export interface ContentApi {
  getSiteContent(): Promise<SiteContent>;
}

/**
 * لایه‌ی داده‌ی عمومی برنامه.
 * همه‌ی صفحه‌ها فقط از این توابع استفاده می‌کنند تا در آینده adapter مرورگر
 * با API واقعی جایگزین شود، بدون تغییر در کامپوننت‌ها.
 */
export const authApi: AuthApi = {
  login: (input) => mockAdapter.login(input),
  register: (input) => mockAdapter.register(input),
  getSession: () => mockAdapter.getSession(),
  logout: () => mockAdapter.logout(),
};

export const coursesApi: CoursesApi = {
  list: () => mockAdapter.listCourses(),
  getBySlug: (slug) => mockAdapter.getCourseBySlug(slug),
  getById: (id) => mockAdapter.getCourseById(id),
};

export const ordersApi: OrdersApi = {
  create: (input) => mockAdapter.createOrder(input),
  pay: (orderId) => mockAdapter.payOrder(orderId),
  cancel: (orderId) => mockAdapter.cancelOrder(orderId),
  get: (orderId) => mockAdapter.getOrder(orderId),
  listMine: () => mockAdapter.listMyOrders(),
  listAll: () => mockAdapter.listAllOrders(),
  addLicense: (input) => mockAdapter.addLicense(input),
  resendLicenseEmail: (orderId) => mockAdapter.resendLicenseEmail(orderId),
};

export const discountsApi: DiscountsApi = {
  validate: (input) => mockAdapter.validateDiscount(input),
  listAll: () => mockAdapter.listDiscounts(),
  create: (input) => mockAdapter.createDiscount(input),
  toggle: (code) => mockAdapter.toggleDiscount(code),
};

export const adminApi: AdminApi = {
  getStats: () => mockAdapter.getAdminStats(),
  listEmails: () => mockAdapter.listEmails(),
};

export const contentApi: ContentApi = {
  getSiteContent: () => mockAdapter.getSiteContent(),
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید.";
}
