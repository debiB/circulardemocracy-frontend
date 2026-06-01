import type { AuthResponse, User } from "@supabase/supabase-js";
import { AuthApiError } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import JmapClient from "jmap-cli";

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
  const [jmapToken, setJmapToken] = useState<string | null>(null);

  // Extract JMAP token from the Supabase session whenever user/auth changes
  useEffect(() => {
    if (!supabase) return;

    const updateJmapToken = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.provider_token ?? null;
      setJmapToken(token);
    };

    updateJmapToken();
  }, [user]);

  // Create the JmapClient instance when token and baseUrl are both available
  const jmapClient = useMemo<JmapClient | null>(() => {
    if (!jmapToken) return null;

    const jmapUrl = import.meta.env.VITE_JMAP_URL as string | undefined;
    if (!jmapUrl) {
      console.warn("VITE_JMAP_URL is not set; skipping JmapClient creation");
      return null;
    }

    return new JmapClient({ baseUrl: jmapUrl, token: jmapToken });
  }, [jmapToken]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      },
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
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
        scopes: "openid email profile", // Requests full OIDC context from Stalwart
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
    const { error } = await supabase.auth.signOut();
    return { error: error instanceof AuthApiError ? error : null };
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
