import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: false,
    // Vercel build containers are far slower than local dev — the docx
    // report test and 40-question leverage simulations exceeded the 5 s
    // default there while passing locally. The suite gates deploys, so a
    // slow pass must never read as a failure.
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
