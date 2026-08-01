import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      tier: string;
      role?: string;
      /** Registered sector, so the assessment need not ask a second time. */
      sector?: string | null;
      organization?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    tier: string;
    role?: string;
    sector?: string | null;
    organization?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    tier: string;
    role?: string;
    sector?: string | null;
    organization?: string | null;
  }
}
