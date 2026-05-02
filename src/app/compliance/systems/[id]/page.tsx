"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  FileStack,
  ClipboardList,
  Sparkles,
  Radar,
  FileJson,
  Scale,
  ScrollText,
  Download,
  Cpu,
  Grid3x3,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CoverageRow {
  code: string;
  label: string;
  severity: string;
  citationCount: number;
}

function CoverageMatrixSection({
  systemId,
  disabled,
}: {
  systemId: string;
  disabled?: boolean;
}) {
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [covErr, setCovErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCode, setModalCode] = useState<string | null>(null);
  const [modalCitations, setModalCitations] = useState<
    Array<{ evidenceFilename: string; pageNumber: number | null; textExcerpt: string; downloadUrl: string }>
  >([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setCovErr(null);
      try {
        const res = await fetch(`/api/compliance/systems/${systemId}/coverage`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!cancelled) setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e) {
        if (!cancelled) setCovErr(e instanceof Error ? e.message : "Failed to load coverage");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId]);

  async function openModal(code: string) {
    setModalCode(code);
    setModalOpen(true);
    setModalLoading(true);
    setModalCitations([]);
    try {
      const res = await fetch(`/api/compliance/systems/${systemId}/citations?obligation=${encodeURIComponent(code)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setModalCitations(Array.isArray(data.citations) ? data.citations : []);
    } catch {
      setModalCitations([]);
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <Card className="bg-navy-800/90 border-border/40">
      <CardHeader>
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-eari-blue-light" />
          Coverage matrix
        </CardTitle>
        <CardDescription className="font-sans">
          AI Act obligations vs. extracted clause citations for this system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {covErr ? <p className="text-sm text-red-300">{covErr}</p> : null}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border/30">
              <table className="w-full text-xs font-sans">
                <thead className="bg-navy-900/80 text-muted-foreground">
                  <tr>
                    <th className="text-left p-2 font-heading">Obligation</th>
                    <th className="text-left p-2 font-heading">Severity</th>
                    <th className="text-right p-2 font-heading">Citations</th>
                    <th className="p-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.code} className="border-t border-border/20 hover:bg-navy-700/30">
                      <td className="p-2 align-top">
                        <span className="font-mono text-[10px] text-eari-blue-light/90">{r.code}</span>
                        <p className="text-foreground mt-0.5">{r.label}</p>
                      </td>
                      <td className="p-2 align-top capitalize text-muted-foreground">{r.severity}</td>
                      <td className="p-2 align-top text-right">
                        {r.citationCount > 0 ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono">
                            ✓ {r.citationCount}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border text-muted-foreground font-mono">
                            ✗ 0
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] font-heading"
                          disabled={disabled || r.citationCount === 0}
                          onClick={() => void openModal(r.code)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogContent className="bg-navy-900 border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading text-foreground">
                    Citations — {modalCode ?? ""}
                  </DialogTitle>
                </DialogHeader>
                {modalLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light mx-auto my-6" />
                ) : modalCitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No citations returned.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {modalCitations.map((c, i) => (
                      <li key={`${c.evidenceFilename}-${i}`} className="border-b border-border/20 pb-3">
                        <p className="font-mono text-[10px] text-eari-blue-light">{c.evidenceFilename}</p>
                        {c.pageNumber != null ? (
                          <p className="text-[10px] text-muted-foreground">Page {c.pageNumber}</p>
                        ) : null}
                        <p className="text-foreground mt-1 whitespace-pre-wrap">{c.textExcerpt}</p>
                        <a
                          href={c.downloadUrl}
                          className="text-[11px] text-eari-blue-light underline mt-1 inline-block"
                        >
                          Download source file
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface SystemDetail {
  id: string;
  name: string;
  description: string;
  purpose: string;
  deployerRole: string;
  sector: string;
  populationsAffected: string | null;
  riskTier: string | null;
  riskRationale: string | null;
  classifiedAt: string | null;
  assessmentId: string | null;
  _count: { evidence: number; obligationGaps: number };
}

export default function AISystemOverviewPage() {
  const params = useParams();
  const id = params.id as string;
  const [system, setSystem] = useState<SystemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/compliance/systems/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setSystem(data);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function run(label: string, fn: () => Promise<void>) {
    setError(null);
    setActionMsg(null);
    setBusy(label);
    try {
      await fn();
      await load();
      setActionMsg(`${label} finished`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPack() {
    setBusy("download-pack");
    setError(null);
    try {
      const res = await fetch(`/api/compliance/systems/${id}/submission-pack`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `e-ari-submission-pack-${id.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setActionMsg("Submission pack (ZIP) downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Link href="/compliance" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-sans">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Compliance home
        </Link>

        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="py-4 text-sm text-red-300">{error}</CardContent>
          </Card>
        )}
        {actionMsg && !error && (
          <p className="text-xs font-sans text-emerald-400/90">{actionMsg}</p>
        )}

        {!system && !error ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-eari-blue-light" />
          </div>
        ) : system ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground">{system.name}</h1>
                <p className="text-sm text-muted-foreground font-sans mt-1 flex flex-wrap gap-2 items-center">
                  <span>{system.sector}</span>
                  <Badge variant="outline" className="text-[10px] border-border">
                    {system.deployerRole}
                  </Badge>
                  {system.riskTier ? (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                      {system.riskTier}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
                      Unclassified
                    </Badge>
                  )}
                </p>
                {system.assessmentId ? (
                  <p className="text-xs font-mono text-eari-blue-light/90 mt-2">
                    Baseline assessment:{" "}
                    <Link className="underline hover:text-eari-blue-light" href={`/results/${system.assessmentId}`}>
                      {system.assessmentId}
                    </Link>
                  </p>
                ) : null}
              </div>
              <Link href={`/compliance/systems/${id}/evidence`}>
                <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading">
                  <FileStack className="h-4 w-4 mr-2" />
                  Evidence vault
                </Button>
              </Link>
            </div>

            {system.riskRationale ? (
              <Card className="bg-navy-800/90 border-eari-blue/20">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4 text-eari-blue-light" />
                    Classification rationale (draft)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-sans text-muted-foreground whitespace-pre-wrap leading-relaxed">{system.riskRationale}</p>
                  {system.classifiedAt ? (
                    <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">Classified at {new Date(system.classifiedAt).toLocaleString()}</p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <CoverageMatrixSection systemId={id} disabled={!!busy} />

            <Card className="bg-navy-800/90 border-border/40">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-eari-blue-light" />
                  Compliance automation
                </CardTitle>
                <CardDescription className="font-sans">
                  Uses your configured LLM at temperature 0. Requires extracted evidence text for best clause/gap results — run Extract from the vault after uploads. Regulator ZIP pack requires{" "}
                  <strong className="text-foreground/90">finalized</strong> FRIA and Annex IV technical file (buttons on those pages).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-eari-blue/30 justify-start h-auto py-3 font-heading"
                  disabled={!!busy}
                  onClick={() =>
                    run("Classification", async () => {
                      const res = await fetch(`/api/compliance/systems/${id}/classify`, { method: "POST" });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
                    })
                  }
                >
                  {busy === "Classification" ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <Cpu className="h-4 w-4 mr-2 shrink-0 text-eari-blue-light" />}
                  Run AI Act classification
                </Button>
                <Button
                  variant="outline"
                  className="border-eari-blue/30 justify-start h-auto py-3 font-heading"
                  disabled={!!busy}
                  onClick={() =>
                    run("Gap radar", async () => {
                      const res = await fetch(`/api/compliance/systems/${id}/gaps`, { method: "POST" });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
                    })
                  }
                >
                  {busy === "Gap radar" ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <Radar className="h-4 w-4 mr-2 shrink-0 text-amber-400" />}
                  Regenerate obligation gaps
                </Button>
                <Button
                  variant="outline"
                  className="border-eari-blue/30 justify-start h-auto py-3 font-heading"
                  disabled={!!busy}
                  onClick={() =>
                    run("FRIA", async () => {
                      const res = await fetch(`/api/compliance/systems/${id}/fria`, { method: "POST" });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
                    })
                  }
                >
                  {busy === "FRIA" ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <ScrollText className="h-4 w-4 mr-2 shrink-0 text-emerald-400" />}
                  Generate FRIA draft
                </Button>
                <Button
                  variant="outline"
                  className="border-eari-blue/30 justify-start h-auto py-3 font-heading"
                  disabled={!!busy}
                  onClick={() =>
                    run("Annex IV", async () => {
                      const res = await fetch(`/api/compliance/systems/${id}/technical-file`, { method: "POST" });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
                    })
                  }
                >
                  {busy === "Annex IV" ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <FileJson className="h-4 w-4 mr-2 shrink-0 text-cyan-400" />}
                  Generate Annex IV draft
                </Button>
                <Link href={`/compliance/systems/${id}/gaps`} className="sm:col-span-2">
                  <Button variant="secondary" className="w-full justify-start font-heading bg-navy-700/50">
                    <Radar className="h-4 w-4 mr-2" />
                    Open gap radar
                  </Button>
                </Link>
                <Link href={`/compliance/systems/${id}/fria`} className="sm:col-span-2">
                  <Button variant="secondary" className="w-full justify-start font-heading bg-navy-700/50">
                    <ScrollText className="h-4 w-4 mr-2" />
                    Review FRIA JSON & export DOCX
                  </Button>
                </Link>
                <Link href={`/compliance/systems/${id}/technical-file`} className="sm:col-span-2">
                  <Button variant="secondary" className="w-full justify-start font-heading bg-navy-700/50">
                    <FileJson className="h-4 w-4 mr-2" />
                    Review technical file & export DOCX
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  className="sm:col-span-2 justify-start font-heading bg-gradient-to-r from-eari-blue/20 to-cyan-600/10 border border-eari-blue/30"
                  disabled={!!busy}
                  onClick={() => downloadPack()}
                >
                  {busy === "download-pack" ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <Download className="h-4 w-4 mr-2 shrink-0" />}
                  Download submission pack (ZIP)
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-navy-800/90 border-border/40">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-eari-blue-light" />
                  Purpose & scope
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm font-sans text-muted-foreground leading-relaxed">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-1">Purpose</p>
                  <p className="text-foreground">{system.purpose}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-1">Description</p>
                  <p className="text-foreground whitespace-pre-wrap">{system.description}</p>
                </div>
                {system.populationsAffected ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-1">Affected populations</p>
                    <p className="text-foreground whitespace-pre-wrap">{system.populationsAffected}</p>
                  </div>
                ) : null}
                <p className="text-[11px] font-mono pt-2 border-t border-border/30">
                  Evidence files: {system._count.evidence} · Obligation gaps: {system._count.obligationGaps}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
