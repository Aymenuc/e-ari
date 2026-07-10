/**
 * E-ARI Certification Badge System
 *
 * Provides certification levels, assessment logic, and professional SVG badge
 * generation for the "E-ARI Certified AI Ready" program.
 *
 * Certification levels (highest to lowest):
 *   Platinum — 85+ overall, all pillars ≥ 70
 *   Gold     — 75+ overall, all pillars ≥ 55
 *   Silver   — 60+ overall, all pillars ≥ 40
 *   Bronze   — 45+ overall, all pillars ≥ 25
 *   None     — Below bronze thresholds
 *
 * Pillar IDs: strategy, data, technology, talent, governance, culture, process, security
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Certification {
  level: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  label: string;
  description: string;
  minOverallScore: number;
  minPillarScores: Record<string, number>; // pillarId -> minimum score
  icon: string; // emoji or unicode symbol for the badge
  color: string; // hex color for the badge
  requirements: string[];
}

export interface CertificationResult {
  level: Certification['level'];
  certification: Certification;
  overallScore: number;
  pillarGaps: Array<{ pillarId: string; pillarName: string; current: number; required: number }>;
  isCertified: boolean;
  nextLevel: Certification | null;
  nextLevelGaps: Array<{ pillarId: string; pillarName: string; current: number; required: number }>;
}

// ─── Certification Level Definitions ────────────────────────────────────────

export const CERTIFICATION_LEVELS: Certification[] = [
  {
    level: 'platinum',
    label: 'Platinum',
    description:
      'The highest E-ARI certification. The organization demonstrates exceptional AI readiness across all dimensions with robust foundations, mature governance, and a culture that sustains continuous AI innovation.',
    minOverallScore: 85,
    minPillarScores: {
      strategy: 70,
      data: 70,
      technology: 70,
      talent: 70,
      governance: 70,
      culture: 70,
      process: 70,
      security: 70,
    },
    icon: '◆',
    color: '#e2e8f0',
    requirements: [
      'Overall E-ARI score of 85 or above',
      'Every pillar scores at least 70',
      'No critical pillar failures',
    ],
  },
  {
    level: 'gold',
    label: 'Gold',
    description:
      'Demonstrates strong AI readiness. The organization has solid strategic alignment, capable data and technology foundations, and effective governance — well-positioned to scale AI initiatives.',
    minOverallScore: 75,
    minPillarScores: {
      strategy: 55,
      data: 55,
      technology: 55,
      talent: 55,
      governance: 55,
      culture: 55,
      process: 55,
      security: 55,
    },
    icon: '◆',
    color: '#d4a853',
    requirements: [
      'Overall E-ARI score of 75 or above',
      'Every pillar scores at least 55',
      'No critical pillar failures',
    ],
  },
  {
    level: 'silver',
    label: 'Silver',
    description:
      'Indicates progressing AI readiness. Key foundations are in place, active investment is underway, and the organization is building momentum toward advanced AI capabilities.',
    minOverallScore: 60,
    minPillarScores: {
      strategy: 40,
      data: 40,
      technology: 40,
      talent: 40,
      governance: 40,
      culture: 40,
      process: 40,
      security: 40,
    },
    icon: '◆',
    color: '#94a3b8',
    requirements: [
      'Overall E-ARI score of 60 or above',
      'Every pillar scores at least 40',
    ],
  },
  {
    level: 'bronze',
    label: 'Bronze',
    description:
      'Foundational certification. The organization has begun its AI readiness journey with essential elements emerging, but significant investment is needed to achieve competitive AI maturity.',
    minOverallScore: 45,
    minPillarScores: {
      strategy: 25,
      data: 25,
      technology: 25,
      talent: 25,
      governance: 25,
      culture: 25,
      process: 25,
      security: 25,
    },
    icon: '◆',
    color: '#c08a4e',
    requirements: [
      'Overall E-ARI score of 45 or above',
      'Every pillar scores at least 25',
    ],
  },
  {
    level: 'none',
    label: 'Not Certified',
    description:
      'The organization does not yet meet the minimum threshold for E-ARI certification. Focused investment in foundational AI readiness pillars is recommended before re-assessment.',
    minOverallScore: 0,
    minPillarScores: {
      strategy: 0,
      data: 0,
      technology: 0,
      talent: 0,
      governance: 0,
      culture: 0,
      process: 0,
      security: 0,
    },
    icon: '○',
    color: '#64748b',
    requirements: [
      'Achieve an overall E-ARI score of at least 45',
      'Ensure every pillar scores at least 25',
    ],
  },
];

// ─── Helper: Lookup ─────────────────────────────────────────────────────────

function getCertificationByLevel(level: Certification['level']): Certification {
  return CERTIFICATION_LEVELS.find((c) => c.level === level)!;
}

// ─── Core Assessment ────────────────────────────────────────────────────────

/**
 * Assess which certification level an organization qualifies for.
 *
 * The algorithm evaluates from the highest level (Platinum) downward and
 * returns the first level for which **both** the overall score and every
 * pillar score meet the minimum thresholds.
 *
 * The result also includes gap analysis for the current level and the next
 * level above, so consumers can show users exactly what needs to improve.
 */
