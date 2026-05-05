#!/usr/bin/env python3
"""
Build the E-ARI Handbook PDF from the source markdown.

Reads:  public/docs/e-ari-handbook.md
Writes: public/docs/e-ari-handbook.pdf

Usage:  npm run handbook:pdf
        (or: python3 scripts/build-handbook-pdf.py)
"""
from __future__ import annotations
import sys
from pathlib import Path
import markdown
from weasyprint import HTML, CSS

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "docs" / "e-ari-handbook.md"
OUT = ROOT / "public" / "docs" / "e-ari-handbook.pdf"

# ===========================================================================
# SVG diagrams — injected at HTML comment markers in the markdown
# ===========================================================================

DIAGRAM_ARCHITECTURE = """
<figure class="diagram diagram-architecture">
  <svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="layer-bg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#eff6ff"/>
      </linearGradient>
      <linearGradient id="layer-accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#1e40af"/>
      </linearGradient>
    </defs>

    <!-- Layer 4 (top) -->
    <g transform="translate(0, 0)">
      <rect x="40" y="0" width="640" height="78" rx="6" fill="url(#layer-bg)" stroke="#cbd5e1" stroke-width="0.8"/>
      <rect x="40" y="0" width="4" height="78" fill="url(#layer-accent)" rx="2"/>
      <text x="64" y="26" font-family="JetBrains Mono, monospace" font-size="9" fill="#64748b" letter-spacing="2">LAYER 04</text>
      <text x="64" y="48" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Continuous Monitoring</text>
      <text x="64" y="66" font-family="Inter, sans-serif" font-size="10" fill="#475569">Pulse checks · Gap radar · Regulatory scanner · Email digests</text>
    </g>

    <!-- Layer 3 -->
    <g transform="translate(0, 90)">
      <rect x="40" y="0" width="640" height="78" rx="6" fill="url(#layer-bg)" stroke="#cbd5e1" stroke-width="0.8"/>
      <rect x="40" y="0" width="4" height="78" fill="url(#layer-accent)" rx="2"/>
      <text x="64" y="26" font-family="JetBrains Mono, monospace" font-size="9" fill="#64748b" letter-spacing="2">LAYER 03</text>
      <text x="64" y="48" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Compliance Autopilot</text>
      <text x="64" y="66" font-family="Inter, sans-serif" font-size="10" fill="#475569">Registry · Classifier · Evidence vault · FRIA · Technical File · Submission Pack</text>
    </g>

    <!-- Layer 2 -->
    <g transform="translate(0, 180)">
      <rect x="40" y="0" width="640" height="78" rx="6" fill="url(#layer-bg)" stroke="#cbd5e1" stroke-width="0.8"/>
      <rect x="40" y="0" width="4" height="78" fill="url(#layer-accent)" rx="2"/>
      <text x="64" y="26" font-family="JetBrains Mono, monospace" font-size="9" fill="#64748b" letter-spacing="2">LAYER 02</text>
      <text x="64" y="48" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Six AI Agents</text>
      <text x="64" y="66" font-family="Inter, sans-serif" font-size="10" fill="#475569">Scoring · Insight · Discovery · Report · Literacy · Assistant</text>
    </g>

    <!-- Layer 1 (bottom) -->
    <g transform="translate(0, 270)">
      <rect x="40" y="0" width="640" height="78" rx="6" fill="url(#layer-bg)" stroke="#cbd5e1" stroke-width="0.8"/>
      <rect x="40" y="0" width="4" height="78" fill="url(#layer-accent)" rx="2"/>
      <text x="64" y="26" font-family="JetBrains Mono, monospace" font-size="9" fill="#64748b" letter-spacing="2">LAYER 01 · FOUNDATION</text>
      <text x="64" y="48" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#0f172a">The Assessment Engine</text>
      <text x="64" y="66" font-family="Inter, sans-serif" font-size="10" fill="#475569">8 pillars · 40 questions · weighted scoring · maturity bands</text>
    </g>
  </svg>
  <figcaption>Four cooperating layers with one shared source of truth.</figcaption>
</figure>
"""


