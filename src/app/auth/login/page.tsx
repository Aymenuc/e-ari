"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";

// ─── Inner component (uses useSearchParams) ──────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/portal";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        // Redirect to the callback URL (e.g., /checkout?plan=professional) or default to portal
        router.push(callbackUrl);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-navy-800 border-border">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <img src="/logo.svg" alt="E-ARI" className="h-12 w-12 rounded-xl" />
        </div>
        <CardTitle className="font-heading text-xl">Sign In to E-ARI</CardTitle>
        <CardDescription className="text-muted-foreground font-sans">
          Access your assessments and readiness reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="font-sans text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-navy-700 border-border font-sans"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-sans text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-navy-700 border-border font-sans"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground font-sans">
            Don&apos;t have an account?{" "}
            <Link
              href={callbackUrl !== "/portal" ? `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/register"}
              className="text-eari-blue-light hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page wrapper with Suspense ─────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
