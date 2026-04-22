/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the Next.js server starts (in production).
 * We use it to ensure NEXTAUTH_URL is set correctly for the deployment,
 * so that OAuth callback redirects work regardless of whether the
 * NEXTAUTH_URL env var was explicitly set.
 */
export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    // If NEXTAUTH_URL is missing or still pointing to localhost, try to infer
    // from other deployment environment variables
    if (!nextAuthUrl || nextAuthUrl.includes("localhost")) {
      // Check common deployment platform env vars
      const deployedUrl =
        process.env.VERCEL_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.RAILWAY_STATIC_URL ||
        process.env.DEPLOYMENT_URL;

      if (deployedUrl) {
        const protocol = deployedUrl.startsWith("http") ? "" : "https://";
        process.env.NEXTAUTH_URL = `${protocol}${deployedUrl}`;
        console.log(
          `[instrumentation] NEXTAUTH_URL auto-detected: ${process.env.NEXTAUTH_URL}`
        );
      }
    }

    console.log(
      `[instrumentation] NEXTAUTH_URL = ${process.env.NEXTAUTH_URL || "(not set)"}`
    );
  }
}
