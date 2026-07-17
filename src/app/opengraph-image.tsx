import { ImageResponse } from "next/og";

/**
 * Social share card (OpenGraph / Twitter) — generated at the edge so it
 * always matches the brand: navy field, monochrome Threshold-E bars, the
 * hero claim. Referenced automatically by Next for og:image / twitter:image.
 */
export const runtime = "edge";
export const alt = "E-ARI — The AI readiness score you can defend";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(180deg, #060b16 0%, #0a1024 60%, #0d1117 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              width: 56,
              height: 56,
              padding: 12,
              background: "#0a1024",
              border: "1px solid #26314d",
              borderRadius: 13,
              justifyContent: "center",
            }}
          >
            <div style={{ height: 6, width: 32, background: "#f1f5f9", borderRadius: 2 }} />
            <div style={{ height: 6, width: 19, background: "rgba(241,245,249,0.62)", borderRadius: 2 }} />
            <div style={{ height: 6, width: 32, background: "rgba(241,245,249,0.35)", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.5 }}>E-ARI</div>
        </div>

        {/* Claim */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 74, fontWeight: 700, color: "#f8fafc", letterSpacing: -2, lineHeight: 1.05 }}>
            The AI readiness score
          </div>
          <div style={{ fontSize: 74, fontWeight: 700, color: "#a5b4fc", letterSpacing: -2, lineHeight: 1.05 }}>
            you can defend.
          </div>
          <div style={{ fontSize: 27, color: "#94a3b8", marginTop: 10 }}>
            Deterministic 8-pillar scoring · EU AI Act compliance autopilot · Six AI agents
          </div>
        </div>

        {/* Footer strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, color: "#64748b", letterSpacing: 2 }}>e-ari.com</div>
          <div style={{ fontSize: 20, color: "#64748b", letterSpacing: 3 }}>SCORING V5.3 · REPRODUCIBLE</div>
        </div>
      </div>
    ),
    size,
  );
}
