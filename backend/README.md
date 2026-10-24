# بک‌اند مسیرهای روشن (BrightPaths)

API مستقل با Node.js 20، Fastify، TypeScript، PostgreSQL 16، Drizzle ORM، Zod و
pg-boss. این سرویس فقط با همان دامنه‌ی فرانت‌اند کار می‌کند و هیچ سرویس خارجی
به‌جز SMTP و درگاه PayPing ندارد.

## پیش‌نیاز

- Node.js 20.11 یا بالاتر
- PostgreSQL 16
- SMTP برای ارسال ایمیل تأیید و بازیابی رمز

## اجرای محلی

```bash
cd backend
cp .env.example .env
# مقادیر .env را پر کنید؛ نمونه‌ی تولید کلید رمزنگاری:
openssl rand -base64 32
# SESSION_SECRET را با یک رشته‌ی تصادفی حداقل ۳۲ نویسه‌ای پر کنید.

npm ci
npm run db:migrate
npm run db:seed
npm run dev          # API روی http://localhost:3000
npm run worker:dev   # worker ارسال ایمیل (در ترمینال جداگانه)
```

`ADMIN_PASSWORD` فقط برای اجرای `db:seed` لازم است. پس از ساخت اولین مدیر، آن
را از فایل محیط حذف کنید. رمز هیچ‌گاه در لاگ چاپ نمی‌شود.

### ساخت اولین مدیر

```bash
# در .env: ADMIN_EMAIL و ADMIN_PASSWORD را پر کنید، سپس
npm run db:seed
```

seed یک‌بار مصرف است: اگر کاربری با همان ایمیل باشد، رمز او را عوض نمی‌کند.
پس از ورود، مدیر باید تأیید دومرحله‌ای (TOTP) را فعال کند؛ بدون آن تمام
مسیرهای `/api/v1/admin/*` پاسخ ۴۰۳ می‌دهند. سپس `ADMIN_PASSWORD` را از `.env`
حذف کنید. برای ساختن مدیر دیگر، کاربر را از مسیر عادی ثبت‌نام بسازید و نقش
او را در پایگاه داده به `admin` تغییر دهید:

```sql
UPDATE users SET role = 'admin' WHERE email = 'new-admin@example.com';
```

## Docker Compose

```bash
cd backend
cp .env.example .env
# DATABASE_URL را به میزبان postgres داخل شبکه تنظیم کنید:
# postgres://USER:PASSWORD@postgres:5432/DBNAME
docker compose up -d --build
```

پس از بالا آمدن سرویس‌ها، اولین مدیر و داده‌های نمونه را یک‌بار بسازید
(`ADMIN_PASSWORD` باید در `.env` باشد و بعداً حذف شود):

```bash
docker compose exec api node dist/db/seed.js
```

سرویس‌ها:

- `postgres`: PostgreSQL 16 با volume و healthcheck
- `api`: اجرای migration و سپس API روی پورت داخلی ۳۰۰۰
- `worker`: پردازش صندوق ایمیل، انقضای سفارش‌های در انتظار و یادآوری SLA با pg-boss
- `nginx`: تنها درگاه عمومی روی `${HTTP_PORT:-8080}`

در محیط واقعی TLS را روی nginx یا لایه‌ی جلوی آن فعال کنید و
`COOKIE_SECURE=true` را نگه دارید.

## متغیرهای محیطی

