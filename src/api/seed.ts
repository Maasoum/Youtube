import { brand } from "@/config/brand";
import type {
  Course,
  DiscountCode,
  EmailMessage,
  Order,
  OrderCustomer,
  OrderDiscount,
  SiteFaq,
  Testimonial,
  UserRole,
} from "./types";

export interface SeedUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  password: string;
}

const now = Date.now();
const hour = 60 * 60 * 1000;
const day = 24 * hour;

export function daysAgo(days: number): string {
  return new Date(now - days * day).toISOString();
}

export function hoursAgo(hours: number): string {
  return new Date(now - hours * hour).toISOString();
}

export const seedUsers: SeedUser[] = [
  {
    id: "user-admin",
    fullName: `مدیر ${brand.nameFa}`,
    email: "admin@brightpaths.example",
    phone: "09120000001",
    role: "admin",
    createdAt: daysAgo(120),
    password: "admin1234",
  },
  {
    id: "user-demo",
    fullName: "سارا محمدی",
    email: "parent@example.com",
    phone: "09121234567",
    role: "parent",
    createdAt: daysAgo(40),
    password: "demo1234",
  },
  {
    id: "user-negar",
    fullName: "نگار رضایی",
    email: "negar@example.com",
    phone: "09123334455",
    role: "parent",
    createdAt: daysAgo(15),
    password: "demo1234",
  },
  {
    id: "user-amir",
    fullName: "امیرحسین کریمی",
    email: "amir@example.com",
    phone: "09125556677",
    role: "parent",
    createdAt: daysAgo(9),
    password: "demo1234",
  },
  {
    id: "user-maryam",
    fullName: "مریم احمدی",
    email: "maryam@example.com",
    phone: "09127778899",
    role: "parent",
    createdAt: daysAgo(32),
    password: "demo1234",
  },
];

