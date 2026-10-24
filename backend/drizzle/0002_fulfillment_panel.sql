-- مرحله ۴پ: تحویل لایسنس، پنل‌ها، ایمیل‌ها و اعلان‌ها
-- این فایل فقط ستون‌های تازه را اضافه می‌کند و داده‌ی موجود را دست نمی‌زند.

CREATE TYPE "order_source" AS ENUM ('purchase', 'gift');
CREATE TYPE "course_level" AS ENUM ('beginner', 'intermediate', 'advanced');

ALTER TABLE "users"
  ADD COLUMN "deletion_requested_at" timestamp with time zone,
  ADD COLUMN "deletion_reason" text;

ALTER TABLE "courses"
  ADD COLUMN "tagline" text NOT NULL DEFAULT '',
  ADD COLUMN "level" "course_level" NOT NULL DEFAULT 'beginner',
  ADD COLUMN "duration_weeks" integer NOT NULL DEFAULT 6,
  ADD COLUMN "sessions" integer NOT NULL DEFAULT 12,
  ADD COLUMN "outcomes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "syllabus" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "faqs" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "art" text,
  ADD COLUMN "badge" text,
  ADD COLUMN "popular" boolean NOT NULL DEFAULT false,
  ADD COLUMN "featured" boolean NOT NULL DEFAULT false;

ALTER TABLE "orders"
  ADD COLUMN "source" "order_source" NOT NULL DEFAULT 'purchase',
  ADD COLUMN "tax_percent" numeric(4, 1) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_toman" bigint NOT NULL DEFAULT 0,
  ADD COLUMN "note" text,
  ADD COLUMN "cancel_reason" text,
  ADD COLUMN "refund_reason" text,
  ADD COLUMN "refund_reference" text,
  ADD COLUMN "refunded_at" timestamp with time zone;

ALTER TABLE "licenses"
  ADD COLUMN "email_sent_at" timestamp with time zone,
  ADD COLUMN "key_last4" text;

ALTER TABLE "email_outbox"
  ADD COLUMN "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_tax_nonnegative_chk" CHECK ("tax_toman" >= 0),
  ADD CONSTRAINT "orders_tax_percent_range_chk"
  CHECK ("tax_percent" >= 0 AND "tax_percent" <= 30);

CREATE INDEX "email_outbox_order_idx"
  ON "email_outbox" ("order_id", "template", "created_at");

CREATE INDEX "notifications_unread_idx"
  ON "notifications" ("user_id", "read_at");
