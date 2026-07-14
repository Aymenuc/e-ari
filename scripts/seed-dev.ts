/**
 * Local design-iteration seed — pairs with /api/dev/login (dev-only).
 *
 * Creates one enterprise demo user and a completed, sector-weighted
 * assessment with a deliberately imperfect answer profile so every results
 * surface has something real to show: X-Ray findings fire, interdependency
 * rules apply, leverage moves rank, certification sits below platinum.
 *
 * Run: npx tsx scripts/seed-dev.ts   (against a LOCAL database only)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PILLARS } from '../src/lib/pillars';
import { scoreAssessment, type ResponseMap } from '../src/lib/assessment-engine';

const db = new PrismaClient();

// Mixed-maturity profile: strong security/governance, weak talent/data_3,
// mid everything else — fires Ambition Gap + at least one adjustment rule.
const ANSWER_PROFILE: Record<string, number[]> = {
  strategy: [5, 4, 4, 3, 3],
  data: [3, 3, 1, 3, 2],
  technology: [4, 4, 3, 3, 3],
  talent: [2, 2, 2, 1, 2],
  governance: [4, 4, 3, 4, 4],
  culture: [3, 3, 2, 3, 3],
  process: [3, 3, 3, 2, 3],
  security: [5, 4, 4, 4, 4],
};

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('seed-dev is a local-only tool');
  }

  const email = 'demo@e-ari.local';
  const user = await db.user.upsert({
    where: { email },
    update: { tier: 'enterprise' },
    create: {
      email,
      name: 'Demo Reviewer',
      passwordHash: await bcrypt.hash('local-dev-only', 10),
      organization: 'Aurora Health Group',
      sector: 'healthcare',
      orgSize: '201-1000',
      tier: 'enterprise',
      emailVerified: new Date(),
    },
  });

  const responses: ResponseMap = {};
  for (const pillar of PILLARS) {
    pillar.questions.forEach((q, i) => {
      responses[q.id] = ANSWER_PROFILE[pillar.id][i];
    });
  }
  const scoring = scoreAssessment(responses, 'healthcare');

  // Recreate the demo assessment fresh each run.
  await db.assessment.deleteMany({ where: { userId: user.id } });
  const assessment = await db.assessment.create({
    data: {
      userId: user.id,
      sector: 'healthcare',
      entityType: 'commercial',
      status: 'completed',
      completedAt: new Date(),
      overallScore: scoring.overallScore,
      maturityBand: scoring.maturityBand,
      pillarScores: JSON.stringify(scoring.pillarScores),
      scoringVersion: scoring.scoringVersion,
      methodologyVersion: scoring.methodologyVersion,
      responses: {
        create: Object.entries(responses).map(([questionId, answer]) => ({
          pillarId: questionId.split('_')[0],
          questionId,
          answer,
        })),
      },
    },
  });

  console.log(`seeded: ${email} (enterprise) — assessment ${assessment.id}`);
  console.log(`overall ${scoring.overallScore} (${scoring.maturityBand}) · xray ${scoring.xRayFindings?.length ?? 0} · adjustments ${scoring.adjustments.length}`);
  console.log(`login:   http://localhost:3000/api/dev/login?next=/portal`);
  console.log(`results: http://localhost:3000/api/dev/login?next=/results/${assessment.id}`);
}

main().finally(() => db.$disconnect());