DIAGRAM_AGENTS = """
<figure class="diagram diagram-agents">
  <svg viewBox="0 0 720 480" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" fill="#94a3b8"/>
      </marker>
      <linearGradient id="agent-blue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#dbeafe"/>
        <stop offset="100%" stop-color="#bfdbfe"/>
      </linearGradient>
      <linearGradient id="agent-violet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ede9fe"/>
        <stop offset="100%" stop-color="#ddd6fe"/>
      </linearGradient>
      <linearGradient id="agent-emerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d1fae5"/>
        <stop offset="100%" stop-color="#a7f3d0"/>
      </linearGradient>
    </defs>

    <!-- Stage labels (left rail) -->
    <text x="20" y="60" font-family="JetBrains Mono, monospace" font-size="9" fill="#94a3b8" letter-spacing="2">STAGE 1</text>
    <text x="20" y="170" font-family="JetBrains Mono, monospace" font-size="9" fill="#94a3b8" letter-spacing="2">STAGE 2</text>
    <text x="20" y="280" font-family="JetBrains Mono, monospace" font-size="9" fill="#94a3b8" letter-spacing="2">STAGE 3</text>
    <text x="20" y="390" font-family="JetBrains Mono, monospace" font-size="9" fill="#94a3b8" letter-spacing="2">STAGE 4</text>

    <!-- Stage 1: SCORING -->
    <g transform="translate(290, 30)">
      <rect width="160" height="64" rx="6" fill="url(#agent-blue)" stroke="#1e40af" stroke-width="1.4"/>
      <text x="80" y="24" font-family="JetBrains Mono, monospace" font-size="8" fill="#1e3a8a" text-anchor="middle" letter-spacing="2">DETERMINISTIC</text>
      <text x="80" y="44" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#1e3a8a" text-anchor="middle">SCORING</text>
      <text x="80" y="58" font-family="Inter, sans-serif" font-size="9" fill="#1e40af" text-anchor="middle">Numerical baseline</text>
    </g>

    <!-- Arrows from Scoring to Stage 2 -->
    <path d="M 320 95 Q 320 130 220 130" fill="none" stroke="#94a3b8" stroke-width="1.3" marker-end="url(#arrow)"/>
    <path d="M 420 95 Q 420 130 520 130" fill="none" stroke="#94a3b8" stroke-width="1.3" marker-end="url(#arrow)"/>

    <!-- Stage 2: INSIGHT (left) + DISCOVERY (right) -->
    <g transform="translate(60, 140)">
      <rect width="160" height="64" rx="6" fill="url(#agent-violet)" stroke="#7c3aed" stroke-width="1.4"/>
      <text x="80" y="24" font-family="JetBrains Mono, monospace" font-size="8" fill="#5b21b6" text-anchor="middle" letter-spacing="2">PARALLEL</text>
      <text x="80" y="44" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#5b21b6" text-anchor="middle">INSIGHT</text>
      <text x="80" y="58" font-family="Inter, sans-serif" font-size="9" fill="#7c3aed" text-anchor="middle">Narrative grounded in scores</text>
    </g>

    <g transform="translate(520, 140)">
      <rect width="160" height="64" rx="6" fill="url(#agent-violet)" stroke="#7c3aed" stroke-width="1.4"/>
      <text x="80" y="24" font-family="JetBrains Mono, monospace" font-size="8" fill="#5b21b6" text-anchor="middle" letter-spacing="2">PARALLEL</text>
      <text x="80" y="44" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#5b21b6" text-anchor="middle">DISCOVERY</text>
      <text x="80" y="58" font-family="Inter, sans-serif" font-size="9" fill="#7c3aed" text-anchor="middle">Sector context + signals</text>
    </g>

    <!-- Arrows converging to Report -->
    <path d="M 220 205 Q 290 205 290 250" fill="none" stroke="#94a3b8" stroke-width="1.3" marker-end="url(#arrow)"/>
    <path d="M 520 205 Q 450 205 450 250" fill="none" stroke="#94a3b8" stroke-width="1.3" marker-end="url(#arrow)"/>

    <!-- Stage 3: REPORT -->
    <g transform="translate(290, 250)">
      <rect width="160" height="64" rx="6" fill="url(#agent-blue)" stroke="#1e40af" stroke-width="1.4"/>
      <text x="80" y="24" font-family="JetBrains Mono, monospace" font-size="8" fill="#1e3a8a" text-anchor="middle" letter-spacing="2">COMPILES</text>
      <text x="80" y="44" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#1e3a8a" text-anchor="middle">REPORT</text>
      <text x="80" y="58" font-family="Inter, sans-serif" font-size="9" fill="#1e40af" text-anchor="middle">Executive document</text>
    </g>

    <!-- Arrow from Report to Literacy -->
    <path d="M 370 315 Q 370 345 370 360" fill="none" stroke="#94a3b8" stroke-width="1.3" marker-end="url(#arrow)"/>

    <!-- Stage 4: LITERACY -->
    <g transform="translate(290, 360)">
      <rect width="160" height="64" rx="6" fill="url(#agent-emerald)" stroke="#059669" stroke-width="1.4"/>
      <text x="80" y="24" font-family="JetBrains Mono, monospace" font-size="8" fill="#065f46" text-anchor="middle" letter-spacing="2">ADAPTIVE</text>
      <text x="80" y="44" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#065f46" text-anchor="middle">LITERACY</text>
      <text x="80" y="58" font-family="Inter, sans-serif" font-size="9" fill="#059669" text-anchor="middle">Personalised curriculum</text>
    </g>

    <!-- Side card: ASSISTANT (on-demand, not in main flow) -->
    <g transform="translate(530, 360)">
      <rect width="160" height="64" rx="6" fill="#fafbfc" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="4 3"/>
      <text x="80" y="24" font-family="JetBrains Mono, monospace" font-size="8" fill="#64748b" text-anchor="middle" letter-spacing="2">ON-DEMAND</text>
      <text x="80" y="44" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#334155" text-anchor="middle">ASSISTANT</text>
      <text x="80" y="58" font-family="Inter, sans-serif" font-size="9" fill="#64748b" text-anchor="middle">Interactive chat, post-pipeline</text>
    </g>
  </svg>
  <figcaption>Six agents across four sequential stages — outputs of earlier stages feed later ones.</figcaption>
</figure>
"""


