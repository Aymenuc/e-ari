import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      tier: string;
      role?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    tier: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    tier: string;
    role?: string;
  }
}
