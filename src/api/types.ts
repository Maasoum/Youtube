import type { ImageKey } from "@/types/image";

export type UserRole = "parent" | "admin";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
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
}

export type OrderStatus = "awaiting_payment" | "paid" | "delivered" | "canceled";

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

export interface OrderDiscount {
  code: string;
  percent: number;
  amountToman: number;
}

export interface License {
  code: string;
  issuedAt: string;
  emailSentAt?: string;
  enteredBy: string;
}

export interface Order {
  id: string;
  number: number;
  userId: string;
  course: OrderCourse;
  customer: OrderCustomer;
  originalPriceToman: number;
  discount: OrderDiscount | null;
  totalToman: number;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  paymentRef?: string;
  license: License | null;
  note?: string;
  updatedAt: string;
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
}

export interface DiscountCode {
  code: string;
  percent: number;
  active: boolean;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  createdAt: string;
}

export type DiscountValidation =
  | {
      valid: true;
      discount: DiscountCode;
      amountToman: number;
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
  percent: number;
  maxUses: number;
  expiresAt?: string;
}

export interface AdminStats {
  totalRevenueToman: number;
  pendingLicenses: number;
  totalOrders: number;
  customers: number;
  deliveredLicenses: number;
  todayOrders: number;
}

export interface EmailMessage {
  id: string;
  orderId: string;
  to: string;
  subject: string;
  sentAt: string;
  template: "license-delivery";
}

export interface OrderList {
  orders: Order[];
}

export type ApiErrorField =
  | "email"
  | "phone"
  | "password"
  | "fullName"
  | "code"
  | "licenseCode"
  | "general";

export class ApiError extends Error {
  field?: ApiErrorField;

  constructor(message: string, field?: ApiErrorField) {
    super(message);
    this.name = "ApiError";
    this.field = field;
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