# ===========================================================================
# CSS — print-grade typography and the new cover
# ===========================================================================

CSS_TEMPLATE = r"""
@page {
  size: A4;
  margin: 22mm 18mm 22mm 18mm;

  @bottom-left {
    content: "E-ARI Handbook · v1.0";
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 8.5pt;
    color: #94a3b8;
  }
  @bottom-center {
    content: "";
  }
  @bottom-right {
    content: counter(page) " / " counter(pages);
    font-family: 'JetBrains Mono', 'Menlo', monospace;
    font-size: 8.5pt;
    color: #94a3b8;
    letter-spacing: 0.08em;
  }
}

@page :first {
  margin: 0;
  @bottom-left { content: none; }
  @bottom-right { content: none; }
}

* { box-sizing: border-box; }

html, body {
  font-family: 'Inter', 'Helvetica Neue', system-ui, -apple-system, sans-serif;
  font-size: 10.5pt;
  line-height: 1.62;
  color: #1f2937;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

/* ════════════════════════════════════════════════════════════════════════
   COVER PAGE — editorial-style minimalism
   ════════════════════════════════════════════════════════════════════════ */

.cover {
  page-break-after: always;
  padding: 0;
  margin: 0;
  width: 210mm;
  height: 297mm;
  position: relative;
  background: #0a0e1a;
  color: #f1f5f9;
  overflow: hidden;
}

/* Layered backdrop: subtle mesh + diagonal accent line */
.cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(ellipse at 80% 10%, rgba(59, 130, 246, 0.18) 0%, transparent 55%),
    radial-gradient(ellipse at 10% 90%, rgba(124, 58, 237, 0.10) 0%, transparent 50%);
  pointer-events: none;
}

/* Vertical accent rule along the left margin */
.cover::after {
  content: "";
  position: absolute;
  top: 30mm;
  bottom: 30mm;
  left: 22mm;
  width: 1.5px;
  background: linear-gradient(180deg, transparent 0%, rgba(96, 165, 250, 0.5) 15%, rgba(96, 165, 250, 0.7) 50%, rgba(96, 165, 250, 0.5) 85%, transparent 100%);
  pointer-events: none;
}

.cover-frame {
  position: relative;
  height: 100%;
  padding: 32mm 26mm 26mm 36mm;
  display: flex;
  flex-direction: column;
  z-index: 2;
}

/* Top eyebrow (just under top margin) */
.cover-eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 60mm;
}

.cover-eyebrow .rule {
  display: inline-block;
  width: 32px;
  height: 1.5px;
  background: #60a5fa;
}

.cover-eyebrow .label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.30em;
  color: #93c5fd;
}

/* Hero block — title + subtitle, anchored to the upper third */
.cover-hero { }

.cover-title {
  font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
  font-size: 64pt;
  font-weight: 800;
  line-height: 0.96;
  color: #ffffff;
  letter-spacing: -0.04em;
  margin: 0 0 12mm 0;
}

.cover-title .accent {
  display: block;
  color: #60a5fa;
  font-weight: 400;
  font-style: italic;
  letter-spacing: -0.02em;
}

.cover-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 13pt;
  font-weight: 400;
  color: #cbd5e1;
  max-width: 125mm;
  line-height: 1.55;
  margin: 0;
}

/* Stat strip — minimal: just three columns separated by hairline */
.cover-stats {
  display: flex;
  gap: 0;
  margin-top: auto;
  margin-bottom: 18mm;
  padding: 8mm 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.cover-stat {
  flex: 1;
  padding: 0 5mm;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.cover-stat:last-child { border-right: none; }
.cover-stat:first-child { padding-left: 0; }

.cover-stat-value {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28pt;
  font-weight: 300;
  color: #ffffff;
  line-height: 1;
  margin: 0 0 3mm 0;
  letter-spacing: -0.02em;
}

.cover-stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7pt;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #94a3b8;
  margin: 0;
  white-space: nowrap;
  hyphens: none;
}

/* Bottom row — brand mark left, version + URL right */
.cover-foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.cover-brand-mark {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14pt;
  font-weight: 800;
  letter-spacing: 0.22em;
  color: #ffffff;
}

.cover-meta {
  display: flex;
  flex-direction: column;
  gap: 2mm;
  text-align: right;
  align-items: flex-end;
}

.cover-meta-line {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #94a3b8;
}

.cover-meta-line .sep {
  display: inline-block;
  width: 16px;
  text-align: center;
  color: #475569;
}

/* ════════════════════════════════════════════════════════════════════════
   BODY CONTENT
   ════════════════════════════════════════════════════════════════════════ */

.content { max-width: 100%; }

h1, h2, h3, h4, h5, h6 {
  font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
  color: #0f172a;
  font-weight: 700;
  letter-spacing: -0.012em;
  line-height: 1.3;
  page-break-after: avoid;
}

h1 {
  font-size: 22pt;
  margin: 14mm 0 4mm 0;
  padding-bottom: 3mm;
  border-bottom: 1px solid #e5e7eb;
  page-break-before: always;
  font-weight: 800;
}

h1:first-of-type { page-break-before: auto; }

h2 {
  font-size: 15pt;
  margin: 10mm 0 3mm 0;
  color: #0f172a;
}

h3 {
  font-size: 12pt;
  margin: 7mm 0 2mm 0;
  color: #1e3a8a;
}

h4 {
  font-size: 10.5pt;
  margin: 5mm 0 2mm 0;
  font-weight: 600;
  color: #374151;
}

p {
  margin: 0 0 4mm 0;
  text-align: justify;
  hyphens: auto;
  color: #374151;
}

p + p { margin-top: 0; }

strong { font-weight: 600; color: #111827; }
em { font-style: italic; }

a {
  color: #1e40af;
  text-decoration: none;
  border-bottom: 1px dotted #93c5fd;
}

/* Lists */

ul, ol {
  margin: 0 0 4mm 0;
  padding-left: 6mm;
  orphans: 3;
  widows: 3;
}

li {
  margin: 0 0 1.5mm 0;
  color: #374151;
  page-break-inside: avoid;
}

ul li::marker { color: #3b82f6; }
ol li::marker { color: #1e40af; font-weight: 600; }

/* Tables */

table {
  width: 100%;
  border-collapse: collapse;
  margin: 5mm 0;
  font-size: 9.5pt;
  page-break-inside: avoid;
}

thead {
  background: #f8fafc;
  border-bottom: 1.5px solid #cbd5e1;
}

th {
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-size: 7.5pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #475569;
  padding: 2.5mm 3mm;
  text-align: left;
  vertical-align: top;
}

tbody tr { border-bottom: 1px solid #e5e7eb; }
tbody tr:nth-child(even) { background: #fafbfc; }

td {
  padding: 2.5mm 3mm;
  vertical-align: top;
  color: #374151;
  line-height: 1.5;
}

td:first-child { font-weight: 500; color: #1f2937; }

/* Code & pre */

code {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
  font-size: 9pt;
  background: #f1f5f9;
  padding: 0.5mm 1.5mm;
  border-radius: 2px;
  color: #1e3a8a;
  border: 1px solid #e2e8f0;
}

pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 4mm 5mm;
  border-radius: 3px;
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-size: 8.5pt;
  line-height: 1.55;
  overflow-x: auto;
  margin: 4mm 0;
  page-break-inside: avoid;
  border: 1px solid #1e293b;
  white-space: pre-wrap;
}

pre code {
  background: transparent;
  padding: 0;
  color: #e2e8f0;
  border: none;
  font-size: 8.5pt;
}

/* Blockquote */

blockquote {
  margin: 4mm 0;
  padding: 3mm 5mm;
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
  border-radius: 0 3px 3px 0;
  color: #1e3a8a;
  font-style: italic;
}

blockquote p { color: #1e3a8a; margin: 0; }

/* HR */

hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 8mm 0;
}

/* ════════════════════════════════════════════════════════════════════════
   DIAGRAMS (SVG figures)
   ════════════════════════════════════════════════════════════════════════ */

.diagram {
  margin: 8mm 0;
  page-break-inside: avoid;
  text-align: center;
}

.diagram svg {
  width: 100%;
  max-width: 170mm;
  height: auto;
}

.diagram figcaption {
  margin-top: 3mm;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt;
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #64748b;
}

/* Disclaimer at very bottom */

.content > p:last-child em {
  display: block;
  margin-top: 8mm;
  padding-top: 4mm;
  border-top: 1px solid #e5e7eb;
  font-size: 8.5pt;
  color: #6b7280;
  text-align: center;
}
"""


