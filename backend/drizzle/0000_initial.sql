-- BrightPaths initial schema (PostgreSQL 16)
-- This migration is applied once by src/db/migrate.ts inside a transaction.

CREATE TYPE "user_role" AS ENUM ('admin', 'user');
CREATE TYPE "order_status" AS ENUM (
  'pending', 'awaiting_license', 'fulfilled', 'on_hold',
  'failed', 'cancelled', 'expired', 'refunded'
);
CREATE TYPE "license_status" AS ENUM ('active', 'revoked');
CREATE TYPE "license_source" AS ENUM ('purchase', 'admin_gift');
CREATE TYPE "discount_type" AS ENUM ('percent', 'fixed');
CREATE TYPE "redemption_status" AS ENUM ('reserved', 'redeemed', 'released');
CREATE TYPE "email_status" AS ENUM ('pending', 'sending', 'sent', 'failed');
CREATE TYPE "content_status" AS ENUM ('draft', 'published');
CREATE TYPE "message_status" AS ENUM ('new', 'read', 'done');
CREATE TYPE "teacher_accent" AS ENUM ('lavender', 'yellow', 'sky', 'coral');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "full_name" text NOT NULL,
  "phone" text,
  "role" "user_role" NOT NULL DEFAULT 'user',
  "email_verified_at" timestamptz,
  "totp_secret_encrypted" text,
  "totp_enabled_at" timestamptz,
  "totp_last_used_at" timestamptz,
  "failed_login_attempts" integer NOT NULL DEFAULT 0,
  "locked_until" timestamptz,
  "disabled_at" timestamptz,
  "disabled_reason" text,
  "password_changed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" (lower("email"));
CREATE INDEX "users_role_idx" ON "users" ("role");
CREATE INDEX "users_disabled_idx" ON "users" ("disabled_at");

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "totp_verified" boolean NOT NULL DEFAULT false,
  "ip" text,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_seen_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz
);
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "sessions" ("token_hash");
CREATE INDEX "sessions_user_idx" ON "sessions" ("user_id");
CREATE INDEX "sessions_expires_idx" ON "sessions" ("expires_at");

CREATE TABLE "password_resets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "requested_ip" text,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "password_resets_token_hash_uq" ON "password_resets" ("token_hash");
CREATE INDEX "password_resets_user_idx" ON "password_resets" ("user_id");
CREATE INDEX "password_resets_expires_idx" ON "password_resets" ("expires_at");

CREATE TABLE "email_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "email_verifications_token_hash_uq" ON "email_verifications" ("token_hash");
CREATE INDEX "email_verifications_user_idx" ON "email_verifications" ("user_id");
CREATE INDEX "email_verifications_expires_idx" ON "email_verifications" ("expires_at");

CREATE TABLE "courses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "age_min" integer NOT NULL,
  "age_max" integer NOT NULL,
  "provider_name" text NOT NULL,
  "provider_site_url" text,
  "activation_url" text,
  "activation_instructions" text,
  "price_toman" bigint NOT NULL,
  "compare_at_price_toman" bigint,
  "is_published" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "courses_age_range_chk" CHECK ("age_min" <= "age_max"),
  CONSTRAINT "courses_age_positive_chk" CHECK ("age_min" >= 3 AND "age_max" <= 99),
  CONSTRAINT "courses_price_nonnegative_chk" CHECK ("price_toman" >= 0)
);
CREATE UNIQUE INDEX "courses_slug_uq" ON "courses" ("slug");
CREATE INDEX "courses_published_idx" ON "courses" ("is_published");