export const seedCourses: Course[] = [
  {
    id: "course-foundations",
    slug: "ai-foundations",
    title: "هوش مصنوعی از صفر برای کوچک‌ترها",
    tagline: "اولین برخورد امن و بازی‌گونه با ایده‌های هوش مصنوعی",
    description: [
      "بچه‌ها در این دوره بدون نیاز به هیچ پیش‌زمینه‌ای یاد می‌گیرند هوش مصنوعی چیست، چطور یاد می‌گیرد و کجا به کمک ما می‌آید. مسیر آموزش پر از بازی، گفت‌وگو و تمرین‌های کوتاه است تا کنجکاوی جای ترس از فناوری را بگیرد.",
      "هر جلسه با یک فعالیت ساده شروع می‌شود و با یک کار خلاقانه در خانه تمام می‌شود. والدین هم در هر بخش یک راهنمای کوتاه دارند تا بتوانند همراه کودک باشند، بدون اینکه لازم باشد خودشان دانش فنی داشته باشند.",
    ],
    level: "beginner",
    ageRange: { min: 8, max: 10 },
    durationWeeks: 6,
    sessions: 18,
    priceToman: 1290000,
    compareAtPriceToman: 1590000,
    outcomes: [
      "توضیح می‌دهد هوش مصنوعی چه کارهایی می‌تواند انجام دهد و چه محدودیت‌هایی دارد.",
      "تفاوت انسان و ماشین را با مثال‌های روزمره تشخیص می‌دهد.",
      "یک دستیار ساده برای مرتب‌کردن ایده‌ها و نوشتن داستان می‌سازد.",
      "می‌داند چه اطلاعاتی را نباید با ابزارهای هوش مصنوعی به اشتراک بگذارد.",
      "با کمک والدین یک پروژه‌ی کوچک پایانی ارائه می‌دهد.",
    ],
    syllabus: [
      {
        title: "هوش مصنوعی چیست؟",
        summary: "با مثال‌های آشنا مثل دستیار صوتی و پیشنهاد فیلم، مفهوم هوش مصنوعی را کشف می‌کنیم.",
      },
      {
        title: "ماشین چطور یاد می‌گیرد؟",
        summary: "با یک بازی دسته‌بندی، تفاوت آموزش با قاعده و آموزش با مثال را تجربه می‌کنیم.",
      },
      {
        title: "دستیارهای مهربان",
        summary: "یاد می‌گیریم چطور سؤال روشن بپرسیم و پاسخ‌های ابزارهای هوش مصنوعی را بررسی کنیم.",
      },
      {
        title: "خلاقیت با هوش مصنوعی",
        summary: "با کمک یک بزرگ‌تر، یک داستان کوتاه و تصویرسازی ساده خلق می‌کنیم.",
      },
      {
        title: "شهروند امن دیجیتال",
        summary: "قانون‌های طلایی حفظ حریم خصوصی و درخواست کمک از والدین را تمرین می‌کنیم.",
      },
      {
        title: "پروژه‌ی پایانی من",
        summary: "کودک نمایش کوتاهی از یادگیری‌اش را آماده می‌کند و بازخورد می‌گیرد.",
      },
    ],
    faqs: [
      {
        question: "برای این دوره به چه تجهیزاتی نیاز داریم؟",
        answer:
          "یک رایانه یا تبلت با اینترنت کافی است. بهتر است جلسه‌های آنلاین را با یک بزرگ‌تر شروع کنید؛ بقیه‌ی مسیر را کودک می‌تواند با راهنمای کوتاه هر جلسه ادامه دهد.",
      },
      {
        question: "آیا کودک باید خواندن و نوشتن کامل بداند؟",
        answer:
          "برای رده‌ی ۸ تا ۱۰ سال، آشنایی مقدماتی با خواندن کافی است. تمرین‌ها کوتاه و تصویری هستند و والدین در بخش‌های نوشتاری همراهی می‌کنند.",
      },
    ],
    art: "foundations",
    badge: "پیشنهاد شروع",
    featured: true,
  },
  {
    id: "course-creative",
    slug: "creative-ai",
    title: "هوش مصنوعی خلاق: داستان، تصویر و صدا",
    tagline: "خلاقیت کودک را با ابزارهای هوش مصنوعی گسترش بده",
    description: [
      "این دوره برای بچه‌هایی است که دوست دارند بسازند، بنویسند و خیال‌پردازی کنند. هر جلسه یک ماجرای خلاقانه است که با کمک هوش مصنوعی به داستان، تصویر، صدا یا نمایش تبدیل می‌شود.",
      "تمرکز ما روی استفاده‌ی امن، مسئولانه و با نظارت والدین است. کودک یاد می‌گیرد هوش مصنوعی را به‌عنوان یک همیار ببیند، نه جایگزین ایده‌های خودش. در پایان دوره یک اثر دیجیتال کوچک خواهد داشت که می‌تواند به خانواده نشان دهد.",
    ],
    level: "intermediate",
    ageRange: { min: 9, max: 12 },
    durationWeeks: 8,
    sessions: 24,
    priceToman: 1590000,
    outcomes: [
      "یک داستان مصور کوتاه با ایده‌ی شخصی خود می‌سازد.",
      "برای نوشتن و ویرایش، سؤال‌های دقیق و سازنده از دستیار هوش مصنوعی می‌پرسد.",
      "قواعد استفاده از تصویر و صدا و حق نشر را به زبان ساده می‌شناسد.",
      "می‌تواند ایده‌های هوش مصنوعی را ویرایش و به سبک خودش تغییر دهد.",
      "یک نمایش دیجیتال کوتاه برای ارائه‌ی پایانی آماده می‌کند.",
    ],
    syllabus: [
      {
        title: "کارگاه ایده‌ها",
        summary: "با طوفان فکری و دسته‌بندی ایده‌ها، سوژه‌ی پروژه‌ی پایان دوره را انتخاب می‌کنیم.",
      },
      {
        title: "داستانی که خودت می‌نویسی",
        summary: "دستیار هوش مصنوعی را برای پیشنهاد و ویرایش داستان به کار می‌گیریم؛ تصمیم نهایی با کودک است.",
      },
      {
        title: "رنگ، فرم و تصویر",
        summary: "با توصیف دقیق صحنه، تصویرسازی خلاقانه را تمرین می‌کنیم و نکات حق نشر را می‌آموزیم.",
      },
      {
        title: "صدا و موسیقی",
        summary: "به داستان، موسیقی و افکت صوتی اضافه می‌کنیم و استفاده‌ی مسئولانه از صدا را بررسی می‌کنیم.",
      },
      {
        title: "چیدمان اثر",
        summary: "داستان، تصویر و صدا را کنار هم می‌چینیم تا یک تجربه‌ی دیجیتال کوتاه بسازیم.",
      },
      {
        title: "بازبینی مهربانانه",
        summary: "به اثر خود و هم‌کلاسی‌ها بازخورد سازنده می‌دهیم و نسخه‌ی نهایی را آماده می‌کنیم.",
      },
    ],
    faqs: [
      {
        question: "آیا کودک به تنهایی از ابزارهای هوش مصنوعی استفاده می‌کند؟",
        answer:
          "خیر. همه‌ی فعالیت‌ها با راهنمای گام‌به‌گام و نظارت والدین انجام می‌شود. در هر جلسه یک چک‌لیست امنیتی کوتاه برای والدین داریم.",
      },
      {
        question: "مدرک پایان دوره می‌دهید؟",
        answer:
          "بله، بعد از تحویل پروژه‌ی پایانی، یک گواهی دیجیتال با نام کودک در داشبورد شما قرار می‌گیرد.",
      },
    ],
    art: "creative",
    badge: "محبوب والدین",
    popular: true,
    featured: true,
  },
  {
    id: "course-python",
    slug: "python-ai",
    title: "پایتون و هوش مصنوعی برای نوجوان‌ها",
    tagline: "از اولین خط کد تا ساخت یک پروژه‌ی هوش مصنوعی کوچک",
    description: [
      "این دوره پلی است بین کنجکاوی و مهارت. نوجوان‌ها با زبان پایتون شروع می‌کنند، مفاهیم پایه‌ی برنامه‌نویسی را با تمرین‌های کوتاه یاد می‌گیرند و در نیمه‌ی دوم دوره یک مدل ساده‌ی دسته‌بندی می‌سازند.",
      "دوره طوری طراحی شده که ریاضی ترسناک نباشد؛ هر مفهوم با یک بازی، تصویر یا پروژه‌ی کاربردی وارد می‌شود. در پایان، نوجوان یک پروژه‌ی قابل اجرا دارد که می‌تواند در نمایشگاه مدرسه ارائه کند.",
    ],
    level: "intermediate",
    ageRange: { min: 11, max: 14 },
    durationWeeks: 10,
    sessions: 30,
    priceToman: 1890000,
    compareAtPriceToman: 2190000,
    outcomes: [
      "متغیر، شرط، حلقه و تابع را در پایتون به کار می‌برد.",
      "داده‌ها را مرتب می‌کند و یک نمودار ساده می‌سازد.",
      "ایده‌ی آموزش ماشین را با یک مثال دسته‌بندی تجربه می‌کند.",
      "یک پروژه‌ی کوچک را از ایده تا اجرا مدیریت می‌کند.",
      "کدهای خود را با کمک همیار هوش مصنوعی بررسی و اصلاح می‌کند.",
    ],
    syllabus: [
      {
        title: "اولین برنامه‌ی من",
        summary: "محیط کدنویسی را می‌شناسیم و اولین برنامه‌ی چاپ و ورودی را می‌نویسیم.",
      },
      {
        title: "تصمیم‌گیری با شرط",
        summary: "برنامه‌ای می‌سازیم که بر اساس پاسخ کاربر تصمیم می‌گیرد.",
      },
      {
        title: "حلقه‌ها و بازی‌ها",
        summary: "با حلقه‌ها یک بازی حدس عدد می‌سازیم و تکرار منطقی را تمرین می‌کنیم.",
      },
      {
        title: "توابع و سازمان‌دهی کد",
        summary: "کدهای طولانی را به بخش‌های کوچک و قابل استفاده‌ی مجدد تبدیل می‌کنیم.",
      },
      {
        title: "آشنایی با داده",
        summary: "با فهرست‌ها و جدول‌های ساده کار می‌کنیم و یک نمودار می‌سازیم.",
      },
      {
        title: "هوش مصنوعی در عمل",
        summary: "یک مدل دسته‌بندی ساده آموزش می‌دهیم و نتیجه را ارزیابی می‌کنیم.",
      },
      {
        title: "پروژه‌ی پایانی",
        summary: "ایده‌ی خود را انتخاب می‌کنیم، کد می‌نویسیم، آزمون می‌کنیم و ارائه می‌دهیم.",
      },
    ],
    faqs: [
      {
        question: "آیا نوجوان باید قبلاً برنامه‌نویسی کرده باشد؟",
        answer:
          "برای ورود به این دوره، آشنایی مقدماتی با پایتون یا گذراندن دوره‌ی مقدماتی مسیر توصیه می‌شود. اگر مطمئن نیستید، واحد پشتیبانی می‌تواند سطح مناسب را پیشنهاد دهد.",
      },
      {
        question: "چه نرم‌افزاری لازم است؟",
        answer:
          "در جلسه‌های ابتدایی از محیط کدنویسی آنلاین امن استفاده می‌کنیم. راهنمای نصب پایتون روی رایانه نیز در داشبورد قرار می‌گیرد.",
      },
    ],
    art: "python",
    featured: true,
  },
  {
    id: "course-safety",
    slug: "digital-citizenship",
    title: "شهروند دیجیتال: امنیت در دنیای هوش مصنوعی",
    tagline: "استفاده‌ی آگاهانه، امن و مسئولانه از فناوری",
    description: [
      "پیش از هر مهارت فنی، بچه‌ها باید بدانند چطور در دنیای دیجیتال امن بمانند. این دوره‌ی کوتاه با سناریوهای واقعی، فیلم‌های کوتاه و بحث‌های خانوادگی، مهارت‌های شهروندی دیجیتال را تمرین می‌کند.",
      "بخش مهمی از دوره با والدین است: چطور تنظیمات حریم خصوصی را بررسی کنیم، چه چیزی را با ابزارهای هوش مصنوعی به اشتراک نگذاریم و وقتی چیزی ناراحت‌کننده دیدیم چه کنیم. مناسب برای خانواده‌هایی که می‌خواهند شروع استفاده از فناوری را همراه با قاعده انجام دهند.",
    ],
    level: "beginner",
    ageRange: { min: 8, max: 14 },
    durationWeeks: 4,
    sessions: 12,
    priceToman: 890000,
    outcomes: [
      "اطلاعات شخصی و حساس را از اطلاعات قابل اشتراک‌گذاری تفکیک می‌کند.",
      "نشانه‌های پاسخ اشتباه یا گمراه‌کننده‌ی هوش مصنوعی را بررسی می‌کند.",
      "برای مواجهه با محتوای ناراحت‌کننده یک برنامه‌ی سه‌مرحله‌ای دارد.",
      "قواعد استفاده‌ی خانوادگی از فناوری را همراه والدین می‌نویسد.",
      "یک تعهدنامه‌ی شهروند دیجیتال امضا می‌کند.",
    ],
    syllabus: [
      {
        title: "ردپای دیجیتال",
        summary: "می‌فهمیم چه اطلاعاتی از ما در اینترنت می‌ماند و چرا مهم است.",
      },
      {
        title: "رمز و حریم خصوصی",
        summary: "ساخت رمز قوی و تنظیم حریم خصوصی حساب‌ها را تمرین می‌کنیم.",
      },
      {
        title: "هوش مصنوعی درست می‌گوید؟",
        summary: "با مثال‌های ساده یاد می‌گیریم پاسخ‌ها را بررسی کنیم و منبع بخواهیم.",
      },
      {
        title: "قرار خانوادگی",
        summary: "خانواده‌ها با هم قواعد استفاده، زمان و نظارت را مشخص می‌کنند.",
      },
    ],
    faqs: [
      {
        question: "والدین هم باید در جلسه‌ها شرکت کنند؟",
        answer:
          "دو جلسه از چهار جلسه به‌صورت خانوادگی برگزار می‌شود. بقیه‌ی جلسه‌ها برای کودک است، اما خلاصه و تمرین والدین در داشبورد قرار می‌گیرد.",
      },
      {
        question: "این دوره پیش‌نیاز دارد؟",
        answer: "خیر. این دوره نقطه‌ی شروع خوبی برای همه‌ی خانواده‌هاست و پیش‌نیاز فنی ندارد.",
      },
    ],
    art: "safety",
    badge: "تازه",
  },
];

