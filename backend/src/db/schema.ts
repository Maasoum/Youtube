import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "awaiting_license",
  "fulfilled",
  "on_hold",
  "failed",
  "cancelled",
  "expired",
  "refunded",
]);

export const licenseStatusEnum = pgEnum("license_status", ["active", "revoked"]);

export const licenseSourceEnum = pgEnum("license_source", [
  "purchase",
  "admin_gift",
]);

export const orderSourceEnum = pgEnum("order_source", ["purchase", "gift"]);

export const courseLevelEnum = pgEnum("course_level", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const discountTypeEnum = pgEnum("discount_type", ["percent", "fixed"]);

export const redemptionStatusEnum = pgEnum("redemption_status", [
  "reserved",
  "redeemed",
  "released",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "pending",
  "sending",
  "sent",
  "failed",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "published",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "new",
  "read",
  "done",
]);

export const teacherAccentEnum = pgEnum("teacher_accent", [
  "lavender",
  "yellow",
  "sky",
  "coral",
]);

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("user"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    totpSecretEncrypted: text("totp_secret_encrypted"),
    totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
    totpLastUsedAt: timestamp("totp_last_used_at", { withTimezone: true }),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledReason: text("disabled_reason"),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    deletionRequestedAt: timestamp("deletion_requested_at", {
      withTimezone: true,
    }),
    deletionReason: text("deletion_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${table.email})`),
    index("users_role_idx").on(table.role),
    index("users_disabled_idx").on(table.disabledAt),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    totpVerified: boolean("totp_verified").notNull().default(false),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uq").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    requestedIp: text("requested_ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("password_resets_token_hash_uq").on(table.tokenHash),
    index("password_resets_user_idx").on(table.userId),
    index("password_resets_expires_idx").on(table.expiresAt),
  ],
);

export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("email_verifications_token_hash_uq").on(table.tokenHash),
    index("email_verifications_user_idx").on(table.userId),
    index("email_verifications_expires_idx").on(table.expiresAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    ageMin: integer("age_min").notNull(),
    ageMax: integer("age_max").notNull(),
    providerName: text("provider_name").notNull(),
    providerSiteUrl: text("provider_site_url"),
    activationUrl: text("activation_url"),
    activationInstructions: text("activation_instructions"),
    tagline: text("tagline").notNull().default(""),
    level: courseLevelEnum("level").notNull().default("beginner"),
    durationWeeks: integer("duration_weeks").notNull().default(6),
    sessions: integer("sessions").notNull().default(12),
    outcomes: jsonb("outcomes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    syllabus: jsonb("syllabus")
      .$type<{ title: string; summary: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    faqs: jsonb("faqs")
      .$type<{ question: string; answer: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    art: text("art"),
    badge: text("badge"),
    popular: boolean("popular").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    priceToman: bigint("price_toman", { mode: "number" }).notNull(),
    compareAtPriceToman: bigint("compare_at_price_toman", { mode: "number" }),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("courses_slug_uq").on(table.slug),
    index("courses_published_idx").on(table.isPublished),
    check("courses_age_range_chk", sql`${table.ageMin} <= ${table.ageMax}`),
    check(
      "courses_age_positive_chk",
      sql`${table.ageMin} >= 3 AND ${table.ageMax} <= 99`,
    ),
    check("courses_price_nonnegative_chk", sql`${table.priceToman} >= 0`),
  ],
);

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    type: discountTypeEnum("type").notNull(),
    percent: integer("percent"),
    amountToman: bigint("amount_toman", { mode: "number" }),
    minTotalToman: bigint("min_total_toman", { mode: "number" })
      .notNull()
      .default(0),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    maxDiscountToman: bigint("max_discount_toman", { mode: "number" }),
    perUserLimit: integer("per_user_limit").notNull().default(1),
    firstPurchaseOnly: boolean("first_purchase_only").notNull().default(false),
    allowFree: boolean("allow_free").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("discount_codes_code_uq").on(sql`upper(${table.code})`),
    index("discount_codes_active_idx").on(table.isActive),
    check(
      "discount_codes_type_value_chk",
      sql`(${table.type} = 'percent' AND ${table.percent} BETWEEN 1 AND 100 AND ${table.amountToman} IS NULL)
          OR (${table.type} = 'fixed' AND ${table.amountToman} > 0 AND ${table.percent} IS NULL)`,
    ),
    check(
      "discount_codes_cap_positive_chk",
      sql`${table.maxDiscountToman} IS NULL OR ${table.maxDiscountToman} > 0`,
    ),
  ],
);

export const discountCodeCourses = pgTable(
  "discount_code_courses",
  {
    discountCodeId: uuid("discount_code_id")
      .notNull()
      .references(() => discountCodes.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("discount_code_courses_uq").on(
      table.discountCodeId,
      table.courseId,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Orders, payments, licenses                                                 */
/* -------------------------------------------------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    titleSnapshot: text("title_snapshot").notNull(),
    unitPriceSnapshot: bigint("unit_price_snapshot", {
      mode: "number",
    }).notNull(),
    discountCodeId: uuid("discount_code_id").references(
      () => discountCodes.id,
      { onDelete: "set null" },
    ),
    discountToman: bigint("discount_toman", { mode: "number" })
      .notNull()
      .default(0),
    /** درصد مالیات اعمال‌شده در لحظه‌ی ثبت سفارش؛ یک رقم اعشار. */
    taxPercent: numeric("tax_percent", {
      precision: 4,
      scale: 1,
      mode: "number",
    })
      .notNull()
      .default(0),
    taxToman: bigint("tax_toman", { mode: "number" }).notNull().default(0),
    totalToman: bigint("total_toman", { mode: "number" }).notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    source: orderSourceEnum("source").notNull().default("purchase"),
    note: text("note"),
    cancelReason: text("cancel_reason"),
    refundReason: text("refund_reason"),
    refundReference: text("refund_reference"),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    clientRefId: text("client_ref_id").notNull(),
    paymentCode: text("payment_code"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    onHoldReason: text("on_hold_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_number_uq").on(table.number),
    uniqueIndex("orders_client_ref_uq").on(table.clientRefId),
    index("orders_user_idx").on(table.userId, table.createdAt),
    index("orders_course_idx").on(table.courseId),
    index("orders_status_idx").on(table.status),
    index("orders_payment_code_idx").on(table.paymentCode),
    uniqueIndex("orders_payment_code_uq")
      .on(table.paymentCode)
      .where(sql`${table.paymentCode} IS NOT NULL`),
    uniqueIndex("orders_active_user_course_uq")
      .on(table.userId, table.courseId)
      .where(sql`${table.status} IN ('pending', 'awaiting_license', 'on_hold')`),
    index("orders_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.status} = 'pending'`),
    check("orders_total_nonnegative_chk", sql`${table.totalToman} >= 0`),
    check("orders_tax_nonnegative_chk", sql`${table.taxToman} >= 0`),
    check(
      "orders_tax_percent_range_chk",
      sql`${table.taxPercent} >= 0 AND ${table.taxPercent} <= 30`,
    ),
    check(
      "orders_discount_nonnegative_chk",
      sql`${table.discountToman} >= 0 AND ${table.discountToman} <= ${table.unitPriceSnapshot}`,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    code: text("code"),
    refId: text("ref_id").notNull(),
    cardNumberMasked: text("card_number_masked"),
    cardHashPan: text("card_hash_pan"),
    rawResponse: jsonb("raw_response").$type<Record<string, unknown>>(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payments_ref_id_uq").on(table.refId),
    uniqueIndex("payments_order_uq").on(table.orderId),
    index("payments_code_idx").on(table.code),
  ],
);

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    payloadEncrypted: text("payload_encrypted").notNull(),
    keyFingerprint: text("key_fingerprint").notNull(),
    status: licenseStatusEnum("status").notNull().default("active"),
    source: licenseSourceEnum("source").notNull().default("purchase"),
    deliveredBy: uuid("delivered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    /** فقط برای نمایش ماسک‌شده؛ کلید کامل فقط رمزنگاری‌شده ذخیره می‌شود. */
    keyLast4: text("key_last4"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("licenses_order_uq").on(table.orderId),
    uniqueIndex("licenses_active_user_course_uq")
      .on(table.userId, table.courseId)
      .where(sql`${table.status} = 'active'`),
    index("licenses_fingerprint_idx").on(table.keyFingerprint),
    index("licenses_user_idx").on(table.userId),
    index("licenses_course_idx").on(table.courseId),
    check(
      "licenses_revoked_fields_chk",
      sql`(${table.status} = 'revoked' AND ${table.revokedAt} IS NOT NULL)
          OR (${table.status} = 'active' AND ${table.revokedAt} IS NULL)`,
    ),
  ],
);

export const discountRedemptions = pgTable(
  "discount_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discountCodeId: uuid("discount_code_id")
      .notNull()
      .references(() => discountCodes.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: redemptionStatusEnum("status").notNull().default("reserved"),
    reservedAt: timestamp("reserved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("discount_redemptions_order_uq").on(table.orderId),
    index("discount_redemptions_code_user_idx").on(
      table.discountCodeId,
      table.userId,
    ),
    check(
      "discount_redemptions_dates_chk",
      sql`(${table.status} <> 'redeemed' OR ${table.redeemedAt} IS NOT NULL)
          AND (${table.status} <> 'released' OR ${table.releasedAt} IS NOT NULL)`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Notifications and mail                                                     */
/* -------------------------------------------------------------------------- */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    kind: text("kind").notNull().default("system"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.createdAt)],
);

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** سفارش مرتبط برای ایمیل‌های تراکنشی و جلوگیری از یادآوری تکراری. */
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    template: text("template").notNull(),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),
    status: emailStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("email_outbox_dispatch_idx").on(table.status, table.scheduledAt),
    index("email_outbox_created_idx").on(table.createdAt),
    index("email_outbox_order_idx").on(
      table.orderId,
      table.template,
      table.createdAt,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Settings and content                                                       */
/* -------------------------------------------------------------------------- */

export const paymentSettings = pgTable(
  "payment_settings",
  {
    id: integer("id").primaryKey().default(1),
    tokenEncrypted: text("token_encrypted"),
    /** فقط چهار نویسه‌ی آخر برای نمایش ماسک‌شده؛ توکن کامل هرگز برگردانده نمی‌شود. */
    tokenLast4: text("token_last4"),
    isActive: boolean("is_active").notNull().default(false),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastTestResult: text("last_test_result"),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("payment_settings_singleton_chk", sql`${table.id} = 1`),
    check(
      "payment_settings_last_test_chk",
      sql`${table.lastTestResult} IS NULL OR ${table.lastTestResult} IN ('success', 'failed')`,
    ),
  ],
);

export const siteSettings = pgTable(
  "site_settings",
  {
    id: integer("id").primaryKey().default(1),
    general: jsonb("general")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check("site_settings_singleton_chk", sql`${table.id} = 1`)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    category: text("category").notNull(),
    author: text("author").notNull(),
    readMinutes: integer("read_minutes").notNull().default(5),
    art: text("art"),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_uq").on(table.slug),
    index("blog_posts_status_idx").on(table.status, table.publishedAt),
    check("blog_posts_read_minutes_chk", sql`${table.readMinutes} BETWEEN 1 AND 90`),
  ],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: messageStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("contact_messages_status_idx").on(table.status, table.createdAt),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    contact: text("contact").notNull(),
    source: text("source").notNull().default("site"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("leads_created_idx").on(table.createdAt)],
);

export const faqs = pgTable(
  "faqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("faqs_order_idx").on(table.isActive, table.sortOrder)],
);

export const teachers = pgTable(
  "teachers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    bio: text("bio").notNull(),
    initials: text("initials").notNull(),
    accent: teacherAccentEnum("accent").notNull().default("lavender"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("teachers_order_idx").on(table.isActive, table.sortOrder),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_created_idx").on(table.createdAt),
    index("audit_logs_action_idx").on(table.action, table.createdAt),
    index("audit_logs_actor_idx").on(table.actorId, table.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type CourseRow = typeof courses.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type LicenseRow = typeof licenses.$inferSelect;
export type EmailOutboxRow = typeof emailOutbox.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
