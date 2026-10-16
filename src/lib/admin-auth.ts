import "server-only";

import { auth } from "@clerk/nextjs/server";
import { hasClerkConfiguration } from "@/lib/auth-config";
import {
  AdminAuthorizationError,
  parseAdminUserIdAllowlist,
  requireAdminIdentity,
} from "@/lib/admin-auth-core";

/** Require a verified Clerk session whose user ID is explicitly allowlisted. */
export async function requireAdmin(): Promise<string> {
  const clerkConfigured = hasClerkConfiguration();
  if (!clerkConfigured) {
    throw new AdminAuthorizationError("configuration");
  }

  const allowlist = process.env.ADMIN_CLERK_USER_IDS;
  // Validate configuration before asking Clerk to resolve a request session.
  parseAdminUserIdAllowlist(allowlist);

  let userId: string | null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    throw new AdminAuthorizationError("unauthenticated");
  }

  return requireAdminIdentity({ clerkConfigured, allowlist, userId });
}