export function assessCertification(
  overallScore: number,
  pillarScores: Array<{ pillarId: string; pillarName: string; normalizedScore: number }>
): CertificationResult {
  const scoreMap = new Map<string, { pillarName: string; normalizedScore: number }>();
  for (const p of pillarScores) {
    scoreMap.set(p.pillarId, { pillarName: p.pillarName, normalizedScore: p.normalizedScore });
  }

  // Evaluate from highest (platinum) to lowest (bronze); "none" is the fallback
  const rankedLevels: Certification['level'][] = ['platinum', 'gold', 'silver', 'bronze'];

  let achievedLevel: Certification['level'] = 'none';

  for (const level of rankedLevels) {
    const cert = getCertificationByLevel(level);

    // Check overall score
    if (overallScore < cert.minOverallScore) continue;

    // Check all pillar minimums
    const allPillarsPass = Object.entries(cert.minPillarScores).every(
      ([pillarId, minScore]) => {
        const pillar = scoreMap.get(pillarId);
        return pillar !== undefined && pillar.normalizedScore >= minScore;
      }
    );

    if (allPillarsPass) {
      achievedLevel = level;
      break;
    }
  }

  const certification = getCertificationByLevel(achievedLevel);
  const isCertified = achievedLevel !== 'none';

  // Gaps for current achieved level
  const pillarGaps = computeGaps(certification, scoreMap);

  // Next level (the one immediately above the achieved level)
  const nextLevelIndex = rankedLevels.indexOf(achievedLevel);
  const nextLevelKey: Certification['level'] | null =
    nextLevelIndex >= 0 && nextLevelIndex < rankedLevels.length - 1
      ? rankedLevels[nextLevelIndex + 1]
      : nextLevelIndex === -1 && rankedLevels.length > 0
        ? rankedLevels[0] // "none" → next is bronze
        : null;

  // If achieved is platinum, there is no higher level
  const nextLevel: Certification | null =
    achievedLevel === 'platinum'
      ? null
      : nextLevelKey
        ? getCertificationByLevel(nextLevelKey)
        : null;

  const nextLevelGaps = nextLevel ? computeGaps(nextLevel, scoreMap) : [];

  return {
    level: achievedLevel,
    certification,
    overallScore,
    pillarGaps,
    isCertified,
    nextLevel,
    nextLevelGaps,
  };
}

/**
 * Compute the gap between current pillar scores and a certification's minimums.
 * Only pillars that fall short of the required minimum are included.
 */
function computeGaps(
  cert: Certification,
  scoreMap: Map<string, { pillarName: string; normalizedScore: number }>
): Array<{ pillarId: string; pillarName: string; current: number; required: number }> {
  const gaps: Array<{ pillarId: string; pillarName: string; current: number; required: number }> = [];

  for (const [pillarId, required] of Object.entries(cert.minPillarScores)) {
    const pillar = scoreMap.get(pillarId);
    const current = pillar?.normalizedScore ?? 0;
    const name = pillar?.pillarName ?? pillarId;
    if (current < required) {
      gaps.push({ pillarId, pillarName: name, current: Math.round(current * 100) / 100, required });
    }
  }

  return gaps;
}

// ─── SVG Badge Generation ───────────────────────────────────────────────────

/**
 * Generate a professional circular SVG badge for a given certification level.
 *
 * The badge features:
 * - A circular border with a gradient matching the level colour
 * - "E-ARI CERTIFIED" arced along the top perimeter
 * - "AI READY" arced along the bottom perimeter
 * - The level name prominently centred
 * - A subtle star/diamond accent
 * - Clean, embeddable markup suitable for reports, email, or web
 */