# ===========================================================================
# Build
# ===========================================================================

def build():
    if not SRC.exists():
        print(f"ERROR: source markdown not found at {SRC}", file=sys.stderr)
        sys.exit(1)

    md_text = SRC.read_text(encoding="utf-8")

    # ── Extract title + subtitle from the first H1 block ───────────────────
    lines = md_text.splitlines()
    title = "The E-ARI Handbook"
    subtitle = ""
    body_start = 0

    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            title = ln[2:].strip()
            for j in range(i + 1, min(i + 6, len(lines))):
                t = lines[j].strip()
                if t.startswith("**") and t.endswith("**"):
                    subtitle = t.strip("*").strip()
                    break
            for k in range(i + 1, len(lines)):
                if lines[k].strip() == "---":
                    body_start = k + 1
                    break
            break

    body_md = "\n".join(lines[body_start:])

    # ── Markdown → HTML ────────────────────────────────────────────────────
    html_body = markdown.markdown(
        body_md,
        extensions=["tables", "fenced_code", "toc", "sane_lists", "smarty"],
        output_format="html5",
    )

    # ── Inject SVG diagrams at HTML comment markers ────────────────────────
    # The python-markdown library preserves HTML comments verbatim
    html_body = html_body.replace("<!-- pdf:diagram-architecture -->", DIAGRAM_ARCHITECTURE)
    html_body = html_body.replace("<!-- pdf:diagram-agents -->", DIAGRAM_AGENTS)

    # ── Cover page (editorial minimalism) ──────────────────────────────────
    # Two-line title with italic accent on the headline word
    cover_title_html = 'The E-ARI<span class="accent">Handbook</span>'

    cover_html = f"""
<section class="cover">
  <div class="cover-frame">
    <div class="cover-eyebrow">
      <span class="rule"></span>
      <span class="label">Platform Documentation</span>
    </div>

    <div class="cover-hero">
      <h1 class="cover-title">{cover_title_html}</h1>
      <p class="cover-subtitle">A complete guide to the platform — what it does, how it works, and why it is built the way it is.</p>
    </div>

    <div class="cover-stats">
      <div class="cover-stat">
        <p class="cover-stat-value">8</p>
        <p class="cover-stat-label">Pillars</p>
      </div>
      <div class="cover-stat">
        <p class="cover-stat-value">6</p>
        <p class="cover-stat-label">Agents</p>
      </div>
      <div class="cover-stat">
        <p class="cover-stat-value">4</p>
        <p class="cover-stat-label">Layers</p>
      </div>
      <div class="cover-stat">
        <p class="cover-stat-value">EU</p>
        <p class="cover-stat-label">AI Act native</p>
      </div>
    </div>

    <div class="cover-foot">
      <div class="cover-brand-mark">E-ARI</div>
      <div class="cover-meta">
        <span class="cover-meta-line">v1.0<span class="sep">·</span>May 2026</span>
        <span class="cover-meta-line">www.e-ari.com</span>
      </div>
    </div>
  </div>
</section>
"""

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>{title}</title>
</head>
<body>
{cover_html}
<main class="content">
{html_body}
</main>
</body>
</html>"""

    # ── Render via WeasyPrint ──────────────────────────────────────────────
    HTML(string=full_html, base_url=str(ROOT)).write_pdf(
        target=str(OUT),
        stylesheets=[CSS(string=CSS_TEMPLATE)],
    )

    size_kb = OUT.stat().st_size / 1024
    print(f"✅ PDF generated: {OUT.relative_to(ROOT)} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    build()
