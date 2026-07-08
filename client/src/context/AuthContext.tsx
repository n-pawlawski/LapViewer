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
  fetchAuthConfig,
  fetchHealth,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  type AuthUser,
  type LoginRequest,
} from "../api/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  devUserMode: boolean;
  googleAuthEnabled: boolean;
  login: (body: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [devUserMode, setDevUserMode] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [health, config, me] = await Promise.all([
        fetchHealth(),
        fetchAuthConfig(),
        fetchMe(),
      ]);
      setDevUserMode(health.devUserMode);
      setGoogleAuthEnabled(config.googleAuthEnabled);
      if (me) {
        setUser(me);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (body: LoginRequest) => {
    const loggedIn = await apiLogin(body);
    setUser(loggedIn);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, devUserMode, googleAuthEnabled, login, logout, refresh }),
    [status, user, devUserMode, googleAuthEnabled, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
