import { brand } from "@/config/brand";
import {
  normalizeCode,
  normalizeEmail,
  normalizeLicenseCode,
  normalizePhone,
} from "@/lib/format";
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
  User,
  ValidateDiscountInput,
} from "./types";
import { ApiError } from "./types";
import {
  seedCourses,
  seedDiscounts,
  seedEmails,
  seedFaqs,
  seedOrders,
  seedTestimonials,
  seedUsers,
} from "./seed";

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

interface MockDb {
  users: DbUserRecord[];
  orders: Order[];
  discounts: DiscountCode[];
  emails: EmailMessage[];
}

interface StoredSession {
  userId: string;
  token: string;
}

const DB_KEY = "brightpaths.mockdb.v1";
const SESSION_KEY = "brightpaths.session.v1";

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
    orders: clone(seedOrders),
    discounts: clone(seedDiscounts),
    emails: clone(seedEmails),
  };
}

function isMockDb(value: unknown): value is MockDb {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.orders) &&
    Array.isArray(candidate.discounts) &&
    Array.isArray(candidate.emails)
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
        db = parsed;
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
  const course = seedCourses.find((item) => item.id === courseId);
  if (!course) {
    throw new ApiError("دوره‌ی انتخاب‌شده پیدا نشد.", "general");
  }
  return course;
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function validateDiscountForCourse(
  rawCode: string,
  course: Course,
  discounts: DiscountCode[],
): DiscountValidation {
  const code = normalizeCode(rawCode);
  if (!code) {
    return { valid: false, message: "کد تخفیف را وارد کنید." };
  }

  const discount = discounts.find((item) => item.code === code);
  if (!discount) {
    return { valid: false, message: "این کد تخفیف معتبر نیست." };
  }
  if (!discount.active) {
    return { valid: false, message: "این کد تخفیف در حال حاضر فعال نیست." };
  }
  if (isExpired(discount.expiresAt)) {
    return { valid: false, message: "این کد تخفیف منقضی شده است." };
  }
  if (discount.usedCount >= discount.maxUses) {
    return { valid: false, message: "ظرفیت استفاده از این کد تخفیف تکمیل شده است." };
  }

  const rawAmount = Math.round((course.priceToman * discount.percent) / 100);
  const amountToman = Math.min(
    course.priceToman - 1000,
    Math.round(rawAmount / 1000) * 1000,
  );

  return { valid: true, discount: clone(discount), amountToman };
}