| متغیر | توضیح |
| --- | --- |
| `DATABASE_URL` | نشانی PostgreSQL |
| `SESSION_SECRET` | حداقل ۳۲ نویسه برای امضای CSRF و هش توکن |
| `ENCRYPTION_KEY` | دقیقاً ۳۲ بایت base64 برای AES-256-GCM |
| `ENCRYPTION_KEY_ID` | شناسه‌ی نسخه‌ی کلید، پیش‌فرض `v1` |
| `APP_URL` | نشانی عمومی فرانت‌اند برای ساخت پیوند ایمیل و بازگشت پرداخت |
| `PUBLIC_API_URL` | اختیاری؛ نشانی عمومی خود API برای `returnUrl` درگاه. اگر API و فرانت هم‌دامنه‌اند، خالی بگذارید |
| `ADMIN_EMAIL` | ایمیل اولین مدیر |
| `ADMIN_ALERT_EMAIL` | گیرنده‌ی هشدارهای عملیاتی |
| `ADMIN_PASSWORD` | فقط برای seed؛ بعداً حذف شود |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | میزبان و پورت SMTP؛ معمولاً ۵۸۷ با `SMTP_SECURE=false` یا ۴۶۵ با `true` |
| `SMTP_USER` / `SMTP_PASS` | اعتبارنامه‌ی SMTP |
| `SMTP_FROM` | فرستنده‌ی ایمیل‌ها، مثلاً `«مسیرهای روشن» <no-reply@example.com>` |
| `PAYPING_TOKEN` | اختیاری؛ فقط جایگزین توکن ذخیره‌شده در پنل |
| `COOKIE_SECURE` | در production باید `true` باشد |
| `TRUST_PROXY` | هنگام اجرای پشت nginx `true` |

در `.env.example` همه‌ی مقدارها خالی‌اند. کلیدهای اختیاری (مثل `LOG_LEVEL`،
`SMTP_PORT` و `SESSION_TTL_HOURS`) در صورت خالی بودن مقدار پیش‌فرض می‌گیرند؛
کلیدهای اجباری (نشانی پایگاه داده، کلیدها و ایمیل مدیر) باید پر شوند.

## جریان احراز هویت

همه‌ی درخواست‌های تغییردهنده به توکن CSRF نیاز دارند:

```bash
# 1) دریافت توکن و کوکی
curl -c cookies.txt http://localhost:8080/api/v1/auth/csrf
# {"csrfToken":"..."}

# 2) ورود (توکن را از پاسخ بالا و کوکی را از فایل بگذارید)
curl -b cookies.txt -c cookies.txt \
  -H 'content-type: application/json' \
  -H 'x-csrf-token: <csrfToken>' \
  -d '{"email":"admin@example.com","password":"..."}' \
  http://localhost:8080/api/v1/auth/login
```

مسیرها:

- `GET /api/v1/auth/csrf`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`
- `POST /api/v1/auth/password/change`
- `POST /api/v1/auth/totp/setup`
- `POST /api/v1/auth/totp/enable`
- `POST /api/v1/auth/totp/verify`
- `GET /api/v1/admin/security` (نمونه‌ی محافظت‌شده با `requireAdmin`)

### ورود مدیر و TOTP

مدیر پس از ورود با رمز، در صورت نداشتن TOTP پاسخ
`totpSetupRequired: true` می‌گیرد و باید `totp/setup` و سپس `totp/enable` را
صدا بزند. در ورودهای بعدی، پاسخ `totpRequired: true` است تا کد ۶ رقمی با
`totp/verify` تأیید شود. تا فعال‌شدن TOTP و تأیید نشست، مسیرهای
`requireAdmin` پاسخ ۴۰۳ می‌دهند.

## امنیت

- رمزها با Argon2id (۱۹ MiB، زمان ۲، موازی‌سازی ۱) هش می‌شوند.
- نشست‌ها در جدول `sessions` با هش SHA-256 توکن ذخیره می‌شوند؛ کوکی
  `bp_session` با `HttpOnly`، `Secure` و `SameSite=Lax` ارسال می‌شود.
- CSRF با الگوی double-submit امضاشده محافظت می‌شود؛ توکن در کوکی
  `bp_csrf` (غیر HttpOnly) و هدر `x-csrf-token` قرار می‌گیرد.
- توکن تأیید ایمیل و بازیابی رمز فقط به‌صورت هش ذخیره می‌شود و یک‌بارمصرف است.
- قفل موقت پس از پنج تلاش ناموفق ورود (۱۵ دقیقه) و محدودیت نرخ مسیرها فعال است.
- محتوای لایسنس و توکن PayPing با AES-256-GCM و شناسه‌ی نسخه‌ی کلید داخل
  ciphertext رمز می‌شوند؛ fingerprint با HMAC ساخته می‌شود.
- لاگر فقط متد، مسیر، شناسه‌ی درخواست و وضعیت را ثبت می‌کند؛ هدرها، کوکی‌ها،
  بدنه، رمز، توکن و کلید لایسنس در لاگ نمی‌آیند.
- در تولید، متن خطاهای پیش‌بینی‌نشده لاگ نمی‌شود تا مقادیر حساس درایور افشا نشوند.

## دوره‌ها، سفارش، تخفیف و پرداخت

همه‌ی مبالغ به **تومان** و عدد صحیح‌اند. قیمت و مبلغ نهایی فقط در سرور از
پایگاه داده محاسبه می‌شود و هیچ مبلغی از کلاینت پذیرفته نمی‌شود.

### مسیرهای عمومی

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/api/v1/courses` | دوره‌های منتشرشده (`q`, `limit`, `offset`) |
| GET | `/api/v1/courses/:slug` | جزئیات دوره‌ی منتشرشده |
| GET | `/api/v1/blog` | نوشته‌های منتشرشده |
| GET | `/api/v1/blog/:slug` | جزئیات نوشته |
| GET | `/api/v1/faqs` | پرسش‌های فعال |
| GET | `/api/v1/teachers` | مربیان فعال |
| GET | `/api/v1/site-settings` | تنظیمات عمومی (فوتر، مالیات، SLA، نماد) |
| POST | `/api/v1/leads` | دریافت راهنما (Zod + honeypot) |
| POST | `/api/v1/contact` | پیام تماس (Zod + honeypot) |

