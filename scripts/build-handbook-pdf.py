#!/usr/bin/env python3
"""
Build the E-ARI Handbook PDF from the source markdown.

Reads:  public/docs/e-ari-handbook.md
Writes: public/docs/e-ari-handbook.pdf

Usage:  python3 scripts/build-handbook-pdf.py
Deps:   markdown, weasyprint  (install via `pip3 install --break-system-packages markdown weasyprint`)
"""
from __future__ import annotations
import sys
from pathlib import Path
import markdown
from weasyprint import HTML, CSS

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "docs" / "e-ari-handbook.md"
OUT = ROOT / "public" / "docs" / "e-ari-handbook.pdf"

# ---------------------------------------------------------------------------
# CSS — print-grade typography matching the platform aesthetic
# ---------------------------------------------------------------------------

CSS_TEMPLATE = r"""
@page {
  size: A4;
  margin: 22mm 18mm 22mm 18mm;

  @bottom-left {
    content: "E-ARI Handbook · v1.0";
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 8.5pt;
    color: #6b7280;
  }
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-family: 'JetBrains Mono', 'Menlo', monospace;
    font-size: 8.5pt;
    color: #6b7280;
  }
}

@page :first {
  margin-top: 0;
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

/* ── Cover page ─────────────────────────────────────────────────────────── */

.cover {
  page-break-after: always;
  padding: 30mm 18mm 22mm 18mm;
  margin: -22mm -18mm;
  height: calc(297mm - 0mm);
  background: linear-gradient(180deg, #0a0e1a 0%, #0f1729 60%, #0a0e1a 100%);
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cover-top { }

.cover-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18mm;
}

.cover-eyebrow .rule {
  display: inline-block;
  width: 32px;
  height: 1px;
  background: #3b82f6;
  opacity: 0.7;
}

.cover-eyebrow .label {
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #93c5fd;
}

.cover-title {
  font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
  font-size: 44pt;
  font-weight: 800;
  line-height: 1.05;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin: 0 0 12mm 0;
}

.cover-subtitle {
  font-size: 14pt;
  font-weight: 400;
  color: #cbd5e1;
  max-width: 130mm;
  line-height: 1.5;
  margin: 0;
}

.cover-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 6mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.cover-bottom-meta {
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-size: 8.5pt;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #94a3b8;
}

.cover-bottom-brand {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11pt;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.04em;
}

/* ── Body content ───────────────────────────────────────────────────────── */

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

/* ── Lists ──────────────────────────────────────────────────────────────── */

ul, ol {
  margin: 0 0 4mm 0;
  padding-left: 6mm;
}

li {
  margin: 0 0 1.5mm 0;
  color: #374151;
}

ul li::marker { color: #3b82f6; }
ol li::marker { color: #1e40af; font-weight: 600; }

/* ── Tables ─────────────────────────────────────────────────────────────── */

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

tbody tr {
  border-bottom: 1px solid #e5e7eb;
}

tbody tr:nth-child(even) { background: #fafbfc; }

td {
  padding: 2.5mm 3mm;
  vertical-align: top;
  color: #374151;
  line-height: 1.5;
}

td:first-child { font-weight: 500; color: #1f2937; }

/* ── Code & pre ─────────────────────────────────────────────────────────── */

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

/* ── Blockquote ─────────────────────────────────────────────────────────── */

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

/* ── HR ─────────────────────────────────────────────────────────────────── */

hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 8mm 0;
}

/* ── Italic disclaimer at very bottom ───────────────────────────────────── */

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

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def build():
    if not SRC.exists():
        print(f"ERROR: source markdown not found at {SRC}", file=sys.stderr)
        sys.exit(1)

    md_text = SRC.read_text(encoding="utf-8")

    # The first H1 is the title — strip it from the body, we'll put it on the cover.
    lines = md_text.splitlines()
    title = "The E-ARI Handbook"
    subtitle = ""
    body_start = 0

    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            title = ln[2:].strip()
            # Look for subtitle (next bold line)
            for j in range(i + 1, min(i + 6, len(lines))):
                t = lines[j].strip()
                if t.startswith("**") and t.endswith("**"):
                    subtitle = t.strip("*").strip()
                    break
            # Body starts after the version line / first hr
            for k in range(i + 1, len(lines)):
                if lines[k].strip() == "---":
                    body_start = k + 1
                    break
            break

    body_md = "\n".join(lines[body_start:])

    # ── Convert markdown → HTML ────────────────────────────────────────────
    html_body = markdown.markdown(
        body_md,
        extensions=["tables", "fenced_code", "toc", "sane_lists", "smarty"],
        output_format="html5",
    )

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>{title}</title>
</head>
<body>
  <section class="cover">
    <div class="cover-top">
      <div class="cover-eyebrow">
        <span class="rule"></span>
        <span class="label">Platform Documentation</span>
      </div>
      <h1 class="cover-title">{title}</h1>
      <p class="cover-subtitle">{subtitle}</p>
    </div>
    <div class="cover-bottom">
      <div class="cover-bottom-meta">Version 1.0 · May 2026</div>
      <div class="cover-bottom-brand">E-ARI</div>
    </div>
  </section>

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
