# اتصال فرانت به بک‌اند — ناهماهنگی‌ها و تصمیم‌ها

این سند فهرست ناهماهنگی‌هایی است که هنگام جایگزینی `mockAdapter` با کلاینت
واقعی پیدا شد، به‌همراه جایی که هرکدام اصلاح شده است.

## ۱. نشست و احراز هویت

| ناهماهنگی | اصلاح |
| --- | --- |
| `AuthSession.token` در فرانت اجباری بود، اما سرور نشست را با کوکی `bp_session` (httpOnly) نگه می‌دارد و هیچ توکنی برنمی‌گرداند. | `token` اختیاری شد و adapter واقعی آن را ست نمی‌کند؛ `http.ts` همه‌ی درخواست‌ها را با `credentials: "include"` می‌فرستد. هیچ توکنی در storage نیست. |
| `POST /auth/register` نشست نمی‌سازد (تا تأیید ایمیل) ولی فرانت بعد از ثبت‌نام کاربر را وارد می‌کرد. | `AuthSession.pendingVerification` اضافه شد؛ `AuthContext.register` کاربر را ست نمی‌کند و صفحه‌ی ثبت‌نام پیام «پیوند تأیید ارسال شد» را با ایمیل کاربر نشان می‌دهد. |
| نقش کاربر در سرور `user` و در فرانت `parent` است. | `toRole()` در adapter: `user → parent`. |
| `phone` در سرور می‌تواند `null` باشد؛ در فرانت رشته است. | adapter مقدار `null` را به `""` تبدیل می‌کند. |
| پاسخ `GET /auth/me` پاکت `{user, session, totpRequired, totpSetupRequired}` دارد. | adapter پاکت را باز می‌کند و `AuthSession` می‌سازد. |
| ورود مدیر با TOTP فعال، `totpRequired: true` برمی‌گرداند و مسیرهای `/admin/*` تا تأیید کد ۴۰۳ می‌دهند؛ فرم ورود فرانت فیلد کد نداشت. | `LoginInput.totp` اختیاری اضافه شد و `POST /auth/login` همان کد را می‌پذیرد؛ صفحه‌ی ورود مرحله‌ی «تأیید دومرحله‌ای» با کد ۶ رقمی دارد. `AuthContext.login` فقط وقتی `totpRequired` نیست کاربر را وارد می‌کند و `getSession` هم نشست تأییدنشده را وارد حساب نمی‌کند. کد TOTP هیچ‌جا ذخیره نمی‌شود. |

## ۲. سفارش‌ها

| ناهماهنگی | اصلاح |
| --- | --- |
| نمای عمومی سفارش فقط `id/number/status/course/unitPrice/total/dates/paymentUrl` بود، اما `Order` فرانت به `customer`, `license`, `discount`, `statusHistory`, `paymentRef`, `paymentState`, `source`, `updatedAt`, `taxPercent/taxToman` نیاز دارد. | `PublicOrder` در `services/orders.ts` کامل شد و همان قرارداد `Order` فرانت را دارد؛ لایسنس فقط ماسک‌شده است. |
| لغو سفارش توسط کاربر مسیر نداشت (فقط لغو مدیر). | `POST /orders/:id/cancel` اضافه شد: فقط صاحب سفارش، فقط وضعیت `pending`، آزادسازی رزرو تخفیف و ثبت `order.cancelled_by_user` در audit. |
| «پرداخت دوباره» برای سفارش در جریان مسیر نداشت؛ `paymentsApi.start` در mock مستقیم نتیجه برمی‌گرداند. | `POST /orders/:id/payment` اضافه شد؛ اگر کد پرداخت موجود باشد همان لینک درگاه برگردانده می‌شود (بدون پرداخت تکراری) و در غیر این صورت کد تازه ساخته می‌شود. adapter واقعی مرورگر را به `paymentUrl` منتقل می‌کند. |
| `paymentsApi.getResult` در سرور معادل نداشت. | adapter از `GET /orders/:id` وضعیت را مشتق می‌کند (`paymentState` + وضعیت سفارش). |
| پاکت پاسخ‌ها: `GET /orders` → `{orders}`، `GET /orders/:id` → `{order}`. | adapter پاکت‌ها را باز می‌کند تا امضای `OrdersApi` تغییر نکند. |
| صفحه‌های مدیر با `ordersApi.get()` کار می‌کنند، ولی این مسیر فقط مالک را می‌پذیرد (۴۰۴ برای مدیر غیرمالک). | adapter وضعیت نشست را می‌خواند؛ اگر نقش `admin` باشد `GET /admin/orders/:id` را صدا می‌زند. |
| `paymentsApi.revealLicense` برای مدیر و کاربر یکی است، اما مسیرها متفاوت‌اند (`/me/licenses/:id/reveal` و `/admin/licenses/:id/reveal`). | adapter بر اساس نقش، مسیر درست را انتخاب می‌کند. هر دو مسیر در سرور audit می‌نویسند. |

