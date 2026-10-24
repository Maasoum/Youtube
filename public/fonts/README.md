# فونت پِیدا (Peyda)

فایل‌های فونت برند در همین پوشه قرار دارند و در `src/index.css` با `@font-face`
معرفی شده‌اند. Vite محتوای `public/` را بدون تغییر به ریشه‌ی build کپی می‌کند،
پس در production از مسیر `/fonts/...` سرو می‌شوند.

| فایل | وزن | استفاده |
| --- | --- | --- |
| `PeydaWeb-Regular.woff2` / `.woff` | ۴۰۰ | متن معمولی |
| `PeydaWeb-Bold.woff2` / `.woff` | ۷۰۰ | عنوان‌ها و تأکید |

- این پروژه فقط دو وزن ۴۰۰ و ۷۰۰ دارد؛ `font-synthesis: none` جلوی جعل وزن را
  می‌گیرد و کلاس‌های `font-medium`/`font-semibold` در Tailwind به همان ۴۰۰/۷۰۰
  نگاشت شده‌اند.
- فایل‌های `.ttf` و `.eot` فقط برای مرجع نگه داشته شده‌اند و در CSS استفاده
  نمی‌شوند؛ حذف آن‌ها حجم bundle را کم می‌کند.
- بررسی سریع پس از اجرا: `curl -I http://localhost:5173/fonts/PeydaWeb-Regular.woff2`
  باید `200` و `Content-Type: font/woff2` برگرداند. اگر ۴۰۴ دیدید، فایل‌ها در
  `public/fonts` نیستند یا build قدیمی است.
