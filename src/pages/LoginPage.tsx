import { AuthApiError } from "@supabase/supabase-js";
import type React from "react";
import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLegacyForm, setShowLegacyForm] = useState(false);
  const { signIn, signInStalwart, user } = useAuth();

  // Basic redirection if user is already logged in
  if (user) {
    return <p>Redirecting...</p>;
  }

  const handleOAuthLogin = async () => {
    setLoading(true);
    setError(null);
    const { error: oauthError } = await signInStalwart();
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const handleLegacySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await signIn(email, password);
      if (signInError) throw signInError;
      console.log("Logged in successfully!", data);
    } catch (err: unknown) {
      if (err instanceof AuthApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during sign-in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout centerContent={true} standalone={true}>
      <div className="flex flex-col items-center gap-4">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-primary text-center">
              Authentication needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {!showLegacyForm ? (
              <Button
                type="button"
                className="w-full"
                disabled={loading}
                onClick={handleOAuthLogin}
              >
                {loading ? "Redirecting..." : "Login"}
              </Button>
            ) : (
              <form onSubmit={handleLegacySubmit} className="space-y-4">
                <Input
                  id="email"
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <Input
                  id="password"
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    className="underline hover:text-primary cursor-pointer"
                    onClick={() => setShowLegacyForm(false)}
                  >
                    back to OAuth login
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {!showLegacyForm && (
          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="underline hover:text-primary cursor-pointer"
              onClick={() => setShowLegacyForm(true)}
            >
              legacy login
            </button>
          </p>
        )}
      </div>
    </PageLayout>
  );
}
