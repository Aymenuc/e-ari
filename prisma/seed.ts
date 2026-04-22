/**
 * E-ARI Database Seed Script
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Promotes a user to admin and/or creates a default admin user.
 * Reads from environment variables or uses defaults.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@eari.io";
  const adminPassword = process.env.ADMIN_PASSWORD || "EariAdmin2026!";
  const adminName = process.env.ADMIN_NAME || "E-ARI Admin";

  // Check if admin user already exists
  const existing = await db.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    // Promote existing user to admin + enterprise
    const updated = await db.user.update({
      where: { email: adminEmail },
      data: { role: "admin", tier: "enterprise" },
    });
    console.log(`✅ Promoted existing user to admin: ${updated.email} (role: ${updated.role}, tier: ${updated.tier})`);
  } else {
    // Create new admin user
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const created = await db.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "admin",
        tier: "enterprise",
        organization: "E-ARI Platform",
        sector: "technology",
      },
    });
    console.log(`✅ Created admin user: ${created.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ⚠️  Change this password immediately after first login!`);
  }

  // List all users for verification
  const allUsers = await db.user.findMany({
    select: { email: true, role: true, tier: true, name: true },
  });
  console.log("\n📋 All users:");
  allUsers.forEach((u) => {
    console.log(`   ${u.email} — role: ${u.role}, tier: ${u.tier}, name: ${u.name || "—"}`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