export const seedDiscounts: DiscountCode[] = [
  {
    code: "BRIGHT20",
    percent: 20,
    active: true,
    maxUses: 200,
    usedCount: 47,
    createdAt: daysAgo(60),
  },
  {
    code: "MOM15",
    percent: 15,
    active: true,
    maxUses: 100,
    usedCount: 12,
    createdAt: daysAgo(28),
  },
  {
    code: "NOWRUZ30",
    percent: 30,
    active: true,
    maxUses: 50,
    usedCount: 50,
    expiresAt: daysAgo(3),
    createdAt: daysAgo(90),
  },
];

function courseSummary(courseId: string) {
  const course = seedCourses.find((item) => item.id === courseId);
  if (!course) {
    throw new Error("دوره‌ی نمونه پیدا نشد.");
  }

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    art: course.art,
    priceToman: course.priceToman,
  };
}

function customerFor(userId: string): OrderCustomer {
  const user = seedUsers.find((item) => item.id === userId);
  if (!user) {
    throw new Error("کاربر نمونه پیدا نشد.");
  }

  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
  };
}

function makeDiscount(code: string, amountToman: number): OrderDiscount {
  const discount = seedDiscounts.find((item) => item.code === code);
  if (!discount) {
    throw new Error("کد تخفیف نمونه پیدا نشد.");
  }

  return { code: discount.code, percent: discount.percent, amountToman };
}

