export interface ErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (
  message: string,
  code = "bad_request",
  fields?: Record<string, string>,
) => new AppError(400, code, message, fields);

export const unauthorized = (
  message = "برای ادامه باید وارد حساب شوید.",
  code = "unauthorized",
) => new AppError(401, code, message);

export const forbidden = (
  message = "اجازه‌ی انجام این کار را ندارید.",
  code = "forbidden",
) => new AppError(403, code, message);

export const notFound = (message = "موردی پیدا نشد.", code = "not_found") =>
  new AppError(404, code, message);

export const conflict = (message: string, code = "conflict") =>
  new AppError(409, code, message);

export const tooManyRequests = (
  message = "تلاش‌های زیاد؛ کمی بعد دوباره تلاش کنید.",
  code = "rate_limited",
) => new AppError(429, code, message);

export const payloadTooLarge = () =>
  new AppError(413, "payload_too_large", "حجم درخواست بیش از حد مجاز است.");

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function errorBody(
  code: string,
  message: string,
  fields?: Record<string, string>,
): ErrorBody {
  return {
    error: {
      code,
      message,
      ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
    },
  };
}
