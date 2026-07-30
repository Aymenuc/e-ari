import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Dev builds into its own directory.
   *
   * `output: 'standalone'` makes `next build` rewrite .next into a production
   * shape. A later `next dev` reads the same directory and serves a corrupted
   * route manifest — the app boots, `/` returns 200, and every other route
   * 404s, which reads as "the router broke" rather than "stale artifacts".
   * Separate directories make the collision impossible.
   *
   * Development only: Vercel builds with NODE_ENV=production, so the deployed
   * output path is unchanged.
   */
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/compliance", destination: "/portal/use-cases", permanent: false },
      {
        source: "/compliance/:path*",
        destination: "/portal/use-cases/:path*",
        permanent: false,
      },
    ];
  },
  serverExternalPackages: ['docx'],
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    'preview-chat-e69b3da2-881f-416c-bbeb-581b2335c25f.space.z.ai',
    'd1t9v39md791-d.space.z.ai',
    '.space.z.ai',
    '.space.chatglm.site',
  ],
};

export default nextConfig;