## ۳. پنل مدیریت

| ناهماهنگی | اصلاح |
| --- | --- |
| `GET /admin/fulfillment` پاکت `{orders, slaHours}` دارد و فرانت آرایه می‌خواهد. | adapter آرایه را برمی‌گرداند؛ `overdue` و `overdueHours` از سرور می‌آیند. |
| `GET /admin/orders` پاکت `{orders, total}` دارد و پیش‌فرض ۵۰ ردیف است. | adapter `{orders}` را باز می‌کند و `limit=200` می‌فرستد (سقف مجاز). |
| آمار داشبورد (`AdminStats`) هیچ نقطه‌ی پایانی در سرور نداشت. | `GET /admin/stats` با تجمیع SQL اضافه شد (درآمد، صف، تأخیر SLA، سری ۷ روزه). |
| `GET /admin/users/:id` پاسخ `{detail}` می‌دهد و `orders` آن‌ها `PanelOrder` است. | adapter پاکت را باز و `PanelOrder` را به `Order` نگاشت می‌کند. |
| فهرست لایسنس `source` را `purchase/admin_gift` می‌دهد؛ فرانت `provider/gift` می‌خواهد. | نگاشت در `toLicense()` و `toLicenseListItem()`. |
| لغو لایسنس فقط `{licenseId, orderId, order}` برمی‌گرداند ولی `AdminApi.revokeLicense` آیتم کامل می‌خواهد. | adapter آیتم را از سفارش برگشتی می‌سازد. |
| قالب ایمیل با نام‌های snake_case (`license_delivery`, `delay_notice`, …) می‌آید؛ فرانت union خط‌تیره‌دار داشت. | جدول نگاشت + افزودن `"other"` برای قالب‌هایی مثل رسید پرداخت که در UI استفاده نمی‌شوند. |
| `email_outbox` بدنه‌ی ایمیل را برنمی‌گرداند (ممکن است کلید داشته باشد) و `sentAt` برای ردیف ارسال‌نشده `null` است. | adapter فقط فراداده می‌سازد، `sentAt` را با `createdAt` جایگزین می‌کند و هرگز کلید را در فهرست نمی‌آورد. |
| `audit_logs.id` عدد است، ولی `AuditLogEntry.id` رشته. | `String(id)` در نگاشت. |
| `notifications.kind` متن آزاد است؛ فرانت سه مقدار `license/order/system` می‌پذیرد. | مقدار ناشناس به `system` نگاشت می‌شود. |
| `GET /me/notifications` پاکت `{notifications, unread}` دارد و `read-all` فقط `{updated}` برمی‌گرداند. | adapter پاکت را باز می‌کند و بعد از read-all فهرست را دوباره می‌خواند. |
| کد تخفیف: `perUserLimit/endsAt/isActive` در سرور ↔ `maxUsesPerUser/expiresAt/active` در فرانت. | نگاشت در `toDiscount`/`toDiscountPayload`. |
| مبلغ و مالیات: فرانت `totalToman` نهایی را نشان می‌دهد؛ سرور پیش‌تر مالیات را ذخیره نمی‌کرد. | ستون‌های `tax_percent` و `tax_toman` به `orders` اضافه شد و مالیات روی مبلغ پس از تخفیف محاسبه می‌شود (فقط سمت سرور). |

## ۴. محتوا

