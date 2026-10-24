/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** با مقدار "true" adapter ساختگی در توسعه فعال می‌شود. */
  readonly VITE_USE_MOCK?: string;
  /** پیشوند API؛ پیش‌فرض `/api/v1`. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