CREATE TABLE "discount_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL,
  "type" "discount_type" NOT NULL,
  "percent" integer,
  "amount_toman" bigint,
  "min_total_toman" bigint NOT NULL DEFAULT 0,
  "max_uses" integer,
  "used_count" integer NOT NULL DEFAULT 0,
  "per_user_limit" integer NOT NULL DEFAULT 1,
  "allow_free" boolean NOT NULL DEFAULT false,
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "discount_codes_type_value_chk" CHECK (
    ("type" = 'percent' AND "percent" BETWEEN 1 AND 100 AND "amount_toman" IS NULL)
    OR
    ("type" = 'fixed' AND "amount_toman" > 0 AND "percent" IS NULL)
  )
);
CREATE UNIQUE INDEX "discount_codes_code_uq" ON "discount_codes" (upper("code"));
CREATE INDEX "discount_codes_active_idx" ON "discount_codes" ("is_active");

CREATE TABLE "discount_code_courses" (
  "discount_code_id" uuid NOT NULL REFERENCES "discount_codes" ("id") ON DELETE CASCADE,
  "course_id" uuid NOT NULL REFERENCES "courses" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "discount_code_courses_uq" ON "discount_code_courses" ("discount_code_id", "course_id");

CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" serial NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "course_id" uuid NOT NULL REFERENCES "courses" ("id") ON DELETE RESTRICT,
  "title_snapshot" text NOT NULL,
  "unit_price_snapshot" bigint NOT NULL,
  "discount_code_id" uuid REFERENCES "discount_codes" ("id") ON DELETE SET NULL,
  "discount_toman" bigint NOT NULL DEFAULT 0,
  "total_toman" bigint NOT NULL,
  "status" "order_status" NOT NULL DEFAULT 'pending',
  "client_ref_id" text NOT NULL,
  "payment_code" text,
  "expires_at" timestamptz,
  "paid_at" timestamptz,
  "fulfilled_at" timestamptz,
  "on_hold_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "orders_total_nonnegative_chk" CHECK ("total_toman" >= 0),
  CONSTRAINT "orders_discount_nonnegative_chk" CHECK (
    "discount_toman" >= 0 AND "discount_toman" <= "unit_price_snapshot"
  )
);
CREATE UNIQUE INDEX "orders_number_uq" ON "orders" ("number");
CREATE UNIQUE INDEX "orders_client_ref_uq" ON "orders" ("client_ref_id");
CREATE INDEX "orders_user_idx" ON "orders" ("user_id", "created_at");
CREATE INDEX "orders_course_idx" ON "orders" ("course_id");
CREATE INDEX "orders_status_idx" ON "orders" ("status");
CREATE INDEX "orders_payment_code_idx" ON "orders" ("payment_code");

CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
  "code" text,
  "ref_id" text NOT NULL,
  "card_number_masked" text,
  "card_hash_pan" text,
  "raw_response" jsonb,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "payments_ref_id_uq" ON "payments" ("ref_id");
CREATE INDEX "payments_order_idx" ON "payments" ("order_id");
CREATE INDEX "payments_code_idx" ON "payments" ("code");

CREATE TABLE "licenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "course_id" uuid NOT NULL REFERENCES "courses" ("id") ON DELETE RESTRICT,
  "order_id" uuid NOT NULL REFERENCES "orders" ("id") ON DELETE RESTRICT,
  "payload_encrypted" text NOT NULL,
  "key_fingerprint" text NOT NULL,
  "status" "license_status" NOT NULL DEFAULT 'active',
  "source" "license_source" NOT NULL DEFAULT 'purchase',
  "delivered_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "delivered_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz,
  "revoked_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "licenses_revoked_fields_chk" CHECK (
    ("status" = 'revoked' AND "revoked_at" IS NOT NULL)
    OR
    ("status" = 'active' AND "revoked_at" IS NULL)
  )
);
CREATE UNIQUE INDEX "licenses_order_uq" ON "licenses" ("order_id");
CREATE UNIQUE INDEX "licenses_active_user_course_uq"
  ON "licenses" ("user_id", "course_id") WHERE "status" = 'active';