`leads` و `contact` محدودیت ۵ درخواست در ۱۰ دقیقه دارند و کلید محدودیت،
**هش HMAC آدرس IP** است؛ IP خام ذخیره یا لاگ نمی‌شود. اگر فیلد تله‌ی
`website` پر باشد، پاسخ موفق قلابی برمی‌گردد و چیزی در پایگاه داده نوشته
نمی‌شود.

### تخفیف و سفارش

| متد | مسیر | توضیح |
| --- | --- | --- |
| POST | `/api/v1/discount/validate` | اعتبارسنجی کد برای یک دوره (نیازمند ورود، ۲۰ درخواست در دقیقه) |
| POST | `/api/v1/orders` | ساخت سفارش (نیازمند ورود) |
| GET | `/api/v1/orders` | سفارش‌های کاربر جاری |
| GET | `/api/v1/orders/:id` | جزئیات سفارش کاربر جاری (شامل مشتری، مالیات، کد تخفیف، لایسنس ماسک‌شده و خط زمان) |
| POST | `/api/v1/orders/:id/cancel` | لغو سفارش `pending` توسط خود کاربر و آزادسازی رزرو تخفیف |
| POST | `/api/v1/orders/:id/payment` | دریافت دوباره‌ی لینک درگاه؛ کد پرداخت موجود دوباره استفاده می‌شود |

- بدنه‌ی ساخت سفارش: `{ "courseId": "...", "discountCode": "..." }`؛ برای
  سازگاری، `course_id` و `discount_code` هم پذیرفته می‌شوند.
- موتور تخفیف در `src/lib/discount.ts` توابع خالص دارد و همان ترتیب بررسی
  فرانت‌اند را پیاده می‌کند: وجود/فعال‌بودن، بازه‌ی زمانی، سقف کل، سقف هر
  کاربر، دوره، حداقل مبلغ، اولین خرید، مبلغ صفر.
- هنگام ساخت سفارش، ظرفیت کد با `UPDATE ... WHERE used_count < max_uses`
  به‌صورت اتمیک رزرو می‌شود و یک ردیف `discount_redemptions` با وضعیت
  `reserved` ثبت می‌گردد. ردیف کاربر هم در همان تراکنش قفل می‌شود تا سقف
  هر کاربر قابل اتکا باشد.
- خرید دوباره برای دوره‌ای که لایسنس فعال یا سفارش در جریان
  (`pending`/`awaiting_license`/`on_hold`) دارد رد می‌شود. دو ایندکس یکتای
  جزئی هم به‌عنوان لایه‌ی دفاعی در پایگاه داده وجود دارند.
