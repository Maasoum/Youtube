import { ApiError, type ApiErrorField } from "./types";

/**
 * کلاینت HTTP مشترک برای API واقعی.
 *
 * - همه‌ی درخواست‌ها با کوکی نشست (`credentials: "include"`) ارسال می‌شوند؛
 *   هیچ توکنی در localStorage، sessionStorage یا state ماندگار نیست.
 * - برای متدهای غیر امن، توکن CSRF از `GET /auth/csrf` گرفته و در هدر
 *   `x-csrf-token` فرستاده می‌شود. توکن فقط در حافظه‌ی همین ماژول می‌ماند.
 * - خطاها به `ApiError` فارسی تبدیل می‌شوند تا لایه‌ی UI یکسان رفتار کند.
 */

const RAW_BASE: unknown = import.meta.env.VITE_API_BASE;
export const API_BASE_URL: string = (
  typeof RAW_BASE === "string" && RAW_BASE.trim() !== ""
    ? RAW_BASE
    : "/api/v1"
).replace(/\/+$/, "");

export const CSRF_HEADER = "x-csrf-token";
const REQUEST_TIMEOUT_MS = 25_000;

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  /** برای درخواست‌هایی که پاسخ خالی (۲۰۴) دارند. */
  expectEmpty?: boolean;
}

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

const FIELDS: readonly ApiErrorField[] = [
  "email",
  "phone",
  "password",
  "fullName",
  "code",
  "licenseCode",
  "currentPassword",
  "newPassword",
  "confirmation",
  "reason",
  "title",
  "slug",
  "token",
  "question",
  "answer",
  "name",
  "role",
  "bio",
  "body",
  "general",
];

function asField(value: string | null | undefined): ApiErrorField | undefined {
  if (!value) return undefined;
  return (FIELDS as readonly string[]).includes(value)
    ? (value as ApiErrorField)
    : "general";
}

export function buildUrl(
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalized}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface ParsedError {
  code?: string;
  message?: string;
  field?: string;
}

function parseErrorBody(payload: unknown): ParsedError {
  if (!isRecord(payload)) return {};
  const error = payload.error;
  if (!isRecord(error)) return {};

  const code = typeof error.code === "string" ? error.code : undefined;
  const message =
    typeof error.message === "string" ? error.message : undefined;

  let field: string | undefined;
  if (isRecord(error.fields)) {
    const first = Object.entries(error.fields).find(
      ([, value]) => typeof value === "string" && value.trim() !== "",
    );
    if (first) field = first[0];
  }

  return { code, message, field };
}

function fallbackMessage(status: number): string {
  if (status === 400) return "اطلاعات ارسال‌شده معتبر نیست.";
  if (status === 401) return "نشست شما منقضی شده است؛ دوباره وارد شوید.";
  if (status === 403) return "اجازه‌ی انجام این کار را ندارید.";
  if (status === 404) return "موردی پیدا نشد.";
  if (status === 409) return "این درخواست با وضعیت فعلی هم‌خوانی ندارد.";
  if (status === 413) return "حجم درخواست بیش از حد مجاز است.";
  if (status === 422) return "اطلاعات واردشده قابل پردازش نیست.";
  if (status === 429) return "تعداد درخواست‌ها زیاد بود؛ کمی بعد تلاش کنید.";
  if (status >= 500) return "خطای سرور؛ لطفاً بعداً دوباره تلاش کنید.";
  return "مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید.";
}

async function fetchCsrfToken(force = false): Promise<string> {
  if (!force && csrfToken) return csrfToken;
  if (!force && csrfRequest) return csrfRequest;

  csrfRequest = (async () => {
    try {
      const response = await fetch(buildUrl("/auth/csrf"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new ApiError(
          fallbackMessage(response.status),
          "general",
          "csrf_unavailable",
        );
      }
      const payload: unknown = await response.json();
      const token = isRecord(payload) ? payload.csrfToken : undefined;
      if (typeof token !== "string" || token === "") {
        throw new ApiError(
          "اعتبار درخواست تأمین نشد؛ صفحه را تازه کنید.",
          "general",
          "csrf_unavailable",
        );
      }
      csrfToken = token;
      return token;
    } finally {
      csrfRequest = null;
    }
  })();

  return csrfRequest;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function requestJson<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const unsafe = !["GET", "HEAD"].includes(method.toUpperCase());
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (unsafe) {
    headers[CSRF_HEADER] = await fetchCsrfToken();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  const send = async (token?: string): Promise<Response> => {
    const attemptHeaders = { ...headers };
    if (token) attemptHeaders[CSRF_HEADER] = token;
    return fetch(buildUrl(path, options.query), {
      method,
      credentials: "include",
      headers: attemptHeaders,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  };

  let response: Response;
  try {
    response = await send();
    if (response.status === 403) {
      // توکن CSRF ممکن است در اثر بازسازی کوکی منقضی شده باشد؛ یک‌بار تازه
      // می‌شود و همان درخواست تکرار می‌گردد.
      const probe = await response.clone().json().catch(() => null);
      if (parseErrorBody(probe).code === "csrf_invalid" && unsafe) {
        const fresh = await fetchCsrfToken(true);
        response = await send(fresh);
      }
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError(
        "پاسخی از سرور دریافت نشد؛ ارتباط را بررسی و دوباره تلاش کنید.",
        "general",
        "timeout",
      );
    }
    throw new ApiError(
      "ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید.",
      "general",
      "network_error",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }

  if (response.status === 204 || options.expectEmpty) {
    if (!response.ok) {
      const payload = await readJson(response);
      const parsed = parseErrorBody(payload);
      throw new ApiError(
        parsed.message ?? fallbackMessage(response.status),
        asField(parsed.field),
        parsed.code,
      );
    }
    return undefined as T;
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const parsed = parseErrorBody(payload);
    throw new ApiError(
      parsed.message ?? fallbackMessage(response.status),
      asField(parsed.field),
      parsed.code,
    );
  }

  return payload as T;
}

export function apiGet<T>(
  path: string,
  query?: Record<string, QueryValue>,
  signal?: AbortSignal,
): Promise<T> {
  return requestJson<T>("GET", path, { query, signal });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  query?: Record<string, QueryValue>,
): Promise<T> {
  return requestJson<T>("POST", path, { body, query });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>("PUT", path, { body });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>("PATCH", path, { body });
}

export function apiDelete(path: string): Promise<void> {
  return requestJson<void>("DELETE", path, { expectEmpty: true });
}