CREATE INDEX "licenses_fingerprint_idx" ON "licenses" ("key_fingerprint");
CREATE INDEX "licenses_user_idx" ON "licenses" ("user_id");
CREATE INDEX "licenses_course_idx" ON "licenses" ("course_id");

CREATE TABLE "discount_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "discount_code_id" uuid NOT NULL REFERENCES "discount_codes" ("id") ON DELETE RESTRICT,
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "order_id" uuid NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
  "status" "redemption_status" NOT NULL DEFAULT 'reserved',
  "reserved_at" timestamptz NOT NULL DEFAULT now(),
  "redeemed_at" timestamptz,
  "released_at" timestamptz,
  CONSTRAINT "discount_redemptions_dates_chk" CHECK (
    ("status" <> 'redeemed' OR "redeemed_at" IS NOT NULL)
    AND
    ("status" <> 'released' OR "released_at" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "discount_redemptions_order_uq" ON "discount_redemptions" ("order_id");
CREATE INDEX "discount_redemptions_code_user_idx" ON "discount_redemptions" ("discount_code_id", "user_id");

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'system',
  "href" text,
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "notifications_user_idx" ON "notifications" ("user_id", "created_at");

CREATE TABLE "email_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "to_email" text NOT NULL,
  "subject" text NOT NULL,
  "template" text NOT NULL,
  "body_text" text NOT NULL,
  "body_html" text,
  "status" "email_status" NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "scheduled_at" timestamptz NOT NULL DEFAULT now(),
  "sent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "email_outbox_dispatch_idx" ON "email_outbox" ("status", "scheduled_at");
CREATE INDEX "email_outbox_created_idx" ON "email_outbox" ("created_at");

CREATE TABLE "payment_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "token_encrypted" text,
  "is_active" boolean NOT NULL DEFAULT false,
  "updated_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_settings_singleton_chk" CHECK ("id" = 1)
);

CREATE TABLE "site_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "general" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "site_settings_singleton_chk" CHECK ("id" = 1)
);

CREATE TABLE "blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "excerpt" text NOT NULL,
  "body" text NOT NULL,
  "category" text NOT NULL,
  "author" text NOT NULL,
  "read_minutes" integer NOT NULL DEFAULT 5,
  "art" text,
  "status" "content_status" NOT NULL DEFAULT 'draft',
  "published_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "blog_posts_read_minutes_chk" CHECK ("read_minutes" BETWEEN 1 AND 90)
);
CREATE UNIQUE INDEX "blog_posts_slug_uq" ON "blog_posts" ("slug");
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" ("status", "published_at");

CREATE TABLE "contact_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "status" "message_status" NOT NULL DEFAULT 'new',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" ("status", "created_at");

CREATE TABLE "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "full_name" text NOT NULL,
  "contact" text NOT NULL,
  "source" text NOT NULL DEFAULT 'site',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "leads_created_idx" ON "leads" ("created_at");

CREATE TABLE "faqs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "faqs_order_idx" ON "faqs" ("is_active", "sort_order");

CREATE TABLE "teachers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "role" text NOT NULL,
  "bio" text NOT NULL,
  "initials" text NOT NULL,
  "accent" "teacher_accent" NOT NULL DEFAULT 'lavender',
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "teachers_order_idx" ON "teachers" ("is_active", "sort_order");

CREATE TABLE "audit_logs" (
  "id" bigserial PRIMARY KEY,
  "actor_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "actor_name" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "summary" text NOT NULL,
  "details" jsonb,
  "ip" text,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" ("created_at");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" ("action", "created_at");
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" ("actor_id", "created_at");

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER courses_set_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER discount_codes_set_updated_at BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER licenses_set_updated_at BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER email_outbox_set_updated_at BEFORE UPDATE ON email_outbox
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_settings_set_updated_at BEFORE UPDATE ON payment_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER site_settings_set_updated_at BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER contact_messages_set_updated_at BEFORE UPDATE ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER faqs_set_updated_at BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER teachers_set_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