function sendLicenseEmail(order: Order, sentAt: string): EmailMessage {
  const email: EmailMessage = {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId: order.id,
    to: order.customer.email,
    subject: `لایسنس دوره‌ی شما آماده است | ${brand.nameFa}`,
    sentAt,
    template: "license-delivery",
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

export const mockAdapter = {
  async login(input: LoginInput): Promise<AuthSession> {
    await delay();
    const database = getDb();
    const email = normalizeEmail(input.email);
    const user = database.users.find((item) => item.email === email);

    if (!user || user.passwordHash !== hashPassword(input.password)) {
      throw new ApiError("ایمیل یا رمز عبور درست نیست.", "general");
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

  async getSession(): Promise<AuthSession | null> {
    await delay(120);
    const session = readSession();
    if (!session) return null;
    const user = getDb().users.find((item) => item.id === session.userId);
    if (!user) {
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
    return clone(seedCourses);
  },

  async getCourseBySlug(slug: string): Promise<Course | null> {
    await delay(200);
    const course = seedCourses.find((item) => item.slug === slug);
    return course ? clone(course) : null;
  },

  async getCourseById(id: string): Promise<Course | null> {
    await delay(120);
    const course = seedCourses.find((item) => item.id === id);
    return course ? clone(course) : null;
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    await delay(320);
    const user = currentUser();
    const database = getDb();
    const course = findCourse(input.courseId);

    let discount = null as Order["discount"];
    let totalToman = course.priceToman;

    if (input.discountCode && input.discountCode.trim().length > 0) {
      const validation = validateDiscountForCourse(
        input.discountCode,
        course,
        database.discounts,
      );
      if (!validation.valid) {
        throw new ApiError(validation.message, "code");
      }
      discount = {
        code: validation.discount.code,
        percent: validation.discount.percent,
        amountToman: validation.amountToman,
      };
      totalToman = course.priceToman - validation.amountToman;
    }

    const now = new Date().toISOString();
    const number = nextOrderNumber();
    const order: Order = {
      id: `order-${number}`,
      number,
      userId: user.id,
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
      totalToman,
      status: "awaiting_payment",
      createdAt: now,
      license: null,
      note: input.note?.trim() || undefined,
      updatedAt: now,
    };

    database.orders.push(order);
    saveDb();
    return clone(order);
  },

  async payOrder(orderId: string): Promise<Order> {
    await delay(650);
    const user = currentUser();
    const database = getDb();
    const order = database.orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    assertOwnerOrAdmin(order, user);

    if (order.status === "paid" || order.status === "delivered") {
      return clone(order);
    }
    if (order.status === "canceled") {
      throw new ApiError("این سفارش لغو شده است و قابل پرداخت نیست.", "general");
    }

    const now = new Date().toISOString();
    order.status = "paid";
    order.paidAt = now;
    order.updatedAt = now;
    order.paymentRef = `TRX-${order.number}-${Date.now().toString().slice(-5)}`;

    if (order.discount) {
      const discount = database.discounts.find(
        (item) => item.code === order.discount?.code,
      );
      if (discount) {
        discount.usedCount += 1;
      }
    }

    saveDb();
    return clone(order);
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
    if (order.status !== "awaiting_payment") {
      throw new ApiError("فقط سفارش‌های در انتظار پرداخت قابل لغو هستند.", "general");
    }
    order.status = "canceled";
    order.updatedAt = new Date().toISOString();
    saveDb();
    return clone(order);
  },

  async getOrder(orderId: string): Promise<Order> {
    await delay(160);
    const user = currentUser();
    const order = getDb().orders.find((item) => item.id === orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    assertOwnerOrAdmin(order, user);
    return clone(order);
  },

  async listMyOrders(): Promise<Order[]> {
    await delay(220);
    const user = currentUser();
    const orders = getDb().orders.filter((item) => item.userId === user.id);
    return clone(sortNewest(orders));
  },

  async listAllOrders(): Promise<Order[]> {
    await delay(260);
    currentAdmin();
    return clone(sortNewest(getDb().orders));
  },

  async validateDiscount(input: ValidateDiscountInput): Promise<DiscountValidation> {
    await delay(260);
    currentUser();
    const course = findCourse(input.courseId);
    return validateDiscountForCourse(
      input.code,
      course,
      getDb().discounts,
    );
  },

  async addLicense(input: AddLicenseInput): Promise<Order> {
    await delay(420);
    const admin = currentAdmin();
    const database = getDb();
    const order = database.orders.find((item) => item.id === input.orderId);
    if (!order) {
      throw new ApiError("سفارش پیدا نشد.", "general");
    }
    if (order.status === "delivered") {
      throw new ApiError("برای این سفارش قبلاً لایسنس ثبت شده است.", "general");
    }
    if (order.status !== "paid") {
      throw new ApiError("فقط سفارش‌های پرداخت‌شده قابل تحویل لایسنس هستند.", "general");
    }

    const code = normalizeLicenseCode(input.licenseCode);
    if (code.length < 6) {
      throw new ApiError("کد لایسنس معتبر نیست.", "licenseCode");
    }
    const duplicated = database.orders.some(
      (item) => item.license?.code.toUpperCase() === code,
    );
    if (duplicated) {
      throw new ApiError("این کد لایسنس قبلاً برای سفارش دیگری ثبت شده است.", "licenseCode");
    }

    const now = new Date().toISOString();
    order.license = {
      code,
      issuedAt: now,
      emailSentAt: now,
      enteredBy: admin.id,
    };
    order.status = "delivered";
    order.updatedAt = now;
    sendLicenseEmail(order, now);
    saveDb();
    return clone(order);
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

    const now = new Date().toISOString();
    order.license.emailSentAt = now;
    order.updatedAt = now;
    sendLicenseEmail(order, now);
    saveDb();
    return clone(order);
  },

  async listDiscounts(): Promise<DiscountCode[]> {
    await delay(200);
    currentAdmin();
    return clone(getDb().discounts);
  },

  async createDiscount(input: CreateDiscountInput): Promise<DiscountCode> {
    await delay(280);
    currentAdmin();
    const database = getDb();
    const code = normalizeCode(input.code);

    if (database.discounts.some((item) => item.code === code)) {
      throw new ApiError("این کد تخفیف قبلاً ساخته شده است.", "code");
    }
    if (!Number.isInteger(input.percent) || input.percent < 5 || input.percent > 90) {
      throw new ApiError("درصد تخفیف باید بین ۵ تا ۹۰ باشد.", "code");
    }
    if (!Number.isInteger(input.maxUses) || input.maxUses < 1) {
      throw new ApiError("سقف استفاده باید حداقل ۱ باشد.", "code");
    }

    const discount: DiscountCode = {
      code,
      percent: input.percent,
      active: true,
      maxUses: input.maxUses,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };
    database.discounts.unshift(discount);
    saveDb();
    return clone(discount);
  },

  async toggleDiscount(code: string): Promise<DiscountCode> {
    await delay(220);
    currentAdmin();
    const discount = getDb().discounts.find(
      (item) => item.code === normalizeCode(code),
    );
    if (!discount) {
      throw new ApiError("کد تخفیف پیدا نشد.", "code");
    }
    discount.active = !discount.active;
    saveDb();
    return clone(discount);
  },

  async getAdminStats(): Promise<AdminStats> {
    await delay(220);
    currentAdmin();
    const database = getDb();
    const paidOrders = database.orders.filter(
      (order) => order.status === "paid" || order.status === "delivered",
    );
    const today = new Date();

    return {
      totalRevenueToman: paidOrders.reduce(
        (sum, order) => sum + order.totalToman,
        0,
      ),
      pendingLicenses: database.orders.filter((order) => order.status === "paid")
        .length,
      totalOrders: database.orders.filter((order) => order.status !== "canceled")
        .length,
      customers: database.users.filter((user) => user.role === "parent").length,
      deliveredLicenses: database.orders.filter(
        (order) => order.status === "delivered",
      ).length,
      todayOrders: database.orders.filter((order) => {
        const created = new Date(order.createdAt);
        return (
          created.getFullYear() === today.getFullYear() &&
          created.getMonth() === today.getMonth() &&
          created.getDate() === today.getDate()
        );
      }).length,
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
};
