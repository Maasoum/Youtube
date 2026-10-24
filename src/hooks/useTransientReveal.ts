import { useCallback, useEffect, useRef, useState } from "react";

/**
 * نگه‌داری موقت داده‌ی حساس (مثل کلید کامل لایسنس) در state کامپوننت.
 *
 * - مقدار فقط در حافظه‌ی React می‌ماند و در هیچ storage یا متغیر سراسری
 *   ذخیره نمی‌شود.
 * - هر بار «نمایش»، شمارش معکوس از نو شروع می‌شود و پس از پایان آن مقدار
 *   خودکار پاک می‌شود.
 * - با unmount شدن کامپوننت هم مقدار دور ریخته می‌شود.
 */
export const REVEAL_TTL_MS = 60_000;

export interface TransientRevealOptions {
  ttlMs?: number;
  /** پس از پاک‌شدن خودکار اجرا می‌شود (مثلاً برای اطلاع‌رسانی). */
  onExpire?: () => void;
}

export interface TransientReveal<T> {
  value: T | null;
  show: (value: T) => void;
  hide: () => void;
  /** ثانیه‌های باقی‌مانده تا پاک‌شدن خودکار؛ صفر یعنی چیزی نمایش داده نمی‌شود. */
  remainingSeconds: number;
}

export function useTransientReveal<T>(
  options: TransientRevealOptions = {},
): TransientReveal<T> {
  const ttlMs = options.ttlMs ?? REVEAL_TTL_MS;
  const onExpireRef = useRef(options.onExpire);
  onExpireRef.current = options.onExpire;

  const [value, setValue] = useState<T | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const hide = useCallback(() => {
    setValue(null);
    setExpiresAt(null);
    setRemainingSeconds(0);
  }, []);

  const show = useCallback(
    (next: T) => {
      setValue(next);
      setExpiresAt(Date.now() + ttlMs);
      setRemainingSeconds(Math.ceil(ttlMs / 1000));
    },
    [ttlMs],
  );

  useEffect(() => {
    if (expiresAt === null) return;

    const tick = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setValue(null);
        setExpiresAt(null);
        setRemainingSeconds(0);
        onExpireRef.current?.();
        return;
      }
      setRemainingSeconds(Math.ceil(remaining / 1000));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => () => setValue(null), []);

  return { value, show, hide, remainingSeconds };
}
