/**
 * Local: optionally loads `.env.test` (gitignored). Never overrides Vercel-injected env on the platform.
 * Vercel: `DATABASE_URL` / `DIRECT_URL` come from the project (Production / Preview). Integration tests
 * run during `npm run build` — see package.json. Set `RUN_INTEGRATION_TESTS=0` in Vercel to disable DB checks.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

if (process.env.VERCEL !== "1") {
  config({ path: resolve(process.cwd(), ".env.test") });
  if (process.env.TEST_DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL.trim();
  }
  if (process.env.TEST_DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = process.env.TEST_DIRECT_URL.trim();
  }
}

if (process.env.VERCEL === "1" && process.env.DATABASE_URL?.trim()) {
  process.env.RUN_INTEGRATION_TESTS ??= "1";
}
