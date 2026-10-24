import { eq, sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { hashPassword } from "../lib/password.js";
import { errorMeta, logger } from "../lib/logger.js";
import { closeDatabase, db } from "./client.js";
import {
  auditLogs,
  blogPosts,
  courses,
  discountCodeCourses,
  discountCodes,
  faqs,
  paymentSettings,
  siteSettings,
  teachers,
  users,
} from "./schema.js";

const siteGeneralSettings = {
  fulfillmentSlaHours: 24,
  includeLicenseKeyInEmail: false,
  taxPercent: 0,
  footer: {
    about:
      "مسیرهای روشن با دوره‌های کوتاه و پروژه‌محور، کودکان را با هوش مصنوعی و مهارت‌های دیجیتال آشنا می‌کند.",
    email: "support@brightpaths.example",
    phone: "02191000000",
    address: "تهران، خیابان ولیعصر، پلاک ۱۲",
  },
  trustBadge: {
    enabled: false,
    label: "نماد اعتماد الکترونیکی",
    url: "https://trust.brightpaths.example",
    code: "",
  },
} as const;

const sampleCourses = [
  {
    slug: "ai-foundations",
    title: "استودیوی کوچک من",
    description:
      "اولین تجربه خلاقانه و پروژه‌محور کودک شما با هوش مصنوعی",
    ageMin: 8,
    ageMax: 11,
    durationWeeks: 6,
    sessions: 8,
    providerName: "آکادمی مسیر روشن",
    art: "studio",
    providerSiteUrl: "https://provider.example",
    activationInstructions:
      "پس از دریافت کلید، در صفحه‌ی فعال‌سازی دوره آن را وارد کنید.",
    priceToman: 3_590_000,
    compareAtPriceToman: 4_300_000,
    isPublished: true,
  },
  {
    slug: "creative-ai",
    title: "ساختن با هوش مصنوعی",
    description:
      "پروژه‌های خلاقانه‌ی تصویر، داستان و موسیقی با ابزارهای ایمن و راهنمایی والدین.",
    ageMin: 10,
    ageMax: 14,
    providerName: "استودیو یادگیری روشن",
    providerSiteUrl: "https://provider.example",
    activationInstructions:
      "کلید لایسنس را در پنل ارائه‌دهنده وارد کنید و حساب کودک را فعال کنید.",
    priceToman: 1_590_000,
    isPublished: true,
  },
  {
    slug: "digital-citizenship",
    title: "شهروند دیجیتال امن",
    description:
      "مهارت‌های امنیت، حریم خصوصی و رفتار محترمانه در فضای آنلاین برای کودکان و نوجوانان.",
    ageMin: 9,
    ageMax: 13,
    providerName: "آکادمی مسیر روشن",
    priceToman: 890_000,
    isPublished: true,
  },
] as const;

const samplePosts = [
  {
    slug: "how-to-talk-about-ai",
    title: "چطور با کودک ۹ ساله درباره‌ی هوش مصنوعی حرف بزنیم؟",
    excerpt:
      "گفت‌وگو درباره‌ی هوش مصنوعی لازم نیست فنی باشد؛ با مثال‌های روزمره و چند سؤال ساده شروع کنید.",
    body: [
      "## از چیزی شروع کنید که کودک می‌شناسد",
      "",
      "هوش مصنوعی را با مثال‌هایی مثل پیشنهاد فیلم یا تشخیص عکس توضیح دهید و بپرسید به نظر او سیستم از کجا می‌داند چه چیزی پیشنهاد بدهد.",
      "",
      "## سه سؤال ساده برای هر روز",
      "",
      "۱. این پاسخ از کجا آمده؟",
      "۲. اگر اشتباه باشد چه اتفاقی می‌افتد؟",
      "۳. چه اطلاعاتی را نباید با آن به اشتراک گذاشت؟",
    ].join("\n"),
    category: "گفت‌وگو با کودک",
    author: "تیم مسیرهای روشن",
    readMinutes: 6,
    art: "foundations",
    status: "published" as const,
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  },
  {
    slug: "screen-free-ai-games",
    title: "سه بازی بدون صفحه‌نمایش برای فهم الگوریتم",
    excerpt:
      "الگوریتم را می‌توان با دستور پخت، مرتب‌کردن اسباب‌بازی و بازی حدس زدن تمرین کرد؛ بدون نیاز به رایانه.",
    body: [
      "## الگوریتم، دستور پخت است",
      "",
      "از کودک بخواهید مراحل ساختن یک ساندویچ را دقیق بگوید و سپس آن را عیناً اجرا کنید. تفاوت دستور دقیق و کلی را همین‌جا ببینید.",
      "",
      "## بازی دسته‌بندی با اسباب‌بازی‌ها",
      "",
      "مجموعه‌ای از اسباب‌بازی‌ها را بر اساس دو ویژگی هم‌زمان دسته‌بندی کنید و درباره‌ی معیارها گفت‌وگو کنید.",
    ].join("\n"),
    category: "بازی و یادگیری",
    author: "نگار رضایی",
    readMinutes: 4,
    art: "creativity",
    status: "published" as const,
    publishedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
  },
];

const sampleFaqs = [
  {
    question: "لایسنس دوره چه مدت اعتبار دارد؟",
    answer:
      "لایسنس‌ها دائمی و تک‌کاربره هستند؛ پس از تحویل، در داشبورد شما باقی می‌مانند و برای همان کودک قابل استفاده‌اند.",
    sortOrder: 0,
  },
  {
    question: "اگر کلید لایسنس را گم کنیم چه کار کنیم؟",
    answer:
      "کلید در داشبورد شما ذخیره می‌شود. برای امنیت بیشتر، کلید کامل فقط با اقدام صریح و ثبت در گزارش دسترسی نمایش داده می‌شود.",
    sortOrder: 1,
  },
  {
    question: "تحویل لایسنس چقدر طول می‌کشد؟",
    answer:
      "پس از تأیید پرداخت، لایسنس حداکثر تا مهلت اعلام‌شده در تنظیمات سایت (به‌طور پیش‌فرض ۲۴ ساعت کاری) در داشبورد قرار می‌گیرد.",
    sortOrder: 2,
  },
];

const sampleTeachers = [
  {
    name: "نگار رضایی",
    role: "مدرس سواد دیجیتال",
    bio: "ده سال تجربه‌ی آموزش به کودکان و طراحی بازی‌های یادگیری بدون صفحه‌نمایش.",
    initials: "ن ر",
    accent: "lavender" as const,
    sortOrder: 0,
  },
  {
    name: "امیرحسین کریمی",
    role: "مدرس برنامه‌نویسی",
    bio: "علاقه‌مند به پروژه‌محور کردن یادگیری و ساختن اولین تجربه‌های موفق برای کودک.",
    initials: "ا ک",
    accent: "yellow" as const,
    sortOrder: 1,
  },
];

async function seedAdmin(): Promise<{ created: boolean; name: string } | null> {
  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existing[0]) {
    logger.info("حساب مدیر از قبل وجود دارد؛ رمز آن تغییر نکرد.");
    return { created: false, name: existing[0].fullName };
  }

  if (!env.ADMIN_PASSWORD) {
    throw new Error(
      "برای ساخت اولین مدیر، متغیر ADMIN_PASSWORD را تنظیم کنید.",
    );
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  const [admin] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      fullName: "مدیر مسیرهای روشن",
      role: "admin",
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id, fullName: users.fullName });

  if (!admin) throw new Error("ساخت حساب مدیر ناموفق بود.");
  logger.info("حساب مدیر ساخته شد؛ تأیید دومرحله‌ای پس از اولین ورود فعال شود.");
  return { created: true, name: admin.fullName };
}

