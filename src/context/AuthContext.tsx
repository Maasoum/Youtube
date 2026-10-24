import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authApi,
  type AuthSession,
  type LoginInput,
  type RegisterInput,
  type User,
} from "@/api";

export interface RegisterOutcome {
  /** حساب ساخته شده اما تا تأیید ایمیل، نشستی باز نمی‌شود. */
  pendingVerification: boolean;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /**
   * نتیجه‌ی ورود را برمی‌گرداند تا صفحه بتواند مرحله‌ی کد دومرحله‌ای را
   * تشخیص دهد؛ تا تأیید آن، کاربر واردشده حساب نمی‌شود.
   */
  login: (input: LoginInput) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<RegisterOutcome>;
  logout: () => Promise<void>;
  /** به‌روزرسانی کاربر از نشست، بعد از ویرایش پروفایل. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    authApi
      .getSession()
      .then((session) => {
        // مدیرِ بدون تأیید TOTP وارد پنل نمی‌شود؛ صفحه‌ی ورود کد را می‌گیرد.
        if (active) setUser(session && !session.totpRequired ? session.user : null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await authApi.login(input);
    setUser(session.totpRequired ? null : session.user);
    return session;
  }, []);

  const register = useCallback(
    async (input: RegisterInput): Promise<RegisterOutcome> => {
      const session = await authApi.register(input);
      if (session.pendingVerification) {
        // سرور واقعی پس از ثبت‌نام نشست نمی‌سازد؛ کاربر باید ایمیل را تأیید کند.
        setUser(null);
        return {
          pendingVerification: true,
          message: session.message,
        };
      }
      setUser(session.user);
      return { pendingVerification: false };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const session = await authApi.getSession();
    setUser(session?.user ?? null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth باید داخل AuthProvider استفاده شود.");
  }
  return context;
}