export function getCertificationBadge(
  level: Certification['level']
): { svg: string; label: string; color: string } {
  const cert = getCertificationByLevel(level);
  const color = cert.color;
  const label = cert.label;

  // Derive a lighter tint for gradients
  const lighterColor = lightenColor(color, 40);
  const darkerColor = darkenColor(color, 20);

  // Watch-face tick ring — echoes the methodology radar aesthetic.
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 - 90) * (Math.PI / 180);
    const major = i % 5 === 0;
    const r1 = major ? 86 : 90;
    const r2 = 94;
    const x1 = 100 + r1 * Math.cos(a);
    const y1 = 100 + r1 * Math.sin(a);
    const x2 = 100 + r2 * Math.cos(a);
    const y2 = 100 + r2 * Math.sin(a);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-opacity="${major ? 0.7 : 0.28}" stroke-width="${major ? 1.4 : 0.8}" />`;
  }).join('\n  ');

  const barMid = color;
  const barDark = darkenColor(color, 30);
  const barLight = lightenColor(color, 25);
  const fontStack = `'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif`;
  const isNone = level === 'none';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="E-ARI certification seal: ${label}">
  <defs>
    <path id="topArc-${level}" d="M 30,100 A 70,70 0 0,1 170,100" fill="none" />
    <path id="bottomArc-${level}" d="M 26,100 A 74,74 0 0,0 174,100" fill="none" />
  </defs>

  <!-- Dark seal disc — sits naturally on the platform's navy surfaces -->
  <circle cx="100" cy="100" r="97" fill="#0a1024" />
  <circle cx="100" cy="100" r="97" fill="none" stroke="${color}" stroke-opacity="0.45" stroke-width="1.5"${isNone ? ' stroke-dasharray="3 4"' : ''} />

  <!-- Tick ring -->
  ${ticks}

  <!-- Inner boundary -->
  <circle cx="100" cy="100" r="80" fill="#0f1729" />
  <circle cx="100" cy="100" r="80" fill="none" stroke="${color}" stroke-opacity="0.3" stroke-width="1" />

  <!-- Arc lettering -->
  <text fill="${color}" font-family="${fontStack}" font-size="10" font-weight="600" letter-spacing="3.2">
    <textPath href="#topArc-${level}" startOffset="50%" text-anchor="middle">E-ARI CERTIFIED</textPath>
  </text>
  <text fill="${color}" fill-opacity="0.85" font-family="${fontStack}" font-size="8.5" font-weight="500" letter-spacing="3.4">
    <textPath href="#bottomArc-${level}" startOffset="50%" text-anchor="middle">AI READINESS · ${new Date().getFullYear()}</textPath>
  </text>

  <!-- Threshold-E brand mark, tinted to the certification level -->
  <rect x="81" y="66" width="38" height="7" rx="2" fill="${barLight}"${isNone ? ' fill-opacity="0.4"' : ''} />
  <rect x="81" y="78" width="22" height="7" rx="2" fill="${barMid}"${isNone ? ' fill-opacity="0.4"' : ''} />
  <rect x="81" y="90" width="38" height="7" rx="2" fill="${barDark}"${isNone ? ' fill-opacity="0.4"' : ''} />

  <!-- Level -->
  <text x="100" y="124" text-anchor="middle" font-family="${fontStack}" font-size="16" font-weight="700" letter-spacing="4" fill="#f1f5f9">${label.toUpperCase()}</text>
  <text x="100" y="138" text-anchor="middle" font-family="${fontStack}" font-size="6" font-weight="500" letter-spacing="2.2" fill="#94a3b8">SCORING V5.3</text>
</svg>`;

  return { svg, label, color };
}

// ─── Color Utilities ────────────────────────────────────────────────────────

/**
 * Lighten a hex colour by a given percentage (0–100).
 */
function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const t = percent / 100;
  return rgbToHex(
    Math.round(r + (255 - r) * t),
    Math.round(g + (255 - g) * t),
    Math.round(b + (255 - b) * t)
  );
}

/**
 * Darken a hex colour by a given percentage (0–100).
 */
function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const t = 1 - percent / 100;
  return rgbToHex(
    Math.round(r * t),
    Math.round(g * t),
    Math.round(b * t)
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