async function seedContent(): Promise<void> {
  await db
    .insert(courses)
    .values([...sampleCourses])
    .onConflictDoNothing();

  const courseRows = await db
    .select({ id: courses.id, slug: courses.slug })
    .from(courses);

  const existingBlogCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blogPosts);
  if ((existingBlogCount[0]?.count ?? 0) === 0) {
    await db.insert(blogPosts).values(
      samplePosts.map((post) => ({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        category: post.category,
        author: post.author,
        readMinutes: post.readMinutes,
        art: post.art,
        status: post.status,
        publishedAt: post.publishedAt,
      })),
    );
  }

  const existingFaqCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(faqs);
  if ((existingFaqCount[0]?.count ?? 0) === 0) {
    await db.insert(faqs).values(sampleFaqs);
  }

  const existingTeacherCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teachers);
  if ((existingTeacherCount[0]?.count ?? 0) === 0) {
    await db.insert(teachers).values(sampleTeachers);
  }

  const [discount] = await db
    .insert(discountCodes)
    .values({
      code: "BRIGHT20",
      type: "percent",
      percent: 20,
      minTotalToman: 0,
      maxUses: 200,
      perUserLimit: 1,
      isActive: true,
      allowFree: false,
    })
    .onConflictDoNothing()
    .returning({ id: discountCodes.id });

  if (discount) {
    for (const course of courseRows) {
      await db
        .insert(discountCodeCourses)
        .values({ discountCodeId: discount.id, courseId: course.id })
        .onConflictDoNothing();
    }
  }

  await db
    .insert(siteSettings)
    .values({ id: 1, general: siteGeneralSettings })
    .onConflictDoNothing();

  await db
    .insert(paymentSettings)
    .values({ id: 1, isActive: false })
    .onConflictDoNothing();

  const [existingSettings] = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (existingSettings) {
    logger.info("تنظیمات عمومی نمونه آماده است.");
  }
}

async function run(): Promise<void> {
  const admin = await seedAdmin();
  await seedContent();

  await db.insert(auditLogs).values({
    actorId: null,
    actorName: admin?.name ?? "system",
    action: "system.seed",
    entityType: "system",
    summary: "داده‌ی نمونه و تنظیمات اولیه ایجاد شد.",
  });

  logger.info(
    { adminCreated: admin?.created ?? false },
    "seed با موفقیت اجرا شد",
  );
}

run()
  .then(async () => {
    await closeDatabase();
  })
  .catch(async (error: unknown) => {
    logger.error(errorMeta(error), "اجرای seed ناموفق بود");
    await closeDatabase();
    process.exitCode = 1;
  });
