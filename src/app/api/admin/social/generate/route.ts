import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const TEMPLATES: Record<string, (sector?: string) => { content: string; platform: string; category: string }> = {
  benchmark: (sector) => {
    const sectorLabel = sector ? sector.charAt(0).toUpperCase() + sector.slice(1) : "Healthcare";
    const score = Math.floor(Math.random() * 20) + 40;
    return {
      content: `📊 AI Readiness Benchmark Update: ${sectorLabel} organizations score an average of ${score}/100 on Data & Infrastructure. Where does your organization stand?\n\nTake the free E-ARI assessment and discover your AI readiness score → e-ari.com\n\n#AIReadiness #Benchmark #${sectorLabel.replace(/\s/g, "")} #DigitalTransformation`,
      platform: "linkedin",
      category: "benchmark",
    };
  },
  compliance: (sector) => {
    const frameworks = ["EU AI Act", "NIST AI RMF", "ISO/IEC 42001"];
    const framework = frameworks[Math.floor(Math.random() * frameworks.length)];
    const sectorLabel = sector ? sector.charAt(0).toUpperCase() + sector.slice(1) : "Enterprise";
    return {
      content: `⚖️ Is your organization ${framework}-compliant?\n\n${sectorLabel} leaders can't afford to ignore AI governance. The ${framework} sets the standard for responsible AI deployment.\n\nE-ARI helps you identify compliance gaps and build a roadmap to certification.\n\nStart your assessment → e-ari.com\n\n#AIGovernance #${framework.replace(/[\s/]/g, "")} #Compliance #${sectorLabel.replace(/\s/g, "")}`,
      platform: "linkedin",
      category: "compliance",
    };
  },
  certification: () => {
    const badge = "🏆";
    return {
      content: `${badge} Proud to announce: Another organization has earned their E-ARI AI Readiness Certification!\n\nOur certification demonstrates commitment to responsible and effective AI adoption. Stand out from the competition with a verified AI readiness score.\n\nGet certified → e-ari.com\n\n#AICertification #AIReadiness #Innovation #Leadership`,
      platform: "linkedin",
      category: "certification",
    };
  },
  promotion: () => {
    const features = [
      "6-pillar assessment framework",
      "AI-powered strategic insights",
      "Continuous monthly monitoring with AI Pulse",
      "Industry benchmarking across sectors",
    ];
    const feature = features[Math.floor(Math.random() * features.length)];
    return {
      content: `🚀 Ready to transform your AI strategy?\n\nE-ARI provides ${feature} — and much more.\n\nJoin 500+ organizations that trust E-ARI to measure, track, and improve their AI readiness.\n\nStart free → e-ari.com\n\n#AI #Strategy #DigitalTransformation #Innovation`,
      platform: "linkedin",
      category: "promotion",
    };
  },
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { type, sector } = body;

    if (!type || !TEMPLATES[type]) {
      return Response.json(
        { error: `Invalid type. Must be one of: ${Object.keys(TEMPLATES).join(", ")}` },
        { status: 400 }
      );
    }

    // Use template generation (LLM integration can be added later)
    const result = TEMPLATES[type](sector);

    return Response.json(result);
  } catch (error) {
    console.error("[SOCIAL_GENERATE]", error);
    return Response.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