// کدهای لایسنس زیر کاملاً ساختگی و صرفاً برای نمایش رابط کاربری هستند.
const demoLicenseCode = "BP-DEMO-4K7Q-2M9X";
const sampleLicenseCode = "BP-SAFE-8R3T-1L6V";

export const seedOrders: Order[] = [
  {
    id: "order-1001",
    number: 1001,
    userId: "user-demo",
    course: courseSummary("course-creative"),
    customer: customerFor("user-demo"),
    originalPriceToman: 1590000,
    discount: null,
    totalToman: 1590000,
    status: "delivered",
    createdAt: daysAgo(18),
    paidAt: daysAgo(18),
    paymentRef: "TRX-DEMO-1001",
    license: {
      code: demoLicenseCode,
      issuedAt: daysAgo(17),
      emailSentAt: daysAgo(17),
      enteredBy: "user-admin",
    },
    updatedAt: daysAgo(17),
  },
  {
    id: "order-1002",
    number: 1002,
    userId: "user-negar",
    course: courseSummary("course-foundations"),
    customer: customerFor("user-negar"),
    originalPriceToman: 1290000,
    discount: makeDiscount("MOM15", 193500),
    totalToman: 1096500,
    status: "paid",
    createdAt: daysAgo(2),
    paidAt: daysAgo(2),
    paymentRef: "TRX-DEMO-1002",
    license: null,
    updatedAt: daysAgo(2),
  },
  {
    id: "order-1003",
    number: 1003,
    userId: "user-amir",
    course: courseSummary("course-python"),
    customer: customerFor("user-amir"),
    originalPriceToman: 1890000,
    discount: null,
    totalToman: 1890000,
    status: "paid",
    createdAt: hoursAgo(5),
    paidAt: hoursAgo(5),
    paymentRef: "TRX-DEMO-1003",
    license: null,
    updatedAt: hoursAgo(5),
  },
  {
    id: "order-1004",
    number: 1004,
    userId: "user-maryam",
    course: courseSummary("course-safety"),
    customer: customerFor("user-maryam"),
    originalPriceToman: 890000,
    discount: null,
    totalToman: 890000,
    status: "delivered",
    createdAt: daysAgo(25),
    paidAt: daysAgo(25),
    paymentRef: "TRX-DEMO-1004",
    license: {
      code: sampleLicenseCode,
      issuedAt: daysAgo(24),
      emailSentAt: daysAgo(24),
      enteredBy: "user-admin",
    },
    updatedAt: daysAgo(24),
  },
];