- سفارش با `client_ref_id` یکتا و `expires_at` سی دقیقه ساخته می‌شود.
- اگر مبلغ نهایی صفر و `allow_free` کد فعال باشد، بدون درگاه مستقیماً
  `awaiting_license` ثبت می‌شود و در `audit_logs` با اکشن
  `order.created_free` می‌آید.
- مبلغ کمتر از ۱٬۰۰۰ تومان یا بیشتر از ۵۰٬۰۰۰٬۰۰۰ تومان با کد مشخص رد
  می‌شود.

### درگاه PayPing

پیاده‌سازی در `src/services/payping.ts` است و با مستندات رسمی
[docs.payping.ir](https://docs.payping.ir/) تطبیق داده شده:

- پایه: `https://api.payping.ir` و هدر `Authorization: Bearer <TOKEN>`
- ساخت: `POST /v2/pay` با `amount`، `returnUrl`، `clientRefId`،
  `payerIdentity`، `payerName`، `description`؛ پاسخ شامل `code`
- هدایت: `GET /v2/pay/gotoipg/{code}`
- بازگشت: پی‌پینگ با `POST application/x-www-form-urlencoded` فیلدهای
  `code`، `refid`، `clientrefid`، `cardnumber`، `cardhashpan` را به
  `returnUrl` می‌فرستد. مسیر بازگشت زیر پشتیبانی GET هم دارد.
- تایید: `POST /v2/pay/verify` با `{ refId, amount }`؛ واحد مبلغ تومان است
  و مبلغ همیشه از سفارش خوانده می‌شود.
- استعلام: `GET /v1/report/{code}` برای بررسی وضعیت پیش از انقضا و
  مغایرت‌گیری.

توکن ابتدا از `payment_settings` (رمزنگاری‌شده با AES-256-GCM) و در نبود آن
از `PAYPING_TOKEN` خوانده می‌شود. توکن هرگز در پاسخ، لاگ یا متن خطا ظاهر
نمی‌شود. اگر درگاه غیرفعال باشد یا توکنی موجود نباشد، پاسخ
`503 payment_not_available` با پیام «به‌زودی فعال می‌شود» برمی‌گردد.

### تایید پرداخت

| متد | مسیر | توضیح |
| --- | --- | --- |
| POST | `/api/v1/payments/verify` | تایید پرداخت با `orderId` یا `code`/`clientRefId` (نیازمند ورود) |
| GET/POST | `/api/v1/payments/callback` | بازگشت سرور‌به‌سرور درگاه؛ سپس ۳۰۲ به `/payment/callback` فرانت |

- ترتیب کار: پیدا کردن سفارش، استعلام با کد پرداخت، بررسی
  `clientRefId` و مبلغ، سپس `verify` با مبلغ پایگاه داده.
- در یک تراکنش: ثبت `payments` (یکتا بر `ref_id` و `order_id`)، تغییر وضعیت
  به `awaiting_license`، ثبت `paid_at` و `redeemed` کردن رزرو تخفیف.
- عملیات idempotent است: تکرار یا رفرش، ردیف پرداخت/ایمیل تکراری نمی‌سازد.
  `ref_id` متعلق به سفارش دیگر با `409 payment_reference_conflict` رد می‌شود.
- سفارش `expired` هم اگر پولش کسر شده باشد پذیرفته و به `awaiting_license`
  منتقل می‌شود. سفارش `cancelled`/`refunded`/`failed` قابل احیا نیست.
- خطای شبکه یا ۵xx درگاه، سفارش را `pending` نگه می‌دارد تا استعلام مجدد
  ممکن باشد.
- مسیر callback از CSRF مستثنی است (فراخوانی سرور‌به‌سرور) و صحت آن با
  verify و تطبیق کد/مبلغ بررسی می‌شود.

### تنظیمات پرداخت (فقط مدیر)

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/api/v1/admin/settings/payment` | نمایش وضعیت با توکن ماسک‌شده |
| PUT | `/api/v1/admin/settings/payment/token` | ذخیره‌ی رمزنگاری‌شده‌ی توکن |
| PUT | `/api/v1/admin/settings/payment/enabled` | فعال/غیرفعال کردن درگاه |
| POST | `/api/v1/admin/settings/payment/test` | ساخت کد پرداخت ۱٬۰۰۰ تومانی بدون تایید تراکنش |

پاسخ‌ها فقط `••••` + چهار نویسه‌ی آخر را برمی‌گردانند. فعال‌سازی بدون توکن
ذخیره‌شده ممکن نیست و هر تغییر در `audit_logs` ثبت می‌شود.

### ایمیل‌ها و job انقضا

- پس از پرداخت موفق (یا سفارش رایگان): رسید برای کاربر و هشدار فوری
  «سفارش جدید در انتظار صدور لایسنس» برای `ADMIN_ALERT_EMAIL` در
  `email_outbox` ثبت می‌شود. در ایمیل رسید و هشدار مدیر هیچ کلید لایسنس یا
  توکنی نیست.
- هنگام تحویل لایسنس، ایمیل «لایسنس شما آماده است» برای کاربر ثبت می‌شود؛
  متن کلید فقط اگر `includeLicenseKeyInEmail` در تنظیمات عمومی روشن باشد در
  ایمیل می‌آید. پیش‌فرض خاموش است.
- یادآوری SLA به `ADMIN_ALERT_EMAIL` می‌رود و برای هر سفارش حداکثر یک‌بار در
  ۲۴ ساعت ساخته می‌شود؛ مبنای تأخیر `fulfillmentSlaHours` از تنظیمات است.
- worker با pg-boss صف `orders.expire` را هر دقیقه اجرا می‌کند، سفارش‌های
  `pending` منقضی را می‌یابد، در صورت امکان از PayPing استعلام می‌گیرد و
  سپس آن‌ها را `expired` و رزرو تخفیف را `released` می‌کند. اگر استعلام
  ممکن نباشد یا پرداختی دیده شود، سفارش برای بررسی بعدی `pending` می‌ماند.

## تحویل لایسنس و پنل مدیریت

پس از پرداخت، سفارش در وضعیت `awaiting_license` قرار می‌گیرد و تا ثبت
لایسنس در صف تحویل می‌ماند. همه‌ی مسیرهای زیر نیازمند نشست مدیر با TOTP
تأییدشده‌اند و هر اقدام حساس در `audit_logs` ثبت می‌شود.

### صف تحویل و سفارش‌ها

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/api/v1/admin/stats` | آمار داشبورد: درآمد، صف، تأخیر SLA، امروز، مشتریان و سری ۷ روزه |
| GET | `/api/v1/admin/fulfillment` | صف `awaiting_license`/`on_hold` به ترتیب قدیمی‌ترین، همراه `slaHours` و پرچم `overdue` |
| GET | `/api/v1/admin/orders` | فهرست سفارش‌ها با فیلتر وضعیت، جست‌وجو، بازه‌ی تاریخ و صفحه‌بندی |
| GET | `/api/v1/admin/orders.csv` | خروجی CSV همان فیلترها (بدون کلید کامل؛ فقط ماسک) |
| GET | `/api/v1/admin/orders/:id` | جزئیات سفارش، مشتری، پرداخت و لایسنس ماسک‌شده |
| POST | `/api/v1/admin/orders/:id/license` | ثبت لایسنس و تحویل سفارش |
| POST | `/api/v1/admin/orders/:id/hold` | توقف با دلیل و ارسال اختیاری ایمیل تأخیر |
| POST | `/api/v1/admin/orders/:id/resume` | بازگشت از `on_hold` به `awaiting_license` |
| POST | `/api/v1/admin/orders/:id/delay-email` | ارسال دوباره‌ی اطلاع تأخیر |
| POST | `/api/v1/admin/orders/:id/resend-license-email` | ارسال مجدد ایمیل لایسنس |
| POST | `/api/v1/admin/orders/:id/cancel` | لغو سفارش با دلیل |
| POST | `/api/v1/admin/orders/:id/refund` | استرداد دستی؛ سفارش `refunded` و لایسنس `revoked` می‌شود |
| POST | `/api/v1/admin/orders/:id/note` | یادداشت داخلی سفارش |

ثبت لایسنس در یک تراکنش انجام می‌شود: رمزنگاری `licenseKey` و
`extraInfo`، ساخت ردیف `licenses` با `key_last4`، تغییر سفارش به `fulfilled`
همراه `fulfilled_at`، اعلان کاربر، ایمیل «لایسنس شما آماده است» در
`email_outbox` (کلید فقط وقتی `includeLicenseKeyInEmail` روشن باشد) و
`audit_logs`. اگر fingerprint کلید قبلاً به **کاربر دیگری** تحویل داده شده
باشد، پاسخ `409 license_duplicate` است و ثبت فقط با `confirmDuplicate: true`
انجام می‌شود. کلید برای همان کاربر قبلی مجاز است.

بازگشت پول از پنل PayPing انجام می‌شود و لغو لایسنس نزد ارائه‌دهنده باید
جداگانه با او هماهنگ شود؛ این جمله در پاسخ مسیر استرداد هم آمده است.

### لایسنس‌ها، کاربران و محتوا

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/api/v1/admin/licenses` | فهرست ماسک‌شده با فیلتر وضعیت/جست‌وجو |
| POST | `/api/v1/admin/licenses/gift` | تحویل دستی (`source=admin_gift`) با ساخت سفارش رایگان |
| PATCH | `/api/v1/admin/licenses/:id` | ویرایش payload و ارسال ایمیل به‌روزرسانی |
| POST | `/api/v1/admin/licenses/:id/revoke` | لغو با دلیل اجباری |
| POST | `/api/v1/admin/licenses/:id/reveal` | نمایش صریح کلید؛ هر بار یک ردیف audit |
| GET/POST/PUT/DELETE | `/api/v1/admin/courses...` | CRUD دوره و `POST .../publish` |
| GET/POST/PUT/DELETE | `/api/v1/admin/blog...` | CRUD نوشته و `POST .../status` |
| GET/POST/PUT/DELETE | `/api/v1/admin/faqs...` | CRUD پرسش و `POST .../move` |
| GET/POST/PUT/DELETE | `/api/v1/admin/teachers...` | CRUD مربی و `POST .../move` |
| GET/POST/PUT/DELETE | `/api/v1/admin/discounts...` | CRUD کد تخفیف، `bulk`، `usage` و `toggle` |
| GET/PATCH | `/api/v1/admin/users...` | فهرست، جزئیات و فعال/غیرفعال‌سازی کاربر |
| GET/PATCH | `/api/v1/admin/messages...` | صندوق پیام و تغییر وضعیت |
| GET/DELETE | `/api/v1/admin/leads...` | فهرست و حذف لید |
| GET/PUT | `/api/v1/admin/site-settings` | ساعت SLA، درصد مالیات، ایمیل کلید و فوتر |
| GET | `/api/v1/admin/audit-logs` | گزارش اقدام‌های حساس |
| GET | `/api/v1/admin/emails` | وضعیت صندوق ایمیل؛ بدنه‌ی ایمیل برنمی‌گردد |

کلید لایسنس در هیچ فهرست، CSV، لاگ یا پاسخ جزئیات سفارش نمی‌آید. برای دیدن
متن کلید فقط مسیر `reveal` وجود دارد که مالکیت را بررسی می‌کند، هدر
`Cache-Control: no-store` می‌دهد و audit می‌نویسد. در سمت کاربر هم
`GET /api/v1/me/licenses/:id/reveal` با محدودیت ۱۰ درخواست در دقیقه و
ثبت audit کار می‌کند.

### مسیرهای کاربر

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/api/v1/me/courses` | دوره‌های خریداری‌شده با وضعیت لایسنس و بدون کلید |
| GET | `/api/v1/me/courses/:courseId/access` | بررسی دسترسی به دوره |
| GET | `/api/v1/me/receipts` | رسیدهای پرداخت کاربر |
| GET | `/api/v1/me/notifications` | اعلان‌ها و تعداد خوانده‌نشده |
| POST | `/api/v1/me/notifications/:id/read` | خواندن یک اعلان |
| POST | `/api/v1/me/notifications/read-all` | خواندن همه |
| PATCH | `/api/v1/me/profile` | نام و تلفن |
| POST | `/api/v1/me/deletion-request` | درخواست حذف حساب با تأیید «حذف» |

## ایمیل، SMTP و DNS

همه‌ی ایمیل‌ها ابتدا در `email_outbox` ثبت می‌شوند و worker با Nodemailer
می‌فرستد؛ تا پنج تلاش با backoff و ذخیره‌ی خطا در همان ردیف. قالب‌ها در
`src/lib/email-templates.ts` هستند: راست‌به‌چپ، CSS درون‌خطی، فونت Tahoma و
بدون تصویر یا منبع خارجی. قالب‌ها: تأیید ایمیل، بازیابی رمز، خوش‌آمد، رسید
پرداخت، لایسنس آماده، هدیه، به‌روزرسانی لایسنس، اطلاع تأخیر، هشدار مدیر،
یادآوری SLA و درخواست حذف حساب.

برای تحویل قابل اتکا در SMTP، رکوردهای DNS دامنه را تنظیم کنید:

| نوع | نمونه | توضیح |
| --- | --- | --- |
| SPF | `v=spf1 include:mailprovider.com ~all` | فقط سرویس‌دهنده‌ی SMTP مجاز باشد |
| DKIM | `<selector>._domainkey` | مقدار را از پنل SMTP بگیرید و فعال کنید |
| DMARC | `v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com` | گزارش و سیاست قرنطینه |
| MX/PTR | میزبان SMTP | نام برگشتی باید با دامنه هم‌خوان باشد |

از پورت ۵۸۷ با STARTTLS (یا ۴۶۵ با TLS) استفاده کنید. اگر SMTP روی سرور
داخلی است، دسترسی خروجی به آن را جدا باز کنید؛ worker بدون SMTP اجرا
نمی‌شود و ایمیل‌ها در صف `pending` می‌مانند.

## پشتیبان‌گیری و بازیابی

پایگاه داده و **کلید رمزنگاری** را با هم نگه دارید؛ بدون
`ENCRYPTION_KEY` متن لایسنس‌ها قابل بازیابی نیست.

```bash
# پشتیبان فشرده
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > backup.dump

# بازیابی روی پایگاه خالی
cat backup.dump | docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

فایل `.env` (به‌ویژه `SESSION_SECRET` و `ENCRYPTION_KEY`) را جداگانه و
رمزنگاری‌شده نگه دارید. آزمون بازیابی را روی محیط آزمایشی انجام دهید و پس از
آن `npm run db:migrate` را اجرا کنید تا migrationهای جدید اعمال شوند.

## استقرار روی سرور ایران بدون اینترنت خروجی

اگر سرور به Docker Hub یا npm دسترسی ندارد، تصاویر را جای دیگر بسازید و
منتقل کنید:

```bash
# روی ماشین دارای اینترنت، از پوشه‌ی backend
docker build -t brightpaths-api:local .
docker save brightpaths-api:local | gzip > brightpaths-api.tar.gz
docker pull postgres:16-alpine
docker pull nginx:1.27-alpine
docker save postgres:16-alpine | gzip > postgres.tar.gz
docker save nginx:1.27-alpine | gzip > nginx.tar.gz

# روی سرور، از پوشه‌ی backend
docker load < brightpaths-api.tar.gz
docker load < postgres.tar.gz
docker load < nginx.tar.gz
```

در `docker-compose.yml` تصویر `brightpaths-api:local` برای `api` و `worker`
تنظیم شده است؛ بنابراین compose بعد از `docker load` همان تصویر محلی را اجرا
می‌کند و به اینترنت نیاز ندارد. سپس `docker compose up -d --no-build`،
اجرای یک‌باره‌ی seed و بررسی `/readyz`. برای TLS از گواهی موجود روی nginx استفاده
کنید و `APP_URL`، `PUBLIC_API_URL`، `COOKIE_SECURE=true` و
`TRUST_PROXY=true` را تنظیم کنید. دسترسی خروجی فقط برای SMTP و
`api.payping.ir` لازم است.

## فعال‌سازی PayPing

1. در پنل PayPing توکن API بگیرید و `returnUrl` را روی
   `https://example.com/api/v1/payments/callback` ثبت کنید.
2. با ورود مدیر به `/admin/settings/payment` توکن را وارد و ذخیره کنید؛ پس از
   ذخیره فقط `••••` و چهار نویسه‌ی آخر نمایش داده می‌شود.
3. دکمه‌ی «تست اتصال» یک کد پرداخت ۱٬۰۰۰ تومانی می‌سازد و تراکنش را تأیید
   نمی‌کند؛ موفقیت آن یعنی توکن و شبکه درست است.
4. کلید فعال‌سازی درگاه را روشن کنید و یک خرید واقعی کم‌مبلغ انجام دهید.
   بازگشت به `/payment/callback` باید سفارش را `awaiting_license` کند و در
   صف تحویل دیده شود.

اگر درگاه غیرفعال یا بدون توکن باشد، خریدار پیام `payment_not_available`
(«به‌زودی فعال می‌شود») می‌گیرد و هیچ سفارشی ساخته نمی‌شود.

## تست‌ها

```bash
npm run test            # Vitest + PGlite (بدون نیاز به PostgreSQL)
npm run typecheck:tests
```

تست‌ها شامل موتور تخفیف، قرارداد کلاینت PayPing با fetch ساختگی، مبلغ از
پایگاه داده، idempotency، مبلغ ناهمخوان، تایید پس از انقضا، نبود توکن،
آخرین ظرفیت کد تخفیف، چرخه‌ی انقضا، ثبت اتمیک لایسنس، کلید تکراری،
ایمیل در outbox، دسترسی غیرمجاز به لایسنس/سفارش دیگران، نبود کلید در
فهرست‌ها و لاگ‌ها، نبود توکن PayPing در پاسخ‌ها و مسیرهای HTTP (CSRF، نقش
مدیر، callback درگاه) هستند. آزمون‌ها با PGlite و بدون PostgreSQL اجرا
می‌شوند و همه‌ی migrationها از جمله `0002` را اعمال می‌کنند.

## پایگاه داده

Schema در `src/db/schema.ts` و migrationها در `drizzle/0000_initial.sql`،
`drizzle/0001_orders_payments.sql` و `drizzle/0002_fulfillment_panel.sql`
هستند. اجرای migration با اسکریپت `src/db/migrate.ts` و جدول
`__migrations` انجام می‌شود (هر فایل در یک تراکنش) و هر فایل فقط یک‌بار
اجرا می‌شود. migrationها دست‌نویس و شماره‌دارند؛ فایل تازه را با شماره‌ی بعدی
و SQL سازگار با PostgreSQL 16 اضافه کنید و پیش از استقرار روی یک پایگاه
آزمایشی اجرا کنید.

## صندوق ایمیل

`email_outbox` منبع حقیقت ایمیل‌هاست. API فقط ردیف `pending` را در تراکنش
همان عملیات ثبت می‌کند. worker با pg-boss هر دقیقه صف را پردازش می‌کند،
ردیف‌ها را با `FOR UPDATE SKIP LOCKED` برمی‌دارد و تا پنج تلاش با backoff
دوباره می‌فرستد. اگر worker وسط کار متوقف شود، ردیف‌های `sending` قدیمی
آزاد می‌شوند. همان worker صف‌های `orders.expire` و `orders.remind` را هم
اجرا می‌کند؛ یادآوری SLA ساعتی اجرا می‌شود و برای هر سفارش حداکثر یک ایمیل
در ۲۴ ساعت می‌سازد. جزئیات در بخش «ایمیل‌ها و job انقضا» آمده است.

## سلامت

- `GET /healthz` — liveness بدون وابستگی
- `GET /readyz` — بررسی اتصال PostgreSQL
