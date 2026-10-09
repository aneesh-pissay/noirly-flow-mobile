import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { NoirlySession } from "@noirly-dev/identity-mobile";
import { configureIdentity, NoirlyIdentity, restoreSession } from "./identity";
import { setMe } from "./useMe";

type AuthContextValue = {
  session: NoirlySession | null;
  loading: boolean;
  setSession: (session: NoirlySession | null) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<NoirlySession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configureIdentity();
    void restoreSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  const signOut = useCallback(async () => {
    await NoirlyIdentity.signOut();
    setMe(null);
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    const next = await NoirlyIdentity.getSession();
    setSession(next);
  }, []);

  const value = useMemo(
    () => ({ session, loading, setSession, signOut, refresh }),
    [session, loading, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
