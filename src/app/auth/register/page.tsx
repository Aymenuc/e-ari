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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";

const SECTORS = [
  "Technology", "Financial Services", "Healthcare", "Manufacturing",
  "Government", "Energy", "Retail", "Education", "Telecommunications", "Other"
];

const ORG_SIZES = [
  { value: "1-50", label: "1–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-1000", label: "201–1,000 employees" },
  { value: "1001-5000", label: "1,001–5,000 employees" },
  { value: "5000+", label: "5,000+ employees" },
];

// ─── Inner component (uses useSearchParams) ──────────────────────────────────

function RegisterForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    sector: "",
    orgSize: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/portal";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      // Register
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          organization: formData.organization,
          sector: formData.sector,
          orgSize: formData.orgSize,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      // Auto sign in after registration
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
    <Card className="w-full max-w-lg bg-navy-800 border-border">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <img src="/logo.svg" alt="E-ARI" className="h-12 w-12 rounded-xl" />
        </div>
        <CardTitle className="font-heading text-xl">Create Your Account</CardTitle>
        <CardDescription className="text-muted-foreground font-sans">
          Start your AI readiness assessment journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-sans text-sm">Full Name</Label>
              <Input
                id="name"
                placeholder="Jane Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-navy-700 border-border font-sans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org" className="font-sans text-sm">Organization</Label>
              <Input
                id="org"
                placeholder="Acme Corp"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="bg-navy-700 border-border font-sans"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="font-sans text-sm">Work Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@organization.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-navy-700 border-border font-sans"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-sans text-sm">Industry Sector</Label>
              <Select
                value={formData.sector}
                onValueChange={(value) => setFormData({ ...formData, sector: value })}
              >
                <SelectTrigger className="bg-navy-700 border-border font-sans">
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent className="bg-navy-800 border-border">
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s} className="font-sans">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-sans text-sm">Organization Size</Label>
              <Select
                value={formData.orgSize}
                onValueChange={(value) => setFormData({ ...formData, orgSize: value })}
              >
                <SelectTrigger className="bg-navy-700 border-border font-sans">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent className="bg-navy-800 border-border">
                  {ORG_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="font-sans">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-sans text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="bg-navy-700 border-border font-sans"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="font-sans text-sm">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="bg-navy-700 border-border font-sans"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground font-sans">
            Already have an account?{" "}
            <Link
              href={callbackUrl !== "/portal" ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/login"}
              className="text-eari-blue-light hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page wrapper with Suspense ─────────────────────────────────────────────

export default function RegisterPage() {
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
          <RegisterForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
