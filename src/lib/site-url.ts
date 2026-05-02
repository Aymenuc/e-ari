function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getBaseUrl(): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) return trimTrailingSlash(nextAuthUrl);

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${trimTrailingSlash(vercelUrl)}`;

  return "http://localhost:3000";
}

export function getCanonicalSiteUrl(): string {
  return getBaseUrl();
}
