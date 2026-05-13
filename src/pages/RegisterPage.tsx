import { AuthApiError } from "@supabase/supabase-js"; // Import AuthApiError
import type React from "react";
import { useState } from "react";
import { PageLayout } from "@/components/PageLayout"; // Import PageLayout
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp, user } = useAuth();

  // Basic redirection if user is already logged in
  if (user) {
    // In a real application, you'd use a router like react-router-dom
    // navigate('/');
    return <p>Redirecting...</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await signUp(email, password);
      if (signUpError) throw signUpError;
      // Handle successful registration, e.g., show a success message or redirect
      console.log("Registered successfully!", data);
    } catch (err: unknown) {
      // Use unknown for initial error type
      if (err instanceof AuthApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during sign-up.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout centerContent={true} standalone={true}>
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-primary text-center">Register</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