export const seedEmails: EmailMessage[] = [
  {
    id: "email-seed-1",
    orderId: "order-1001",
    to: "parent@example.com",
    subject: `لایسنس دوره‌ی شما آماده است | ${brand.nameFa}`,
    sentAt: daysAgo(17),
    template: "license-delivery",
  },
  {
    id: "email-seed-2",
    orderId: "order-1004",
    to: "maryam@example.com",
    subject: `لایسنس دوره‌ی شما آماده است | ${brand.nameFa}`,
    sentAt: daysAgo(24),
    template: "license-delivery",
  },
];


export const seedFaqs: SiteFaq[] = [
  {
    id: "faq-license",
    question: "لایسنس دائمی و تک‌کاربره یعنی چه؟",
    answer:
      "برای هر کودک یک لایسنس دائمی صادر می‌شود؛ یعنی دسترسی به دوره تاریخ انقضا ندارد. این لایسنس مخصوص همان یک کاربر است و نمی‌تواند بین چند نفر یا چند خانواده به اشتراک گذاشته شود.",
    category: "license",
  },
  {
    id: "faq-delivery",
    question: "بعد از پرداخت، کد لایسنس چطور به دستم می‌رسد؟",
    answer:
      "پس از تایید پرداخت، تیم ما کد لایسنس را از سرویس‌دهنده‌ی آموزشی دریافت می‌کند و آن را در پنل مدیریت ثبت می‌کند. کد بلافاصله در داشبورد شما نمایش داده می‌شود و نسخه‌ای هم به ایمیل ثبت‌شده ارسال می‌شود. این فرایند معمولاً کمتر از یک روز کاری زمان می‌برد.",
    category: "license",
  },
  {
    id: "faq-one-code",
    question: "آیا می‌توانم بیش از یک کد تخفیف وارد کنم؟",
    answer:
      "هر سفارش فقط یک دوره و حداکثر یک کد تخفیف دارد. اگر چند کد دارید، کدی را انتخاب کنید که تخفیف بیشتری برای همان دوره می‌دهد.",
    category: "license",
  },
  {
    id: "faq-prerequisite",
    question: "آیا برای شروع دوره به پیش‌زمینه‌ی فنی نیاز است؟",
    answer:
      "برای دوره‌های مقدماتی خیر؛ همه‌چیز از صفر و با زبان ساده شروع می‌شود. برای دوره‌ی پایتون، آشنایی مقدماتی با برنامه‌نویسی توصیه می‌شود و در صفحه‌ی دوره به سطح مورد نیاز اشاره شده است.",
    category: "learning",
  },
  {
    id: "faq-parent-role",
    question: "والدین چقدر باید همراهی کنند؟",
    answer:
      "در دوره‌ی خردسالان، حضور یک بزرگ‌تر در شروع هر جلسه و برای تمرین‌های نوشتاری کمک می‌کند. برای نوجوانان، همراهی بیشتر به‌صورت نظارت و پیگیری هفتگی است. راهنمای کوتاه والدین برای هر دوره در داشبورد قرار می‌گیرد.",
    category: "learning",
  },
  {
    id: "faq-where-content",
    question: "محتوای دوره در همین سایت پخش می‌شود؟",
    answer:
      "این وب‌سایت ویترین و محل خرید دوره‌هاست. محتوای آموزشی در سامانه‌ی سرویس‌دهنده‌ی دوره میزبانی می‌شود و با لایسنس اختصاصی شما در دسترس خواهد بود. در این سایت ویدیو یا پخش‌کننده‌ای وجود ندارد.",
    category: "learning",
  },
  {
    id: "faq-refund",
    question: "اگر دوره مناسب کودکم نبود چه می‌شود؟",
    answer:
      "تا ۷ روز پس از تحویل لایسنس، اگر کد استفاده نشده باشد و محتوای دوره باز نشده باشد، می‌توانید درخواست بازگشت وجه ثبت کنید. برای ثبت درخواست با پشتیبانی تماس بگیرید.",
    category: "support",
  },
  {
    id: "faq-transfer",
    question: "آیا می‌توانم لایسنس را به خانواده‌ی دیگری منتقل کنم؟",
    answer:
      "لایسنس‌ها تک‌کاربره و مخصوص سفارش‌دهنده هستند و قابل انتقال یا فروش مجدد نیستند. اگر برای دو کودک می‌خواهید، برای هر کودک یک لایسنس جدا تهیه کنید.",
    category: "license",
  },
  {
    id: "faq-support",
    question: "چه زمانی پاسخ پشتیبانی را می‌گیرم؟",
    answer:
      "پیام‌ها در روزهای کاری از ۹ تا ۱۸ بررسی می‌شوند و تلاش می‌کنیم حداکثر تا یک روز کاری پاسخ دهیم. برای موضوعات مربوط به لایسنس، شماره‌ی سفارش را هم بنویسید تا سریع‌تر پیدا کنیم.",
    category: "support",
  },
  {
    id: "faq-payment",
    question: "پرداخت چگونه انجام می‌شود؟",
    answer:
      "پرداخت به‌صورت آنلاین و از طریق درگاه بانکی انجام می‌شود. مبالغ به تومان و به‌صورت عدد صحیح نمایش داده می‌شوند. هیچ اشتراک ماهانه‌ای وجود ندارد.",
    category: "license",
  },
];

