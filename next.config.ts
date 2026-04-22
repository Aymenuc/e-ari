import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
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
