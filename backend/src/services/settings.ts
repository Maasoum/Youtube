import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { siteSettings, type UserRow } from "../db/schema.js";
import type { AppDb } from "../db/types.js";
import { writeAudit } from "./audit.js";

export interface FooterSettings {
  about: string;
  email: string;
  phone: string;
  address: string;
}

export interface TrustBadgeSettings {
  enabled: boolean;
  label: string;
  url: string;
  code: string;
}

export interface GeneralSettings {
  fulfillmentSlaHours: number;
  includeLicenseKeyInEmail: boolean;
  taxPercent: number;
  footer: FooterSettings;
  trustBadge: TrustBadgeSettings;
  updatedAt: string | null;
}

export interface PublicSiteSettings {
  fulfillmentSlaHours: number;
  taxPercent: number;
  footer: FooterSettings;
  trustBadge: TrustBadgeSettings;
}

export const DEFAULT_GENERAL_SETTINGS = {
  fulfillmentSlaHours: 24,
  includeLicenseKeyInEmail: false,
  taxPercent: 0,
  footer: {
    about: "",
    email: "",
    phone: "",
    address: "",
  },
  trustBadge: {
    enabled: false,
    label: "نماد اعتماد الکترونیکی",
    url: "",
    code: "",
  },
} as const;

type RawGeneral = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asTaxPercent(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(30, Math.max(0, Math.round(value * 10) / 10));
}

function asNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * تنظیمات در یک ستون JSON ذخیره می‌شوند؛ این تابع مقدار ناقص/قدیمی را با
 * پیش‌فرض‌ها کامل می‌کند تا خواندن هرگز خطا ندهد.
 */
export function parseGeneralSettings(raw: unknown): Omit<GeneralSettings, "updatedAt"> {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as RawGeneral;
  const footerRaw = (
    typeof source.footer === "object" && source.footer !== null
      ? source.footer
      : {}
  ) as RawGeneral;
  const badgeRaw = (
    typeof source.trustBadge === "object" && source.trustBadge !== null
      ? source.trustBadge
      : {}
  ) as RawGeneral;

  return {
    fulfillmentSlaHours: asNumber(
      source.fulfillmentSlaHours,
      DEFAULT_GENERAL_SETTINGS.fulfillmentSlaHours,
      1,
      168,
    ),
    includeLicenseKeyInEmail: asBoolean(
      source.includeLicenseKeyInEmail,
      DEFAULT_GENERAL_SETTINGS.includeLicenseKeyInEmail,
    ),
    taxPercent: asTaxPercent(
      source.taxPercent,
      DEFAULT_GENERAL_SETTINGS.taxPercent,
    ),
    footer: {
      about: asString(footerRaw.about, DEFAULT_GENERAL_SETTINGS.footer.about),
      email: asString(footerRaw.email, DEFAULT_GENERAL_SETTINGS.footer.email),
      phone: asString(footerRaw.phone, DEFAULT_GENERAL_SETTINGS.footer.phone),
      address: asString(
        footerRaw.address,
        DEFAULT_GENERAL_SETTINGS.footer.address,
      ),
    },
    trustBadge: {
      enabled: asBoolean(
        badgeRaw.enabled,
        DEFAULT_GENERAL_SETTINGS.trustBadge.enabled,
      ),
      label: asString(
        badgeRaw.label,
        DEFAULT_GENERAL_SETTINGS.trustBadge.label,
      ),
      url: asString(badgeRaw.url, DEFAULT_GENERAL_SETTINGS.trustBadge.url),
      code: asString(badgeRaw.code, DEFAULT_GENERAL_SETTINGS.trustBadge.code),
    },
  };
}

async function loadRow(
  executor: AppDb,
): Promise<{ general: RawGeneral; updatedAt: Date } | null> {
  const [row] = await executor
    .select({ general: siteSettings.general, updatedAt: siteSettings.updatedAt })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  if (!row) return null;
  return {
    general: (row.general ?? {}) as RawGeneral,
    updatedAt: row.updatedAt,
  };
}

export async function getGeneralSettings(
  executor: AppDb = db,
): Promise<GeneralSettings> {
  const row = await loadRow(executor);
  return {
    ...parseGeneralSettings(row?.general ?? {}),
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
}

export async function getPublicSiteSettings(
  executor: AppDb = db,
): Promise<PublicSiteSettings> {
  const settings = await getGeneralSettings(executor);
  return {
    fulfillmentSlaHours: settings.fulfillmentSlaHours,
    taxPercent: settings.taxPercent,
    footer: settings.footer,
    trustBadge: settings.trustBadge,
  };
}

export async function updateGeneralSettings(
  params: {
    input: Omit<GeneralSettings, "updatedAt">;
    actor: UserRow;
    request?: { ip?: string; userAgent?: string };
  },
  executor: AppDb = db,
): Promise<GeneralSettings> {
  const clean = parseGeneralSettings(params.input);

  await executor
    .insert(siteSettings)
    .values({
      id: 1,
      general: clean,
      updatedBy: params.actor.id,
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        general: clean,
        updatedBy: params.actor.id,
        updatedAt: new Date(),
      },
    });

  await writeAudit(
    {
      actor: { id: params.actor.id, name: params.actor.fullName },
      action: "settings.general_updated",
      entityType: "site_settings",
      entityId: "1",
      summary: "تنظیمات عمومی سایت به‌روزرسانی شد.",
      details: {
        fulfillmentSlaHours: clean.fulfillmentSlaHours,
        includeLicenseKeyInEmail: clean.includeLicenseKeyInEmail,
        taxPercent: clean.taxPercent,
      },
      request: params.request,
    },
    executor,
  );

  return getGeneralSettings(executor);
}

export async function includeLicenseKeyInEmail(
  executor: AppDb = db,
): Promise<boolean> {
  const settings = await getGeneralSettings(executor);
  return settings.includeLicenseKeyInEmail;
}

export async function fulfillmentSlaHours(
  executor: AppDb = db,
): Promise<number> {
  const settings = await getGeneralSettings(executor);
  return settings.fulfillmentSlaHours;
}