export const seedTestimonials: Testimonial[] = [
  {
    id: "testimonial-1",
    parentName: "مریم احمدی",
    city: "تهران",
    childInfo: "مادر آوا، ۹ ساله",
    quote:
      "قبلاً هر وقت حرف هوش مصنوعی می‌شد، دخترم فکر می‌کرد قرار است یک ربات جای او را بگیرد. حالا با کلی ذوق برای من توضیح می‌دهد که ماشین چطور از مثال یاد می‌گیرد. تغییر نگاهش برای من از خود دوره هم ارزشمندتر بود.",
    rating: 5,
  },
  {
    id: "testimonial-2",
    parentName: "رضا کریمی",
    city: "اصفهان",
    childInfo: "پدر پارسا، ۱۲ ساله",
    quote:
      "دوره‌ی پایتون نقطه‌ی عطف بود. پارسا از یک گیمر کنجکاو تبدیل شد به کسی که برای بازی‌اش ایده می‌نویسد و کدش را خودش تست می‌کند. پشتیبانی هم وقتی برای انتخاب سطح سؤال کردم خیلی دقیق راهنمایی کرد.",
    rating: 5,
  },
  {
    id: "testimonial-3",
    parentName: "نگار رضایی",
    city: "شیراز",
    childInfo: "مادر باران، ۱۰ ساله",
    quote:
      "چیزی که برای من مهم بود، شفافیت مسیر خرید بود. دقیق می‌دانستم لایسنس دائمی است، چه زمانی تحویل می‌شود و در داشبورد کجا پیدایش کنم. باران هم بعد از دو هفته با اعتمادبه‌نفس درباره‌ی سؤال‌هایش از هوش مصنوعی حرف می‌زند.",
    rating: 5,
  },
];
