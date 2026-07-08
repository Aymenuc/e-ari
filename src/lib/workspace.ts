/**
 * Team seats — workspace resolution.
 *
 * Model: every account owns exactly one workspace (its own data, keyed by
 * userId across all tables). An account with an ACTIVE OrgMembership acts
 * inside the owner's workspace instead of its own: reads and writes scope
 * to ownerId, entitlements come from the owner's tier, quotas count against
 * the owner.
 *
 * Roles:
 *   owner  — the workspace owner (implicit; no membership row)
 *   admin  — everything member can + manage seats
 *   member — read/write workspace data
 *   viewer — read-only (mutating routes must call assertCanWrite)
 *
 * A user belongs to at most ONE workspace at a time: their own by default,
 * or the first active membership if one exists. Deliberately not multi-
 * workspace — mid-market buyers need shared seats, not a tenant switcher.
 */

import { db } from "./db";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceContext {
  /** The userId whose data this session operates on. */
  ownerId: string;
  /** The session user's role inside that workspace. */
  role: WorkspaceRole;
  /** True when the session user is acting in someone else's workspace. */
  isGuest: boolean;
}

export async function resolveWorkspace(sessionUserId: string): Promise<WorkspaceContext> {
  const membership = await db.orgMembership.findFirst({
    where: { memberUserId: sessionUserId, status: "active" },
    orderBy: { acceptedAt: "asc" },
    select: { ownerId: true, role: true },
  });
  if (membership) {
    const role: WorkspaceRole = membership.role === "admin" ? "admin" : membership.role === "viewer" ? "viewer" : "member";
    return { ownerId: membership.ownerId, role, isGuest: true };
  }
  return { ownerId: sessionUserId, role: "owner", isGuest: false };
}

/** True when the role may mutate workspace data. */
export function canWrite(role: WorkspaceRole): boolean {
  return role !== "viewer";
}

/** True when the role may manage seats / billing-adjacent settings. */
export function canManage(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

/** Seat allowance per tier — total ACTIVE seats including the owner.
 *  Matches the "team members" ladder advertised on /pricing. */
export function getSeatLimit(tier: string | null | undefined): number {
  switch (tier) {
    case "professional": return 5;
    case "growth": return 25;
    case "autopilot": return Infinity;
    case "enterprise": return Infinity;
    default: return 1; // free: owner only
  }
}
