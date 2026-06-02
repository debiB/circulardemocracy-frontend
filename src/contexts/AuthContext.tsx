import type { AuthResponse, User } from "@supabase/supabase-js";
import { AuthApiError } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import JmapClient from "jmap-cli";

const JMAP_TOKEN_KEY = "jmap_token";
const JMAP_REFRESH_TOKEN_KEY = "jmap_refresh_token";

function loadPersistedJmapToken(): string | null {
  try {
    return sessionStorage.getItem(JMAP_TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistJmapToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(JMAP_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(JMAP_TOKEN_KEY);
    }
  } catch {
    // storage full or unavailable — ignore
  }
}

function loadPersistedRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(JMAP_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistRefreshToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(JMAP_REFRESH_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(JMAP_REFRESH_TOKEN_KEY);
    }
  } catch {
    // storage full or unavailable — ignore
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    data: AuthResponse["data"] | null;
    error: AuthApiError | null;
  }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    data: AuthResponse["data"] | null;
    error: AuthApiError | null;
  }>;
  signInStalwart: () => Promise<{ error: AuthApiError | null }>;
  signOut: () => Promise<{ error: AuthApiError | null }>;
  jmapClient: JmapClient | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [jmapToken, setJmapToken] = useState<string | null>(
    () => loadPersistedJmapToken(),
  );
  const [jmapRefreshToken, setJmapRefreshToken] = useState<string | null>(
    () => loadPersistedRefreshToken(),
  );

  // Persist JMAP tokens to sessionStorage so they survive page reloads / tab switches
  useEffect(() => {
    persistJmapToken(jmapToken);
  }, [jmapToken]);

  useEffect(() => {
    persistRefreshToken(jmapRefreshToken);
  }, [jmapRefreshToken]);

  // Create the JmapClient instance when token and baseUrl are both available
  const jmapClient = useMemo<JmapClient | null>(() => {
    if (!jmapToken) return null;

    const jmapUrl = import.meta.env.VITE_JMAP_URL as string | undefined;
    if (!jmapUrl) {
      console.warn("VITE_JMAP_URL is not set; skipping JmapClient creation");
      return null;
    }

    return new JmapClient({
      baseUrl: jmapUrl,
      token: jmapToken,
      refreshToken: jmapRefreshToken ?? undefined,
    });
  }, [jmapToken, jmapRefreshToken]);

  // Main auth listener — also captures provider tokens on every auth event
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);

        // Capture provider tokens from any auth event (login, refresh, etc.)
        const token = session?.provider_token ?? null;
        if (token) {
          setJmapToken(token);
          setJmapRefreshToken(session?.provider_refresh_token ?? null);
        }
        // If the session has no provider_token, keep whatever we already have
      },
    );

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
      const token = session?.provider_token ?? null;
      if (token) {
        setJmapToken(token);
        setJmapRefreshToken(session?.provider_refresh_token ?? null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInStalwart = async () => {
    if (!supabase) {
      return { data: null, error: null };
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "custom:stalwart",
      options: {
        scopes: "openid email profile",
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { data, error: error instanceof AuthApiError ? error : null };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error: error instanceof AuthApiError ? error : null };
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: null };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error: error instanceof AuthApiError ? error : null };
  };

  const signOut = async () => {
    if (!supabase) {
      return { error: null };
    }
    await supabase.auth.signOut();
    // Clear JMAP tokens on explicit logout
    setJmapToken(null);
    setJmapRefreshToken(null);
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signInStalwart,
        signUp,
        signOut,
        jmapClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