| ناهماهنگی | اصلاح |
| --- | --- |
| `description` دوره در مسیر عمومی رشته‌ی تک‌پاراگرافی است، در فرانت آرایه. | `toDescription()` بر اساس `\n\n` می‌شکند (پاسخ مدیر از قبل آرایه است). |
| `providerPanelUrl` در مسیر عمومی `providerSiteUrl` نام دارد و `activationUrl/activationInstructions/published` ندارد. | نگاشت نام + پیش‌فرض‌های امن در `toCourse()`. |
| `art` رشته‌ی آزاد است ولی فرانت `ImageKey` محدود دارد. | `toImageKey()` فقط کلیدهای مجاز را می‌پذیرد و برای مقدار ناشناس پیش‌فرض می‌گذارد. |
| `blog_posts.body` مارک‌داون است و `sections` ندارد؛ `publishedAt` می‌تواند `null` باشد. | `parseSections()` مارک‌داون را به بخش‌ها تبدیل می‌کند؛ تاریخ با `createdAt/updatedAt` جایگزین می‌شود. |
| FAQ عمومی `order/isActive` ندارد و FAQ مدیر `sortOrder` دارد. | هر دو به `order` نگاشت می‌شوند. |
| `SiteContent` فرانت شامل `testimonials` است، اما در سرور جدولی برای آن نیست. | `getSiteContent` فعلاً `testimonials: []` برمی‌گرداند؛ صفحه‌ی پرسش‌ها فقط `faqs` را مصرف می‌کند. |
| اعتبارسنجی تخفیف عمومی فقط `{type, percent, amountToman, maxDiscountToman}` از کد را برمی‌گرداند، ولی `DiscountValidation` یک `DiscountCode` کامل می‌خواهد. | adapter بقیه‌ی فیلدها را با مقادیر بی‌اثر پر می‌کند؛ مصرف‌کننده فقط `code/label/amount` را می‌خواند. |

## ۵. زیرساخت

- پیشوند واقعی API `/api/v1` است؛ نیازمندی «مسیر پایه‌ی `/api`» با پروکسی
  nginx روی `/api/` و مقدار پیش‌فرض `VITE_API_BASE=/api/v1` برآورده می‌شود.
- `http.ts` توکن CSRF را از `GET /auth/csrf` می‌گیرد، در حافظه نگه می‌دارد و
  در هدر `x-csrf-token` می‌فرستد؛ در صورت `csrf_invalid` یک‌بار تازه می‌کند و
  همان درخواست را تکرار می‌کند.
- خطاهای سرور (`{error: {code, message, fields}}`) به `ApiError` با پیام فارسی،
  `code` ماشین‌خوان و `field` فرم تبدیل می‌شوند. خطای شبکه و timeout هم پیام
  فارسی جدا دارند.
- محافظ CSRF سرور، `Origin` را با `APP_URL` مقایسه می‌کند. در توسعه باید
  `APP_URL` بک‌اند دقیقاً همان مبدأی فرانت باشد (مثلاً `http://localhost:5173`
  یا پورتی که Vite روی آن اجرا شده)؛ وگرنه همه‌ی درخواست‌های غیر-GET با
  `csrf_origin_mismatch` رد می‌شوند. در production هر دو روی یک دامنه‌اند.
- پیکربندی nginx در `deploy/nginx/brightpaths.conf` است: fallback به
  `index.html`، پروکسی `/api` و `/uploads`، CSP سخت‌گیرانه، HSTS،
  `X-Frame-Options: DENY` و کش طولانی برای `/assets` و `/fonts`.

## ۶. اجرا

```bash
# فرانت با بک‌اند واقعی (پیش‌فرض)
npm run dev

# فرانت با adapter ساختگی، بدون بک‌اند
VITE_USE_MOCK=true npm run dev
```

در محیط توسعه، Vite مسیر `/api` را به `VITE_API_PROXY_TARGET`
(پیش‌فرض `http://127.0.0.1:3000`) پروکسی می‌کند. در production، nginx این
نقش را دارد. مقدار `VITE_USE_MOCK` و `VITE_API_BASE` در `.env.example`
توضیح داده شده‌اند.

برای روشن‌کردن دائمی حالت mock در توسعه، `VITE_USE_MOCK=true` را در
`.env.development.local` بگذارید (نه `.env.local`): آن فایل فقط در حالت
development خوانده می‌شود و build تولیدی هرگز adapter ساختگی و داده‌های
نمونه را با خود نمی‌برد. علاوه بر این، پرچم mock فقط وقتی `import.meta.env.DEV`
باشد اثر دارد. `mockAdapter` با import پویا بارگذاری می‌شود و در بسته‌ی اصلی
production وجود ندارد.
