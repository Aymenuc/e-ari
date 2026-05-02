import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "./email-service";
import { getSetting } from "./platform-settings";

/**
 * Resolve the canonical NEXTAUTH_URL.
 * Priority:
 *  1. NEXTAUTH_URL env var (explicit override)
 *  2. VERCEL_URL (Vercel deployments)
 *  3. Fallback to http://localhost:3000
 */
function getNextAuthUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // FC platform: construct from FC_HTTP_HOST or fall through
  if (process.env.FC_HTTP_HOST) return `https://${process.env.FC_HTTP_HOST}`;
  return "http://localhost:3000";
}

export const authOptions: NextAuthOptions = {
  // trustHost allows NextAuth to accept the host from the request header
  // instead of strictly matching NEXTAUTH_URL. Required for sandbox/reverse-proxy
  // deployments where the public domain differs from the internal URL.
  ...({ trustHost: true } as Record<string, unknown>),
  providers: [
    // ── Credentials (email + password) ──────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // Check email verification requirement
        const requireVerification = await getSetting('require_email_verification');
        if (requireVerification && !user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          role: user.role,
          image: user.image,
        };
      },
    }),

    // ── Google OAuth ────────────────────────────────────────────────────────
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // ── GitHub OAuth ────────────────────────────────────────────────────────
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),

    // ── X / Twitter OAuth 2.0 ──────────────────────────────────────────────
    ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
      ? [
          TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
            version: "2.0", // OAuth 2.0
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // ── OAuth sign-in: create or link user ──────────────────────────────
      if (account?.provider && account.provider !== "credentials") {
        const provider = account.provider;
        const providerAccountId = account.providerAccountId;

        // Check if an Account already exists for this provider + providerAccountId
        const existingAccount = await db.account.findUnique({
          where: { provider_providerAccountId: { provider, providerAccountId } },
          include: { user: true },
        });

        if (existingAccount) {
          // Update the user's image from OAuth profile if available
          if (user.image && existingAccount.user.image !== user.image) {
            await db.user.update({
              where: { id: existingAccount.userId },
              data: { image: user.image },
            });
          }
          return true;
        }

        // No existing account — check if a user with this email already exists
        const email = user.email;
        if (!email) {
          // Cannot create user without email
          return false;
        }

        const existingUser = await db.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // Link the OAuth account to the existing user
          await db.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider,
              providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | undefined,
            },
          });
          return true;
        }

        // Create a brand-new user + account
        const newUser = await db.user.create({
          data: {
            email,
            name: user.name || email.split("@")[0],
            image: user.image,
            tier: "free",
            role: "user",
          },
        });

        await db.account.create({
          data: {
            userId: newUser.id,
            type: account.type,
            provider,
            providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state as string | undefined,
          },
        });

        // Send welcome email for new OAuth users (fire-and-forget)
        sendWelcomeEmail(newUser.id, newUser.email, newUser.name).catch(() => {});

        return true;
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? token.email;
        token.tier = (user as unknown as Record<string, unknown>).tier as string || "free";
        token.role = (user as unknown as Record<string, unknown>).role as string || "user";

        // For OAuth sign-ins, fetch tier/role from DB since OAuth user object may not have them
        if (account?.provider && account.provider !== "credentials") {
          const dbUser = await db.user.findUnique({
            where: { email: user.email! },
            select: { id: true, tier: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.tier = dbUser.tier;
            token.role = dbUser.role;
          }
        }

        // Auto-promote ADMIN_EMAIL to admin role
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail && token.email === adminEmail && token.role !== "admin") {
          await db.user.update({
            where: { email: adminEmail },
            data: { role: "admin" },
          });
          token.role = "admin";
        }
      }

      // Keep JWT claims aligned with DB changes made after login
      // (e.g. admin tier updates), so the portal does not show stale tier.
      if (!user && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, tier: true, role: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.tier = dbUser.tier;
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.tier = token.tier as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "e-ari-dev-secret-change-in-production",
};
