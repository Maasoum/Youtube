-- Stage 4B: order/payment internals, discount safeguards, gateway settings.

ALTER TABLE "discount_codes"
  ADD COLUMN "max_discount_toman" bigint,
  ADD COLUMN "first_purchase_only" boolean NOT NULL DEFAULT false;

ALTER TABLE "discount_codes"
  ADD CONSTRAINT "discount_codes_cap_positive_chk"
  CHECK ("max_discount_toman" IS NULL OR "max_discount_toman" > 0);

ALTER TABLE "payment_settings"
  ADD COLUMN "token_last4" text,
  ADD COLUMN "last_tested_at" timestamptz,
  ADD COLUMN "last_test_result" text;

ALTER TABLE "payment_settings"
  ADD CONSTRAINT "payment_settings_last_test_chk"
  CHECK ("last_test_result" IS NULL OR "last_test_result" IN ('success', 'failed'));

-- یک سفارش فقط می‌تواند یک پرداخت تاییدشده داشته باشد.
DROP INDEX IF EXISTS "payments_order_idx";
CREATE UNIQUE INDEX "payments_order_uq" ON "payments" ("order_id");

-- کد پرداخت درگاه باید یکتا باشد و سفارش‌های در جریان برای هر کاربر/دوره
-- فقط یکی باشند؛ این دو ایندکس جلوی پرداخت دوباره در شرایط رقابتی را می‌گیرند.
CREATE UNIQUE INDEX "orders_payment_code_uq" ON "orders" ("payment_code")
  WHERE "payment_code" IS NOT NULL;
CREATE UNIQUE INDEX "orders_active_user_course_uq" ON "orders" ("user_id", "course_id")
  WHERE "status" IN ('pending', 'awaiting_license', 'on_hold');

CREATE INDEX "orders_expiry_idx" ON "orders" ("expires_at")
  WHERE "status" = 'pending';

CREATE INDEX "discount_redemptions_status_idx" ON "discount_redemptions" ("status");
