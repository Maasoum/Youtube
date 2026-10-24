import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, type UserRow } from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { AppError } from "../lib/errors.js";
import { toPublicUser, type PublicUser } from "../types/auth.js";
import { writeAudit } from "./audit.js";
import { queueAccountDeletionAlert } from "./email.js";

export interface AccountMeta {
  ip?: string;
  userAgent?: string;
}

export async function updateProfile(
  params: {
    userId: string;
    fullName: string;
    phone?: string;
    meta?: AccountMeta;
  },
  executor: AppDb = db,
): Promise<PublicUser> {
  const [row] = await executor
    .update(users)
    .set({
      fullName: params.fullName,
      phone: params.phone && params.phone.length > 0 ? params.phone : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.userId))
    .returning();

  if (!row) {
    throw new AppError(404, "user_not_found", "حساب کاربری پیدا نشد.");
  }

  await writeAudit(
    {
      actor: { id: row.id, name: row.fullName },
      action: "account.profile_updated",
      entityType: "user",
      entityId: row.id,
      summary: "اطلاعات پروفایل کاربر به‌روزرسانی شد.",
      request: params.meta,
    },
    executor,
  );

  return toPublicUser(row);
}

export interface DeletionReceipt {
  message: string;
  requestedAt: string;
}

/**
 * درخواست حذف حساب فقط ثبت می‌شود؛ حذف واقعی پس از بررسی پشتیبانی انجام
 * می‌شود تا سوابق مالی و حسابرسی از بین نرود.
 */
export async function requestAccountDeletion(
  params: {
    user: UserRow;
    reason?: string;
    meta?: AccountMeta;
  },
  executor: AppDb = db,
): Promise<DeletionReceipt> {
  const now = params.user.deletionRequestedAt ?? new Date();

  const [row] = await executor
    .update(users)
    .set({
      deletionRequestedAt: now,
      deletionReason: params.reason?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.user.id))
    .returning();

  if (!row) {
    throw new AppError(404, "user_not_found", "حساب کاربری پیدا نشد.");
  }

  const alreadyRequested = params.user.deletionRequestedAt !== null;

  if (!alreadyRequested) {
    await queueAccountDeletionAlert(executor, {
      userId: row.id,
      fullName: row.fullName,
      email: row.email,
      reason: params.reason ?? null,
    });

    await writeAudit(
      {
        actor: { id: row.id, name: row.fullName },
        action: "account.deletion_requested",
        entityType: "user",
        entityId: row.id,
        summary: "درخواست حذف حساب ثبت شد و در انتظار بررسی است.",
        request: params.meta,
      },
      executor,
    );
  }

  return {
    message: alreadyRequested
      ? "درخواست حذف حساب شما قبلاً ثبت شده و در حال بررسی است."
      : "درخواست حذف حساب ثبت شد. تیم پشتیبانی پیش از حذف با شما هماهنگ می‌کند.",
    requestedAt: now.toISOString(),
  };
}
