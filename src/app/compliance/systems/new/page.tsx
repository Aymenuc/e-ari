"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";

export default function NewAISystemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("assessmentId");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [deployerRole, setDeployerRole] = useState<string>("deployer");
  const [sector, setSector] = useState("");
  const [populationsAffected, setPopulationsAffected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/compliance/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          purpose,
          deployerRole,
          sector,
          populationsAffected: populationsAffected.trim() || null,
          assessmentId: assessmentId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.push(`/compliance/systems/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Link href="/compliance" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-sans">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to compliance
        </Link>

        <Card className="bg-navy-800/90 border-border/40">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Register AI system</CardTitle>
            <CardDescription className="font-sans">
              Describe the deployment you need to evidence. Risk classification arrives in PR #2.
              {assessmentId ? (
                <span className="block mt-2 font-mono text-[11px] text-eari-blue-light/90">
                  Linked baseline assessment: {assessmentId}
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-400 font-sans">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="name">System name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-navy-900/80 border-border/40"
                  placeholder="e.g. Customer churn prediction API"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Sector / context</Label>
                <Input
                  id="sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  required
                  className="bg-navy-900/80 border-border/40"
                  placeholder="e.g. Financial services — retail banking"
                />
              </div>
              <div className="space-y-2">
                <Label>Role under AI Act</Label>
                <Select value={deployerRole} onValueChange={setDeployerRole}>
                  <SelectTrigger className="bg-navy-900/80 border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-border">
                    <SelectItem value="provider">Provider</SelectItem>
                    <SelectItem value="deployer">Deployer</SelectItem>
                    <SelectItem value="importer">Importer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  rows={3}
                  className="bg-navy-900/80 border-border/40 font-sans text-sm"
                  placeholder="Why does this system exist? What decision or outcome does it influence?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="bg-navy-900/80 border-border/40 font-sans text-sm"
                  placeholder="Data inputs, model family, humans in the loop, geographic scope..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="populations">Affected populations (optional)</Label>
                <Textarea
                  id="populations"
                  value={populationsAffected}
                  onChange={(e) => setPopulationsAffected(e.target.value)}
                  rows={2}
                  className="bg-navy-900/80 border-border/40 font-sans text-sm"
                  placeholder="Who is impacted if the system fails or behaves unfairly?"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-eari-blue to-eari-blue-dark text-white font-heading"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create system"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
